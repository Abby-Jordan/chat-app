import mongoose from "mongoose";

const messageSchema = new mongoose.Schema({
    sender: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    content: {
        type: String,
        default: ""
    },
    room: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Room",
        required: true
    },
    isBot: {
        type: Boolean,
        default: false
    },
    // Media / file support
    fileUrl: { type: String, default: null },
    fileName: { type: String, default: null },
    fileType: { type: String, default: null },  // 'image' | 'video' | 'audio' | 'document'
    fileSize: { type: Number, default: null },
    readBy: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
    }]
}, { timestamps: true })

messageSchema.index({ room: 1, createdAt: 1 })

export default mongoose.model("Message", messageSchema);