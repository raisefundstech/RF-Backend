"use strict"
import * as Joi from 'joi'
import { apiResponse } from '../common'
import { isValidObjectId } from 'mongoose'
import { Request, Response } from 'express'
import { responseMessage } from "../helpers"

const userProfileSchema = Joi.object({
        firstName: Joi.string().trim().required().error(new Error('firstName is required!')),
        lastName: Joi.string().trim().required().error(new Error('lastName is required!')),
        gender: Joi.number().required().error(new Error('gender is a number 0 for female 1 for male 2 for other')),
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
        RBSId: Joi.number().allow(null).error(new Error('userType is number!')),
        rbsImage: Joi.string().trim().allow(null, "").error(new Error('image is string!')),
        city: Joi.string().trim().allow(null, "").error(new Error('city is string!')),
        notes: Joi.string().trim().allow(null, "").error(new Error('notes is string!')),
    })

export const userSignUp = async (req: Request, res: Response, next: any) => {
    const schema = userProfileSchema.keys({});
    schema.validateAsync(req.body).then(result => {
        if (!isValidObjectId(result.workSpaceId)) return res.status(400).json(new apiResponse(400, responseMessage.invalidId('workSpaceId'), {}));
        req.body = result;
        return next()
    }).catch(error => {
        res.status(400).json(new apiResponse(400, error.message, {}))
    })
}

export const userSignIn = async (req: Request, res: Response, next: any) => {
    const schema = Joi.object({
        mobileNumber: Joi.string().trim().required().error(new Error('mobileNumber is required!'))
    })
    schema.validateAsync(req.body).then(result => {
        req.body = result
        return next()
    }).catch(error => {
        res.status(400).json(new apiResponse(400, error.message, {}))
    })
}

export const resendOTP = async (req: Request, res: Response, next: any) => {
    const schema = Joi.object({
        mobileNumber: Joi.string().required().error(new Error('mobileNumber is required!'))
    })
    schema.validateAsync(req.body).then(result => {
        req.body = result
        return next()
    }).catch(error => {
        res.status(400).json(new apiResponse(400, error.message, {}))
    })
}

export const otpVerification = async (req: Request, res: Response, next: any) => {
    const schema = Joi.object({
        otp: Joi.number().required().error(new Error('otp is required!')),
        mobileNumber: Joi.string().required().error(new Error('mobileNumber is required!')),
        device_token: Joi.string().allow("", null).error(new Error('device_token is string!')),
    })
    schema.validateAsync(req.body).then(result => {
        req.body = result
        return next()
    }).catch(error => {
        res.status(400).json(new apiResponse(400, error.message, {}))
    })
}


export const verifyOTP = async (req: Request, res: Response, next: any) => {
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
        res.status(400).json(new apiResponse(400, error.message, {}));
      });
};
  
export const volunteerUpdate = async (req: Request, res: Response, next: any) => {
    const schema = userProfileSchema.keys({
        id: Joi.string().trim().required().error(new Error('id is required!')),
    })
    schema.validateAsync(req.body).then(result => {
        if (!isValidObjectId(result.id)) return res.status(400).json(new apiResponse(400, responseMessage.invalidId('id'), {}));
        req.body = result
        return next()
    }).catch(error => {
        res.status(400).json(new apiResponse(400, error.message, {}))
    })
}

export const by_id = async (req: Request, res: Response, next: any) => {
    if (!isValidObjectId(req.params.id)) return res.status(400).json(new apiResponse(400, responseMessage.invalidId('id'), {}));
    next()
}

export const checkWorkSpaceId = async (req: Request, res: Response, next: any) => {
    const workSpaceId = req.query.workSpaceId as string;
    if (!workSpaceId) {
        return res.status(400).json(new apiResponse(400, responseMessage.invalidId('workSpaceId'), {}));
    }
    next();
}