import mongoose from 'mongoose';

const statsSchema: any = new mongoose.Schema({
    workSpaceId: { type: mongoose.Schema.Types.ObjectId, default: null },
    volunteerId: { type: mongoose.Schema.Types.ObjectId, default: null },
    eventInformation: {
        type: [{
            eventId: { type: mongoose.Schema.Types.ObjectId },
            rfCoins : { type: Number, default: 0 },
            createdAt: { type: Date, default: Date.now }
        }], default: []
    }
}, { timestamps: true });

export const statsModel = mongoose.model('stats', statsSchema)