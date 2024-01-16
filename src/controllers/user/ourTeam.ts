import { reqInfo } from '../../helpers/winston_logger'
import { apiResponse, userStatus } from '../../common'
import { Request, Response } from 'express'
import { responseMessage } from '../../helpers'
import { ourTeamModel } from '../../database'
const ObjectId = require('mongoose').Types.ObjectId

export const createOurTeam = async (req: Request, res: Response) => {
    reqInfo(req)
    let response: any, body = req.body;
    try {
        response = await new ourTeamModel(body).save();
        if (response) return res.status(200).json(new apiResponse(200, responseMessage.addDataSuccess('meet our team'), response))
        else return res.status(400).json(new apiResponse(400, responseMessage.addDataError, {}))
    } catch (error) {
        return res.status(500).json(new apiResponse(500, responseMessage?.internalServerError, error));
    }
}

export const updateOurTeam = async (req: Request, res: Response) => {
    reqInfo(req)
    let response: any, body = req.body;
    try {
        response = await ourTeamModel.findOneAndUpdate({ _id: ObjectId(body._id), isActive: true }, body, { new: true })
        if (response) return res.status(200).json(new apiResponse(200, responseMessage.updateDataSuccess('meet our team'), response))
        else return res.status(400).json(new apiResponse(400, responseMessage.updateDataError('meet our team'), {}))
    } catch (error) {
        return res.status(500).json(new apiResponse(500, responseMessage?.internalServerError, error));
    }
}

export const getOurTeam = async (req: Request, res: Response) => {
    reqInfo(req)
    let response: any
    try {
        response = await ourTeamModel.find({ isActive: true });
        if (response) return res.status(200).json(new apiResponse(200, responseMessage.getDataSuccess('meet our team'), response))
        else return res.status(400).json(new apiResponse(400, responseMessage.getDataNotFound('meet our team'), {}))
    } catch (error) {
        return res.status(500).json(new apiResponse(500, responseMessage?.internalServerError, error));
    }
}