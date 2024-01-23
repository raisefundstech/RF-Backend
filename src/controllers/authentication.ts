"use strict"
import { reqInfo, logger } from '../helpers/winston_logger'
import { userModel, userSessionModel } from '../database'
import { apiResponse } from '../common'
import jwt from 'jsonwebtoken'
import config from 'config'
import { Request, Response } from 'express'
import { responseMessage } from '../helpers'
import { generateVolunteerCode, generateOTP } from '../helpers/generateCode'
import { sendEmail } from '../helpers/email'
import { sendSMS,validOTP, sendLoginSMS } from '../helpers/message'
import { deleteUserSessions } from '../helpers/authenticationQueries'
const twilio: any = config.get("twilio");
const client = require('twilio')(twilio.accountSid, twilio.authToken);
const ObjectId = require('mongoose').Types.ObjectId
const jwt_token_secret: any = config.get('jwt_token_secret')
const refresh_jwt_token_secret: any = config.get('refresh_jwt_token_secret')

export const userSignUp = async (req: Request, res: Response) => {
    reqInfo(req)
    try {
        let body = req.body;
        let isAlready: any = await userModel.findOne({ $or: [{ email: body.email }, { mobileNumber: body.mobileNumber }], isActive: true })
        if (isAlready?.email == body?.email) return res.status(409).json(new apiResponse(409, responseMessage?.alreadyEmail, {}))
        if (isAlready?.mobileNumber == body?.mobileNumber) return res.status(409).json(new apiResponse(409, responseMessage?.alreadyMobileNumber, {}))
        
        body.volunteerId = await generateVolunteerCode();

        let checkUserExists: any = await userModel.findOne({ mobileNumber: body.mobileNumber, isActive: false })

        if (checkUserExists) {
            body.isActive = true
            body.otp = null
            body.otpExpireTime = null
            body.device_token = []
            let response = await userModel.findOneAndUpdate({ mobileNumber: body.mobileNumber }, body, { new: true })
            if (response) {
                return res.status(200).json(new apiResponse(200, responseMessage?.signupSuccess, {}))
            } else {
                return res.status(501).json(new apiResponse(501, "Something went wrong", {response}))
            }
        }

        let response = await new userModel(body).save();

        if (response) {
            return res.status(200).json(new apiResponse(200, responseMessage.signupSuccess, {}))
        } else {
            return res.status(501).json(new apiResponse(501, "Something went wrong", {response}))
        }
    } catch (error) {
        return res.status(500).json({error:error.message});
    }
}

export const userSignIn = async (req: Request, res: Response) => {
    let body = req.body;
    let otpFlag = 1;
    let otp = 0;
    reqInfo(req);
    try {
        // generate a otp and send it to the user via sms 
        otp = generateOTP();
        const currentTimestamp = new Date();
        const otpExpireTime = new Date(currentTimestamp.getTime() + 5 * 60000); // 5 minutes in milliseconds
        let findData: any = await userModel.findOneAndUpdate(
            { $and: [{ $or: [{ userType: 0 }, { userType: 1 }, { userType: 2 }] }, { mobileNumber: body.mobileNumber, isActive: true }] },
            { otp, otpExpireTime: otpExpireTime },
            { new: true }
        );
        if (!findData) {
            return res.status(400).json(new apiResponse(400, responseMessage?.invalidMobileNumber, {}));
        }

        const messageBody = `${findData?.otp} is your OTP to log in to Raise funds. Code will expire in 5 minutes.`;

        if (findData) {
            var sms_response = await sendLoginSMS(findData?.mobileNumber, messageBody);
            logger.info(sms_response.MessageResponse);
            var status = sms_response?.MessageResponse?.Result[findData?.mobileNumber]?.DeliveryStatus;
            if (sms_response.$metadata?.httpStatusCode == 200) {
                return res.status(200).json(new apiResponse(200, `OTP has been sent to this ${findData.mobileNumber}`, {status}));
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
        return res.status(501).json(new apiResponse(501, 'Something went wrong', { error_message }));
    } catch (error) {
        logger.error(error);
        return res.status(500).json(new apiResponse(500, responseMessage?.internalServerError, error));
    }
};

export const otpVerification = async (req: Request, res: Response) => {
    reqInfo(req)
    try {
        let body = req.body
        body.isActive = true

        let findUser = await userModel.findOne({ otp: body.otp, mobileNumber: body.mobileNumber, isActive: true },{_id:1,otp:1,otpExpireTime:1})

        if (!findUser) return res.status(400).json(new apiResponse(400, responseMessage?.invalidOTP, {}))

        // checks if the user has submitted the OTP with in the expiry time, expiry time is set to creation time + 5 minutes
        if (findUser.otpExpireTime < new Date()){
            return res.status(410).json(new apiResponse(410, responseMessage?.expireOTP, {}))
        }

        if (findUser) {

            // Only one device can be logged in at a time
            let LoggedIn = await userSessionModel.findOne({createdBy: findUser?._id})
            let logout_response = null;
            
            if(LoggedIn) {
                let delete_sessions: any = await deleteUserSessions(findUser?._id);
                if(delete_sessions?.error){
                    throw new Error(responseMessage?.customMessage('Error in deleting sessions'));
                }
                logout_response = delete_sessions != null ? delete_sessions : 'User have no active session';
                logger.info(logout_response);
            }

            let response = await userModel.findOneAndUpdate(
                { otp: body.otp, mobileNumber: body.mobileNumber, isActive: true },
                {
                    $set: {
                        otp: null,
                        otpExpireTime: null,
                        device_token: [],
                    },
                },
                { new: true }
            );

            if (response) {
                response.device_token.push(body.device_token);
                await response.save();
            }

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
                token: token,
                device_token: body?.device_token,
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
            }
            let verfication_logout_endpoint_response = `${responseMessage?.OTPverified} & ${logout_response}`
            return res.status(200).json(new apiResponse(200,verfication_logout_endpoint_response, responseIs))
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
    // console.log(response);
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

// The verify OTP 
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

/**
 * Validates if a mobile number exists in the userModel.
 * @param req - The request object.
 * @param res - The response object.
 * @returns The response with the validation result.
 */
export const validate = async (req: Request, res: Response) => {
    reqInfo(req);
    try {
        const response = await userModel.find({ mobileNumber: req.body.mobileNumber, isActive: true });
        if (response.length === 0) {
            return res.status(200).json(new apiResponse(200, 'Mobile Number does not exist', {}));
        } else {
            return res.status(409).json(new apiResponse(409, 'Mobile Number already exists', {}));
        }
    } catch (error) {
        return res.status(500).json(new apiResponse(500, responseMessage?.internalServerError, error));
    }
};
