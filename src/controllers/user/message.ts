"use strict"
import { reqInfo } from '../../helpers/winston_logger'
import { messageModel } from '../../database'
import { apiResponse, message_status, } from '../../common'
import { Request, Response } from 'express'
import { responseMessage } from '../../helpers/response'

const ObjectId = require('mongoose').Types.ObjectId

export const get_message = async (req: Request, res: Response) => {
    reqInfo(req)
    let user: any = req.header('user'), { roomId } = req.query
    try {

        let response = await messageModel.aggregate([
            { $match: { roomId: ObjectId(roomId), isActive: true } },
            { $sort: { createdAt: -1 } },
            {
                $lookup: {
                    from: "users",
                    let: { senderId: "$senderId" },
                    pipeline: [
                        {
                            $match: {
                                $expr: {
                                    $and: [
                                        { $eq: ["$_id", "$$senderId"] },
                                        // { $ne: ["$_id", ObjectId(user?._id)] },
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
                    as: "sender"
                }
            },
            {
                $lookup: {
                    from: "users",
                    let: { receiverIds: "$receiverIds" },
                    pipeline: [
                        {
                            $match: {
                                $expr: {
                                    $and: [
                                        { $in: ["$_id", "$$receiverIds"] },
                                        // { $ne: ["$_id", ObjectId(user?._id)] },
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
                    as: "receiversData"
                }
            },
            {
                $project: {
                    roomId: 1, message: 1, senderId: 1, receiverIds: 1, createdAt: 1, senderData: { $first: "$sender" }, receiversData: 1
                }
            }
        ])
        return res.status(200).json(new apiResponse(200, responseMessage?.getDataSuccess('message by roomId'), response))
    } catch (error) {
        return res.status(500).json(new apiResponse(500, responseMessage?.internalServerError, {}))
    }
}