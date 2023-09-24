import mongoose from 'mongoose'

const messageSchema = new mongoose.Schema({
    roomId: { type: mongoose.Schema.Types.ObjectId, default: null },
    senderId: { type: mongoose.Schema.Types.ObjectId, default: null },
    receiverIds: { type: [{ type: mongoose.Schema.Types.ObjectId, default: null }], default: null },
    message: { type: String, default: null },
    isActive: { type: Boolean, default: true },
}, { timestamps: true })

export const messageModel = mongoose.model('message', messageSchema)