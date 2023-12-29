import async from 'async'
import { reqInfo } from '../../helpers/winston_logger'
import { apiResponse, notification_types } from '../../common'
import { Request, Response } from 'express'
import { responseMessage } from '../../helpers'
import { volunteerInfoByEvent, applyOnEvent, withdrawFromEvent, updateVolunteersRequestStatus, fetchAdminsAndSuperVolunteers } from '../../helpers/eventQueries'
import { eventModel, notificationModel, roomModel, userModel } from '../../database'
import { timeDifferences } from '../../helpers/timeDifference'
import { sendNotification, fetchUserTokens, mapTokensToUser } from '../../helpers/notification'

const ObjectId = require('mongoose').Types.ObjectId

export const getEvents = async (req: Request, res: Response) => {
    reqInfo(req)
    let user: any = req.header('user'), response: any, isVolunteer: any = req.query.isVolunteer;
    try {
        response = await eventModel.aggregate([
            { $match: { isActive: true } },
            { $sort: { startTime: -1 } },
            {
                $project: {
                    workSpaceId: 1,
                    name: 1,
                    address: 1,
                    date: 1,
                    startTime: 1,
                    endTime: 1,
                    volunteerSize: 1,
                    notes: 1,
                    isActive: 1,
                    createdBy: 1,
                    volunteerRequest: {
                        $filter: {
                            input: "$volunteerRequest",
                            as: "volunteer",
                            cond: {
                                $eq: ["$$volunteer.volunteerId", ObjectId(user._id)]
                            }
                        }
                    },
                    isEventOwn: {
                        $cond: [{ $eq: ['$createdBy', ObjectId(user._id)] }, true, false]
                    },
                    createdAt: 1,
                    updatedAt: 1,
                }
            }
        ]);
        // console.timeEnd('mongoconntime');
        if (response) return res.status(200).json(new apiResponse(200, responseMessage.getDataSuccess('events'), response))
        else return res.status(404).json(new apiResponse(404, responseMessage.getDataNotFound('events'), {}))
    } catch (error) {
        // console.log(error);
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
                        requestStatus: "PENDING",
                        attendance: true,
                        appliedAt: new Date()
                    }
                }
            });
            let userData = await userModel.find({ userType: 0, isActive: true, workSpaceId: ObjectId(response?.workSpaceId) }, { firstName: 1, lastName: 1, device_token: 1 });
            let title = `New event created`;
            const date = new Date(body.date);
            const formattedDate = date.toLocaleString('en-US', { month: 'short', day: '2-digit' });
            let message = `Hello, New event has been created for ${body.address} on ${formattedDate}. please apply on this event.`;
            const updatePromises = userData.map(async (data: any) => {
                const tokens: string[] = data?.device_token;
                const userTokenMapper = mapTokensToUser(data?._id, tokens);
                const payload = {
                    title: title,
                    message: message,
                    data: {
                        type: 1,
                        eventId: response?._id
                    }
                };
                sendNotification(tokens, userTokenMapper, payload);
            })
            // await Promise.all(updatePromises);
            // await async.parallel([(callback) => { notification_to_multiple_user(findUserData, newEventCreateData?.data, newEventCreateData?.template).then(data => { callback(null, data) }).catch(err => { console.log(err) }) }])
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
        // only admin and super volunteer can update the event
        if (body.startTime || body.endTime) {
            if (new Date(body.startTime) < new Date() || new Date(body.endTime) < new Date() || new Date(body.startTime).toString() == new Date(body.endTime).toString()) return res.status(400).json(new apiResponse(400, "Invalid start time or end time!", {}))
        }
        if (body.volunteerSize) {
            if (body.volunteerSize < 2) return res.status(400).json(new apiResponse(400, "Please add volunteer size more than 1 . ", {}))
        }
        response = await eventModel.findOneAndUpdate({ _id: ObjectId(body.id), isActive: true }, body, { new: true });
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
    let userStatus = await userModel.findOne({ _id: ObjectId(user._id) }, { userType: 1 });
    try {
        const pipeline = await volunteerInfoByEvent(req, user);
        response = await eventModel.aggregate(pipeline);
        // If the userStatus represent the user is a volunteer delete the volunteerRequest from the response
        if(userStatus?.userType === 0){
            delete response[0]?.volunteerRequest;
        }
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

// task: minimize the function code for apply witddraw and updateVolunteers to reduce code duplication
// requires workspaceId for this 
export const apply = async (req: Request, res: Response) => {
    reqInfo(req)
    let user: any = req.header('user'), response: any, body = req.body, match: any = {}, findUser: any
    try {
        const result = await applyOnEvent(req,user?._id);
        if(result?.error){
            throw new Error(result.error);
        }
        response = await fetchAdminsAndSuperVolunteers(body?.workSpaceId)
        if(response?.error){
            throw new Error(result.error);
        }
        const updatePromises = response.map(async (data: any) => {
            const tokens: string[] = data?.device_token;
            const userTokenMapper = mapTokensToUser(data?._id, tokens);

            const findUser = await userModel.findOne({ _id: ObjectId(user?._id)});
            const date = new Date(body.date);
            const formattedDate = date.toLocaleString('en-US', { month: 'short', day: '2-digit' });

            const payload = {
                title: `Apply on event`,
                message: `Hello, ${findUser?.firstName} ${(findUser?.lastName)} has applied to this event name ${body.name} on ${formattedDate}. please approve or declined the user participation.`,
                data: {
                    type: 1,
                    eventId: result?._id
                }
            };
            sendNotification(tokens, userTokenMapper, payload);
        });
        // Wait for all promises to complete
        // await Promise.all(updatePromises);
        return res.status(200).json(new apiResponse(200, "You have succeessfully applied for the event", {}));
    } catch (error) {
        return res.status(500).json(new apiResponse(500, responseMessage?.customMessage(error), {}));
    }
}

export const withdraw = async (req: Request, res: Response) => {
    reqInfo(req)
    let user: any = req.header('user'), response: any, body = req.body, match: any = {}, findUser: any
    try {
        const result = await withdrawFromEvent(req)
        if(result?.error){
            throw new Error(result.error);
        }
        response = await fetchAdminsAndSuperVolunteers(body?.workSpaceId)
        if(response?.error){
            throw new Error(result.error);
        }
        const updatePromises = response.map(async (data: any) => {
            const tokens: string[] = data?.device_token;
            const userTokenMapper = mapTokensToUser(data?._id, tokens);

            const findUser = await userModel.findOne({ _id: ObjectId(user?._id)});
            const date = new Date(body.date);
            const formattedDate = date.toLocaleString('en-US', { month: 'short', day: '2-digit' });

            const payload = {
                title: `Apply on event`,
                message: `Hello, ${findUser?.firstName} ${(findUser?.lastName)} has withdrawn from this event name ${body.name} on ${formattedDate}.`,
                data: {
                    type: 1,
                    eventId: result?._id
                }
            };
            sendNotification(tokens, userTokenMapper, payload);
        });
        // Wait for all promises to complete
        // await Promise.all(updatePromises);
        return res.status(200).json(new apiResponse(200, "You have successfully withdrawn from the event", {}));
    } catch (error) {
        return res.status(500).json(new apiResponse(500, responseMessage?.customMessage(error),{}));
    }
}

export const updateVolunteers = async (req: Request, res: Response) => {
    reqInfo(req);
    try {
        let user: any = req.header('user'), userTokenMapper: any = {}, payload: any = {};
        const body = req.body;

        let userAuthority = await userModel.findOne({ _id: ObjectId(user?._id) }, { userType: 1 });

        if(userAuthority?.userType === 0){
            throw new Error("You are not authorized to update event status.");
        }

        // Use Promise.all to execute updateVolunteersRequestStatus for each volunteerRequest
        const updatePromises = body.volunteerRequest.map(async (data: any) => {
            const result = await updateVolunteersRequestStatus(req, data?.volunteerId, data?.requestStatus);

            if (result?.error) {
                throw new Error(result.error);
            }

            // Fetch user tokens and send notifications concurrently
            const tokens: any[] = await fetchUserTokens(data?.volunteerId);

            if (tokens.length > 0) {

                userTokenMapper = mapTokensToUser(data?.volunteerId, tokens);
                const date = new Date(body.date);
                const formattedDate = date.toLocaleString('en-US', { month: 'short', day: '2-digit' });

                payload = {
                    title: `Event request ${result?.requestStatus}`,
                    message: `Hello, ${result?.firstName} your event request has been ${result?.requestStatus} for the ${body.address} on ${formattedDate}.`,
                    data: {
                        type: 1,
                        eventId: result?._id
                    }
                };
                sendNotification(tokens, userTokenMapper, payload);
            }
        });
        // Wait for all promises to complete
        // await Promise.all(updatePromises);
        return res.status(200).json(new apiResponse(200, "Volunteers event status has been updated successfully", {}));
    } catch (error) {
        return res.status(500).json(new apiResponse(500, responseMessage?.customMessage(error), error));
    }
};


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

            if (body[0]?.requestStatus == "APPROVED" && findEvent?.volunteerRequest[0]?.checkedIn == true && findEvent?.volunteerRequest[0]?.checkedOut == true) { 
                    match['volunteerRequest.$.attendance'] = true;
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
                    // (callback) => { notification_to_user(findUser, eventApprovedOrDeclined?.data, eventApprovedOrDeclined?.template).then(data => { callback(null, data) }).catch(err => { console.log(err) }) }
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
                        // (callback) => { notification_to_user(getUser, eventAttendanceData?.data, eventAttendanceData?.template).then(data => { callback(null, data) }).catch(err => { console.log(err) }) }
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
