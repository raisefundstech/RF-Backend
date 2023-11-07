import async from 'async'
import { reqInfo } from '../../helpers/winston_logger'
import { apiResponse, notification_types, userStatus } from '../../common'
import { Request, Response } from 'express'
import { responseMessage } from '../../helpers'
import { eventModel, notificationModel, roomModel, userModel } from '../../database'
import { timeDifferences } from '../../helpers/timeDifference'
import { notification_to_multiple_user, notification_to_user } from '../../helpers/notification'

const ObjectId = require('mongoose').Types.ObjectId

export const getEvents = async (req: Request, res: Response) => {
    reqInfo(req)
    let user: any = req.header('user'), response: any, isVolunteer: any = req.query.isVolunteer;
    try {
        // response = await eventModel.find({ isActive: true })
        console.time('mongoconntime');
        // response = await eventModel.aggregate([
        //     { $match: { isActive: true } },
        //     {
        //         $lookup: {
        //             from: "users",
        //             let: { volunteerIds: "$volunteerRequest.volunteerId" },
        //             pipeline: [
        //                 {
        //                     $match: {
        //                         $expr: {
        //                             $and: [
        //                                 { $in: ["$_id", "$$volunteerIds"] }
        //                             ]
        //                         }
        //                     }
        //                 },
        //                 { $project: { firstName: 1, lastName: 1, tags: 1, workTime: 1, RBSId: 1, image: 1 } }
        //             ],
        //             as: 'volunteerData'
        //         }
        //     },
        //     { $sort: { startTime: -1 } },
        //     {
        //         $project: {
        //             workSpaceId: 1,
        //             name: 1,
        //             address: 1,
        //             latitude: 1,
        //             longitude: 1,
        //             date: 1,
        //             startTime: 1,
        //             endTime: 1,
        //             volunteerSize: 1,
        //             notes: 1,
        //             isActive: 1,
        //             isGroupCreated: 1,
        //             createdBy: 1,
        //             volunteerRequest: {
        //                 $map: {
        //                     input: "$volunteerRequest",
        //                     as: "request",
        //                     in: {
        //                         _id: "$$request._id",
        //                         volunteerId: "$$request.volunteerId",
        //                         requestStatus: "$$request.requestStatus",
        //                         attendance: "$$request.attendance",
        //                         volunteerData: {
        //                             $arrayElemAt: [
        //                                 {
        //                                     $filter: {
        //                                         input: "$volunteerData",
        //                                         cond: { $eq: ["$$this._id", "$$request.volunteerId"] }
        //                                     }
        //                                 },
        //                                 0
        //                             ]
        //                         }
        //                     }
        //                 }
        //             },
        //             isEventOwn: {
        //                 $cond: [{ $eq: ['$createdBy', ObjectId(user._id)] }, true, false]
        //             },
        //             createdAt: 1,
        //             updatedAt: 1,
        //         }
        //     }
        // ])
        response = await eventModel.aggregate([
            { $match: { isActive: true } },
            { $sort: { startTime: -1 } },
            {
                $project: {
                    workSpaceId: 1,
                    name: 1,
                    address: 1,
                    // latitude: 1,
                    // longitude: 1,
                    date: 1,
                    startTime: 1,
                    endTime: 1,
                    volunteerSize: 1,
                    notes: 1,
                    isActive: 1,
                    isGroupCreated: 1,
                    createdBy: 1,
                    isEventOwn: {
                        $cond: [{ $eq: ['$createdBy', ObjectId(user._id)] }, true, false]
                    }
                    // createdAt: 1,
                    // updatedAt: 1,
                }
            }
        ]);
        console.timeEnd('mongoconntime');
        if (response) return res.status(200).json(new apiResponse(200, responseMessage.getDataSuccess('events'), response))
        else return res.status(404).json(new apiResponse(404, responseMessage.getDataNotFound('events'), {}))
    } catch (error) {
        console.log(error);

        return res.status(500).json(new apiResponse(500, responseMessage?.internalServerError, error));
    }
}

export const createEvent = async (req: Request, res: Response) => {
    reqInfo(req)
    let user: any = req.header('user'), response: any, body = req.body, newEventCreateData: any;
    try {
        body.createdBy = user?._id;

        if (new Date(body.startTime) < new Date() || new Date(body.endTime) < new Date() || new Date(body.startTime).toString() == new Date(body.endTime).toString()) return res.status(400).json(new apiResponse(400, "Invalid start time or end time!", {}))
        if (body.volunteerSize < 2) return res.status(400).json(new apiResponse(400, "Please add volunteer size more than 1 . ", {}))
        response = await new eventModel(body).save();
        if (response) {
            await eventModel.findOneAndUpdate({
                _id: ObjectId(response._id),
                isActive: true
            }, {
                $push: {
                    volunteerRequest: {
                        volunteerId: ObjectId(user._id),
                        requestStatus: "APPROVED",
                        attendance: true,
                        appliedAt: new Date()
                    }
                }
            });

            let findUserData = await userModel.find({ userType: 0, isActive: true, workSpaceId: ObjectId(response?.workSpaceId) }, { firstName: 1, lastName: 1, device_token: 1 });

            let userArr = [];
            await findUserData.map((e) => { userArr.push(e._id) })
            let title = `New event created`;
            let message = `Hello, New Fundraising event has been created for volunteers opportunities by the raise funds. please apply on this event.`;
            newEventCreateData = await notification_types.event_request_approved({ title, message, eventId: ObjectId(response._id) })
            await async.parallel([
                (callback) => {
                    new notificationModel({
                        title: title,
                        description: newEventCreateData.template.body,
                        notificationData: newEventCreateData.data,
                        notificationType: newEventCreateData.data.type,
                        eventId: ObjectId(response?._id),
                        createdBy: ObjectId(user?._id),
                        receivedIds: userArr,
                    }).save().then(data => { callback(null, data) }).catch(err => { console.log(err) })
                }])
            await async.parallel([(callback) => { notification_to_multiple_user(findUserData, newEventCreateData?.data, newEventCreateData?.template).then(data => { callback(null, data) }).catch(err => { console.log(err) }) }])
            return res.status(200).json(new apiResponse(200, responseMessage.addDataSuccess('event'), response))
        }
        else return res.status(400).json(new apiResponse(400, responseMessage.addDataError, {}))
    } catch (error) {
        return res.status(500).json(new apiResponse(500, responseMessage?.internalServerError, error));
    }
}

