import mongoose from 'mongoose'

const userSessionSchema = new mongoose.Schema({
    isActive: { type: Boolean, default: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId },
    refresh_token: { type: String },
    device_token: { type: String }
}, { timestamps: true })

export const userSessionModel = mongoose.model('user_session', userSessionSchema)