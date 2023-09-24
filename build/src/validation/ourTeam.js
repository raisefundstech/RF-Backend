"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.by_id = exports.updateOurTeam = exports.createOurTeam = void 0;
const Joi = __importStar(require("joi"));
const common_1 = require("../common");
const mongoose_1 = require("mongoose");
const helpers_1 = require("../helpers");
const createOurTeam = async (req, res, next) => {
    const schema = Joi.object({
        name: Joi.string().trim().required().error(new Error('name is required!')),
        mobileNumber: Joi.string().trim().required().error(new Error('mobileNumber is required!')),
        email: Joi.string().trim().allow("", null).error(new Error('email is string!')),
        image: Joi.string().trim().allow("", null).error(new Error('image is string!')),
        designation: Joi.string().trim().allow("", null).error(new Error('designation is string!')),
    });
    schema.validateAsync(req.body).then(result => {
        req.body = result;
        return next();
    }).catch(error => {
        res.status(400).json(new common_1.apiResponse(400, error.message, {}));
    });
};
exports.createOurTeam = createOurTeam;
const updateOurTeam = async (req, res, next) => {
    const schema = Joi.object({
        id: Joi.string().trim().required().error(new Error('id is required!')),
        name: Joi.string().trim().allow(null, "").error(new Error('name is string!')),
        email: Joi.string().trim().allow(null, "").error(new Error('email is string!')),
        mobileNumber: Joi.string().trim().allow(null, "").error(new Error('mobileNumber is string!')),
        image: Joi.string().trim().allow(null, "").error(new Error('image is string!'))
    });
    schema.validateAsync(req.body).then(result => {
        if (!(0, mongoose_1.isValidObjectId)(result.id))
            return res.status(400).json(new common_1.apiResponse(400, 'invalid id', {}));
        req.body = result;
        return next();
    }).catch(error => {
        res.status(400).json(new common_1.apiResponse(400, error.message, {}));
    });
};
exports.updateOurTeam = updateOurTeam;
const by_id = async (req, res, next) => {
    if (!(0, mongoose_1.isValidObjectId)(req.params.id))
        return res.status(400).json(new common_1.apiResponse(400, helpers_1.responseMessage.invalidId('id'), {}));
    next();
};
exports.by_id = by_id;
//# sourceMappingURL=ourTeam.js.map