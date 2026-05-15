import jwt from 'jsonwebtoken'
import Message from '../models/Message.js'
import Room from '../models/Room.js'
import User from '../models/User.js'
import { handleBotMessage } from './botHandler.js'

/**
 * Server-side @mention DM handler.
 */
const handleMentionDM = async (io, socket, currentRoomId, content) => {
    const match = content.match(/^@(\S+)\s+([\s\S]+)$/)
    if (!match) return false

    const mentionedName = match[1].toLowerCase()
    const actualMessage = match[2].trim()

    const targetUser = await User.findOne({
        name: { $regex: new RegExp(`^${mentionedName}`, 'i') },
        _id: { $ne: socket.user.id }
    })

    if (!targetUser) return false
    if (targetUser.email === 'bot@ai.com') return false

    let dmRoom = await Room.findOne({
        isGroupChat: false,
        members: { $all: [socket.user.id, targetUser._id] }
    })
    if (!dmRoom) {
        dmRoom = await Room.create({
            isGroupChat: false,
            members: [socket.user.id, targetUser._id]
        })
    }

    const dmMessage = await Message.create({
        room: dmRoom._id,
        sender: socket.user.id,
        content: actualMessage,
    })
    await Room.findByIdAndUpdate(dmRoom._id, { lastMessage: dmMessage._id })
    const populated = await dmMessage.populate('sender', 'name avatar')
    io.to(dmRoom._id.toString()).emit('receive_message', populated)

    const confirmation = await Message.create({
        room: currentRoomId,
        sender: socket.user.id,
        content: `✅ Sent "${actualMessage}" to **${targetUser.name}** as a direct message.`,
        isBot: true,
    })
    io.to(currentRoomId).emit('receive_message', {
        ...confirmation.toObject(),
        senderName: 'System',
        isBot: true,
    })
    return true
}

export const initSocket = (io) => {

    // Auth middleware
    io.use((socket, next) => {
        const token = socket.handshake.auth.token
        if (!token) return next(new Error('No token'))
        try {
            socket.user = jwt.verify(token, process.env.JWT_SECRET)
            next()
        } catch {
            next(new Error('Invalid token'))
        }
    })

    io.on('connection', (socket) => {
        console.log('User connected:', socket.user.id)

        // ── Room management ──────────────────────────────────────────────
        socket.on('join_room', (roomId) => {
            socket.join(roomId)
        })

        socket.on('leave_room', (roomId) => {
            socket.leave(roomId)
        })

        // ── Messaging ────────────────────────────────────────────────────
        socket.on('send_message', async ({ roomId, content, fileUrl, fileName, fileType, fileSize }) => {
            try {
                // @mention interception (text messages only)
                if (content && content.trim().startsWith('@') && !fileUrl) {
                    const handled = await handleMentionDM(io, socket, roomId, content.trim())
                    if (handled) return
                }

                const message = await Message.create({
                    room: roomId,
                    sender: socket.user.id,
                    content: content || '',
                    fileUrl: fileUrl || null,
                    fileName: fileName || null,
                    fileType: fileType || null,
                    fileSize: fileSize || null,
                })

                await Room.findByIdAndUpdate(roomId, { lastMessage: message._id })
                const populated = await message.populate('sender', 'name avatar')
                io.to(roomId).emit('receive_message', populated)

                // Bot trigger only for text messages
                if (!fileUrl) {
                    const room = await Room.findById(roomId).populate('members', 'email')
                    const hasBot = room.members.some(m => m.email === 'bot@ai.com')
                    if (content && (content.toLowerCase().includes('@bot') || hasBot)) {
                        await handleBotMessage(io, socket, roomId, content)
                    }
                }
            } catch (err) {
                socket.emit('error', { message: err.message })
            }
        })

        // ── Typing ───────────────────────────────────────────────────────
        socket.on('typing', ({ roomId }) => {
            socket.to(roomId).emit('user_typing', { userId: socket.user.id, name: socket.user.name })
        })

        socket.on('stop_typing', ({ roomId }) => {
            socket.to(roomId).emit('user_stop_typing', { userId: socket.user.id })
        })

        // ── WebRTC Signaling (Audio/Video Calls) ─────────────────────────
        // Initiate call to a room
        socket.on('call_room', ({ roomId, callType, callerName, callerId }) => {
            // Notify all OTHER members in the room about incoming call
            socket.to(roomId).emit('incoming_call', {
                roomId,
                callType,       // 'audio' | 'video'
                callerName,
                callerId,
            })
        })

        // A user accepts the call and is ready to peer
        socket.on('join_call', ({ roomId, userId, userName }) => {
            socket.join(`call:${roomId}`)
            // Tell all OTHER existing call participants a new person joined
            socket.to(`call:${roomId}`).emit('user_joined_call', { userId, userName })
        })

        // WebRTC offer (initiator → joiner)
        socket.on('send_offer', ({ to, offer, from, fromName }) => {
            io.to(to).emit('receive_offer', { offer, from, fromName })
        })

        // WebRTC answer (joiner → initiator)
        socket.on('send_answer', ({ to, answer, from }) => {
            io.to(to).emit('receive_answer', { answer, from })
        })

        // ICE candidates
        socket.on('send_ice_candidate', ({ to, candidate, from }) => {
            io.to(to).emit('receive_ice_candidate', { candidate, from })
        })

        // End / reject call
        socket.on('end_call', ({ roomId }) => {
            io.to(`call:${roomId}`).emit('call_ended', { roomId })
            io.to(roomId).emit('call_ended', { roomId }) // also notify those who didn't join
            socket.leave(`call:${roomId}`)
        })

        socket.on('reject_call', ({ roomId, callerSocketId }) => {
            io.to(roomId).emit('call_rejected', { roomId })
        })

        // ── Disconnect ───────────────────────────────────────────────────
        socket.on('disconnect', () => {
            console.log('User disconnected:', socket.user.id)
        })
    })
}