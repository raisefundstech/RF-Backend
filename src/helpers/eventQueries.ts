import { eventModel,userModel } from "../database";
import { logger } from "./winston_logger";

const ObjectId = require('mongoose').Types.ObjectId

async function volunteerInfoByEvent (req: any, user: any): Promise<any> {
    const events = [
        {
            $match: {
            _id: ObjectId(req?.params?.id),
            isActive: true
            }
        },
        {
            $lookup: {
            from: "users",
            localField: "volunteerRequest.volunteerId",
            foreignField: "_id",
            as: "volunteerDetails"
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
            rfCoins: 1,
            createdBy: 1,
            updatedBy: 1,
            isActive: 1,
            volunteerRequest: {
                $map: {
                input: "$volunteerRequest",
                as: "volReq",
                in: {
                    volunteerId: "$$volReq.volunteerId",
                    requestStatus: "$$volReq.requestStatus",
                    attendance: "$$volReq.attendance",
                    appliedAt: "$$volReq.appliedAt",
                    checkedIn: "$$volReq.checkedIn",
                    checkedOut: "$$volReq.checkedOut",
                    userNote: "$$volReq.userNote",
                    userDetails: {
                    $let: {
                        vars: {
                        userDetails: {
                            $arrayElemAt: [
                            {
                                $filter: {
                                input: "$volunteerDetails",
                                as: "volunteerDetail",
                                cond: {
                                    $eq: [
                                    "$$volunteerDetail._id",
                                    "$$volReq.volunteerId"
                                    ]
                                }
                                }
                            },
                            0
                            ]
                        }
                        },
                        in: {
                        firstName: "$$userDetails.firstName",
                        lastName: "$$userDetails.lastName",
                        mobileNumber: "$$userDetails.mobileNumber",
                        image: "$$userDetails.image"
                        }
                    }
                    }
                }
                }
            },
            isApply: {
                $cond: [
                {
                    $eq: [
                    {
                        $filter: {
                        input: '$volunteerRequest',
                        as: 'volunteerRequest',
                        cond: {
                            $eq: [
                            '$$volunteerRequest.volunteerId',
                            ObjectId(user._id)
                            ]
                        }
                        }
                    },
                    []
                    ]
                },
                false,
                true
                ]
            },
            isEventOwn: {
                $cond: [
                { $eq: ['$createdBy', ObjectId(user._id)] },
                true,
                false
                ]
            }
            }
        }
    ]
    return events;
}

async function applyOnEvent(req: any, userId: string): Promise<any> {
    try {
        let response: any = {}, body = req.body; 

        const getEventData = await eventModel.findOne({_id: ObjectId(body._id), isActive: true},{date:1,startTime:1,endTime:1});

        const eventsAppliedOnSameDay = await eventModel.aggregate([
            {
              $match: {
                _id: { $ne: ObjectId(body?._id) }, // Exclude the current event
                isActive: true,
                date: {
                  $eq: new Date(getEventData?.date)
                },
                volunteerRequest: {
                    $elemMatch: { volunteerId: ObjectId(userId) }
                }
              }
            }
        ]);


        if(eventsAppliedOnSameDay.length > 0) {
            response['error'] = `Volunteer has already applied to another event ${eventsAppliedOnSameDay?.[0]?.name} on the same day.`;
            return response
        }

        // logger.info(eventsAppliedOnSameDay);

        // Check if volunteer has already applied
        const existingApplication = await eventModel.findOne({
            _id: ObjectId(body?._id),
            isActive: true,
            volunteerRequest: {
                $elemMatch: { volunteerId: ObjectId(userId) }
            }
        });

        if (existingApplication) {
            response['error'] = "Volunteer has already applied to this event.";
            return response;
        }

        response = await eventModel.findOneAndUpdate({
            _id: ObjectId(body._id),
            isActive: true,
        }, {
            $push: {
                volunteerRequest: {
                    volunteerId: ObjectId(userId),
                    requestStatus: "PENDING",
                    appliedAt: new Date()
                }
            }
        }, { new: true });
        return response;
    } catch (error) {     
        throw error;
    }
}

async function checkEventCreationTime(req: any): Promise<any> {
    const { date, startTime, endTime }: { date: any; startTime: any; endTime: any } = req.body;

    if (date == null || startTime == null || endTime == null) {
        throw new Error("Event date and Start/End Time cannot be null.");
    }

    const eventDate = new Date(date);
    const currentDate = new Date();
    const eventStartTime = new Date(startTime);
    const eventEndTime = new Date(endTime);

    logger.info(eventDate.toString(), currentDate.toString(), eventStartTime.toString(), eventEndTime.toString())
    // Date comparisons
    if (eventDate < currentDate) {
        throw new Error("Invalid event date, can't create event in past.");
    }

    // Duration check
    if (startTime - endTime < 3 * 3600000) {
        throw new Error("Event duration cannot be less than 3 hours.");
    }
}