export const updateEvent = async (req: Request, res: Response) => {
    reqInfo(req)
    let user: any = req.header('user'), response: any, body = req.body;
    try {
        body.updatedBy = user?._id;
        if (body.startTime || body.endTime) {
            if (new Date(body.startTime) < new Date() || new Date(body.endTime) < new Date() || new Date(body.startTime).toString() == new Date(body.endTime).toString()) return res.status(400).json(new apiResponse(400, "Invalid start time or end time!", {}))
        }
        if (body.volunteerSize) {
            if (body.volunteerSize < 2) return res.status(400).json(new apiResponse(400, "Please add volunteer size more than 1 . ", {}))
        }
        response = await eventModel.findOneAndUpdate({ _id: ObjectId(body.id), isActive: true, startTime: { $gte: new Date() } }, body, { new: true });
        if (response) {
            let updateRoomName = await roomModel.findOneAndUpdate({ eventId: ObjectId(response?._id), isActive: true }, { roomName: response?.name + " " + "group" })
            return res.status(200).json(new apiResponse(200, responseMessage.updateDataSuccess('event'), {}))
        }
        else return res.status(400).json(new apiResponse(400, responseMessage.updateDataError('event'), {}))
    } catch (error) {
        return res.status(500).json(new apiResponse(500, responseMessage?.internalServerError, error));
    }
}

export const getEventById = async (req: Request, res: Response) => {
    reqInfo(req)
    let user: any = req.header('user'), response: any
    try {
        // response = await eventModel.findOne({ _id: ObjectId(req.params.id), isActive: true });
        response = await eventModel.aggregate([
            {
                $match: {
                    _id: ObjectId(req.params.id), isActive: true
                }
            },
            {
                $project: {
                    workSpaceId: 1,
                    name: 1,
                    address: 1,
                    latitude: 1,
                    longitude: 1,
                    date: 1,
                    startTime: 1,
                    endTime: 1,
                    volunteerSize: 1,
                    notes: 1,
                    isGroupCreated: 1,
                    createdBy: 1,
                    volunteerRequest: {
                        $filter: {
                            input: '$volunteerRequest',
                            as: 'volunteerRequest',
                            cond: { $eq: ['$$volunteerRequest.volunteerId', ObjectId(user._id)] }
                        }
                    },
                    isApply: {
                        $cond: [{
                            $eq: [{
                                $filter: {
                                    input: '$volunteerRequest',
                                    as: 'volunteerRequest',
                                    cond: { $eq: ['$$volunteerRequest.volunteerId', ObjectId(user._id)] }
                                }
                            }, []]

                        }, false, true]
                    },
                    isEventOwn: {
                        $cond: [{ $eq: ['$createdBy', ObjectId(user._id)] }, true, false]
                    }
                }
            }
        ]);
        if (response) return res.status(200).json(new apiResponse(200, responseMessage.getDataSuccess('event'), response[0]))
        else return res.status(400).json(new apiResponse(400, responseMessage.getDataNotFound('event'), {}))
    } catch (error) {
        return res.status(500).json(new apiResponse(500, responseMessage?.internalServerError, error));
    }
}

export const deleteEvent = async (req: Request, res: Response) => {
    reqInfo(req)
    let user: any = req.header('user'), response: any
    try {
        response = await eventModel.findOneAndUpdate({ _id: ObjectId(req.params.id), isActive: true, startTime: { $gte: new Date() } }, { isActive: false });
        if (response) return res.status(200).json(new apiResponse(200, responseMessage.deleteDataSuccess('event'), {}))
        else return res.status(400).json(new apiResponse(400, responseMessage.getDataNotFound('event'), {}))
    } catch (error) {
        return res.status(500).json(new apiResponse(500, responseMessage?.internalServerError, error));
    }
}

