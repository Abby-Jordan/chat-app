import jwt from 'jsonwebtoken'
import Message from '../models/Message.js'
import Room from '../models/Room.js'
import User from '../models/User.js'
import { handleBotMessage } from './botHandler.js'

/**
 * Handles the server-side @mention DM feature.
 * Pattern: "@username your message here"
 * 1. Finds the target user by name (case-insensitive)
 * 2. Creates or gets existing DM room between sender and target
 * 3. Saves + broadcasts the message in that DM room
 * 4. Sends a bot-style confirmation back in the current room
 */
const handleMentionDM = async (io, socket, currentRoomId, content) => {
    // Match: "@name rest of message"
    const match = content.match(/^@(\S+)\s+([\s\S]+)$/)
    if (!match) return false

    const mentionedName = match[1].toLowerCase()
    const actualMessage = match[2].trim()

    // Find target user by name (case-insensitive, partial match)
    const targetUser = await User.findOne({
        name: { $regex: new RegExp(`^${mentionedName}`, 'i') },
        _id: { $ne: socket.user.id }  // not sender themselves
    })

    if (!targetUser) {
        // User not found — let message send normally, don't intercept
        return false
    }

    // Skip @bot — let bot handler deal with it
    if (targetUser.email === 'bot@ai.com') return false

    // Find or create DM room between sender and target
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

    // Save the actual message in the DM room
    const dmMessage = await Message.create({
        room: dmRoom._id,
        sender: socket.user.id,
        content: actualMessage,
    })

    await Room.findByIdAndUpdate(dmRoom._id, { lastMessage: dmMessage._id })

    const populated = await dmMessage.populate('sender', 'name avatar')

    // Broadcast DM message to that room (if anyone is connected there)
    io.to(dmRoom._id.toString()).emit('receive_message', populated)

    // Send confirmation back to the current room (bot-style system message)
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

    return true  // handled — skip normal message flow
}

export const initSocket = (io) => {

    // Auth middleware for sockets — verify JWT on connect
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

        // Join a chat room
        socket.on('join_room', (roomId) => {
            socket.join(roomId)
            console.log(`${socket.user.id} joined room ${roomId}`)
        })

        // Leave a room
        socket.on('leave_room', (roomId) => {
            socket.leave(roomId)
        })

        // Send a message
        socket.on('send_message', async ({ roomId, content }) => {
            try {
                // --- Server-side @mention interception ---
                // Runs for ALL messages (from bot chat, group chats, DMs)
                if (content.trim().startsWith('@')) {
                    const handled = await handleMentionDM(io, socket, roomId, content.trim())
                    if (handled) return  // DM was sent, skip normal flow
                }

                // Normal message flow
                const message = await Message.create({
                    room: roomId,
                    sender: socket.user.id,
                    content,
                })

                await Room.findByIdAndUpdate(roomId, { lastMessage: message._id })

                const populated = await message.populate('sender', 'name avatar')
                io.to(roomId).emit('receive_message', populated)

                // Trigger Bot if @bot mentioned OR if chatting directly with Bot
                const room = await Room.findById(roomId).populate('members', 'email')
                const hasBot = room.members.some(m => m.email === 'bot@ai.com')

                if (content.toLowerCase().includes('@bot') || hasBot) {
                    await handleBotMessage(io, socket, roomId, content)
                }
            } catch (err) {
                socket.emit('error', { message: err.message })
            }
        })

        // Typing indicator
        socket.on('typing', ({ roomId }) => {
            socket.to(roomId).emit('user_typing', {
                userId: socket.user.id,
                name: socket.user.name
            })
        })

        socket.on('stop_typing', ({ roomId }) => {
            socket.to(roomId).emit('user_stop_typing', { userId: socket.user.id })
        })

        socket.on('disconnect', () => {
            console.log('User disconnected:', socket.user.id)
        })
    })
}