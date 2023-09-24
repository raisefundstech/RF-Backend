import async from 'async'
import { reqInfo } from '../../helpers/winston_logger'
import { apiResponse, userStatus } from '../../common'
import { Request, Response } from 'express'
import { responseMessage } from '../../helpers'
import { userModel, workSpaceModel } from '../../database'
const ObjectId = require('mongoose').Types.ObjectId

export const createWorkSpace = async (req: Request, res: Response) => {
    reqInfo(req)
    let user: any = req.header('user'), response: any, body = req.body, search = new RegExp(`^${body.name}$`, "ig");
    try {
        let isExist = await workSpaceModel.findOne({ name: { $regex: search }, isActive: true })
        if (isExist) {
            return res.status(409).json(new apiResponse(409, responseMessage?.dataAlreadyExist('work space'), {}));
        }
        body.createdBy = user?._id;
        response = await new workSpaceModel(body).save();
        if (response) return res.status(200).json(new apiResponse(200, responseMessage.addDataSuccess('work space'), response))
        else return res.status(400).json(new apiResponse(400, responseMessage.addDataError, {}))
    } catch (error) {
        return res.status(500).json(new apiResponse(500, responseMessage?.internalServerError, error));
    }
}

export const updateWorkSpace = async (req: Request, res: Response) => {
    reqInfo(req)
    let user: any = req.header('user'), response: any, body = req.body;
    try {
        body.updatedBy = user?._id;
        response = await workSpaceModel.findOneAndUpdate({ _id: ObjectId(body.id), isActive: true }, body, { new: true })
        if (response) return res.status(200).json(new apiResponse(200, responseMessage.updateDataSuccess('work space'), response))
        else return res.status(400).json(new apiResponse(400, responseMessage.updateDataError('work space'), {}))
    } catch (error) {
        return res.status(500).json(new apiResponse(500, responseMessage?.internalServerError, error));
    }
}

export const getWorkSpace = async (req: Request, res: Response) => {
    reqInfo(req)
    let user: any = req.header('user'), response: any
    try {
        response = await workSpaceModel.find({ isActive: true }, { name: 1, address: 1, latitude: 1, longitude: 1 }).sort({ createdAt: -1 });

        if (response) return res.status(200).json(new apiResponse(200, responseMessage.getDataSuccess('work space'), response))
        else return res.status(400).json(new apiResponse(400, responseMessage.getDataNotFound('work space'), {}))
    } catch (error) {
        return res.status(500).json(new apiResponse(500, responseMessage?.internalServerError, error));
    }
}

export const getWorkSpaceByManager = async (req: Request, res: Response) => {
    reqInfo(req)
    let user: any = req.header('user'), response: any
    try {
        if (user.type == 2) {
            response = await workSpaceModel.find({ isActive: true, createdBy: ObjectId(user._id) }).sort({ createdAt: -1 });
            return res.status(200).json(new apiResponse(200, responseMessage.getDataSuccess('work space'), response))
        } else {
            return res.status(400).json(new apiResponse(400, responseMessage.getDataNotFound('work space'), []))
        }
    } catch (error) {
        return res.status(500).json(new apiResponse(500, responseMessage?.internalServerError, error));
    }
}

export const getWorkSpaceById = async (req: Request, res: Response) => {
    reqInfo(req)
    let user: any = req.header('user'), response: any
    try {
        response = await workSpaceModel.findOne({ _id: ObjectId(req.params.id), isActive: true });
        if (response) return res.status(200).json(new apiResponse(200, responseMessage.getDataSuccess('work space'), response))
        else return res.status(400).json(new apiResponse(400, responseMessage.getDataNotFound('work space'), {}))
    } catch (error) {
        return res.status(500).json(new apiResponse(500, responseMessage?.internalServerError, error));
    }
}

export const deleteWorkSpace = async (req: Request, res: Response) => {
    reqInfo(req)
    let user: any = req.header('user'), response: any
    try {
        response = await workSpaceModel.findOneAndUpdate({ _id: ObjectId(req.params.id), isActive: true }, { isActive: false });
        if (response) return res.status(200).json(new apiResponse(200, responseMessage.deleteDataSuccess('work space'), {}))
        else return res.status(400).json(new apiResponse(400, responseMessage.getDataNotFound('work space'), {}))
    } catch (error) {
        return res.status(500).json(new apiResponse(500, responseMessage?.internalServerError, error));
    }
}

export const get_workSpace_pagination = async (req: Request, res: Response) => {
    reqInfo(req)
    let { search, page, limit } = req.body, workSpace_data: any, match: any = {}, workSpace_count: any
    try {
        if (search) {
            var nameArray: Array<any> = []
            search = search.split(" ")
            search.forEach(data => {
                nameArray.push({ name: { $regex: data, $options: 'si' } })
            })
            match.$or = [{ $and: nameArray }]
        }

        [workSpace_data, workSpace_count] = await async.parallel([
            (callback) => {
                workSpaceModel.aggregate([
                    { $match: { isActive: true, ...match } },
                    { $sort: { createdAt: -1 } },
                    { $skip: ((((page) as number - 1) * (limit) as number)) },
                    { $limit: (limit) as number }
                ]).then(data => { callback(null, data) }).catch(err => { console.log(err) })
            },
            (callback) => { workSpaceModel.countDocuments({ isActive: true, ...match }).then(data => { callback(null, data) }).catch(err => { console.log(err) }) },
        ])
        return res.status(200).json(new apiResponse(200, responseMessage.getDataSuccess('work space'), {
            workSpace_data: workSpace_data,
            state: {
                page: page,
                limit: limit,
                page_limit: Math.ceil(workSpace_count / (limit) as number)
            }
        }))
    } catch (error) {
        console.log(error)
        return res.status(500).json(new apiResponse(500, responseMessage?.internalServerError, {}))
    }
}

export const getVolunteerByWorkSpace = async (req: Request, res: Response) => {
    reqInfo(req)
    let user: any = req.header('user'), response: any
    try {
        response = await userModel.find({ workSpaceId: ObjectId(req.params.id), isActive: true }, { otp: 0, otpExpireTime: 0, device_token: 0, loginType: 0 }).sort({ createdAt: -1 });

        if (response) return res.status(200).json(new apiResponse(200, responseMessage.getDataSuccess('user'), response))
        else return res.status(400).json(new apiResponse(400, responseMessage.getDataNotFound('user'), {}))
    } catch (error) {
        return res.status(500).json(new apiResponse(500, responseMessage?.internalServerError, error));
    }
}