export const get_event_pagination = async (req: Request, res: Response) => {
    reqInfo(req)
    let { workSpaceId, search, page, limit } = req.body, event_data: any, match: any = {}, event_count: any
    try {
        if (search) {
            var nameArray: Array<any> = []
            search = search.split(" ")
            search.forEach(data => {
                nameArray.push({ name: { $regex: data, $options: 'si' } })
            })
            match.$or = [{ $and: nameArray }]
        }

        if (workSpaceId) match.workSpaceId = ObjectId(workSpaceId);

        [event_data, event_count] = await async.parallel([
            (callback) => {
                eventModel.aggregate([
                    { $match: { isActive: true, ...match } },
                    {
                        $lookup: {
                            from: "users",
                            let: { volunteerIds: "$volunteerRequest.volunteerId" },
                            pipeline: [
                                {
                                    $match: {
                                        $expr: {
                                            $and: [
                                                { $in: ["$_id", "$$volunteerIds"] }
                                            ]
                                        }
                                    }
                                },
                                { $project: { firstName: 1, lastName: 1, tags: 1, workTime: 1, RBSId: 1, image: 1 } }
                            ],
                            as: 'volunteerData'
                        }
                    },
                    {
                        $project: {
                            workSpaceId: 1,
                            name: 1,
                            address: 1,
                            // latitude: 1,
                            // longitude: 1,
                            date: 1,
                            startTime: 1,
                            endTime: 1,
                            volunteerSize: 1,
                            notes: 1,
                            isActive: 1,
                            isGroupCreated: 1,
                            volunteerRequest: {
                                $map: {
                                    input: "$volunteerRequest",
                                    as: "request",
                                    in: {
                                        _id: "$$request._id",
                                        volunteerId: "$$request.volunteerId",
                                        requestStatus: "$$request.requestStatus",
                                        attendance: "$$request.attendance",
                                        volunteerData: {
                                            $arrayElemAt: [
                                                {
                                                    $filter: {
                                                        input: "$volunteerData",
                                                        cond: { $eq: ["$$this._id", "$$request.volunteerId"] }
                                                    }
                                                },
                                                0
                                            ]
                                        }
                                    }
                                }
                            },
                            // createdAt: 1,
                            // updatedAt: 1,
                        }
                    },
                    { $sort: { createdAt: -1 } },
                    { $skip: ((((page) as number - 1) * (limit) as number)) },
                    { $limit: (limit) as number }
                ]).then(data => { callback(null, data) }).catch(err => { console.log(err) })
            },
            (callback) => { eventModel.countDocuments({ isActive: true, ...match }).then(data => { callback(null, data) }).catch(err => { console.log(err) }) },
        ])
        return res.status(200).json(new apiResponse(200, responseMessage.getDataSuccess('event'), {
            event_data: event_data,
            state: {
                page: page,
                limit: limit,
                page_limit: Math.ceil(event_count / (limit) as number)
            }
        }))
    } catch (error) {
        console.log(error)
        return res.status(500).json(new apiResponse(500, responseMessage?.internalServerError, {}))
    }
}

export const applyOnEvent = async (req: Request, res: Response) => {
    reqInfo(req)
    let user: any = req.header('user'), response: any, body = req.body, match: any = {}, findUser: any
    try {
        if (body.event == 0) {
            if (body.requestId) {
                response = await eventModel.findOneAndUpdate({
                    _id: ObjectId(body.id),
                    isActive: true,
                    volunteerRequest: {
                        $elemMatch: { _id: ObjectId(body.requestId) }
                    }
                }, {
                    $set: {
                        'volunteerRequest.$.requestStatus': "PENDING",
                        'volunteerRequest.$.appliedAt': new Date()
                    },
                }, { new: true });

                let findEvent = await eventModel.findOne({
                    _id: ObjectId(body.id),
                    isActive: true,
                    volunteerRequest: {
                        $elemMatch: { _id: ObjectId(body.requestId) }
                    }
                }, {
                    "volunteerRequest.$": 1
                });

                findUser = await userModel.findOne({ _id: ObjectId(findEvent?.volunteerRequest[0]?.volunteerId) });
            } else {
                response = await eventModel.findOneAndUpdate({
                    _id: ObjectId(body.id),
                    isActive: true
                }, {
                    $push: {
                        volunteerRequest: {
                            volunteerId: ObjectId(user._id),
                            appliedAt: new Date()
                        }
                    }
                }, { new: true });
                findUser = await userModel.findOne({ _id: ObjectId(user._id) });
            }

            let findDeviceToken = await userModel.findOne({ _id: ObjectId(response?.createdBy) }, { firstName: 1, lastName: 1, device_token: 1 });

            if (findDeviceToken?.device_token.length > 0) {
                let title = `Apply on event`;
                let message = `Hello, ${findUser?.firstName} ${(findUser?.lastName)} has applied to this event name ${response.name}. please approve or declined the user participation.`;
                let eventApply = await notification_types.event_request_approved({ title, message, eventId: ObjectId(body.id) });
                await async.parallel([
                    (callback) => {
                        new notificationModel({
                            title: title,
                            description: eventApply.template.body,
                            notificationData: eventApply.data,
                            notificationType: eventApply.data.type,
                            eventId: ObjectId(body?.id),
                            createdBy: ObjectId(user?._id),
                            receivedBy: ObjectId(findDeviceToken?._id),
                        }).save().then(data => { callback(null, data) }).catch(err => { console.log(err) })
                    },
                    (callback) => { notification_to_user(findDeviceToken, eventApply?.data, eventApply?.template).then(data => { callback(null, data) }).catch(err => { console.log(err) }) }
                ])
            }

            if (response) return res.status(200).json(new apiResponse(200, 'You have successfully requested in event!, Your request is in PENDING status.', {}))
            else return res.status(400).json(new apiResponse(400, "You have not requested in this event!", {}))
        }

        if (body.event == 1) {
            response = await eventModel.findOneAndUpdate({
                _id: ObjectId(body.id),
                isActive: true
            }, {
                $pull: {
                    volunteerRequest: {
                        volunteerId: ObjectId(user._id)
                    }
                }
            })

            findUser = await userModel.findOne({ _id: ObjectId(user._id) });

            let findDeviceToken = await userModel.findOne({ _id: ObjectId(response?.createdBy) }, { firstName: 1, lastName: 1, device_token: 1 });

            if (findDeviceToken?.device_token.length > 0) {
                let title = `withdraw event request`;
                let message = `Hello, ${findUser?.firstName} ${(findUser?.lastName)} withdraw from this event name ${response.name}.`;
                let eventApply = await notification_types.event_request_approved({ title, message, eventId: ObjectId(body.id) });
                await async.parallel([
                    (callback) => {
                        new notificationModel({
                            title: title,
                            description: eventApply.template.body,
                            notificationData: eventApply.data,
                            notificationType: eventApply.data.type,
                            eventId: ObjectId(body?.id),
                            createdBy: ObjectId(user?._id),
                            receivedBy: ObjectId(findDeviceToken?._id),
                        }).save().then(data => { callback(null, data) }).catch(err => { console.log(err) })
                    },
                    (callback) => { notification_to_user(findDeviceToken, eventApply?.data, eventApply?.template).then(data => { callback(null, data) }).catch(err => { console.log(err) }) }
                ])
            }
            if (response) return res.status(200).json(new apiResponse(200, 'You have successfully deleted event request!', {}))
            else return res.status(400).json(new apiResponse(400, "You have not delete request in this event!", {}))
        }
    } catch (error) {
        return res.status(500).json(new apiResponse(500, responseMessage?.internalServerError, error));
    }
}

