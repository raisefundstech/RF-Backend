"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ourTeamModel = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const ourTeamSchema = new mongoose_1.default.Schema({
    name: { type: String, default: null },
    email: { type: String, default: null },
    mobileNumber: { type: String, default: null },
    designation: { type: String, default: null },
    image: { type: String, default: null },
    isActive: { type: Boolean, default: true },
}, { timestamps: true });
exports.ourTeamModel = mongoose_1.default.model('ourTeam', ourTeamSchema);
//# sourceMappingURL=ourTeam.js.map