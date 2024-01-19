import mongoose from 'mongoose';

const eventSchema: any = new mongoose.Schema({
    workSpaceId: { type: mongoose.Schema.Types.ObjectId, default: null },
    name: { type: String, default: null },
    latitude: { type: Number, default: 0.0 },
    longitude: { type: Number, default: 0.0 },
    date: { type: Date, default: null },
    startTime: { type: Date, default: null },
    endTime: { type: Date, default: null },
    volunteerSize: { type: Number, default: 0 },
    notes: { type: String, default: null },
    rfCoins : { type: Number, default: 0 },
    stadiumId: { type: mongoose.Schema.Types.ObjectId, default: null },
    volunteerRequest: {
        type: [{
            volunteerId: { type: mongoose.Schema.Types.ObjectId },
            requestStatus: { type: String, default: "PENDING", enum: ["PENDING", "APPROVED", "DECLINED"] },            
            attendance: { type: Boolean, default: false },
            appliedAt: { type: Date, default: new Date() },
            checkedIn: { type: Boolean, default: false },
            checkedOut: { type: Boolean, default: false },
            userNote: [{
                note: { type: String },
                createdAt: { type: Date, default: Date.now },
                createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "user" }
            }],
        }], default: []
    },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "user" },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "user" },
    isGroupCreated: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true }
}, { timestamps: true });

export const eventModel = mongoose.model('event', eventSchema)