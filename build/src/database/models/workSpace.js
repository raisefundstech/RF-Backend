"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.workSpaceModel = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const workSpaceSchema = new mongoose_1.default.Schema({
    name: { type: String, default: null },
    address: { type: String, default: null },
    latitude: { type: Number, default: 0 },
    longitude: { type: Number, default: 0 },
    createdBy: { type: mongoose_1.default.Schema.Types.ObjectId, ref: "user", default: null },
    updatedBy: { type: mongoose_1.default.Schema.Types.ObjectId, ref: "user", default: null },
    isActive: { type: Boolean, default: true }
}, { timestamps: true });
exports.workSpaceModel = mongoose_1.default.model('workSpace', workSpaceSchema);
//# sourceMappingURL=workSpace.js.map