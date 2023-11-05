"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.userSessionModel = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const userSessionSchema = new mongoose_1.default.Schema({
    isActive: { type: Boolean, default: true },
    createdBy: { type: mongoose_1.default.Schema.Types.ObjectId },
    refresh_token: { type: String },
    device_token: { type: String }
}, { timestamps: true });
exports.userSessionModel = mongoose_1.default.model('user_session', userSessionSchema);
//# sourceMappingURL=userSession.js.map