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
exports.checkWorkSpaceId = exports.by_id = exports.volunteerUpdate = exports.verifyOTP = exports.otpVerification = exports.resendOTP = exports.userSignIn = exports.userSignUp = void 0;
const Joi = __importStar(require("joi"));
const common_1 = require("../common");
const mongoose_1 = require("mongoose");
const helpers_1 = require("../helpers");
const userSignUp = async (req, res, next) => {
    const schema = Joi.object({
        firstName: Joi.string().trim().required().error(new Error('firstName is required!')),
        lastName: Joi.string().trim().required().error(new Error('lastName is required!')),
        mobileNumber: Joi.string().trim().required().error(new Error('mobileNumber is required!')),
        email: Joi.string().trim().required().error(new Error('email is required!')),
        address: Joi.string().trim().required().error(new Error('address is required!')),
        latitude: Joi.number().allow("", null).error(new Error('latitude is number!')),
        longitude: Joi.number().allow("", null).error(new Error('longitude is number!')),
        zipCode: Joi.string().trim().required().error(new Error('zipCode is required!')),
        workSpaceId: Joi.string().trim().required().error(new Error('workSpaceId is required!')),
        image: Joi.string().trim().allow(null, "").error(new Error('image is string!')),
        userType: Joi.number().allow(null).error(new Error('userType is number!')),
        userStatus: Joi.number().allow(null).error(new Error('userStatus is number!')),
        universityName: Joi.string().trim().allow(null, "").error(new Error('universityName is string!')),
        major: Joi.string().trim().allow(null, "").error(new Error('major is string!')),
        yearOfEducationCompletion: Joi.string().trim().allow(null, "").error(new Error('yearOfEducationCompletion is string!')),
        YearOfCameToUSA: Joi.string().trim().allow(null, "").error(new Error('YearOfCameToUSA is string!')),
        collegeIdCard: Joi.string().trim().allow(null, "").error(new Error('collegeIdCard is string!')),
        countryOfOrigin: Joi.string().trim().allow(null, "").error(new Error('countryOfOrigin is string!')),
        isRBSAvailable: Joi.boolean().allow(null).error(new Error('isRBSAvailable is boolean!')),
        city: Joi.string().trim().allow(null, "").error(new Error('city is string!')),
    });
    schema.validateAsync(req.body).then(result => {
        if (!(0, mongoose_1.isValidObjectId)(result.workSpaceId))
            return res.status(400).json(new common_1.apiResponse(400, helpers_1.responseMessage.invalidId('workSpaceId'), {}));
        req.body = result;
        return next();
    }).catch(error => {
        res.status(400).json(new common_1.apiResponse(400, error.message, {}));
    });
};
exports.userSignUp = userSignUp;
const userSignIn = async (req, res, next) => {
    const schema = Joi.object({
        mobileNumber: Joi.string().trim().required().error(new Error('mobileNumber is required!'))
    });
    schema.validateAsync(req.body).then(result => {
        req.body = result;
        return next();
    }).catch(error => {
        res.status(400).json(new common_1.apiResponse(400, error.message, {}));
    });
};
exports.userSignIn = userSignIn;
const resendOTP = async (req, res, next) => {
    const schema = Joi.object({
        mobileNumber: Joi.string().required().error(new Error('mobileNumber is required!'))
    });
    schema.validateAsync(req.body).then(result => {
        req.body = result;
        return next();
    }).catch(error => {
        res.status(400).json(new common_1.apiResponse(400, error.message, {}));
    });
};
exports.resendOTP = resendOTP;
const otpVerification = async (req, res, next) => {
    const schema = Joi.object({
        otp: Joi.number().required().error(new Error('otp is required!')),
        mobileNumber: Joi.string().required().error(new Error('mobileNumber is required!')),
        device_token: Joi.string().allow("", null).error(new Error('device_token is string!')),
    });
    schema.validateAsync(req.body).then(result => {
        req.body = result;
        return next();
    }).catch(error => {
        res.status(400).json(new common_1.apiResponse(400, error.message, {}));
    });
};
exports.otpVerification = otpVerification;
const verifyOTP = async (req, res, next) => {
    const schema = Joi.object({
        mobileNumber: Joi.string().trim().required().error(new Error('mobileNumber is required!')),
        ApplicationId: Joi.string().trim().required().error(new Error('ApplicationId is required!')),
        otp: Joi.string().trim().required().error(new Error('otp is required!')),
        referenceId: Joi.string().trim().required().error(new Error('referenceId is required!')),
    });
    schema.validateAsync(req.body)
        .then(result => {
        req.body = result;
        return next();
    })
        .catch(error => {
        res.status(400).json(new common_1.apiResponse(400, error.message, {}));
    });
};
exports.verifyOTP = verifyOTP;
const volunteerUpdate = async (req, res, next) => {
    const schema = Joi.object({
        id: Joi.string().trim().required().error(new Error('id is required!')),
        userType: Joi.number().allow(null).error(new Error('userType is number!')),
        tags: Joi.string().allow(null, "").error(new Error('tags is string!')),
        workSpaceId: Joi.string().allow(null, "").error(new Error('workSpaceId is string!')),
    });
    schema.validateAsync(req.body).then(result => {
        if (!(0, mongoose_1.isValidObjectId)(result.id))
            return res.status(400).json(new common_1.apiResponse(400, helpers_1.responseMessage.invalidId('id'), {}));
        req.body = result;
        return next();
    }).catch(error => {
        res.status(400).json(new common_1.apiResponse(400, error.message, {}));
    });
};
exports.volunteerUpdate = volunteerUpdate;
const by_id = async (req, res, next) => {
    if (!(0, mongoose_1.isValidObjectId)(req.params.id))
        return res.status(400).json(new common_1.apiResponse(400, helpers_1.responseMessage.invalidId('id'), {}));
    next();
};
exports.by_id = by_id;
const checkWorkSpaceId = async (req, res, next) => {
    const workSpaceId = req.query.workSpaceId;
    if (!workSpaceId) {
        return res.status(400).json(new common_1.apiResponse(400, helpers_1.responseMessage.invalidId('workSpaceId'), {}));
    }
    next();
};
exports.checkWorkSpaceId = checkWorkSpaceId;
//# sourceMappingURL=user.js.map