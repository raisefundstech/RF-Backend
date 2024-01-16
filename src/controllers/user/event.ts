import async from 'async'
import { reqInfo,logger } from '../../helpers/winston_logger'
import { apiResponse } from '../../common'
import { Request, Response } from 'express'
import { responseMessage } from '../../helpers'
import { 
    volunteerInfoByEvent, applyOnEvent, withdrawFromEvent, getEventInfo, fetchAdminsAndSuperVolunteers, updateVolunteersRequestStatus,
    updateVolunteersCheckInStatus, updateVolunteersCheckOutStatus
} from '../../helpers/eventQueries'
import { eventModel, roomModel, userModel } from '../../database'
import { getUser } from '../../helpers/userQueries'
import { pushUserEventRecord } from '../../helpers/statsQueries'
import { timeDifferences } from '../../helpers/timeDifference'
import { workSpaceModel } from '../../database/models/workSpace'
import { sendNotification, fetchUserTokens, mapTokensToUser } from '../../helpers/notification'

const ObjectId = require('mongoose').Types.ObjectId

// Fetch my events based on the user
export const getMyEvents = async (req: Request, res: Response) => {
    reqInfo(req)
    let user: any = req.header('user'), response: any
    try {
        console.log(user)
        response = await eventModel.aggregate([
          {
            $match: {
              volunteerRequest: {
                $elemMatch: { volunteerId: ObjectId(user._id) },
              },
              isActive: true,
            },
          },
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
              rfCoins: 1,
              requestStatus: {
                $let: {
                  vars: {
                    requestStatuses: {
                      $map: {
                        input: {
                          $filter: {
                            input: "$volunteerRequest",
                            as: "volunteer",
                            cond: {
                              $eq: [
                                "$$volunteer.volunteerId",
                                ObjectId(user._id),
                              ],
                            },
                          },
                        },
                        as: "volunteer",
                        in: "$$volunteer.requestStatus",
                      },
                    },
                  },
                  in: {
                    $cond: {
                      if: { $eq: [{ $size: "$$requestStatuses" }, 1] },
                      then: { $arrayElemAt: ["$$requestStatuses", 0] },
                      else: "$$requestStatuses",
                    },
                  },
                },
              },
            },
          },
          {
            $sort: {
              createdAt: -1,
            },
          },
        ]);
        if (response?.length > 0) return res.status(200).json(new apiResponse(200, responseMessage.getDataSuccess('events'), response))
        else return res.status(404).json(new apiResponse(404, responseMessage.getDataNotFound('events'), {}))
    } catch (error) {
        return res.status(500).json(new apiResponse(500, responseMessage?.internalServerError, error));
    }
}

// Fetch all the events based on the workspace provided 
export const getEvents = async (req: Request, res: Response) => {

    reqInfo(req)
    let user: any = req.header('user'), response: any

    // Allow Admins and super volunteers to view events across all workspaces and volunteers to view events in their workspace
    let userWorkSpace = await userModel.findOne({ _id: ObjectId(user._id) }, { workSpaceId: 1 });
    let workSpaceId = userWorkSpace?.workSpaceId;
    if(user.type === 1 || user.type === 2) {
        workSpaceId = req?.params?.id;
    }

    if(userWorkSpace?.workSpaceId == null) return res.status(400).json(new apiResponse(400, "Please select a valid workspace from your profile and try again.", {}))

    try {
        response = await eventModel.aggregate([
            { $match: {workSpaceId: ObjectId(workSpaceId),isActive: true } },
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
                    rfCoins: 1,
                    requestStatus: {
                        $let: {
                            vars: {
                                requestStatuses: {
                                    $map: {
                                        input: {
                                            $filter: {
                                                input: "$volunteerRequest",
                                                as: "volunteer",
                                                cond: {
                                                    $eq: ["$$volunteer.volunteerId", ObjectId(user._id)]
                                                }
                                            }
                                        },
                                        as: "volunteer",
                                        in: "$$volunteer.requestStatus"
                                    }
                                }
                            },
                            in: {
                                $cond: {
                                    if: { $eq: [{ $size: "$$requestStatuses" }, 1] },
                                    then: { $arrayElemAt: ["$$requestStatuses", 0] },
                                    else: "NEW"
                                }
                            }
                        }
                    },
                    isEventOwn: {
                        $cond: [{ $eq: ['$createdBy', ObjectId(user._id)] }, true, false]
                    }
                }
            },
            {
                $sort: {
                    createdAt: -1
                }
            }
        ]);
        // console.timeEnd('mongoconntime');
        if (response?.length > 0) return res.status(200).json(new apiResponse(200, responseMessage.getDataSuccess('events'), response))
        else return res.status(404).json(new apiResponse(404, responseMessage.getDataNotFound('events'), {}))
    } catch (error) {
        // console.log(error);
        return res.status(500).json(new apiResponse(500, responseMessage?.internalServerError, error));
    }
}

