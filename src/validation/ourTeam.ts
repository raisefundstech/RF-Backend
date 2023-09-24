import * as Joi from 'joi';
import { apiResponse } from '../common';
import { Request, Response } from 'express';
import { isValidObjectId } from 'mongoose';
import { responseMessage } from '../helpers';

export const createOurTeam = async (req: Request, res: Response, next: any) => {
    const schema = Joi.object({
        name: Joi.string().trim().required().error(new Error('name is required!')),
        mobileNumber: Joi.string().trim().required().error(new Error('mobileNumber is required!')),
        email: Joi.string().trim().allow("", null).error(new Error('email is string!')),
        image: Joi.string().trim().allow("", null).error(new Error('image is string!')),
        designation: Joi.string().trim().allow("", null).error(new Error('designation is string!')),
    });
    schema.validateAsync(req.body).then(result => {
        req.body = result;
        return next()
    }).catch(error => {
        res.status(400).json(new apiResponse(400, error.message, {}))
    })
}

export const updateOurTeam = async (req: Request, res: Response, next: any) => {
    const schema = Joi.object({
        id: Joi.string().trim().required().error(new Error('id is required!')),
        name: Joi.string().trim().allow(null, "").error(new Error('name is string!')),
        email: Joi.string().trim().allow(null, "").error(new Error('email is string!')),
        mobileNumber: Joi.string().trim().allow(null, "").error(new Error('mobileNumber is string!')),
        image: Joi.string().trim().allow(null, "").error(new Error('image is string!'))
    });
    schema.validateAsync(req.body).then(result => {
        if (!isValidObjectId(result.id)) return res.status(400).json(new apiResponse(400, 'invalid id', {}));

        req.body = result;
        return next()
    }).catch(error => {
        res.status(400).json(new apiResponse(400, error.message, {}))
    })
}

export const by_id = async (req: Request, res: Response, next: any) => {
    if (!isValidObjectId(req.params.id)) return res.status(400).json(new apiResponse(400, responseMessage.invalidId('id'), {}));
    next()
}