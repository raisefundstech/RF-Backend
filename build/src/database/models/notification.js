"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.notificationModel = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const notificationSchema = new mongoose_1.default.Schema({
    title: { type: String, default: null },
    description: { type: String, default: null },
    notificationData: { type: Object, default: {} },
    notificationType: { type: Number, default: 0, enum: [0, 1, 2, 3] },
    eventId: { type: mongoose_1.default.Schema.Types.ObjectId, ref: "eventModel", default: null },
    roomId: { type: mongoose_1.default.Schema.Types.ObjectId, ref: "roomModel", default: null },
    createdBy: { type: mongoose_1.default.Schema.Types.ObjectId, ref: "userModel" },
    receivedBy: { type: mongoose_1.default.Schema.Types.ObjectId, ref: "userModel" },
    receivedIds: { type: [{ type: mongoose_1.default.Schema.Types.ObjectId, default: null, ref: "userModel" }], default: [] },
    isActive: { type: Boolean, default: true },
}, { timestamps: true });
exports.notificationModel = mongoose_1.default.model('notification', notificationSchema);
//# sourceMappingURL=notification.js.map