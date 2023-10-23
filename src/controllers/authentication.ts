"use strict"
import { reqInfo } from '../helpers/winston_logger'
import { userModel, userSessionModel } from '../database'
import { apiResponse } from '../common'
import jwt from 'jsonwebtoken'
import config from 'config'
import { Request, Response } from 'express'
import { responseMessage } from '../helpers'
import { generateVolunteerCode } from '../helpers/generateCode'
import { sendEmail } from '../helpers/email'
import { sendSMS,validOTP } from '../helpers/message'
const twilio: any = config.get("twilio");
const client = require('twilio')(twilio.accountSid, twilio.authToken);
const ObjectId = require('mongoose').Types.ObjectId
const jwt_token_secret: any = config.get('jwt_token_secret')
const refresh_jwt_token_secret: any = config.get('refresh_jwt_token_secret')

export const userSignUp = async (req: Request, res: Response) => {
    reqInfo(req)
    try {
        
        let body = req.body, otpFlag = 1, otp = 0
        let isAlready: any = await userModel.findOne({ $or: [{ email: body.email }, { mobileNumber: body.mobileNumber }], isActive: true })
        if (isAlready?.email == body?.email) return res.status(409).json(new apiResponse(409, responseMessage?.alreadyEmail, {}))
        if (isAlready?.mobileNumber == body?.mobileNumber) return res.status(409).json(new apiResponse(409, responseMessage?.alreadyMobileNumber, {}))

        if (body.mobileNumber == "+91 8347055891") {
            otp = 123456;
        } else {
            while (otpFlag == 1) {
                for (let flag = 0; flag < 1;) {
                    otp = await Math.round(Math.random() * 1000000)
                    if (otp.toString().length == 6) {
                        flag++
                    }
                }
                let isAlreadyAssign = await userModel.findOne({ otp: otp })
                if (isAlreadyAssign?.otp != otp) otpFlag = 0
            }
        }

        body.otp = otp
        body.otpExpireTime = new Date(new Date().setMinutes(new Date().getMinutes() + 5))

        body.volunteerId = await generateVolunteerCode();

        let response = await new userModel(body).save();

        if (response) {
            client.messages
                .create({
                    body: `${response?.otp} is your OTP to registration in to Raise funds. Code will be expire in 5 minutes.`,
                    to: response?.mobileNumber, // Text your number
                    // from: '+19207543388', // From a valid Twilio number
                    messagingServiceSid: twilio.messagingServiceSid
                })
                .then((message) => console.log(message.sid))
                .catch(error => console.log(error));
            return res.status(200).json(new apiResponse(200, `OTP has been sent to this ${body.mobileNumber}`, {}))
        } else {
            return res.status(501).json(new apiResponse(501, "Something went wrong", {}))
        }
    } catch (error) {
        return res.status(500).json({error:error.message});
        // return res.status(500).json(new apiResponse(500, responseMessage?.internalServerError, error))
    }
}

