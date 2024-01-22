import * as Joi from 'joi';
import { apiResponse } from '../common';
import { Request, Response } from 'express';
import { isValidObjectId } from 'mongoose';
import { responseMessage } from '../helpers';

export const createWorkSpace = async (req: Request, res: Response, next: any) => {
    const schema = Joi.object({
        name: Joi.string().trim().required().error(new Error('name is required!')),
        address: Joi.string().trim().required().error(new Error('address is required!')),
        timeZone: Joi.string().trim().allow(null, "").error(new Error('timeZone is string!')),
        latitude: Joi.number().allow("", null).error(new Error('latitude is number!')),
        longitude: Joi.number().allow("", null).error(new Error('longitude is number!'))
    });
    schema.validateAsync(req.body).then(result => {
        req.body = result;
        return next()
    }).catch(error => {
        res.status(400).json(new apiResponse(400, error.message, {}))
    })
}

export const updateWorkSpace = async (req: Request, res: Response, next: any) => {
    const schema = Joi.object({
        _id: Joi.string().trim().required().error(new Error('id is required!')),
        name: Joi.string().trim().allow(null, "").error(new Error('name is string!')),
        timeZone: Joi.string().trim().allow(null, "").error(new Error('timeZone is string!')),
        address: Joi.string().trim().allow(null, "").error(new Error('address is string!')),
        latitude: Joi.number().allow(null).error(new Error('latitude is number!')),
        longitude: Joi.number().allow(null).error(new Error('longitude is number!'))
    });
    schema.validateAsync(req.body).then(result => {
        if (!isValidObjectId(result._id)) return res.status(400).json(new apiResponse(400, 'invalid id', {}));
        req.body = result;
        return next()
    }).catch(error => {
        res.status(400).json(new apiResponse(400, error.message, {}))
    })
}

export const by_id = async (req: Request, res: Response, next: any) => {
    // console.log(req.params);
    if (!isValidObjectId(req.params.id)) return res.status(400).json(new apiResponse(400, responseMessage.invalidId('id'), {}));
    next()
}

export const fetch_stadium = async (req: Request, res: Response, next: any) => {
    if(!isValidObjectId(req.params.id)) return res.status(400).json(new apiResponse(400, responseMessage.invalidId('id'), {}));
    if(!isValidObjectId(req.query.stadiumId)) return res.status(400).json(new apiResponse(400, responseMessage.invalidId('stadiumId'), {}));
    next()
}

export const add_stadiums = async (req: Request, res: Response, next: any) => {
    const stadiumSchema = Joi.object({
        name: Joi.string().required(),
        address: Joi.string().required(),
        latitude: Joi.number().default(0.0),
        longitude: Joi.number().default(0.0),
        stadiumPolicy: Joi.string().default(null)
    });

    const schema = Joi.object({
        _id: Joi.string().trim().required().error(new Error('id is required!')),
        stadiums: Joi.array().items(stadiumSchema).default([]).required().error(new Error('stadiums data is required [name, address]!')),
    });

    schema.validateAsync(req.body).then(result => {
        req.body = result;
        return next()
    }).catch(error => {
        res.status(400).json(new apiResponse(400, error.message, {}))
    })
}


export const updateStadium = async (req: Request, res: Response, next: any) => {

    const schema = Joi.object({
        _id: Joi.string().trim().required().error(new Error('id is required!')),
        stadiumId: Joi.string().trim().required().error(new Error('stadiumId is required!')),
        name: Joi.string().required(),
        address: Joi.string().required(),
        latitude: Joi.number().default(0.0),
        longitude: Joi.number().default(0.0),
        stadiumPolicy: Joi.string().default("")
    });

    schema.validateAsync(req.body).then(result => {
        req.body = result;
        return next()
    }).catch(error => {
        res.status(400).json(new apiResponse(400, error.message, {}))
    })
}