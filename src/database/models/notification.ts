import mongoose from 'mongoose'

const notificationSchema = new mongoose.Schema({
    title: { type: String, default: null },
    description: { type: String, default: null },
    notificationData: { type: Object, default: {} },
    notificationType: { type: Number, default: 0, enum: [0, 1, 2, 3] },
    eventId: { type: mongoose.Schema.Types.ObjectId, ref: "eventModel", default: null },
    roomId: { type: mongoose.Schema.Types.ObjectId, ref: "roomModel", default: null },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "userModel" },
    receivedBy: { type: mongoose.Schema.Types.ObjectId, ref: "userModel" },
    receivedIds: { type: [{ type: mongoose.Schema.Types.ObjectId, default: null, ref: "userModel" }], default: [] },
    isActive: { type: Boolean, default: true },
}, { timestamps: true })

export const notificationModel = mongoose.model('notification', notificationSchema)