export const get_event_pagination_for_volunteers = async (req: Request, res: Response) => {
    reqInfo(req)
    let user: any = req.header('user')
    let { workSpaceId, search, page, limit } = req.body, event_data: any, match: any = {}, event_count: any
    try {
        if (search) {
            var nameArray: Array<any> = []
            search = search.split(" ")
            search.forEach(data => {
                nameArray.push({ name: { $regex: data, $options: 'si' } })
            })
            match.$or = [{ $and: nameArray }]
        }

        [event_data, event_count] = await async.parallel([
            (callback) => {
                eventModel.aggregate([
                    {
                        $match: {
                            isActive: true, ...match, workSpaceId: ObjectId(workSpaceId)
                        }
                    },
                    { $sort: { name: 1 } },
                    { $skip: ((((page) as number - 1) * (limit) as number)) },
                    { $limit: (limit) as number },
                    {
                        $project: {
                            workSpaceId: 1,
                            name: 1,
                            address: 1,
                            latitude: 1,
                            longitude: 1,
                            date: 1,
                            startTime: 1,
                            endTime: 1,
                            volunteerSize: 1,
                            notes: 1,
                            volunteerRequest: {
                                $filter: {
                                    input: '$volunteerRequest',
                                    as: 'volunteerRequest',
                                    cond: { $eq: ['$$volunteerRequest.volunteerId', ObjectId(user._id)] }
                                }
                            }
                        }
                    }
                ]).then(data => { callback(null, data) }).catch(err => { console.log(err) })
            },
            (callback) => { eventModel.countDocuments({ isActive: true, ...match, workSpaceId: ObjectId(workSpaceId) }).then(data => { callback(null, data) }).catch(err => { console.log(err) }) },
        ])
        return res.status(200).json(new apiResponse(200, responseMessage.getDataSuccess('event'), {
            event_data: event_data,
            state: {
                page: page,
                limit: limit,
                page_limit: Math.ceil(event_count / (limit) as number)
            }
        }))
    } catch (error) {
        console.log(error)
        return res.status(500).json(new apiResponse(500, responseMessage?.internalServerError, {}))
    }
}

export const changeEventRequestStatus = async (req: Request, res: Response) => {
    reqInfo(req)
    let user: any = req.header('user'), response: any, body = req.body, getEvent, match: any = {};
    try {
        if (body[0]?.requestStatus == "APPROVED") {
            getEvent = await eventModel.findOne({ _id: ObjectId(body[0].id) })
            let responseData = getEvent?.volunteerRequest.filter(data => data.requestStatus === "APPROVED");

            if (getEvent?.volunteerSize < (responseData.length + body.length)) {
                return res.status(400).json(new apiResponse(400, `You can not approve volunteers because only ${getEvent?.volunteerSize} volunteer will be participate in this event`, {}))
            }
        }

        for (const item of body) {
            let findEvent = await eventModel.findOne({
                _id: ObjectId(item.id),
                isActive: true,
                volunteerRequest: {
                    $elemMatch: { _id: ObjectId(item.requestId) }
                }
            }, {
                "volunteerRequest.$": 1
            });

            if (body[0]?.requestStatus == "APPROVED") {
                if (new Date(findEvent?.volunteerRequest[0]?.appliedAt) > new Date(getEvent.startTime)) {
                    match['volunteerRequest.$.attendance'] = true;
                }
            }

            response = await eventModel.findOneAndUpdate({
                _id: ObjectId(item.id),
                isActive: true,
                volunteerRequest: {
                    $elemMatch: { _id: ObjectId(item.requestId) }
                }
            }, {
                $set: {
                    'volunteerRequest.$.requestStatus': item.requestStatus,
                    ...match
                },
                updatedBy: user._id
            }, { new: true })


            let findUser = await userModel.findOne({ _id: ObjectId(findEvent?.volunteerRequest[0]?.volunteerId) }, { firstName: 1, lastName: 1, device_token: 1 });

            if (findUser?.device_token.length > 0) {
                let title = `Event request ${(item.requestStatus == "APPROVED" ? "approved" : "declined")}`;
                let message = `Hello, ${findUser?.firstName} your ${response?.name} event request has been ${(item.requestStatus == "APPROVED" ? "approved" : "declined")} by the raise funds app.`;
                let eventApprovedOrDeclined = await notification_types.event_request_approved({ title, message, eventId: ObjectId(item.id) })
                await async.parallel([
                    (callback) => {
                        new notificationModel({
                            title: title,
                            description: eventApprovedOrDeclined.template.body,
                            notificationData: eventApprovedOrDeclined.data,
                            notificationType: eventApprovedOrDeclined.data.type,
                            eventId: ObjectId(item?.id),
                            createdBy: ObjectId(user?._id),
                            receivedBy: ObjectId(findUser?._id),
                        }).save().then(data => { callback(null, data) }).catch(err => { console.log(err) })
                    },
                    (callback) => { notification_to_user(findUser, eventApprovedOrDeclined?.data, eventApprovedOrDeclined?.template).then(data => { callback(null, data) }).catch(err => { console.log(err) }) }
                ])
            }
        }
        return res.status(200).json(new apiResponse(200, `Request status change Successfully!`, {}))
        // else return res.status(400).json(new apiResponse(400, "You have not update request status!", {}))
    } catch (error) {
        return res.status(500).json(new apiResponse(500, responseMessage?.internalServerError, error));
    }
}

