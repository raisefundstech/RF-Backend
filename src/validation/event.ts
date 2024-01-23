import * as Joi from 'joi';
import { apiResponse } from '../common';
import { Request, Response } from 'express';
import { isValidObjectId } from 'mongoose';
import { responseMessage } from '../helpers';

export const createEvent = async (req: Request, res: Response, next: any) => {
    const schema = Joi.object({
        name: Joi.string().trim().required().error(new Error('name is required!')),
        workSpaceId: Joi.string().trim().required().error(new Error('workSpaceId is required!')),
        stadiumId: Joi.string().trim().required().error(new Error('stadiumId is objectId!')),
        date: Joi.string().required().error(new Error('date is required!')),
        startTime: Joi.string().required().error(new Error('startTime is required!')),
        endTime: Joi.string().required().error(new Error('endTime is required!')),
        volunteerSize: Joi.number().required().error(new Error('volunteerSize is required!')),
        notes: Joi.string().allow(null, "").error(new Error('notes is string!')),
        rfCoins: Joi.number().required().error(new Error('rfCoins is number!'))
    });
    schema.validateAsync(req.body).then(result => {
        if (!isValidObjectId(result.workSpaceId)) return res.status(400).json(new apiResponse(400, 'invalid workSpaceId', {}));
        req.body = result;
        return next()
    }).catch(error => {
        res.status(400).json(new apiResponse(400, error.message, {}))
    })
}

export const updateEvent = async (req: Request, res: Response, next: any) => {
    const schema = Joi.object({
        _id: Joi.string().trim().required().error(new Error('event id is required!')),
        name: Joi.string().trim().allow(null, "").error(new Error('name is string!')),
        stadiumId: Joi.string().trim().allow(null, "").error(new Error('stadiumId is objectId!')),
        workSpaceId: Joi.string().trim().allow(null, "").error(new Error('workSpaceId is objectId!')),
        date: Joi.string().trim().allow(null, "").error(new Error('date is string!')),
        startTime: Joi.string().trim().allow(null, "").error(new Error('startTime is string!')),
        endTime: Joi.string().trim().allow(null, "").error(new Error('endTime is string!')),
        volunteerSize: Joi.number().allow(null).error(new Error('volunteerSize is number!')),
        notes: Joi.string().trim().allow(null, "").error(new Error('notes is string!')),
        rfCoins: Joi.number().allow(null,"").error(new Error('rfCoins is number!'))
    });
    schema.validateAsync(req.body).then(result => {
        if (!isValidObjectId(result._id)) return res.status(400).json(new apiResponse(400, 'invalid id', {}));
        req.body = result;
        return next()
    }).catch(error => {
        res.status(400).json(new apiResponse(400, error.message, {}))
    })
}

export const checkInOutEvent = async (req: Request, res: Response, next: any) => {
    const schema = Joi.object({
        _id: Joi.string().trim().required().error(new Error('event id is required!')),
        volunteerRequest: Joi.array().required().default([]).error(new Error('volunteerRequest is array!')),
    });
    schema.validateAsync(req.body).then(result => {
        if (!isValidObjectId(result._id)) return res.status(400).json(new apiResponse(400, 'invalid id', {}));
        req.body = result;
        return next()
    }).catch(error => {
        res.status(400).json(new apiResponse(400, error.message, {}))
    })
}

export const update_volunteer_request_status = async (req: Request, res: Response, next: any) => {
    const schema = Joi.object({
        _id: Joi.string().trim().required().error(new Error('event id is required!')),
        volunteerRequest: Joi.array().required().default([]).error(new Error('volunteerRequest is array!')),
    });
    schema.validateAsync(req.body).then(result => {
        if (!isValidObjectId(result._id)) return res.status(400).json(new apiResponse(400, 'invalid id', {}));
        req.body = result;
        return next()
    }).catch(error => {
        res.status(400).json(new apiResponse(400, error.message, {}))
    })
}

export const by_event_id = async (req: Request, res: Response, next: any) => {
    if (!isValidObjectId(req.params.id)) return res.status(400).json(new apiResponse(400, responseMessage.invalidId('eventId'), {}));
    next()
}

export const applyToEvent = async (req: Request, res: Response, next: any) => {
    const schema = Joi.object({
        _id: Joi.string().trim().required().error(new Error('event id is required!')),
        workSpaceId: Joi.string().trim().required().error(new Error('workSpaceId is required!'))
    })
    schema.validateAsync(req.body).then(result => {
        if (!isValidObjectId(result._id)) return res.status(400).json(new apiResponse(400, 'invalid id', {}));
        if (!isValidObjectId(result.workSpaceId)) return res.status(400).json(new apiResponse(400, 'invalid workSpaceId', {}));
        req.body = result;
        return next()
    }).catch(error => {
        res.status(400).json(new apiResponse(400, error.message, {}))
    })
}
        

export const changeEventRequestStatus = async (req: Request, res: Response, next: any) => {
    const schema = Joi.array().items(
        Joi.object({
            _id: Joi.string().trim().required().error(new Error('id is required!')),
            requestId: Joi.string().trim().required().error(new Error('requestId is required!')),
            requestStatus: Joi.string().trim().required().error(new Error('requestStatus is string!'))
        })
    );
    schema.validateAsync(req.body).then(result => {
        const arrayData = Array.isArray(result) ? result : [result];

        for (const item of arrayData) {
            if (!isValidObjectId(item._id)) return res.status(400).json(new apiResponse(400, 'invalid id', {}));
            if (!isValidObjectId(item.requestId)) return res.status(400).json(new apiResponse(400, 'invalid requestId', {}));
        }
        req.body = arrayData;
        return next()
    }).catch(error => {
        res.status(400).json(new apiResponse(400, error.message, {}))
    })
}

export const addEventAttendance = async (req: Request, res: Response, next: any) => {
    const schema = Joi.array().items(
        Joi.object({
            _id: Joi.string().trim().required().error(new Error('id is required!')),
            requestId: Joi.string().trim().required().error(new Error('requestId is required!')),
            attendance: Joi.boolean().required().error(new Error('attendance is boolean!'))
        })
    );
    schema.validateAsync(req.body).then(result => {

        const arrayData = Array.isArray(result) ? result : [result];

        for (const item of arrayData) {
            if (!isValidObjectId(item._id)) return res.status(400).json(new apiResponse(400, 'invalid id', {}));
            if (!isValidObjectId(item.requestId)) return res.status(400).json(new apiResponse(400, 'invalid requestId', {}));
        }
        req.body = arrayData;
        return next()
    }).catch(error => {
        res.status(400).json(new apiResponse(400, error.message, {}))
    })
}