export const createEvent = async (req: Request, res: Response) => {
    reqInfo(req)
    let user: any = req.header('user'), response: any, body = req.body
    try {

        body.createdBy = user?._id;
        let userInfo = await getUser(user?._id, true);
        logger.info(userInfo?.length);

        if(userInfo[0]?.userType === 0 || userInfo[0]?.userType === 2 || userInfo[0]?.userType > 2) {
            return res.status(400).json(new apiResponse(400, "You are not authorized to create event.", {}));
        }

        if (new Date(body.startTime) < new Date() || new Date(body.endTime) < new Date() || new Date(body.startTime).toString() == new Date(body.endTime).toString()) return res.status(400).json(new apiResponse(400, "Invalid start time or end time!", {}))
        if (body.volunteerSize < 2) return res.status(400).json(new apiResponse(400, "Please add volunteer size more than 1 . ", {}))

        let validWorkSpace = await workSpaceModel.findOne({ _id: ObjectId(body?.workSpaceId), isActive: true });

        if(validWorkSpace == null) {
            return res.status(400).json(new apiResponse(400, "Invalid workspace id. Please provide valid workspace id.", {}));
        }

        response = await new eventModel(body).save();
        if (response) {
            let userData = await userModel.find({ userType: 0, isActive: true, workSpaceId: response?.workSpaceId }, { firstName: 1, lastName: 1, device_token: 1 });
            logger.info(userData?.length);
            let title = `New event created`;
            const date = new Date(body.date);
            const formattedDate = date.toLocaleString('en-US', { month: 'short', day: '2-digit' });
            let message = `Hello! We have an exciting new event coming up: ${body?.name} on ${formattedDate}. Don't miss out on this opportunity to make a difference. Apply now and be part of something meaningful. Thank you!`;
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
            await Promise.all(updatePromises);
            return res.status(200).json(new apiResponse(200, responseMessage.addDataSuccess('event'), response))
        }
        else return res.status(400).json(new apiResponse(400, responseMessage.addDataError, {}))
    } catch (error) {
        return res.status(500).json(new apiResponse(500, responseMessage?.customMessage(error), error));
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
        let userAuthority = await userModel.findOne({ _id: ObjectId(user?._id) }, { userType: 1 });
        if(userAuthority?.userType === 0 || userAuthority?.userType == 2 || userAuthority?.userType > 2){
            throw new Error("You are not authorized to update event.");
        }
        response = await eventModel.findOneAndUpdate({ _id: ObjectId(body._id), isActive: true }, body, { new: true });
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
            response[0].volunteerRequest = response[0]?.volunteerRequest.filter((data: any) => data?.volunteerId?.toString() === user?._id?.toString());
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
        let userAuthority = await getUser(user?._id, true);
        if (userAuthority?.userType != 1) {
            throw new Error("You are not authorized to delete event.");
        }
        response = await eventModel.findOneAndUpdate({ _id: ObjectId(req.params.id), isActive: true, startTime: { $gte: new Date() } }, { isActive: false });
        if (response) return res.status(200).json(new apiResponse(200, responseMessage.deleteDataSuccess('event'), {}))
        else return res.status(400).json(new apiResponse(400, responseMessage.getDataNotFound('event'), {}))
    } catch (error) {
        return res.status(500).json(new apiResponse(500, responseMessage?.customMessage(error), error));
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
        logger.error(error)
        return res.status(500).json(new apiResponse(500, responseMessage?.internalServerError, {}))
    }
}