async function withdrawFromEvent(req: any): Promise<any> {
    try {
        let user: any = req.header('user'), response: any
        response = await eventModel.findOneAndUpdate({
            _id: ObjectId(req?.params?.id),
            isActive: true,
            volunteerRequest: {
                $elemMatch: { volunteerId: ObjectId(user._id) }
            }
        }, {
            $pull: {
                volunteerRequest: {
                    volunteerId: ObjectId(user._id)
                }
            }
        });
        if (!response) {
            throw new Error("Volunteer request not found.");
        }
        return response;
    } catch (error) {     
        throw error;
    }
}

async function updateVolunteersRequestStatus(req: any, volunteerId: string, status: string, userNote: string): Promise<any> {
    try {
        const { body } = req;
        let user: any = req.header('user')
        const response = await eventModel.findOneAndUpdate(
            {
                _id: ObjectId(body._id),
                isActive: true,
                "volunteerRequest.volunteerId": ObjectId(volunteerId),
            },
            {
                $set: {
                    "volunteerRequest.$.requestStatus": status
                },
                $push: {
                    "volunteerRequest.$.userNote": userNote
                }
            },
            { new: true }
        );

        if (!response) {
            logger.error("update volunteer request failed.");
            throw new Error("Document not found or criteria did not match.");
        }
        logger.info("Volunteer request successfully updated");
        return response;
    } catch (error) {
        logger.error("Error updating volunteer request:", error.message);
        return { error: `Invalid volunteerId ${volunteerId}, please correct the VolunteerId and try again`};
    }
}

async function updateVolunteersCheckInStatus(eventId: string, volunteerId: string): Promise<any> {
    try {
        const response = await eventModel.findOneAndUpdate(
            {
                _id: ObjectId(eventId),
                isActive: true,
                "volunteerRequest.volunteerId": ObjectId(volunteerId),
            },
            {
                $set: {
                    "volunteerRequest.$.checkedIn": true,
                },
            },
            { new: true }
        );
        // logger.info(response)
        if (!response || response === null) {
            logger.error("update volunteer checkIn request failed.");
            throw new Error("update volunteer checkIn request failed.");
        }
        logger.info("Volunteer checkIn request updatedsuccessfully :", volunteerId);
        return response;
    } catch (error) {
        logger.error(`Invalid volunteerId ${volunteerId}, please correct the volunteerId and try again`);
        return { error: `Invalid volunteerId ${volunteerId}, please correct the VolunteerId and try again`};
    }
}

async function updateVolunteersCheckOutStatus(eventId: string, volunteerId: string): Promise<any> {
    try {
        const response = await eventModel.findOneAndUpdate(
            {
                _id: ObjectId(eventId),
                isActive: true,
                "volunteerRequest.volunteerId": ObjectId(volunteerId),
            },
            {
                $set: {
                    "volunteerRequest.$.checkedOut": true,
                    "volunteerRequest.$.attendance": true,
                },
            },
            { new: true }
        );
        if (!response) {
            // logger.error("Document not found or criteria did not match.");
            throw new Error("Document not found or criteria did not match.");
        }
        logger.info("Volunteer checkout request updated successfully :", volunteerId,"\t",response?.volunteerRequest?.requestStatus);
        return response;
    } catch (error) {
        logger.error(`Invalid volunteerId ${volunteerId}, please correct the volunteerId and try again`);
        return { error: `Invalid volunteerId ${volunteerId}, please correct the VolunteerId and try again`};
    }
}

async function fetchAdminsAndSuperVolunteers(workspaceId: string): Promise<any> {
    try {
        let response: any;
        response = await userModel.find({
            isActive: true,
            userType: { $in: [1, 2] },
            workSpaceId: ObjectId(workspaceId)
        }, {
            firstName: 1,
            lastName: 1,
            device_token: 1
        });
        return response;
    } catch (error) {     
        throw error;
    }
}

async function getEventInfo(eventId: string): Promise<any> {
    try {
        let response: any;
        response = await eventModel.findOne({
            _id: ObjectId(eventId),
            isActive: true
        }, {
            name: 1,
            date: 1,
            startTime: 1,
            endTime: 1,
            workSpaceId: 1
        });
        return response;
    } catch (error) {     
        throw error;
    }
}

async function userUpdated(eventId: string, userId: string){
    try {
        let response: any;
        response = await eventModel.findOneAndUpdate({
            _id: ObjectId(eventId),
            isActive: true,
        },{
            updatedBy: ObjectId(userId)
        });
    } catch (error){
        throw error;
    }
}

export {
    volunteerInfoByEvent,
    applyOnEvent,
    withdrawFromEvent,
    updateVolunteersRequestStatus,
    fetchAdminsAndSuperVolunteers,
    getEventInfo,
    updateVolunteersCheckInStatus,
    updateVolunteersCheckOutStatus,
    checkEventCreationTime,
    userUpdated
};
