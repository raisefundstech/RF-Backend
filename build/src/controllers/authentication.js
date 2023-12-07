"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.validate = exports.userLogout = exports.resendOTP = exports.verifyOTP = exports.sendOTP = exports.otpVerification = exports.userSignIn = exports.userSignUp = void 0;
const winston_logger_1 = require("../helpers/winston_logger");
const database_1 = require("../database");
const common_1 = require("../common");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const config_1 = __importDefault(require("config"));
const helpers_1 = require("../helpers");
const generateCode_1 = require("../helpers/generateCode");
const email_1 = require("../helpers/email");
const message_1 = require("../helpers/message");
const twilio = config_1.default.get("twilio");
const client = require('twilio')(twilio.accountSid, twilio.authToken);
const ObjectId = require('mongoose').Types.ObjectId;
const jwt_token_secret = config_1.default.get('jwt_token_secret');
const refresh_jwt_token_secret = config_1.default.get('refresh_jwt_token_secret');
const userSignUp = async (req, res) => {
    (0, winston_logger_1.reqInfo)(req);
    try {
        let body = req.body;
        let isAlready = await database_1.userModel.findOne({ $or: [{ email: body.email }, { mobileNumber: body.mobileNumber }], isActive: true });
        if (isAlready?.email == body?.email)
            return res.status(409).json(new common_1.apiResponse(409, helpers_1.responseMessage?.alreadyEmail, {}));
        if (isAlready?.mobileNumber == body?.mobileNumber)
            return res.status(409).json(new common_1.apiResponse(409, helpers_1.responseMessage?.alreadyMobileNumber, {}));
        body.volunteerId = await (0, generateCode_1.generateVolunteerCode)();
        let response = await new database_1.userModel(body).save();
        if (response) {
            return res.status(200).json(new common_1.apiResponse(200, helpers_1.responseMessage.signupSuccess, {}));
        }
        else {
            return res.status(501).json(new common_1.apiResponse(501, "Something went wrong", { response }));
        }
    }
    catch (error) {
        return res.status(500).json({ error: error.message });
    }
};
exports.userSignUp = userSignUp;
const userSignIn = async (req, res) => {
    let body = req.body;
    let otpFlag = 1;
    let otp = 0;
    (0, winston_logger_1.reqInfo)(req);
    try {
        // generate a otp and send it to the user via sms 
        otp = (0, generateCode_1.generateOTP)();
        const currentTimestamp = new Date();
        const otpExpireTime = new Date(currentTimestamp.getTime() + 5 * 60000); // 5 minutes in milliseconds
        let findData = await database_1.userModel.findOneAndUpdate({ $and: [{ $or: [{ userType: 0 }, { userType: 1 }, { userType: 2 }] }, { mobileNumber: body.mobileNumber, isActive: true }] }, { otp, otpExpireTime: otpExpireTime }, { new: true });
        if (!findData) {
            return res.status(400).json(new common_1.apiResponse(400, helpers_1.responseMessage?.invalidMobileNumber, {}));
        }
        const messageBody = `${findData?.otp} is your OTP to log in to Raise funds. Code will expire in 5 minutes.`;
        if (findData) {
            var sms_response = (0, message_1.sendLoginSMS)(findData?.mobileNumber, messageBody);
            console.log(sms_response);
            if (sms_response) {
                return res.status(200).json(new common_1.apiResponse(200, `OTP has been sent to this ${findData.mobileNumber}`, {}));
            }
            // Temporary commented the email functionality to send the OTP
            // const emailResponse = await sendEmail(findData?.email, findData?.otp);
            // var email_message = null;
            // if (emailResponse.accepted.length > 0) {
            //     email_message = 'Email sent successfully to: ' + emailResponse?.accepted;
            // }
            // return res.status(200).json(new apiResponse(200, `OTP has been sent to this ${findData.mobileNumber}`, { email_message }));
        }
        let error_message = 'SMS rejected for delivery to: ' + findData?.mobileNumber;
        return res.status(501).json(new common_1.apiResponse(501, 'Something went wrong', { error_message }));
    }
    catch (error) {
        console.log(error);
        return res.status(500).json(new common_1.apiResponse(500, helpers_1.responseMessage?.internalServerError, error));
    }
};
exports.userSignIn = userSignIn;
const otpVerification = async (req, res) => {
    (0, winston_logger_1.reqInfo)(req);
    try {
        let body = req.body;
        body.isActive = true;
        let findUser = await database_1.userModel.findOne({ otp: body.otp, mobileNumber: body.mobileNumber, isActive: true });
        if (!findUser)
            return res.status(400).json(new common_1.apiResponse(400, helpers_1.responseMessage?.invalidOTP, {}));
        // checks if the user has submitted the OTP with in the expiry time, expiry time is set to creation time + 5 minutes
        if (findUser.otpExpireTime < new Date()) {
            return res.status(410).json(new common_1.apiResponse(410, helpers_1.responseMessage?.expireOTP, {}));
        }
        if (findUser) {
            // Removing the functionality of logout from all devices upon login from a device
            // let LoggedIn = await userSessionModel.findOne({createdBy: ObjectId(findUser._doc._id.toString())})
            // let logout_response = null;
            // if(LoggedIn) {
            //     var delete_session = await deleteSession(findUser._doc._id);
            //     console.log(delete_session);
            //     logout_response = deleteSession != null ? responseMessage?.logoutDevices : '';
            // }
            // $addToSet: { device_token: device_token } } will be implemented into the notifications feature
            let response = await database_1.userModel.findOneAndUpdate({ otp: body.otp, mobileNumber: body.mobileNumber, isActive: true }, { otp: null, otpExpireTime: null }, { new: true });
            const token = jsonwebtoken_1.default.sign({
                _id: response._id,
                workSpaceId: response?.workSpaceId,
                type: response.userType,
                status: "Login",
                generatedOn: (new Date().getTime())
            }, jwt_token_secret);
            const refresh_token = jsonwebtoken_1.default.sign({
                _id: response._id,
                generatedOn: (new Date().getTime())
            }, refresh_jwt_token_secret);
            await new database_1.userSessionModel({
                createdBy: response._id,
                token: token,
                refresh_token
            }).save();
            let responseIs = {
                userType: response?.userType,
                loginType: response?.loginType,
                _id: response?._id,
                firstName: response?.firstName,
                lastName: response?.lastName,
                email: response?.email,
                workSpaceId: response?.workSpaceId,
                tags: response?.tags,
                token
            };
            return res.status(200).json(new common_1.apiResponse(200, helpers_1.responseMessage?.OTPverified, responseIs));
        }
        else {
            return res.status(501).json(new common_1.apiResponse(501, 'Something went wrong', {}));
        }
    }
    catch (error) {
        console.log(error);
        return res.status(500).json(new common_1.apiResponse(500, helpers_1.responseMessage?.internalServerError, error));
    }
};
exports.otpVerification = otpVerification;
const sendOTP = async (req, res) => {
    try {
        const body = req.body; // You should define the 'sendSMS' function to send the OTP via SMS
        var mobileNumber = body.mobileNumber;
        var receiver = {
            "mobileNumber": mobileNumber
        };
        const response = await (0, message_1.sendSMS)(receiver);
        console.log(response);
        var sms_response = {
            ApplicationId: response?.MessageResponse?.ApplicationId,
            requestId: response?.MessageResponse?.RequestId,
            deliveryStatusCode: response?.MessageResponse?.Result[mobileNumber]?.StatusCode,
            deliveryStatus: response?.MessageResponse?.Result[mobileNumber]?.DeliveryStatus,
            referenceId: response?.referenceId
        };
        if (response) {
            return res.status(200).json(new common_1.apiResponse(200, `OTP has been successfully sent to mobile number ${body.mobileNumber}`, { sms_response }));
        }
        else {
            return res.status(400).json(new common_1.apiResponse(400, 'Failed to send OTP', { response }));
        }
    }
    catch (error) {
        console.error(error); // Log the error for debugging
        return res.status(500).json(new common_1.apiResponse(500, 'Internal server error', { error }));
    }
};
exports.sendOTP = sendOTP;
// The verify OTP 
const verifyOTP = async (req, res) => {
    try {
        const body = req.body; // You should define the 'sendSMS' function to send the OTP via SMS
        var otp_verification_info = {
            "mobileNumber": body.mobileNumber,
            "ApplicationId": body.ApplicationId,
            "otp": body.otp,
            "referenceId": body.referenceId
        };
        const response = await (0, message_1.validOTP)(otp_verification_info);
        console.log(response);
        if (response["VerificationResponse"]["Valid"] == true) {
            return res.status(200).json(new common_1.apiResponse(200, `OTP has been successfully verified`, {}));
        }
        else {
            return res.status(400).json(new common_1.apiResponse(400, 'Please submit a valid OTP or make a request to get the latest OTP', {}));
        }
    }
    catch (error) {
        console.error(error); // Log the error for debugging
        return res.status(500).json(new common_1.apiResponse(500, 'Internal server error', { error }));
    }
};
exports.verifyOTP = verifyOTP;
const resendOTP = async (req, res) => {
    (0, winston_logger_1.reqInfo)(req);
    try {
        let body = req.body, otpFlag = 1, otp = 0, response;
        body.isActive = true;
        let findUser = await database_1.userModel.findOne(body);
        if (!findUser)
            return res.status(200).json(new common_1.apiResponse(400, helpers_1.responseMessage?.invalidMobileNumber, {}));
        while (otpFlag == 1) {
            for (let flag = 0; flag < 1;) {
                otp = await Math.round(Math.random() * 1000000);
                if (otp.toString().length == 6) {
                    flag++;
                }
            }
            let isAlreadyAssign = await database_1.userModel.findOne({ otp: otp });
            if (isAlreadyAssign?.otp != otp)
                otpFlag = 0;
        }
        response = await database_1.userModel.findOneAndUpdate(body, { otp, otpExpireTime: new Date(new Date().setMinutes(new Date().getMinutes() + 5)) }, { new: true });
        client.messages
            .create({
            body: `${response?.otp} is your OTP for Raise funds. Code will be expire in 5 minutes.`,
            to: response?.mobileNumber,
            // from: '+19207543388', // From a valid Twilio number
            messagingServiceSid: twilio.messagingServiceSid
        }).then((message) => console.log(message.sid)).catch(error => console.log(error));
        const emailResponse = await (0, email_1.sendEmail)(findUser?.email, findUser?.otp);
        var email_message = null;
        if (emailResponse.accepted.length > 0) {
            email_message = 'Email sent successfully to: ' + emailResponse?.accepted;
        }
        if (response) {
            return res.status(200).json(new common_1.apiResponse(200, `OTP has been sent to this mobile number ${body.mobileNumber}`, { email_message }));
        }
        else {
            email_message = 'Email rejected for delivery to: ' + findUser?.email;
            return res.status(501).json(new common_1.apiResponse(501, 'Error in send sms please try again!', { email_message }));
        }
    }
    catch (error) {
        console.log(error);
        return res.status(500).json(new common_1.apiResponse(500, helpers_1.responseMessage?.internalServerError, error));
    }
};
exports.resendOTP = resendOTP;
const userLogout = async (req, res) => {
    (0, winston_logger_1.reqInfo)(req);
    try {
        await database_1.userModel.findOneAndUpdate({ _id: ObjectId(req.header('user')?._id), isActive: true, }, { $pull: { device_token: req.body?.device_token } });
        return res.status(200).json(new common_1.apiResponse(200, helpers_1.responseMessage?.logout, {}));
    }
    catch (error) {
        console.log(error);
        return res.status(500).json(new common_1.apiResponse(500, helpers_1.responseMessage?.internalServerError, error));
    }
};
exports.userLogout = userLogout;
/**
 * Validates if a mobile number exists in the userModel.
 * @param req - The request object.
 * @param res - The response object.
 * @returns The response with the validation result.
 */
const validate = async (req, res) => {
    (0, winston_logger_1.reqInfo)(req);
    try {
        const response = await database_1.userModel.find({ mobileNumber: req.body.mobileNumber, isActive: true });
        if (response.length === 0) {
            return res.status(200).json(new common_1.apiResponse(200, 'Mobile Number does not exist', {}));
        }
        else {
            return res.status(403).json(new common_1.apiResponse(403, 'Mobile Number already exists', {}));
        }
    }
    catch (error) {
        return res.status(500).json(new common_1.apiResponse(500, helpers_1.responseMessage?.internalServerError, error));
    }
};
exports.validate = validate;
//# sourceMappingURL=authentication.js.map