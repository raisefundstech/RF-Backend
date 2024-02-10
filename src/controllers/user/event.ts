import async from 'async'
import { reqInfo,logger } from '../../helpers/winston_logger'
import { apiResponse } from '../../common'
import { Request, Response } from 'express'
import { responseMessage } from '../../helpers'
import { 
    volunteerInfoByEvent, 
    applyOnEvent, 
    withdrawFromEvent,  
    fetchAdminsAndSuperVolunteers, 
    updateVolunteersRequestStatus,
    updateVolunteersCheckInStatus, 
    updateVolunteersCheckOutStatus, 
    checkEventCreationTime, 
    userUpdated, 
    getStadiumDetails,
    addStadiumDetails
} from '../../helpers/eventQueries';
import { eventModel, roomModel, userModel } from '../../database'
import { getUser } from '../../helpers/userQueries'
import { pushUserEventRecord } from '../../helpers/statsQueries'
import { timeDifferences } from '../../helpers/timeDifference'
import { workSpaceModel } from '../../database/models/workSpace'
import { getStadiumDetailsByWorkSpace } from '../../helpers/workSpaceQueries'
import { sendNotification, fetchUserTokens, mapTokensToUser } from '../../helpers/notification'
import { get } from 'config'

const ObjectId = require('mongoose').Types.ObjectId
const moment = require('moment-timezone');

// Fetch my events based on the user
/**
 * Retrieves events associated with the current user.
 * 
 * @param req - The request object.
 * @param res - The response object.
 * @returns A JSON response with the retrieved events or an error message.
 */
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
                name: 1,
                workSpaceId: 1,
                stadiumId: 1,
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
        let stadiumResponse: any = await addStadiumDetails(response);
        // logger.info(response);
        if (response?.length > 0) return res.status(200).json(new apiResponse(200, responseMessage.getDataSuccess('events'), stadiumResponse))
        else return res.status(404).json(new apiResponse(404, responseMessage.getDataNotFound('events'), {}))
    } catch (error) {
        return res.status(500).json(new apiResponse(500, responseMessage?.customMessage(error), error));
    }
}

// Fetch all the events based on the workspace provided 
/**
 * Retrieves events based on the user's workspace and access level.
 * 
 * @param req - The request object.
 * @param res - The response object.
 * @returns The response with the retrieved events or an error message.
 */