// task: minimize the function code for apply witddraw and updateVolunteers to reduce code duplication
// requires workspaceId for this 
export const apply = async (req: Request, res: Response) => {
    reqInfo(req)
    let user: any = req.header('user'), response: any, body = req.body, match: any = {}, findUser: any
    try {
        let getUserWorkSpace = await userModel.findOne({ _id: ObjectId(user._id) }, { workSpaceId: 1 });

        if(getUserWorkSpace?.workSpaceId != body.workSpaceId){
            throw new Error("You can't apply to an event located in different workstation, please switch the workstation and try again.");
        }

        const result = await applyOnEvent(req,user?._id);
        // logger.info(result);

        if(result?.error){
            throw new Error(result.error);
        }

        response = await fetchAdminsAndSuperVolunteers(body?.workSpaceId)
        // logger.info(response);

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
                    eventId: result?._clsid
                }
            };
            sendNotification(tokens, userTokenMapper, payload);
        });
        // Wait for all promises to complete
        await Promise.all(updatePromises);
        return res.status(200).json(new apiResponse(200, "You have succeessfully applied for the event", {}));
    } catch (error) {
        return res.status(500).json(new apiResponse(500, responseMessage?.customMessage(error), {error}));
    }
}

export const withdraw = async (req: Request, res: Response) => {
    reqInfo(req)
    let user: any = req.header('user'), response: any, body = req.body
    try {
        const result = await withdrawFromEvent(req)
        if(result?.error){
            throw new Error(result.error);
        }
        let userWorkSpace = getUser(user?._id, true);
        response = await fetchAdminsAndSuperVolunteers(userWorkSpace[0]?.workSpaceId)
        if(response?.error) {
            throw new Error(result.error);
        }
        const sendNotifications = response.map(async (data: any) => {
            const tokens: string[] = data?.device_token;
            const userTokenMapper = mapTokensToUser(data?._id, tokens);

            const findUser = await userModel.findOne({ _id: ObjectId(user?._id)});
            const date = new Date(body.date);
            const formattedDate = date.toLocaleString('en-US', { month: 'short', day: '2-digit' });

            const payload = {
                title: `Apply on event`,
                message: `Hello, ${findUser?.firstName} ${(findUser?.lastName)} has withdrawn from the ${body.name} event coducted on ${formattedDate}.`,
                data: {
                    type: 1,
                    eventId: result?._id
                }
            };
            sendNotification(tokens, userTokenMapper, payload);
        });
        // Wait for all promises to complete
        await Promise.all(sendNotifications);
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

        if(userAuthority?.userType === 0 || userAuthority?.userType > 2){
            throw new Error("You are not authorized to update event status.");
        }

        var requestStatus = req.body?.volunteerRequest;

        if (requestStatus == null || requestStatus.length === 0) {
            return res.status(400).json(new apiResponse(400, "Invalid request. Please provide valid data.", {}));
        }

        var getEvent = await eventModel.findOne({ _id: ObjectId(body.id), isActive: true })
        logger.info(getEvent?._id);

        if (getEvent == null) {
            return res.status(400).json(new apiResponse(400, "Invalid event id. Please provide valid event id.", {}));
        }

        let responseData = getEvent?.volunteerRequest?.filter(data => data?.requestStatus === "APPROVED");
        if (getEvent?.volunteerSize < (responseData?.length + body?.volunteerRequest?.length)) {
            return res.status(400).json(new apiResponse(400, `The current request exceeds the limit of available volunteer slots. You can only approve volunteers within the limit of ${getEvent?.volunteerSize}.`, {}))
        }
        
        // Use Promise.all to execute updateVolunteersRequestStatus for each volunteerRequest
        const notificationResponse = body?.volunteerRequest.map(async (data: any) => {
            const result = await updateVolunteersRequestStatus(req, data?.volunteerId, data?.requestStatus, data?.userNote);
            
            if(result?.error) {
                throw new Error(result.error);
            }

            // Fetch user tokens and send notifications concurrently
            const tokens: any[] = await fetchUserTokens(data?.volunteerId);

            if (tokens?.length > 0) {
                userTokenMapper = mapTokensToUser(data?.volunteerId, tokens);
                let date = await getEventInfo(body?.id);
                const formattedDate = date?.toLocaleString('en-US', { month: 'short', day: '2-digit' });
                let userInfo = await getUser(data?.volunteerId, true); 
                payload = {
                    title: `Event request ${data?.requestStatus}`,
                    message: `Hello, ${userInfo?.[0]?.firstName} your event request has been ${body?.requestStatus} for the ${date?.name} on ${formattedDate}.`,
                    data: {
                        type: 1,
                        eventId: body.id
                    }
                };
                sendNotification(tokens, userTokenMapper, payload);
            }
            else{
                console.log("User has not allowed the notifications or unable to send notifications.");
            }
        });
        // Wait for all promises to complete
        await Promise.all(notificationResponse);
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
        logger.info(error)
        return res.status(500).json(new apiResponse(500, responseMessage?.internalServerError, {}))
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
        logger.error(error);
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
        return res.status(500).json(new apiResponse(500, responseMessage?.customMessage(error), error));
    }
}

