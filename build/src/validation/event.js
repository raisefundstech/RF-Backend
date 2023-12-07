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
exports.addEventAttendance = exports.changeEventRequestStatus = exports.by_id = exports.updateEvent = exports.createEvent = void 0;
const Joi = __importStar(require("joi"));
const common_1 = require("../common");
const mongoose_1 = require("mongoose");
const helpers_1 = require("../helpers");
const createEvent = async (req, res, next) => {
    const schema = Joi.object({
        workSpaceId: Joi.string().trim().required().error(new Error('workSpaceId is required!')),
        name: Joi.string().trim().required().error(new Error('name is required!')),
        address: Joi.string().trim().required().error(new Error('address is required!')),
        latitude: Joi.number().allow("", null).error(new Error('latitude is number!')),
        longitude: Joi.number().allow("", null).error(new Error('longitude is number!')),
        date: Joi.string().required().error(new Error('date is required!')),
        startTime: Joi.string().required().error(new Error('startTime is required!')),
        endTime: Joi.string().required().error(new Error('endTime is required!')),
        volunteerSize: Joi.number().required().error(new Error('volunteerSize is required!')),
        notes: Joi.string().allow(null, "").error(new Error('notes is string!'))
    });
    schema.validateAsync(req.body).then(result => {
        if (!(0, mongoose_1.isValidObjectId)(result.workSpaceId))
            return res.status(400).json(new common_1.apiResponse(400, 'invalid workSpaceId', {}));
        req.body = result;
        return next();
    }).catch(error => {
        res.status(400).json(new common_1.apiResponse(400, error.message, {}));
    });
};
exports.createEvent = createEvent;
const updateEvent = async (req, res, next) => {
    const mongoose = require('mongoose');
    const volunteerRequestSchema = new mongoose.Schema({
        volunteerId: { type: mongoose.Schema.Types.ObjectId },
        requestStatus: { type: String, default: "PENDING", enum: ["PENDING", "APPROVED", "DECLINED"] },
        attendance: { type: Boolean, default: false },
        appliedAt: { type: Date, default: new Date() },
        checkedIn: { type: Boolean, default: false },
        checkedOut: { type: Boolean, default: false },
        userNote: { type: [{ type: String }], default: [] },
    }, { _id: false }); // Add this line to disable automatic generation of _id for subdocuments
    const schema = Joi.object({
        id: Joi.string().trim().required().error(new Error('id is required!')),
        workSpaceId: Joi.string().trim().allow(null, "").error(new Error('workSpaceId is objectId!')),
        name: Joi.string().trim().allow(null, "").error(new Error('name is string!')),
        address: Joi.string().trim().allow(null, "").error(new Error('address is string!')),
        latitude: Joi.number().allow(null).error(new Error('latitude is number!')),
        longitude: Joi.number().allow(null).error(new Error('longitude is number!')),
        date: Joi.string().trim().allow(null, "").error(new Error('date is string!')),
        startTime: Joi.string().trim().allow(null, "").error(new Error('startTime is string!')),
        endTime: Joi.string().trim().allow(null, "").error(new Error('endTime is string!')),
        volunteerSize: Joi.number().allow(null).error(new Error('volunteerSize is number!')),
        notes: Joi.string().trim().allow(null, "").error(new Error('notes is string!')),
        volunteerRequest: Joi.array().default([]),
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
exports.updateEvent = updateEvent;
const by_id = async (req, res, next) => {
    if (!(0, mongoose_1.isValidObjectId)(req.params.id))
        return res.status(400).json(new common_1.apiResponse(400, helpers_1.responseMessage.invalidId('id'), {}));
    next();
};
exports.by_id = by_id;
const changeEventRequestStatus = async (req, res, next) => {
    const schema = Joi.array().items(Joi.object({
        id: Joi.string().trim().required().error(new Error('id is required!')),
        requestId: Joi.string().trim().required().error(new Error('requestId is required!')),
        requestStatus: Joi.string().trim().required().error(new Error('requestStatus is string!'))
    }));
    schema.validateAsync(req.body).then(result => {
        const arrayData = Array.isArray(result) ? result : [result];
        for (const item of arrayData) {
            if (!(0, mongoose_1.isValidObjectId)(item.id))
                return res.status(400).json(new common_1.apiResponse(400, 'invalid id', {}));
            if (!(0, mongoose_1.isValidObjectId)(item.requestId))
                return res.status(400).json(new common_1.apiResponse(400, 'invalid requestId', {}));
        }
        req.body = arrayData;
        return next();
    }).catch(error => {
        res.status(400).json(new common_1.apiResponse(400, error.message, {}));
    });
};
exports.changeEventRequestStatus = changeEventRequestStatus;
const addEventAttendance = async (req, res, next) => {
    const schema = Joi.array().items(Joi.object({
        id: Joi.string().trim().required().error(new Error('id is required!')),
        requestId: Joi.string().trim().required().error(new Error('requestId is required!')),
        attendance: Joi.boolean().required().error(new Error('attendance is boolean!'))
    }));
    schema.validateAsync(req.body).then(result => {
        const arrayData = Array.isArray(result) ? result : [result];
        for (const item of arrayData) {
            if (!(0, mongoose_1.isValidObjectId)(item.id))
                return res.status(400).json(new common_1.apiResponse(400, 'invalid id', {}));
            if (!(0, mongoose_1.isValidObjectId)(item.requestId))
                return res.status(400).json(new common_1.apiResponse(400, 'invalid requestId', {}));
        }
        req.body = arrayData;
        return next();
    }).catch(error => {
        res.status(400).json(new common_1.apiResponse(400, error.message, {}));
    });
};
exports.addEventAttendance = addEventAttendance;
//# sourceMappingURL=event.js.map