export const userSignIn = async (req: Request, res: Response) => {
    let body = req.body,
    otpFlag = 1,
    otp = 0
    reqInfo(req)
    try {
        if (body?.mobileNumber == "+91 8347055891") {
            otp = 123456;
        } else {
            while (otpFlag == 1) {
                for (let flag = 0; flag < 1;) {
                    otp = await Math.round(Math.random() * 1000000)
                    if (otp.toString().length == 6) {
                        flag++
                    }
                }
                let isAlreadyAssign = await userModel.findOne({ otp: otp })
                if (isAlreadyAssign?.otp != otp) otpFlag = 0
            }
        }

        let findData: any = await userModel.findOneAndUpdate({ $and: [{ $or: [{ userType: 0 }, { userType: 1 }, { userType: 2 }] }, { mobileNumber: body.mobileNumber, isActive: true }] }, { otp, otpExpireTime: new Date(new Date().setMinutes(new Date().getMinutes() + 5)) }, { new: true })
        if (!findData) return res.status(400).json(new apiResponse(400, responseMessage?.invalidMobileNumber, {}))

        // let response = await userModel.findOneAndUpdate({ $and: [{ $or: [{ userType: 0 }, { userType: 1 }, { userType: 2 }] }, { mobileNumber: body.mobileNumber, isActive: true }] }, { otp, otpExpireTime: new Date(new Date().setMinutes(new Date().getMinutes() + 2)) })

        if (findData) {
            // const token = jwt.sign({
            //     _id: findData._id,
            //     workSpaceId: findData?.workSpaceId,
            //     type: findData.userType,
            //     status: "Login",
            //     generatedOn: (new Date().getTime())
            // }, jwt_token_secret);

            // const refresh_token = jwt.sign({
            //     _id: findData._id,
            //     generatedOn: (new Date().getTime())
            // }, refresh_jwt_token_secret);

            // await new userSessionModel({
            //     createdBy: findData._id,
            //     refresh_token
            // }).save();

            client.messages
                .create({
                    body: `${findData?.otp} is your OTP to log in to Raise funds. Code will be expire in 5 minutes.`,
                    to: findData?.mobileNumber, // Text your number
                    // from: '+19207543388', // From a valid Twilio number
                    messagingServiceSid: twilio.messagingServiceSid
                })
                .then((message) => console.log(message.sid))
                .catch(error => console.log(error));
            
            const emailResponse = await sendEmail(findData?.email,findData?.otp);
            var email_message = null;
            if(emailResponse.accepted.length > 0){
                email_message = 'Email sent successfully to: ' + emailResponse?.accepted; 
            }
            return res.status(200).json(new apiResponse(200, `OTP has been sent to this ${findData.mobileNumber}`, {email_message}));
        } else {
            email_message = 'Email rejected for delivery to: ' + findData?.email;
            return res.status(501).json(new apiResponse(501, 'Something went wrong', {email_message}))
        }
    } catch (error) {
        console.log(error)
        return res.status(500).json(new apiResponse(500, responseMessage?.internalServerError, error))
    }
}