// In the body I require eventId, volunteerId and chekin status

/**
 * Handles the check-in process for volunteers attending an event.
 * 
 * @param req - The request object containing the necessary information.
 * @param res - The response object used to send the result of the check-in process.
 * @returns A JSON response indicating the status of the check-in process.
 */
export const volunteerCheckIn = async (req: Request, res: Response) => {
    reqInfo(req)
    let user: any = req.header('user'), response: any, body = req.body;
    try {
        // Check user authority
        let userAuthority = await userModel.findOne({ _id: ObjectId(user?._id) }, { userType: 1 });
        if(userAuthority?.userType === 0 || userAuthority?.userType > 2){
            throw new Error("You are not authorized to update event status.");
        }

        // Check request status
        var requestStatus = req.body?.volunteerRequest;
        if (requestStatus == null || requestStatus.length === 0 || body?.startTime == null) {
            return res.status(400).json(new apiResponse(400, "Invalid request. Please provide valid data.", {}));
        }

        // Check check-in time, admin can mark attendance 3 hours before the event or 1 hour after the event
        const eventStartTime = new Date(body?.startTime);
        const currentTime = new Date();
        const threeHoursBeforeEvent = new Date(eventStartTime.getTime() - (3 * 60 * 60 * 1000));
        const formattedBefore = threeHoursBeforeEvent.toLocaleString('en-US', { hour: 'numeric', minute: 'numeric', hour12: true });
        const oneHourAfterEvent = new Date(eventStartTime.getTime() + (1 * 60 * 60 * 1000));
        const formattedAfter = oneHourAfterEvent.toLocaleString('en-US', { hour: 'numeric', minute: 'numeric', hour12: true });

        if (currentTime < threeHoursBeforeEvent || currentTime > oneHourAfterEvent) {
            var messgae = `Invalid check-in time. Check-in starts from ${formattedBefore} and ends at ${formattedAfter}`
            return res.status(400).json(new apiResponse(400, messgae, {}));
        }
        // Update check-in status for each volunteer
        const volunteersCheckInStatus = body?.volunteerRequest.map(async (data: any) => {
            response = await updateVolunteersCheckInStatus(body?.id, data?.volunteerId);
            if (response?.error) {
                throw new Error(response.error);
            }
        });
        // Wait for all promises to complete
        await Promise.all(volunteersCheckInStatus);
        return res.status(200).json(new apiResponse(200, "Volunteers checkedIn status has been updated successfully", {}));
    } catch (error) {
        return res.status(500).json(new apiResponse(500, responseMessage?.customMessage(error), {}));
    }
}

