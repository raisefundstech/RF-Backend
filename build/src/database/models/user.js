"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.userModel = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const userSchema = new mongoose_1.default.Schema({
    workSpaceId: { type: mongoose_1.default.Schema.Types.ObjectId, default: null, ref: "workSpace" },
    firstName: { type: String, default: null },
    lastName: { type: String, default: null },
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
    loginType: { type: Number, default: 0, enum: [0, 1, 2, 3] },
    userType: { type: Number, default: 0, enum: [0, 1, 2] },
    userRole: { type: String, default: "NOT_VERIFIED", enum: ["VERIFIED", "NOT_VERIFIED", "BANNED"] },
    isActive: { type: Boolean, default: true }
}, { timestamps: true });
exports.userModel = mongoose_1.default.model('user', userSchema);
//# sourceMappingURL=user.js.map