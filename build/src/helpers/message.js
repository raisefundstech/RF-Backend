"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.validOTP = exports.sendSMS = void 0;
const config_1 = __importDefault(require("config"));
const client_pinpoint_1 = require("@aws-sdk/client-pinpoint");
const aws_config = config_1.default.get('aws');
const pinpoint_config = {
    region: aws_config.region,
    credentials: {
        accessKeyId: aws_config.accessKeyId,
        secretAccessKey: aws_config.secretAccessKey
    }
};
const client = new client_pinpoint_1.PinpointClient(pinpoint_config);
function generateReferenceId() {
    // Create a new Date object to represent the current date and time
    const currentTime = new Date();
    // Use the getTime() method to get the timestamp in milliseconds
    const timestampInMilliseconds = currentTime.getTime();
    // Convert to Unix timestamp in seconds (divide by 1000)
    const timestampInSeconds = Math.floor(timestampInMilliseconds / 1000);
    // return the timestamp as string 
    return String(timestampInSeconds);
}
async function sendSMS(receiver_info) {
    return new Promise(async (resolve, reject) => {
        var referenceId = generateReferenceId();
        try {
            const input = {
                ApplicationId: "d3fb72c2dfab496ba9565cf2d1c8770a",
                SendOTPMessageRequestParameters: {
                    AllowedAttempts: Number(3),
                    BrandName: "Raise Funds",
                    Channel: "SMS",
                    CodeLength: Number(6),
                    DestinationIdentity: receiver_info.mobileNumber,
                    Language: "en-US",
                    OriginationIdentity: aws_config.originNumber,
                    ReferenceId: referenceId,
                    ValidityPeriod: Number(30),
                },
            };
            const command = new client_pinpoint_1.SendOTPMessageCommand(input);
            const response = await client.send(command);
            const customResponse = {
                ...response,
                referenceId: referenceId,
            };
            resolve(customResponse);
        }
        catch (error) {
            console.error('Error sending email:', error);
            reject(error);
        }
    });
}
exports.sendSMS = sendSMS;
async function validOTP(otp_info) {
    return new Promise(async (resolve, reject) => {
        try {
            const input = {
                ApplicationId: otp_info.ApplicationId,
                VerifyOTPMessageRequestParameters: {
                    DestinationIdentity: otp_info.mobileNumber,
                    Otp: otp_info.otp,
                    ReferenceId: otp_info.referenceId, // required
                },
            };
            const command = new client_pinpoint_1.VerifyOTPMessageCommand(input);
            const response = await client.send(command);
            resolve(response);
        }
        catch (error) {
            console.error('Error sending email:', error);
            reject(error);
        }
    });
}
exports.validOTP = validOTP;
//# sourceMappingURL=message.js.map