export const deleteRequestEvent = async (req: Request, res: Response) => {
    reqInfo(req)
    let user: any = req.header('user'), response: any, body = req.body;
    try {
        response = await eventModel.findOneAndUpdate({
            _id: ObjectId(req.params.id),
            isActive: true
        }, {
            $pull: {
                volunteerRequest: {
                    volunteerId: ObjectId(user._id)
                }
            }
        })
        if (response) return res.status(200).json(new apiResponse(200, 'You have successfully deleted event request!', {}))
        else return res.status(400).json(new apiResponse(400, "Event not found!", {}))
    } catch (error) {
        return res.status(500).json(new apiResponse(500, responseMessage?.internalServerError, error));
    }
}

export const getAttendanceBeforeEvents = async (req: Request, res: Response) => {
    reqInfo(req)
    let user: any = req.header('user'), response: any
    try {
        let dateIs = new Date();
        dateIs.setHours(dateIs.getHours() + 5);

        response = await eventModel.find({
            isActive: true,
            workSpaceId: ObjectId(user?.workSpaceId),
            // createdBy: ObjectId(user._id),
            $or: [{ startTime: { $lte: new Date(dateIs), $gte: new Date() } }, { startTime: { $lte: new Date() }, endTime: { $gte: new Date() } }]
        });
        // let responseArray = [];
        // for (let dataIs of response) {
        //     let responseData = dataIs?.volunteerRequest.filter(data => data.requestStatus === "APPROVED");
        //     responseArray.push({ ...dataIs, volunteerRequest: responseData })
        // }
        if (response) return res.status(200).json(new apiResponse(200, responseMessage.getDataSuccess('events attendance'), response))
        else return res.status(404).json(new apiResponse(404, responseMessage.getDataNotFound('events'), {}))
    } catch (error) {
        return res.status(500).json(new apiResponse(500, responseMessage?.internalServerError, error));
    }
}

export const getVolunteerByEventAttendance = async (req: Request, res: Response) => {
    reqInfo(req)
    let user: any = req.header('user'), response: any, body = req.body, match = []
    try {

        response = await eventModel.aggregate([
            { $match: { _id: ObjectId(req.params.id), isActive: true } },
            {
                $lookup: {
                    from: "users",
                    let: { volunteerIds: "$volunteerRequest.volunteerId" },
                    pipeline: [
                        {
                            $match: {
                                $expr: {
                                    $and: [
                                        { $in: ["$_id", "$$volunteerIds"] }
                                    ]
                                }
                            }
                        },
                        { $project: { firstName: 1, lastName: 1, tags: 1, workTime: 1, RBSId: 1, image: 1 } }
                    ],
                    as: 'volunteerData'
                }
            },
            {
                $project: {
                    volunteerRequest: {
                        $map: {
                            input: "$volunteerRequest",
                            as: "request",
                            in: {
                                _id: "$$request._id",
                                volunteerId: "$$request.volunteerId",
                                requestStatus: "$$request.requestStatus",
                                attendance: "$$request.attendance",
                                volunteerData: {
                                    $arrayElemAt: [
                                        {
                                            $filter: {
                                                input: "$volunteerData",
                                                cond: { $eq: ["$$this._id", "$$request.volunteerId"] }
                                            }
                                        },
                                        0
                                    ]
                                }
                            }
                        }
                    },
                }
            }
        ]);

        let responseData = response[0]?.volunteerRequest.filter(data => data.requestStatus === "APPROVED")

        if (responseData.length > 0) {
            responseData.sort(function (a, b) {
                const firstNameA = a.volunteerData.firstName.toUpperCase();
                const firstNameB = b.volunteerData.firstName.toUpperCase();

                if (firstNameA < firstNameB) {
                    return -1;
                }
                if (firstNameA > firstNameB) {
                    return 1;
                }
                return 0;
            });
        }
        if (response) return res.status(200).json(new apiResponse(200, responseMessage.getDataSuccess('events'), responseData))
        else return res.status(404).json(new apiResponse(404, responseMessage.getDataNotFound('events'), {}))
    } catch (error) {
        console.log(error);

        return res.status(500).json(new apiResponse(500, responseMessage?.internalServerError, error));
    }
}

