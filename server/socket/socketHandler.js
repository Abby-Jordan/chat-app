import jwt from 'jsonwebtoken'
import Message from '../models/Message.js'
import Room from '../models/Room.js'
import { handleBotMessage } from './botHandler.js'

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
                const message = await Message.create({
                    room: roomId,
                    sender: socket.user.id,
                    content,
                })

                // Update room's lastMessage
                await Room.findByIdAndUpdate(roomId, { lastMessage: message._id })

                // Populate sender info before broadcasting
                const populated = await message.populate('sender', 'name avatar')

                // Broadcast to everyone in the room (including sender)
                io.to(roomId).emit('receive_message', populated)

                // Trigger Bot if @bot mentioned OR if chatting directly with Bot
                const room = await Room.findById(roomId).populate('members', 'email');
                const hasBot = room.members.some(m => m.email === 'bot@ai.com');

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