export const getEvents = async (req: Request, res: Response) => {
    reqInfo(req);
    let user: any = req.header('user');
    let response: any;
    // Allow Admins and super volunteers to view events across all workspaces and volunteers to view events in their workspace
    let userWorkSpace = await userModel.findOne({ _id: ObjectId(user._id) }, { workSpaceId: 1, userType: 1 });
    let workSpaceId = userWorkSpace?.workSpaceId.toString();

    if (workSpaceId == null) {
        return res.status(400).json(new apiResponse(400, "Please provide a valid workspaceid and try again", {}));
    }

    try {
        response = await eventModel.aggregate([
            { $match: {workSpaceId: ObjectId(workSpaceId),isActive: true } },
            { $sort: { startTime: -1 } },
            {
                $project: {
                    name: 1,
                    workSpaceId: 1,
                    date: 1,
                    stadiumId: 1,
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
        let stadiumResponse: any = await addStadiumDetails(response);
        if (response?.length > 0) {
            return res.status(200).json(new apiResponse(200, responseMessage.getDataSuccess('events'), stadiumResponse));
        } else {
            return res.status(404).json(new apiResponse(404, responseMessage.getDataNotFound('events'), {}));
        }
    } catch (error) {
        return res.status(500).json(new apiResponse(500, responseMessage?.internalServerError, error));
    }
}

/**
 * Creates a new event.
 * 
 * @param req - The request object.
 * @param res - The response object.
 * @returns The response with the created event or an error message.
 */
export const createEvent = async (req: Request, res: Response) => {
    reqInfo(req)
    let user: any = req.header('user'), response: any, body = req.body
    try {    
        body.createdBy = user?._id;
        let userInfo = await getUser(user?._id, true);
        logger.info(userInfo?.userType);
        if(userInfo?.userType != 1) { 
            return res.status(400).json(new apiResponse(400, "You are not authorized to create event.", {}));
        }

        let eventCreationResponse = await checkEventCreationTime(req);

        if(eventCreationResponse?.error){
            throw new Error(eventCreationResponse.error);
        }
        
        if (body.volunteerSize < 2) return res.status(400).json(new apiResponse(400, "Please add volunteer size more than 1 . ", {}))

        let validWorkSpace = await workSpaceModel.findOne({ 
            _id: ObjectId(body?.workSpaceId), 
            stadiums: { $elemMatch: { _id: ObjectId(body?.stadiumId) } },
            isActive: true
        });

        if(validWorkSpace == null) {
            return res.status(400).json(new apiResponse(400, "Invalid workspace or stadium ID provided. Please provide valid IDs.", {}));
        }

        response = await new eventModel(body).save();

        if (response) {
            let userData = await userModel.find({ userType: { $in: [0, 1] }, isActive: true, workSpaceId: response?.workSpaceId }, { firstName: 1, lastName: 1, device_token: 1 });
            logger.info(userData?.length);
            let title = `New event created`;
            const date = new Date(body.date);
            const eventDetails = await getStadiumDetailsByWorkSpace(response?.workSpaceId, response?.stadiumId);
            const formattedDate = date.toLocaleString('en-US', { month: 'short', day: '2-digit' });
            let message = `New event coming up: ${eventDetails?.name} on ${formattedDate}.`;
            logger.info(message);
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

/**
 * Updates an event.
 * 
 * @param req - The request object.
 * @param res - The response object.
 * @returns The updated event or an error response.
 */
export const updateEvent = async (req: Request, res: Response) => {
    reqInfo(req)
    let user: any = req.header('user'), response: any, body = req.body;
    try {
        body.updatedBy = user?._id;
        // only admin can update the event
        if (body.startTime || body.endTime) {
            if (new Date(body.startTime) < new Date() || new Date(body.endTime) < new Date() || new Date(body.startTime).toString() == new Date(body.endTime).toString()) return res.status(400).json(new apiResponse(400, "Invalid start time or end time!", {}))
        }
        if (body.volunteerSize) {
            if (body.volunteerSize < 2) return res.status(400).json(new apiResponse(400, "Please add volunteer size more than 1 . ", {}))
        }
        let validWorkSpace = await workSpaceModel.findOne({ 
            _id: ObjectId(body?.workSpaceId), 
            stadiums: { $elemMatch: { _id: ObjectId(body?.stadiumId) } },
            isActive: true
        });

        if(validWorkSpace == null) {
            return res.status(400).json(new apiResponse(400, "Invalid workspace or stadium ID provided. Please provide valid IDs.", {}));
        }
        let userAuthority = await userModel.findOne({ _id: ObjectId(user?._id) }, { userType: 1 });
        if(userAuthority?.userType != 1){
            throw new Error("You are not authorized to update event.");
        }
        response = await eventModel.findOneAndUpdate({ _id: ObjectId(body._id), isActive: true }, body, { new: true });
        if (response) {
            let updateRoomName = await roomModel.findOneAndUpdate({ eventId: ObjectId(response?._id), isActive: true }, { roomName: response?.name + " " + "group" })
            return res.status(200).json(new apiResponse(200, responseMessage.updateDataSuccess('event'), {}))
        }
        else return res.status(400).json(new apiResponse(400, responseMessage.updateDataError('event'), {}))
    } catch (error) {
        return res.status(500).json(new apiResponse(500, responseMessage?.customMessage(error), error));
    }
}

/**
 * Retrieves an event by its ID.
 * 
 * @param req - The request object.
 * @param res - The response object.
 * @returns A JSON response with the event data if found, or an error response if not found or an error occurred.
 */
export const getEventById = async (req: Request, res: Response) => {
    reqInfo(req)
    let user: any = req.header('user'), response: any
    let userStatus = await userModel.findOne({ _id: ObjectId(user._id) }, { userType: 1 });
    try {
        const pipeline = await volunteerInfoByEvent(req, user);
        response = await eventModel.aggregate(pipeline);
        const stadiumInfo: any = await getStadiumDetails(req?.params?.id);
        // Inject stadium details into the response
        response[0].stadiumName = stadiumInfo?.[0]?.name;
        response[0].stadiumAddress = stadiumInfo?.[0]?.address;
        response[0].stadiumPolicy = stadiumInfo?.[0]?.stadiumPolicy;
        response[0].latitude = stadiumInfo?.[0]?.latitude;
        response[0].longitude = stadiumInfo?.[0]?.longitude;
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

/**
 * Deletes an event.
 * 
 * @param req - The request object.
 * @param res - The response object.
 * @returns A JSON response indicating the status of the deletion.
 */
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

/**
 * Retrieves paginated event data based on the provided request parameters.
 * 
 * @param req - The request object.
 * @param res - The response object.
 * @returns The paginated event data along with pagination information.
 */
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


/**
 * Applies for an event.
 * 
 * @param req - The request object.
 * @param res - The response object.
 * @returns A JSON response indicating the success or failure of the application.
 */
export const apply = async (req: Request, res: Response) => {
    reqInfo(req)
    let user: any = req.header('user'), response: any, body = req.body, match: any = {}, findUser: any
    try {
        let getUser = await userModel.findOne({ _id: ObjectId(user._id) }, { workSpaceId: 1, userStatus: 1, userType: 1 });
        
        if(getUser?.workSpaceId != body.workSpaceId) {
            throw new Error("You can't apply to an event located in different workstation, please switch the workstation and try again.");
        }

        if(getUser?.userStatus != 1) {
            throw new Error("You are not authorized to apply for an event, please contact your admin.");
        }

        const result = await applyOnEvent(req,user?._id);

        if(result?.error){
            return res.status(409).json(new apiResponse(409, result.error, {}));
        }

        // Fetch user tokens and send notification to all the super volunteers and admins when the volunteer request is in counts of 10, 20, etc..
        if(result?.volunteerRequest.length % 10 === 0){
            response = await fetchAdminsAndSuperVolunteers(body?.workSpaceId)
            var getEvent = await eventModel.findOne({ _id: ObjectId(body._id), isActive: true })
            const eventDetails = await getStadiumDetailsByWorkSpace(getEvent?.workSpaceId, getEvent?.stadiumId);
            
            if(response?.error){
                throw new Error(result.error);
            }

            const date = new Date(getEvent?.date);
            const formattedDate = date.toLocaleString('en-US', { month: 'short', day: '2-digit' });
            
            const updatePromises = response.map(async (data: any) => {
                const tokens: string[] = data?.device_token;
                const userTokenMapper = mapTokensToUser(data?._id, tokens);

                const payload = {
                title: `Applied for ${result.name}`,
                message: `${result?.volunteerRequest.length % 10} users, applied to ${eventDetails?.name} event on ${formattedDate}.`,
                data: {
                    type: 1,
                    eventId: result?._clsid,
                },
                };
                logger.info(payload);
                sendNotification(tokens, userTokenMapper, payload);
            });
            // Wait for all promises to complete
            await Promise.all(updatePromises);
        }
        return res.status(200).json(new apiResponse(200, "You have succeessfully applied for the event", {}));
    } catch (error) {
        return res.status(500).json(new apiResponse(500, responseMessage?.customMessage(error), {error}));
    }
}


/**
 * Withdraws a user from an event.
 * 
 * @param req - The request object.
 * @param res - The response object.
 * @returns A JSON response indicating the success or failure of the withdrawal.
 */
export const withdraw = async (req: Request, res: Response) => {
    reqInfo(req)
    let user: any = req.header('user'), response: any, body = req.body
    try {
        const result = await withdrawFromEvent(req)
        if(result?.error){
            throw new Error(result.error);
        }
        let userWorkSpace = await getUser(user?._id, true).then(data => data?.workSpaceId);
        var getEvent = await eventModel.findOne({ _id: ObjectId(req?.params?.id), isActive: true })
        const eventDetails = await getStadiumDetailsByWorkSpace(getEvent?.workSpaceId, getEvent?.stadiumId);

        response = await fetchAdminsAndSuperVolunteers(userWorkSpace);
        if(response?.error) {
            throw new Error(result.error);
        }
        const findUser = await userModel.findOne({ _id: ObjectId(user?._id)});
        // currently commented the notification part as sending notification 
        /*
        const sendNotifications = response.map(async (data: any) => {
            const tokens: string[] = data?.device_token;
            const userTokenMapper = mapTokensToUser(data?._id, tokens);
            const date = new Date(new Date());
            const formattedDate = date.toLocaleString('en-US', { month: 'short', day: '2-digit' });

            const payload = {
              title: `Withdrawn from ${result.name}`,
              message: `${findUser?.firstName} ${findUser?.lastName} (${findUser?.volunteerId}), Withdrawn from ${eventDetails?.name} event on ${formattedDate}.`,
              data: {
                type: 1,
                eventId: result?._id,
              },
            };
            logger.info(payload);
            sendNotification(tokens, userTokenMapper, payload);
        });
        // Wait for all promises to complete
        await Promise.all(sendNotifications); */
        return res.status(200).json(new apiResponse(200, "You have successfully withdrawn from the event", {}));
    } catch (error) {
        return res.status(500).json(new apiResponse(500, responseMessage?.customMessage(error),{}));
    }
}


/**
 * Updates the volunteers' request status for an event.
 * 
 * @param req - The request object.
 * @param res - The response object.
 * @returns A JSON response indicating the status of the update operation.
 * @throws If the user is not authorized to update volunteer request status, or if the request data is invalid.
 */
export const updateVolunteers = async (req: Request, res: Response) => {
    reqInfo(req);
    try {
        let user: any = req.header('user'), userTokenMapper: any = {}, payload: any = {};
        const body = req.body;

        let userAuthority = await userModel.findOne({ _id: ObjectId(user?._id) }, { userType: 1 });

        if(userAuthority?.userType != 1 && userAuthority?.userType != 2){
            throw new Error("You are not authorized to update volunteer request status.");
        }

        var requestStatus = req.body?.volunteerRequest;

        if (requestStatus == null || requestStatus.length === 0) {
            return res.status(400).json(new apiResponse(400, "Invalid request. Please provide valid data.", {}));
        }

        var getEvent = await eventModel.findOne({ _id: ObjectId(body._id), isActive: true })
        logger.info(getEvent?._id);
        const eventDetails = await getStadiumDetailsByWorkSpace(getEvent?.workSpaceId, getEvent?.stadiumId);

        if (getEvent == null) {
            return res.status(400).json(new apiResponse(400, "Invalid event id. Please provide valid event id.", {}));
        }

        let responseData = getEvent?.volunteerRequest?.filter(data => data?.requestStatus === "APPROVED");
        let approvedVolunteersInBody = body?.volunteerRequest?.filter(data => data?.requestStatus === "APPROVED");
        if (getEvent?.volunteerSize < (responseData?.length + approvedVolunteersInBody?.length)) {
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
                let date = getEvent?.date;
                const formattedDate = date?.toLocaleString('en-US', { month: 'short', day: '2-digit' });
                let userInfo = await getUser(data?.volunteerId, true); 
                payload = {
                    title: `Event request ${data?.requestStatus}`,
                    message: `Hello, ${userInfo?.firstName} your event request has been ${body?.requestStatus} for the ${eventDetails?.name} on ${formattedDate}.`,
                    data: {
                        type: 1,
                        eventId: body._id
                    }
                };
                logger.info(payload);
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


/**
 * Retrieves paginated event data for volunteers based on the provided request parameters.
 * @param req - The request object.
 * @param res - The response object.
 * @returns The response with paginated event data and pagination information.
 */
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

/**
 * Retrieves volunteers associated with a specific event.
 * @param req - The request object.
 * @param res - The response object.
 * @returns A JSON response with the volunteer data.
 */
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

/**
 * Adds a volunteer to an event.
 * 
 * @param req - The request object.
 * @param res - The response object.
 * @returns A JSON response indicating the success or failure of adding volunteers to the event.
 */
export const addVolunteerToEvent = async (req: Request, res: Response) => {
    reqInfo(req)
    let user: any = req.header('user'), response: any, body = req.body;
    try {
        response = await eventModel.findOneAndUpdate({
            _id: ObjectId(body._id),
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
        if(userAuthority?.userType != 1 && userAuthority?.userType != 2){
            throw new Error("You are not authorized to update event status.");
        }

        // Check request status
        var requestStatus = req.body?.volunteerRequest;
        if (requestStatus == null || requestStatus.length === 0) {
            return res.status(400).json(new apiResponse(400, "Invalid request. Please provide VolunteerRequest data.", {}));
        }

        // Check check-in time, admin can mark attendance 3 hours before the event or 1 hour after the event
        // Currently commented out as per the discussion with the team
        // const eventStartTimeUTC = moment.utc(body?.startTime);
        // const currentTimeUTC = new Date();
        // const threeHoursBeforeEventUTC = eventStartTimeUTC.clone().subtract(3, 'hours');
        // const formattedBefore = threeHoursBeforeEventUTC.format('h:mm A');
        // const oneHourAfterEventUTC = eventStartTimeUTC.clone().add(1, 'hour');
        // const formattedAfter = oneHourAfterEventUTC.format('h:mm A');

        // if (currentTimeUTC < threeHoursBeforeEventUTC || currentTimeUTC > oneHourAfterEventUTC) {
        //     var messgae = `Invalid check-in time. Check-in starts from ${formattedBefore} and ends at ${formattedAfter}`
        //     return res.status(400).json(new apiResponse(400, messgae, {}));
        // }

        // Update check-in status for each volunteer
        const volunteersCheckInStatus = body?.volunteerRequest.map(async (data: any) => {
            response = await updateVolunteersCheckInStatus(body?._id, data?.volunteerId);
            if (response?.error) {
                throw new Error(response.error);
            }
        });
        // Wait for all promises to complete
        await Promise.all(volunteersCheckInStatus);
        await userUpdated(body?._id,user?._id);
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
        if(userAuthority?.userType != 1 && userAuthority?.userType != 2){
            throw new Error("You are not authorized to update event status.");
        }
        // Check request status
        var requestStatus = req.body?.volunteerRequest;
        if (requestStatus == null || requestStatus.length === 0) {
            return res.status(400).json(new apiResponse(400, "Invalid request. Please provide VolunteerRequest data.", {}));
        }
        // check if the volunteer has checked-in first

        // Check check-out time, admin can mark attendance 2 hours before the event or 2 hour after the event
        // currently suspending the check-out time validation
        // const eventStartTime = new Date(body?.endTime);
        // const currentTime = new Date();
        // const twoHoursBeforeEvent = new Date(eventStartTime.getTime() - (2 * 60 * 60 * 1000));
        // const formattedBefore = twoHoursBeforeEvent.toLocaleString('en-US', { hour: 'numeric', minute: 'numeric', hour12: true });
        // const twoHoursAfterEvent = new Date(eventStartTime.getTime() + (1 * 60 * 60 * 1000));
        // const formattedAfter = twoHoursAfterEvent.toLocaleString('en-US', { hour: 'numeric', minute: 'numeric', hour12: true });

        // if (currentTime < twoHoursAfterEvent || currentTime > twoHoursAfterEvent) {
        //     var messgae = `Invalid check-out time. Check-in starts from ${formattedBefore} and ends at ${formattedAfter}`
        //     return res.status(400).json(new apiResponse(400, messgae, {}));
        // }

        // fetch event information
        const eventInfo = await eventModel.findOne({ _id: ObjectId(body?._id), isActive: true });
        const stadiumInfo = await getStadiumDetailsByWorkSpace(eventInfo?.workSpaceId, eventInfo?.stadiumId);

        // Update check-in status for each volunteer
        const volunteersCheckOutStatus = body?.volunteerRequest.map(async (data: any) => {
            
            // update user attendance in attendance table
            response = await updateVolunteersCheckOutStatus(body?._id, data?.volunteerId);

            if (response?.error) {
                throw new Error(response?.error);
            }

            // update user attended stats information into stats table
            let userEventData = {
                "volunteerId": data?.volunteerId,
                "rfCoins": eventInfo?.rfCoins,
                "eventId" : eventInfo?._id,
                "workSpaceId" : eventInfo?.workSpaceId
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
                    message: `Hello, ${userInfo?.firstName}, your attendance has been marked for the ${stadiumInfo?.name} event on ${formattedDate} by ${userAuthority?.firstName}.`,
                    data: {
                        type: 1,
                        eventId: body._id
                    }
                };
                logger.info(payload);
                sendNotification(userInfo?.device_token, userTokenMapper, payload);
            } else {
                console.log("User has not allowed the notifications or unable to send notifications.");
            }
        });
        // Wait for all promises to complete
        await Promise.all(volunteersCheckOutStatus);
        await userUpdated(body?._id,user?._id);
        return res.status(200).json(new apiResponse(200, "Volunteers attendance has been updated successfully", {}));
    } catch (error) {
        return res.status(500).json(new apiResponse(500, responseMessage?.customMessage(error), {}));
    }
}