export const addEventAttendance = async (req: Request, res: Response) => {
    reqInfo(req)
    let user: any = req.header('user'), response: any, body = req.body;
    try {
        for (const item of body) {
            response = await eventModel.findOneAndUpdate({
                _id: ObjectId(item.id),
                isActive: true,
                volunteerRequest: {
                    $elemMatch: { _id: ObjectId(item.requestId) }
                }
            }, {
                $set: {
                    'volunteerRequest.$.attendance': item.attendance
                },
                updatedBy: user._id
            }, { new: true });
            if (response) {
                let findEvent = await eventModel.findOne({
                    _id: ObjectId(item.id),
                    isActive: true,
                    volunteerRequest: {
                        $elemMatch: { _id: ObjectId(item.requestId) }
                    }
                }, {
                    "volunteerRequest.$": 1
                });

                let findUser = await userModel.findOne({ _id: ObjectId(findEvent?.volunteerRequest[0]?.volunteerId) });

                if (item?.attendance == true) {
                    if (findUser?.workTime == null || findUser?.workTime == "" || findUser?.workTime == undefined) {
                        let totalTimeInEvent = await timeDifferences(response?.startTime, response?.endTime, null);
                        let updateWorkTime = await userModel.findOneAndUpdate({ _id: ObjectId(findUser?._id) }, { workTime: totalTimeInEvent })
                    } else {
                        let totalTimeInEvent = await timeDifferences(response?.startTime, response?.endTime, findUser?.workTime);
                        let updateWorkTime = await userModel.findOneAndUpdate({ _id: ObjectId(findUser?._id) }, { workTime: totalTimeInEvent })
                    }
                }

                let getUser = await userModel.findOne({ _id: ObjectId(findEvent?.volunteerRequest[0]?.volunteerId) }, { firstName: 1, lastName: 1, device_token: 1 });

                if (getUser?.device_token.length > 0) {
                    let title = `Event attendance ${(item.attendance ? "present" : "absent")}`;
                    let message = `Hello, ${getUser?.firstName} your ${response?.name} event request attendance has been marked ${(item.attendance ? "present" : "absent")} by the raise funds app.`;
                    let eventAttendanceData = await notification_types.event_request_approved({ title, message, eventId: ObjectId(item.id) })
                    await async.parallel([
                        (callback) => {
                            new notificationModel({
                                title: title,
                                description: eventAttendanceData.template.body,
                                notificationData: eventAttendanceData.data,
                                notificationType: eventAttendanceData.data.type,
                                eventId: ObjectId(item?.id),
                                createdBy: ObjectId(user?._id),
                                receivedBy: ObjectId(getUser?._id),
                            }).save().then(data => { callback(null, data) }).catch(err => { console.log(err) })
                        },
                        (callback) => { notification_to_user(getUser, eventAttendanceData?.data, eventAttendanceData?.template).then(data => { callback(null, data) }).catch(err => { console.log(err) }) }
                    ])
                }
            }
        }
        return res.status(200).json(new apiResponse(200, `Attendance add successfully!`, {}))
    } catch (error) {
        return res.status(500).json(new apiResponse(500, responseMessage?.internalServerError, error));
    }
}