/**
 * Handles the check-out process for volunteers attending an event.
 * 
 * @param req - The request object containing the necessary information.
 * @param res - The response object used to send the result of the check-in process.
 * @returns A JSON response indicating the status of the check-in process.
 */
export const volunteerCheckOut = async (req: Request, res: Response) => {
    reqInfo(req)
    let user: any = req.header('user'), response: any, body = req.body;
    try {
        // Check user authority
        let userAuthority = await userModel.findOne({ _id: ObjectId(user?._id) }, { userType: 1, firstName: 1, lastName: 1 });
        if(userAuthority?.userType === 0 || userAuthority?.userType > 2){
            throw new Error("You are not authorized to update event status.");
        }
        // Check request status
        var requestStatus = req.body?.volunteerRequest;
        if (requestStatus == null || requestStatus.length === 0 || body?.endTime == null) {
            return res.status(400).json(new apiResponse(400, "Invalid request. Please provide valid data.", {}));
        }
        // Check check-out time, admin can mark attendance 2 hours before the event or 2 hour after the event
        const eventStartTime = new Date(body?.endTime);
        const currentTime = new Date();
        const twoHoursBeforeEvent = new Date(eventStartTime.getTime() - (2 * 60 * 60 * 1000));
        const formattedBefore = twoHoursBeforeEvent.toLocaleString('en-US', { hour: 'numeric', minute: 'numeric', hour12: true });
        const twoHoursAfterEvent = new Date(eventStartTime.getTime() + (1 * 60 * 60 * 1000));
        const formattedAfter = twoHoursAfterEvent.toLocaleString('en-US', { hour: 'numeric', minute: 'numeric', hour12: true });

        if (currentTime < twoHoursAfterEvent || currentTime > twoHoursAfterEvent) {
            var messgae = `Invalid check-out time. Check-in starts from ${formattedBefore} and ends at ${formattedAfter}`
            return res.status(400).json(new apiResponse(400, messgae, {}));
        }
        // Update check-in status for each volunteer
        const volunteersCheckOutStatus = body?.volunteerRequest.map(async (data: any) => {
            
            // update user attendance in attendance table
            response = await updateVolunteersCheckOutStatus(body?.id, data?.volunteerId);

            if (response?.error) {
                throw new Error(response?.error);
            }

            // update user attended stats information into stats table
            let userEventData = {
                "volunteerId": data?.volunteerId,
                "rfCoins": data?.rfCoins,
                "eventId" : data?._id,
                "workSpaceId" : user?.workSpaceId
            }
            response = await pushUserEventRecord(userEventData);

            if (response?.error) {
                throw new Error(response?.error);
            }

            // Fetch user tokens and send notifications concurrently
            let userInfo: any = await getUser(data?.volunteerId, true);
            logger.info("userInfo", userInfo?._id);

            if (userInfo?.device_token?.length > 0) {
                let userTokenMapper = mapTokensToUser(data?.volunteerId, userInfo?.device_token);
                const date = new Date(body.date);
                const formattedDate = date.toLocaleString('en-US', { month: 'short', day: '2-digit' });

                let payload = {
                    title: `Attendance marked`,
                    message: `Hello, ${userInfo?.firstName}, your attendance has been marked for the ${body?.name} event on ${formattedDate} by ${userAuthority?.firstName}.`,
                    data: {
                        type: 1,
                        eventId: body.id
                    }
                };
                sendNotification(userInfo?.device_token, userTokenMapper, payload);
            } else {
                console.log("User has not allowed the notifications or unable to send notifications.");
            }
        });
        // Wait for all promises to complete
        await Promise.all(volunteersCheckOutStatus);
        return res.status(200).json(new apiResponse(200, "Volunteers attendance has been updated successfully", {}));
    } catch (error) {
        return res.status(500).json(new apiResponse(500, responseMessage?.customMessage(error), {}));
    }
}