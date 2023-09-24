"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.roomModel = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const roomSchema = new mongoose_1.default.Schema({
    roomName: { type: String, default: "event group" },
    isActive: { type: Boolean, default: true },
    eventId: { type: mongoose_1.default.Schema.Types.ObjectId, default: null },
    volunteerIds: { type: [{ type: mongoose_1.default.Schema.Types.ObjectId, default: null }], default: null },
}, { timestamps: true });
exports.roomModel = mongoose_1.default.model('room', roomSchema);
//# sourceMappingURL=room.js.map