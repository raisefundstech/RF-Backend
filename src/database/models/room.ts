import mongoose from 'mongoose'

const roomSchema = new mongoose.Schema({
    roomName: { type: String, default: "event group" },
    isActive: { type: Boolean, default: true },
    eventId: { type: mongoose.Schema.Types.ObjectId, default: null },
    volunteerIds: { type: [{ type: mongoose.Schema.Types.ObjectId, default: null }], default: null },
}, { timestamps: true })

export const roomModel = mongoose.model('room', roomSchema)