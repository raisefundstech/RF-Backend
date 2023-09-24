"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.get_room = exports.get_room_v1 = exports.add_room = void 0;
const winston_logger_1 = require("../../helpers/winston_logger");
const database_1 = require("../../database");
const common_1 = require("../../common");
const response_1 = require("../../helpers/response");
const ObjectId = require('mongoose').Types.ObjectId;
const add_room = async (req, res) => {
    (0, winston_logger_1.reqInfo)(req);
    let user = req.header('user'), body = req.body;
    try {
        body.volunteerIds = [ObjectId(body?.volunteerIds[0]), ObjectId(user?._id)];
        let roomAlreadyExist = await database_1.roomModel.findOne({ isActive: true, volunteerIds: { $size: 2, $all: body.volunteerIds } });
        if (roomAlreadyExist)
            return res.status(200).json(new common_1.apiResponse(200, response_1.responseMessage?.addDataSuccess('room'), roomAlreadyExist));
        body.volunteerIds = [ObjectId(body?.volunteerIds[0])];
        body.volunteerIds.push(ObjectId(user?._id));
        body.isActive = true;
        body.createdBy = ObjectId(user?._id);
        let response = await database_1.roomModel.findOneAndUpdate(body, body, { upsert: true, new: true });
        return res.status(200).json(new common_1.apiResponse(200, response_1.responseMessage?.addDataSuccess('room'), response));
    }
    catch (error) {
        console.log(error);
        return res.status(500).json(new common_1.apiResponse(500, response_1.responseMessage?.internalServerError, {}));
    }
};
exports.add_room = add_room;
const get_room_v1 = async (req, res) => {
    (0, winston_logger_1.reqInfo)(req);
    let user = req.header('user'), body = req.body;
    try {
        let response = await database_1.roomModel.aggregate([
            { $match: { volunteerIds: { $in: [ObjectId(user?._id)] }, isActive: true, eventId: ObjectId(req.params.id) } },
            { $sort: { updatedAt: -1 } },
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
        return res.status(200).json(new common_1.apiResponse(200, response_1.responseMessage?.getDataSuccess('room'), response));
    }
    catch (error) {
        console.log(error);
        return res.status(500).json(new common_1.apiResponse(500, response_1.responseMessage?.internalServerError, {}));
    }
};
exports.get_room_v1 = get_room_v1;
const get_room = async (req, res) => {
    (0, winston_logger_1.reqInfo)(req);
    let user = req.header('user'), body = req.body;
    try {
        let response = await database_1.roomModel.aggregate([
            { $match: { userIds: { $in: [ObjectId(user?._id)] }, isActive: true } },
            { $sort: { updatedAt: -1 } },
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
                                        { $in: ["$status", [common_1.message_status?.sent, common_1.message_status?.delivered]] },
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
        ]);
        return res.status(200).json(new common_1.apiResponse(200, response_1.responseMessage?.getDataSuccess('room'), response));
    }
    catch (error) {
        console.log(error);
        return res.status(500).json(new common_1.apiResponse(500, response_1.responseMessage?.internalServerError, {}));
    }
};
exports.get_room = get_room;
//# sourceMappingURL=room.js.map