export const getAllOpenMyEventList = async (req: Request, res: Response) => {
    reqInfo(req)
    let user: any = req.header('user'), response: any, body = req.body, match: any = {};
    try {
        if (body.flag == 0) {
            if (body.workSpaceId) match.workSpaceId = ObjectId(body.workSpaceId);
            const today = new Date();
            // const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
            // const lastDayOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 2);
            if (body.date) {
                let startDateTime = new Date(body.date);
                let endDateTime = new Date(body.date);
                // startDateTime.setHours(startDateTime.getHours() + 5);
                // startDateTime.setMinutes(startDateTime.getMinutes() + 30);
                // endDateTime.setHours(endDateTime.getHours() + 5);
                // endDateTime.setMinutes(endDateTime.getMinutes() + 30);
                startDateTime.setUTCHours(0, 0, 0, 0);
                endDateTime.setUTCHours(23, 59, 59, 999);
                match.date = { $gte: new Date(startDateTime), $lte: new Date(endDateTime) }
            }
            // else {
            //     match.date = { $gt: firstDayOfMonth, $lt: lastDayOfMonth }
            // };

            response = await eventModel.aggregate([
                { $match: { isActive: true, ...match } },
                {
                    $lookup: {
                        from: "users",
                        let: { volunteerIds: "$volunteerRequest.volunteerId" },
                        pipeline: [
                            {
                                $match: {
                                    $expr: {
                                        $and: [
                                            { $in: ["$_id", "$$volunteerIds"] }
                                        ]
                                    }
                                }
                            },
                            { $project: { firstName: 1, lastName: 1, tags: 1, workTime: 1, RBSId: 1, image: 1 } }
                        ],
                        as: 'volunteerData'
                    }
                },
                {
                    $project: {
                        workSpaceId: 1,
                        name: 1,
                        address: 1,
                        latitude: 1,
                        longitude: 1,
                        date: 1,
                        startTime: 1,
                        endTime: 1,
                        volunteerSize: 1,
                        notes: 1,
                        isActive: 1,
                        createdBy: 1,
                        isGroupCreated: {
                            $cond: [{
                                $eq: [{
                                    $filter: {
                                        input: '$volunteerRequest',
                                        as: 'volunteerRequest',
                                        cond: { $and: [{ $eq: ['$$volunteerRequest.volunteerId', ObjectId(user._id)] }, { $eq: ['$$volunteerRequest.requestStatus', "APPROVED"] }, { $eq: ['$isGroupCreated', true] }] }
                                    }
                                }, []]
                            }, false, true]
                        },
                        isEventOwn: {
                            $cond: [{ $eq: ['$createdBy', ObjectId(user._id)] }, true, false]
                        },
                        createdAt: 1,
                        updatedAt: 1,
                    }
                },
                { $sort: { startTime: 1 } }
            ])
        } else if (body.flag == 1) {
            if (body.workSpaceId) match.workSpaceId = ObjectId(body.workSpaceId);
            let dateIs = new Date();
            dateIs.setHours(dateIs.getHours() + 2);
            const today = new Date();
            // const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
            // const lastDayOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 2);
            if (body.date) {
                let startDateTime = new Date(body.date);
                let endDateTime = new Date(body.date);
                // startDateTime.setHours(startDateTime.getHours() + 5);
                // startDateTime.setMinutes(startDateTime.getMinutes() + 30);
                // endDateTime.setHours(endDateTime.getHours() + 5);
                // endDateTime.setMinutes(endDateTime.getMinutes() + 30);
                startDateTime.setUTCHours(0, 0, 0, 0);
                endDateTime.setUTCHours(23, 59, 59, 999);
                match.date = { $gte: new Date(startDateTime), $lte: new Date(endDateTime) }
            } else {
                // match.$and = [{ date: { $gt: firstDayOfMonth, $lt: lastDayOfMonth } }, { $or: [{ startTime: { $lte: new Date(dateIs), $gte: new Date() } }, { startTime: { $lte: new Date() }, endTime: { $gte: new Date() } }] }]
                // match.$and = [{ date: { $gt: firstDayOfMonth, $lt: lastDayOfMonth } }, { $or: [{ startTime: { $gte: new Date() } }] }]
                // match.startTime = { $gte: new Date() }
                match.$or = [{ startTime: { $gte: new Date() } }, { startTime: { $lte: new Date() }, endTime: { $gte: new Date() } }]
            };

            response = await eventModel.aggregate([
                { $match: { isActive: true, ...match } },
                {
                    $lookup: {
                        from: "users",
                        let: { volunteerIds: "$volunteerRequest.volunteerId" },
                        pipeline: [
                            {
                                $match: {
                                    $expr: {
                                        $and: [
                                            { $in: ["$_id", "$$volunteerIds"] }
                                        ]
                                    }
                                }
                            },
                            { $project: { firstName: 1, lastName: 1, tags: 1, workTime: 1, RBSId: 1, image: 1 } }
                        ],
                        as: 'volunteerData'
                    }
                },
                {
                    $project: {
                        workSpaceId: 1,
                        name: 1,
                        address: 1,
                        latitude: 1,
                        longitude: 1,
                        date: 1,
                        startTime: 1,
                        endTime: 1,
                        volunteerSize: 1,
                        notes: 1,
                        isActive: 1,
                        createdBy: 1,
                        volunteerRequest: {
                            $map: {
                                input: "$volunteerRequest",
                                as: "request",
                                in: {
                                    _id: "$$request._id",
                                    volunteerId: "$$request.volunteerId",
                                    requestStatus: "$$request.requestStatus",
                                    attendance: "$$request.attendance",
                                    volunteerData: {
                                        $arrayElemAt: [
                                            {
                                                $filter: {
                                                    input: "$volunteerData",
                                                    cond: { $eq: ["$$this._id", "$$request.volunteerId"] }
                                                }
                                            },
                                            0
                                        ]
                                    }
                                }
                            }
                        },
                        isGroupCreated: {
                            $cond: [{
                                $eq: [{
                                    $filter: {
                                        input: '$volunteerRequest',
                                        as: 'volunteerRequest',
                                        cond: { $and: [{ $eq: ['$$volunteerRequest.volunteerId', ObjectId(user._id)] }, { $eq: ['$$volunteerRequest.requestStatus', "APPROVED"] }, { $eq: ['$isGroupCreated', true] }] }
                                    }
                                }, []]
                            }, false, true]
                        },
                        isEventOwn: {
                            $cond: [{ $eq: ['$createdBy', ObjectId(user._id)] }, true, false]
                        },
                        createdAt: 1,
                        updatedAt: 1,
                    }
                },
                { $sort: { startTime: 1 } }
            ])
        } else if (body.flag == 2) {
            if (body.workSpaceId) match.workSpaceId = ObjectId(body.workSpaceId);
            const today = new Date();
            // const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
            // const lastDayOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 2);
            if (body.date) {
                let startDateTime = new Date(body.date);
                let endDateTime = new Date(body.date);
                // startDateTime.setHours(startDateTime.getHours() + 5);
                // startDateTime.setMinutes(startDateTime.getMinutes() + 30);
                // endDateTime.setHours(endDateTime.getHours() + 5);
                // endDateTime.setMinutes(endDateTime.getMinutes() + 30);
                startDateTime.setUTCHours(0, 0, 0, 0);
                endDateTime.setUTCHours(23, 59, 59, 999);
                match.date = { $gte: new Date(startDateTime), $lte: new Date(endDateTime) }
            }
            //  else {
            //     match.$and = [{ date: { $gt: firstDayOfMonth, $lt: lastDayOfMonth } }]
            // };
            response = await eventModel.aggregate([
                {
                    $match: {
                        isActive: true, ...match,
                        volunteerRequest: {
                            $elemMatch: { volunteerId: ObjectId(user._id), requestStatus: { $eq: "APPROVED" } }
                        }
                    }
                },
                {
                    $lookup: {
                        from: "users",
                        let: { volunteerIds: "$volunteerRequest.volunteerId" },
                        pipeline: [
                            {
                                $match: {
                                    $expr: {
                                        $and: [
                                            { $in: ["$_id", "$$volunteerIds"] }
                                        ]
                                    }
                                }
                            },
                            { $project: { firstName: 1, lastName: 1, tags: 1, workTime: 1, RBSId: 1, image: 1 } }
                        ],
                        as: 'volunteerData'
                    }
                },
                {
                    $project: {
                        workSpaceId: 1,
                        name: 1,
                        address: 1,
                        latitude: 1,
                        longitude: 1,
                        date: 1,
                        startTime: 1,
                        endTime: 1,
                        volunteerSize: 1,
                        notes: 1,
                        isActive: 1,
                        createdBy: 1,
                        volunteerRequest: {
                            $filter: {
                                input: '$volunteerRequest',
                                as: 'volunteerRequest',
                                cond: { $eq: ['$$volunteerRequest.volunteerId', ObjectId(user._id)] }
                            }
                        },
                        isGroupCreated: {
                            $cond: [{
                                $eq: [{
                                    $filter: {
                                        input: '$volunteerRequest',
                                        as: 'volunteerRequest',
                                        cond: { $and: [{ $eq: ['$$volunteerRequest.volunteerId', ObjectId(user._id)] }, { $eq: ['$$volunteerRequest.requestStatus', "APPROVED"] }, { $eq: ['$isGroupCreated', true] }] }
                                    }
                                }, []]
                            }, false, true]
                        },
                        isEventOwn: {
                            $cond: [{ $eq: ['$createdBy', ObjectId(user._id)] }, true, false]
                        },
                        createdAt: 1,
                        updatedAt: 1,
                    }
                },
                { $sort: { startTime: 1 } }
            ])
        }
        if (response) return res.status(200).json(new apiResponse(200, `Successfully fetched event!`, response))
        else return res.status(400).json(new apiResponse(400, "You have not add attendance!", {}))
    } catch (error) {
        return res.status(500).json(new apiResponse(500, responseMessage?.internalServerError, error));
    }
}

