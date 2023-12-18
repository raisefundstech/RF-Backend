import mongoose from 'mongoose';

const userSchema: any = new mongoose.Schema({
    workSpaceId: { type: mongoose.Schema.Types.ObjectId, default: null, ref: "workSpace" },
    firstName: { type: String, default: null },
    lastName: { type: String, default: null },
    gender: { type: Number, default: null, enum: [0, 1, 2] }, // 0 - female, 1 - male, 2 - other
    email: { type: String, default: null },
    mobileNumber: { type: String, default: null },
    address: { type: String, default: null },
    zipCode: { type: String, default: null },
    latitude: { type: Number, default: 0 },
    longitude: { type: Number, default: 0 },
    image: { type: String, default: null },
    volunteerId: { type: String, default: null },
    notes: { type: String, default: null },
    tags: { type: String, default: "NOT VERIFY" },
    workTime: { type: String, default: null },
    RBSId: { type: String, default: null },
    rbsImage : { type: String, default: null },
    isRBSAvailable: { type: Boolean, default: false },
    city: { type: String, default: null },
    universityName: { type: String, default: null },
    major: { type: String, default: null },
    yearOfEducationCompletion: { type: String, default: null },
    YearOfCameToUSA: { type: String, default: null },
    collegeIdCard: { type: String, default: null },
    countryOfOrigin: { type: String, default: null },
    otp: { type: Number, default: 0 },
    otpExpireTime: { type: Date, default: null },
    device_token: { type: [{ type: String }], default: [] },
    loginType: { type: Number, default: 0, enum: [0, 1, 2, 3] }, // 0 - custom || 1 - google || 2 - facebook || 3 - apple
    userType: { type: Number, default: 0, enum: [0, 1, 2] }, // 0 - user || 1 - admin || 2 - super_volunteer
    userStatus: {type: Number, default: 0,enum: [0, 1, 2]}, // "NOT_VERIFIED", "VERIFIED", "BANNED"
    isActive: { type: Boolean, default: true }
}, { timestamps: true });

export const userModel = mongoose.model('user', userSchema);