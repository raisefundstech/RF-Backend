"use strict"
import { reqInfo } from '../../helpers/winston_logger'
import { roomModel } from '../../database'
import { apiResponse, message_status, } from '../../common'
import { Request, Response } from 'express'
import { responseMessage } from '../../helpers/response'

const ObjectId = require('mongoose').Types.ObjectId

export const add_room = async (req: Request, res: Response) => {
    reqInfo(req)
    let user: any = req.header('user'), body = req.body
    try {
        body.volunteerIds = [ObjectId(body?.volunteerIds[0]), ObjectId(user?._id)]
        let roomAlreadyExist = await roomModel.findOne({ isActive: true, volunteerIds: { $size: 2, $all: body.volunteerIds } })
        if (roomAlreadyExist)
            return res.status(200).json(new apiResponse(200, responseMessage?.addDataSuccess('room'), roomAlreadyExist))
        body.volunteerIds = [ObjectId(body?.volunteerIds[0])]
        body.volunteerIds.push(ObjectId(user?._id))
        body.isActive = true
        body.createdBy = ObjectId(user?._id)
        let response = await roomModel.findOneAndUpdate(body, body, { upsert: true, new: true })
        return res.status(200).json(new apiResponse(200, responseMessage?.addDataSuccess('room'), response))
    } catch (error) {
        console.log(error);
        return res.status(500).json(new apiResponse(500, responseMessage?.internalServerError, {}))
    }
}

export const get_room_v1 = async (req: Request, res: Response) => {
    reqInfo(req)
    let user: any = req.header('user'), body = req.body
    try {

        let response = await roomModel.aggregate([
            { $match: { volunteerIds: { $in: [ObjectId(user?._id)] }, isActive: true, eventId: ObjectId(req.params.id) } },
            { $sort: { updatedAt: - 1 } },
            {
                $lookup: {
                    from: "users",
                    let: { volunteerIds: "$volunteerIds" },
                    pipeline: [
                        {
                            $match: {
                                $expr: {
                                    $and: [
                                        { $in: ["$_id", "$$volunteerIds"] },
                                        { $ne: ["$_id", ObjectId(user?._id)] },
                                        { $eq: ["$isActive", true] },
                                    ]
                                }
                            }
                        },
                        {
                            $project: {
                                firstName: 1, lastName: 1, image: 1, mobileNumber: 1
                            }
                        }
                    ],
                    as: "volunteer"
                }
            },
            {
                $project: {
                    roomName: 1,
                    volunteer: 1
                }
            },

        ]);

        return res.status(200).json(new apiResponse(200, responseMessage?.getDataSuccess('room'), response))
    } catch (error) {
        console.log(error);

        return res.status(500).json(new apiResponse(500, responseMessage?.internalServerError, {}))
    }
}

export const get_room = async (req: Request, res: Response) => {
    reqInfo(req)
    let user: any = req.header('user'), body = req.body
    try {

        let response = await roomModel.aggregate([
            { $match: { userIds: { $in: [ObjectId(user?._id)] }, isActive: true } },
            { $sort: { updatedAt: - 1 } },
            {
                $lookup: {
                    from: "messages",
                    let: { roomId: "$_id" },
                    pipeline: [
                        {
                            $match: {
                                $expr: {
                                    $and: [
                                        { $eq: ["$roomId", "$$roomId"] },
                                        { $eq: ["$isActive", true] }
                                    ]
                                }
                            }
                        },
                        { $limit: 1 }
                    ],
                    as: "message"
                }
            },
            {
                $unwind: {
                    path: "$message"
                }
            },
            {
                $lookup: {
                    from: "messages",
                    let: { roomId: "$_id" },
                    pipeline: [
                        {
                            $match: {
                                $expr: {
                                    $and: [
                                        { $eq: ["$roomId", "$$roomId"] },
                                        { $eq: ["$isActive", true] },
                                        { $in: ["$status", [message_status?.sent, message_status?.delivered]] },
                                    ]
                                }
                            }
                        }
                    ],
                    as: "message"
                }
            },
            {
                $group: {
                    _id: "$_id",
                    unreadCount: { $sum: { $size: "$message" } },
                    userIds: { $first: "$userIds" },
                }
            },
            {
                $lookup: {
                    from: "users",
                    let: { userIds: "$userIds" },
                    pipeline: [
                        {
                            $match: {
                                $expr: {
                                    $and: [
                                        { $in: ["$_id", "$$userIds"] },
                                        { $ne: ["$_id", ObjectId(user?._id)] },
                                        { $eq: ["$isActive", true] },
                                    ]
                                }
                            }
                        },
                        {
                            $project: {
                                firstName: 1, lastName: 1, photos: 1
                            }
                        }
                    ],
                    as: "user"
                }
            },
            {
                $unwind: {
                    path: "$user"
                }
            },
            {
                $project: {
                    user: 1,
                    unreadCount: 1
                }
            },

        ])
        return res.status(200).json(new apiResponse(200, responseMessage?.getDataSuccess('room'), response))
    } catch (error) {
        console.log(error);

        return res.status(500).json(new apiResponse(500, responseMessage?.internalServerError, {}))
    }
}