export const getVolunteerByEvent = async (req: Request, res: Response) => {
    reqInfo(req)
    let user: any = req.header('user'), response: any, body = req.body, match = []
    try {

        if (body.type == "RBSId") {
            match = [{ $and: [{ $ne: ["$RBSId", null] }, { $ne: ["$RBSId", ""] }, { $ne: ["$RBSId", "null"] }] }]
        }
        if (body.tags) {
            match = [{ $eq: ["$tags", body.tags] },]
        }

        response = await eventModel.aggregate([
            { $match: { _id: ObjectId(body.eventId), isActive: true } },
            {
                $lookup: {
                    from: "users",
                    let: { volunteerIds: "$volunteerRequest.volunteerId" },
                    pipeline: [
                        {
                            $match: {
                                $expr: {
                                    $and: [
                                        { $in: ["$_id", "$$volunteerIds"] },
                                        ...match
                                    ]
                                }
                            }
                        },
                        { $project: { firstName: 1, lastName: 1, tags: 1, workTime: 1, RBSId: 1, image: 1 } }
                    ],
                    as: 'volunteerData'
                }
            },
            {
                $project: {
                    volunteerRequest: {
                        $map: {
                            input: "$volunteerRequest",
                            as: "request",
                            in: {
                                _id: "$$request._id",
                                volunteerId: "$$request.volunteerId",
                                requestStatus: "$$request.requestStatus",
                                attendance: "$$request.attendance",
                                volunteerData: {
                                    $arrayElemAt: [
                                        {
                                            $filter: {
                                                input: "$volunteerData",
                                                cond: { $eq: ["$$this._id", "$$request.volunteerId"] }
                                            }
                                        },
                                        0
                                    ]
                                }
                            }
                        }
                    },
                }
            }
        ]);

        let responseData = response[0]?.volunteerRequest.filter(data => data.volunteerData);

        if (body.workTime == true) {
            if (responseData.length > 0) {
                responseData.sort(function (a, b) {
                    var timeA = new Date("1970-01-01T" + a.volunteerData.workTime + "Z");
                    var timeB = new Date("1970-01-01T" + b.volunteerData.workTime + "Z");

                    if (timeA < timeB) {
                        return 1;
                    }

                    if (timeA > timeB) {
                        return -1;
                    }

                    return 0;
                });
            }
        }
        if (response) return res.status(200).json(new apiResponse(200, responseMessage.getDataSuccess('events'), responseData))
        else return res.status(404).json(new apiResponse(404, responseMessage.getDataNotFound('events'), {}))
    } catch (error) {
        console.log(error);

        return res.status(500).json(new apiResponse(500, responseMessage?.internalServerError, error));
    }
}

export const addVolunteerToEvent = async (req: Request, res: Response) => {
    reqInfo(req)
    let user: any = req.header('user'), response: any, body = req.body;
    try {
        response = await eventModel.findOneAndUpdate({
            _id: ObjectId(body.id),
            isActive: true
        }, {
            $push: {
                volunteerRequest: body.volunteerList
            },
            updatedBy: ObjectId(user?._id)
        });

        if (response) return res.status(200).json(new apiResponse(200, 'You have successfully added volunteers to event!', {}))
    } catch (error) {
        return res.status(500).json(new apiResponse(500, responseMessage?.internalServerError, error));
    }
}