"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CSV_file_mail = exports.forgot_password_mail = void 0;
const config_1 = __importDefault(require("config"));
const nodemailer = require('nodemailer');
const sendEmail = config_1.default.get('nodeMail');
const aws = config_1.default.get("aws");
const bucket_url = aws.bucket_url;
const option = {
    service: sendEmail.service,
    host: "smtp.gmail.com",
    port: 465,
    tls: {
        rejectUnauthorized: false
    },
    auth: {
        user: sendEmail.mail,
        pass: sendEmail.password
    }
};
const transPorter = nodemailer.createTransport(option);
const forgot_password_mail = async (user, otp) => {
    return new Promise(async (resolve, reject) => {
        try {
            const mailOptions = {
                from: sendEmail.mail,
                to: user.email,
                subject: "Forgot password",
                html: `<html lang="en-US">
                <head>
                    <meta content="text/html; charset=utf-8" http-equiv="Content-Type" />
                    <title>Forgot password</title>
                    <meta name="description" content="Forgot password.">
                    <style type="text/css">
                        a:hover {
                            text-decoration: underline !important;
                        }
                    </style>
                </head>

                <body marginheight="0" topmargin="0" marginwidth="0" style="margin: 0px; background-color: #f2f3f8;" leftmargin="0">
                    <!--100% body table-->
                    <table cellspacing="0" border="0" cellpadding="0" width="100%" bgcolor="#f2f3f8"
                        style="@import url(https://fonts.googleapis.com/css?family=Rubik:300,400,500,700%7COpen+Sans:300,400,600,700); font-family: 'Open Sans', sans-serif;">
                        <tr>
                            <td>
                                <table style="background-color: #f2f3f8; max-width:700px;  margin:0 auto;" width="100%" border="0"
                                    align="center" cellpadding="0" cellspacing="0">
                                    <tr>
                                        <td style="height:80px;">&nbsp;</td>
                                    </tr>
                                    <tr>
                                        <td style="text-align:center;">
                                            <h1
                                                style="color:#F43939; font-weight:500; margin:0;font-size:32px;font-family:'Rubik',sans-serif;">
                                                Raise Fund App</h1>
                                        </td>
                                    </tr>
                                    <tr>
                                        <td style="height:20px;">&nbsp;</td>
                                    </tr>
                                    <tr>
                                        <td>
                                            <table width="95%" border="0" align="center" cellpadding="0" cellspacing="0"
                                                style="max-width:670px;background:#fff; border-radius:3px; text-align:center;-webkit-box-shadow:0 6px 18px 0 rgba(0,0,0,.06);-moz-box-shadow:0 6px 18px 0 rgba(0,0,0,.06);box-shadow:0 6px 18px 0 rgba(0,0,0,.06);">
                                                <tr>
                                                    <td style="height:40px;">&nbsp;</td>
                                                </tr>
                                                <tr>
                                                    <td style="padding:0 35px;">
                                                        <h1
                                                            style="color:#1e1e2d; font-weight:500; margin:0;font-size:32px;font-family:'Rubik',sans-serif;">
                                                            Forgot password</h1>
                                                        <span
                                                            style="display:inline-block; vertical-align:middle; margin:29px 0 26px; border-bottom:1px solid #cecece; width:100px;"></span>
                                                        <p style="color:#455056; font-size:15px;line-height:24px; margin:0;">
                                                            Hi ${user.firstName} ${user.lastName},
                                                            <br>
                                                            Someone, hopefully you, has requested to reset the password for your
                                                            Raise Fund account.
                                                            <br>
                                                            OTP will expire in 2 minutes.
                                                            <br>
                                                            Verification code: ${otp}
                                                            <br>
                                                            <br>
                                                            The Raise Fund Team.
                                                        </p>

                                                    </td>
                                                </tr>
                                                <tr>
                                                    <td style="height:40px;">&nbsp;</td>
                                                </tr>
                                            </table>
                                        </td>
                                    <tr>
                                        <td style="height:20px;">&nbsp;</td>
                                    </tr>
                                    <tr>
                                        <td style="text-align:center;">
                                            <strong></strong></p>
                                        </td>
                                    </tr>
                                    <tr>
                                        <td style="height:80px;">&nbsp;</td>
                                    </tr>
                                </table>
                            </td>
                        </tr>
                    </table>
                    <!--/100% body table-->
                </body>

                </html>`, // html body
            };
            await transPorter.sendMail(mailOptions, function (error, response) {
                if (error) {
                    console.log(error);
                    reject(error);
                }
                else {
                    resolve(`Email has been sent to ${user.email}, kindly follow the instructions`);
                    console.log('Message sent: ' + response);
                }
            });
        }
        catch (error) {
            console.log(error);
            reject(error);
        }
    });
};
exports.forgot_password_mail = forgot_password_mail;
const CSV_file_mail = async (email, csvFileName, s3Key) => {
    return new Promise(async (resolve, reject) => {
        try {
            const mailOptions = {
                from: sendEmail.mail,
                to: email,
                subject: `attendance CSV file`,
                text: 'Please find the attached CSV file.',
                attachments: [
                    {
                        filename: csvFileName,
                        path: `${bucket_url}/${s3Key}`
                    }
                ]
            };
            await transPorter.sendMail(mailOptions, function (error, response) {
                if (error) {
                    console.log(error);
                    reject(error);
                }
                else {
                    resolve(`Email has been sent to successfully, kindly follow the instructions`);
                    console.log('Message sent: ' + response);
                }
            });
        }
        catch (error) {
            console.log(error);
            reject(error);
        }
    });
};
exports.CSV_file_mail = CSV_file_mail;
//# sourceMappingURL=mail.js.map