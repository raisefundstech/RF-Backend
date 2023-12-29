import { eventModel,userModel } from "../database";

const ObjectId = require('mongoose').Types.ObjectId

async function volunteerInfoByEvent (req: any, user: any): Promise<any> {
    const events = [
        {
            $match: {
            _id: ObjectId(req.params.id),
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
            isGroupCreated: 1,
            createdBy: 1,
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
        let response: any, body = req.body; 
        // Check if volunteer has already applied
        const existingApplication = await eventModel.findOne({
            _id: ObjectId(body._id),
            isActive: true,
            volunteerRequest: {
                $elemMatch: { volunteerId: ObjectId(userId) }
            }
        });

        if (existingApplication) {
            throw new Error("Volunteer has already applied to this event.");
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

async function withdrawFromEvent(req: any): Promise<any> {
    try {
        let user: any = req.header('user'), response: any, body = req.body; 
        response = await eventModel.findOneAndUpdate({
            _id: ObjectId(body._id),
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

async function updateVolunteersRequestStatus(req: any, volunteerId: string, status: string): Promise<any> {
    try {
        const { body } = req;
        const response = await eventModel.findOneAndUpdate(
            {
                _id: ObjectId(body._id),
                isActive: true,
                "volunteerRequest.volunteerId": ObjectId(volunteerId),
            },
            {
                $set: {
                    "volunteerRequest.$.requestStatus": status,
                },
            },
            { new: true }
        );

        if (!response) {
            console.error("Document not found or criteria did not match.");
            throw new Error("Document not found or criteria did not match.");
        }
        console.log("Volunteer request successfully updated:", response?.volunteerRequest?.requestStatus);
        return response;
    } catch (error) {
        throw error;
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

export { volunteerInfoByEvent, applyOnEvent, withdrawFromEvent, updateVolunteersRequestStatus, fetchAdminsAndSuperVolunteers };