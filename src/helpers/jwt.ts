import jwt from 'jsonwebtoken'
import config from 'config'
import { userModel, userSessionModel } from '../database'
import mongoose from 'mongoose'
import { apiResponse } from '../common'
import { Request, Response } from 'express'
import { responseMessage } from './response'

const ObjectId = mongoose.Types.ObjectId
const jwt_token_secret:any = config.get('jwt_token_secret')

export const userJWT = async (req: Request, res: Response, next) => {
    // console.log(req);
    let { authorization } = req.headers, result: any;
    let device_token = req.headers["device-token"];
    if (authorization && device_token) {
        try {
            let isVerifyToken:any = jwt.verify(authorization, jwt_token_secret)
            result = await userSessionModel.findOne({ createdBy: new ObjectId(isVerifyToken?._id), isActive: true, device_token: device_token })
            if (result?.isActive == true) {
                req.headers.user = isVerifyToken
                return next()
            } else {
                return res.status(401).json(new apiResponse(401, responseMessage.invalidToken, {}))
            }
        } catch (err) {
            if (err.message == "invalid signature") return res.status(401).json(new apiResponse(401, responseMessage.differentToken, {}))
            console.log(err)
            return res.status(401).json(new apiResponse(401, responseMessage.invalidToken, {}))
        }
    } else {
        return res.status(401).json(new apiResponse(401, responseMessage.tokenNotFound, {}))
    }
}

export const deleteSession = async function (userId: string) {
    try {
        const user_session = await userSessionModel.deleteMany({
            createdBy: new ObjectId(userId),
            isActive: true,
        });
        return user_session;
    } catch (error) {
        console.error('Unable to delete the user session, please try again', error);
        throw error; 
    }
};