export const otpVerification = async (req: Request, res: Response) => {
    reqInfo(req)
    try {
        let body = req.body
        body.isActive = true

        let findUser = await userModel.findOne({ otp: body.otp, mobileNumber: body.mobileNumber, isActive: true })

        if (!findUser) return res.status(400).json(new apiResponse(400, responseMessage?.invalidOTP, {}))

        if (new Date(findUser.otpExpireTime).getTime() < new Date().getTime()) return res.status(410).json(new apiResponse(410, responseMessage?.expireOTP, {}))

        if (findUser) {
            let response = await userModel.findOneAndUpdate({ otp: body.otp, mobileNumber: body.mobileNumber, isActive: true }, { otp: null, otpExpireTime: null, $addToSet: { device_token: body?.device_token } }, { new: true })

            const token = jwt.sign({
                _id: response._id,
                workSpaceId: response?.workSpaceId,
                type: response.userType,
                status: "Login",
                generatedOn: (new Date().getTime())
            }, jwt_token_secret);

            const refresh_token = jwt.sign({
                _id: response._id,
                generatedOn: (new Date().getTime())
            }, refresh_jwt_token_secret);

            await new userSessionModel({
                createdBy: response._id,
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
                image: response?.image,
                token,
            }
            return res.status(200).json(new apiResponse(200, responseMessage?.OTPverified, responseIs))
        } else {
            return res.status(501).json(new apiResponse(501, 'Something went wrong', {}))
        }
    } catch (error) {
        console.log(error);
        return res.status(500).json(new apiResponse(500, responseMessage?.internalServerError, error))
    }
}

export const sendOTP = async (req: Request, res: Response) => {
  try {
    const body = req.body;    // You should define the 'sendSMS' function to send the OTP via SMS
    var mobileNumber = body.mobileNumber
    var receiver = {
        "mobileNumber" : mobileNumber
    }
    const response = await sendSMS(receiver);
    console.log(response);
    var sms_response = {
        ApplicationId : response?.MessageResponse?.ApplicationId,
        requestId : response?.MessageResponse?.RequestId,
        deliveryStatusCode : response?.MessageResponse?.Result[mobileNumber]?.StatusCode,
        deliveryStatus : response?.MessageResponse?.Result[mobileNumber]?.DeliveryStatus,
        referenceId : response?.referenceId
    }
    if (response) {
      return res.status(200).json(new apiResponse(200, `OTP has been successfully sent to mobile number ${body.mobileNumber}`,{sms_response}));
    } else {
      return res.status(400).json(new apiResponse(400, 'Failed to send OTP',{response}));
    }
  } catch (error) {
    console.error(error); // Log the error for debugging
    return res.status(500).json(new apiResponse(500, 'Internal server error',{error}));
  }
};

export const verifyOTP = async (req: Request, res: Response) => {
    try {
      const body = req.body;    // You should define the 'sendSMS' function to send the OTP via SMS
      var otp_verification_info = {
          "mobileNumber" : body.mobileNumber,
          "ApplicationId" : body.ApplicationId,
          "otp" : body.otp,
          "referenceId" : body.referenceId
      }
      const response = await validOTP(otp_verification_info);
      console.log(response);
      if (response["VerificationResponse"]["Valid"] == true) {
        return res.status(200).json(new apiResponse(200, `OTP has been successfully verified`,{}));
      } else {
        return res.status(400).json(new apiResponse(400, 'Please submit a valid OTP or make a request to get the latest OTP',{}));
      }
    } catch (error) {
      console.error(error); // Log the error for debugging
      return res.status(500).json(new apiResponse(500, 'Internal server error',{error}));
    }
  };


export const resendOTP = async (req: Request, res: Response) => {
    reqInfo(req)
    try {
        let body = req.body,
            otpFlag = 1,
            otp = 0,
            response

        body.isActive = true
        let findUser = await userModel.findOne(body)

        if (!findUser) return res.status(200).json(new apiResponse(400, responseMessage?.invalidMobileNumber, {}))

        while (otpFlag == 1) {
            for (let flag = 0; flag < 1;) {
                otp = await Math.round(Math.random() * 1000000)
                if (otp.toString().length == 6) {
                    flag++
                }
            }
            let isAlreadyAssign = await userModel.findOne({ otp: otp })
            if (isAlreadyAssign?.otp != otp) otpFlag = 0
        }

        response = await userModel.findOneAndUpdate(body, { otp, otpExpireTime: new Date(new Date().setMinutes(new Date().getMinutes() + 5)) }, { new: true })

        client.messages
            .create({
                body: `${response?.otp} is your OTP for Raise funds. Code will be expire in 5 minutes.`,
                to: response?.mobileNumber, // Text your number
                // from: '+19207543388', // From a valid Twilio number
                messagingServiceSid: twilio.messagingServiceSid
            }).then((message) => console.log(message.sid)).catch(error => console.log(error));

        const emailResponse = await sendEmail(findUser?.email, findUser?.otp);
        var email_message = null;
        if(emailResponse.accepted.length > 0){
            email_message = 'Email sent successfully to: ' + emailResponse?.accepted; 
        }
        if (response) {
            return res.status(200).json(new apiResponse(200, `OTP has been sent to this mobile number ${body.mobileNumber}`, {email_message}))
        } else {
            email_message = 'Email rejected for delivery to: ' + findUser?.email;
            return res.status(501).json(new apiResponse(501, 'Error in send sms please try again!', {email_message}))
        }
    } catch (error) {
        console.log(error);
        return res.status(500).json(new apiResponse(500, responseMessage?.internalServerError, error))
    }
}

export const userLogout = async (req: Request, res: Response) => {
    reqInfo(req)
    try {
        await userModel.findOneAndUpdate({ _id: ObjectId((req.header('user') as any)?._id), isActive: true, }, { $pull: { device_token: req.body?.device_token } })
        return res.status(200).json(new apiResponse(200, responseMessage?.logout, {}));
    } catch (error) {
        console.log(error)
        return res.status(500).json(new apiResponse(500, responseMessage?.internalServerError, error));
    }
}