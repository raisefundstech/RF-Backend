"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.eventModel = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const eventSchema = new mongoose_1.default.Schema({
    workSpaceId: { type: mongoose_1.default.Schema.Types.ObjectId, default: null },
    name: { type: String, default: null },
    address: { type: String, default: null },
    latitude: { type: Number, default: 0 },
    longitude: { type: Number, default: 0 },
    date: { type: Date, default: null },
    startTime: { type: Date, default: null },
    endTime: { type: Date, default: null },
    volunteerSize: { type: Number, default: 0 },
    notes: { type: String, default: null },
    volunteerRequest: {
        type: [{
                volunteerId: { type: mongoose_1.default.Schema.Types.ObjectId },
                requestStatus: { type: String, default: "PENDING", enum: ["PENDING", "APPROVED", "DECLINED"] },
                attendance: { type: Boolean, default: false },
                appliedAt: { type: Date, default: new Date() },
                checkedIn: { type: Boolean, default: false },
                checkedOut: { type: Boolean, default: false },
                userNote: { type: [{ type: String }], default: [] },
            }], default: []
    },
    createdBy: { type: mongoose_1.default.Schema.Types.ObjectId, ref: "user" },
    updatedBy: { type: mongoose_1.default.Schema.Types.ObjectId, ref: "user" },
    isGroupCreated: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true }
}, { timestamps: true });
exports.eventModel = mongoose_1.default.model('event', eventSchema);
//# sourceMappingURL=event.js.map