import mongoose from 'mongoose';

const workSpaceSchema: any = new mongoose.Schema({
    name: { type: String, default: null },
    address: { type: String, default: null },
    latitude: { type: Number, default: 0 },
    longitude: { type: Number, default: 0 },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "user", default: null },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "user", default: null },
    isActive: { type: Boolean, default: true }
}, { timestamps: true });

export const workSpaceModel = mongoose.model('workSpace', workSpaceSchema)