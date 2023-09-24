"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendEmail = void 0;
const nodemailer_1 = __importDefault(require("nodemailer"));
const config_1 = __importDefault(require("config"));
async function sendEmail(receiver, otp) {
    return new Promise(async (resolve, reject) => {
        // Get the email configuration from the config file
        const emailConfig = config_1.default.get("nodeMail");
        // Create a transporter object using the default SMTP transport
        const transporter = nodemailer_1.default.createTransport({
            service: emailConfig.service,
            auth: {
                user: emailConfig.mail,
                pass: emailConfig.password,
            },
        });
        // Define email data
        const mailOptions = {
            from: emailConfig.mail,
            to: receiver,
            subject: 'RaiseFunds OTP',
            text: otp + ' is your OTP to log in to Raise funds. Code will expire in 5 minutes.',
        };
        try {
            // Send the email
            const info = await transporter.sendMail(mailOptions);
            console.log('Email sent:', info.response);
            resolve(info);
        }
        catch (error) {
            console.error('Error sending email:', error);
            reject(error);
        }
    });
}
exports.sendEmail = sendEmail;
//# sourceMappingURL=email.js.map