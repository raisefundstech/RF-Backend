import mongoose from 'mongoose'

const ourTeamSchema = new mongoose.Schema({
    name: { type: String, default: null },
    email: { type: String, default: null },
    mobileNumber: { type: String, default: null },
    designation: { type: String, default: null },
    image: { type: String, default: null },
    isActive: { type: Boolean, default: true },
}, { timestamps: true })

export const ourTeamModel = mongoose.model('ourTeam', ourTeamSchema)