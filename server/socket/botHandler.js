import Groq from 'groq-sdk'
import Message from '../models/Message.js'
import Room from '../models/Room.js'


export const handleBotMessage = async (io, socket, roomId, userMessage) => {
    try {
        // Show typing indicator for bot
        io.to(roomId).emit('bot_typing', true)

        // Get last 10 messages for context
        const history = await Message.find({ room: roomId })
            .sort({ createdAt: -1 })
            .limit(10)
            .populate('sender', 'name')

        // Format conversation history for OpenAI
        const contextMessages = history.reverse().map(msg => ({
            role: msg.isBot ? 'assistant' : 'user',
            content: msg.isBot ? msg.content : `${msg.sender.name}: ${msg.content}`
        }))

        const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

        // Call OpenAI with context
        const response = await groq.chat.completions.create({
            model: 'llama-3.3-70b-versatile',
            messages: [
                {
                    role: 'system',
                    content: 'You are a helpful AI assistant in a group chat. Keep replies concise and friendly. You are addressed with @bot.'
                },
                ...contextMessages
            ],
        })

        const botReply = response.choices[0].message.content

        // Save bot message to DB
        const botMessage = await Message.create({
            room: roomId,
            sender: socket.user.id,   // sender field still needed — use the user who triggered
            content: botReply,
            isBot: true,
        })

        // Update room lastMessage
        await Room.findByIdAndUpdate(roomId, { lastMessage: botMessage._id })

        // Stop typing indicator
        io.to(roomId).emit('bot_typing', false)

        // Broadcast bot reply to room
        io.to(roomId).emit('receive_message', {
            ...botMessage.toObject(),
            senderName: 'AI Bot',
            isBot: true,
        })
    } catch (err) {
        io.to(roomId).emit('bot_typing', false)
        io.to(roomId).emit('error', { message: 'Bot failed to respond' })
    }
}