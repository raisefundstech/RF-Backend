import { reqInfo } from '../../helpers/winston_logger'
import { apiResponse, userStatus } from '../../common'
import { Request, Response } from 'express'
import { responseMessage } from '../../helpers'
import { userModel, userSessionModel, workSpaceModel } from '../../database'
import { generateVolunteerCode } from '../../helpers/generateCode'
import { deleteSession } from '../../helpers/jwt'

const ObjectId = require('mongoose').Types.ObjectId

export const getProfile = async (req: Request, res: Response) => {
    reqInfo(req)
    let user: any = req.header('user'), response: any
    try {
        // response = await userModel.findOne({ _id: ObjectId(user._id), isActive: true }, { otp: 0, otpExpireTime: 0, device_token: 0, __v: 0 })
        response = await userModel.aggregate([
            { $match: { _id: ObjectId(user._id), isActive: true } },
            {
                $lookup: {
                    from: 'workspaces',
                    let: { workSpaceId: "$workSpaceId" },
                    pipeline: [
                        {
                            $match: {
                                $expr: {
                                    $and: [
                                        { $eq: ['$_id', '$$workSpaceId'] },
                                        { $eq: ['$isActive', true] }
                                    ]
                                }
                            }
                        },
                        { $project: { name: 1 } }
                    ],
                    as: 'workSpace'
                }
            },
            {
                $project: {
                    otp: 0,
                    otpExpireTime: 0,
                    device_token: 0,
                    createdAt: 0,
                    updatedAt: 0
                }
            }
        ])
        if (response) return res.status(200).json(new apiResponse(200, responseMessage.getDataSuccess('Your profile'), response[0]))
        else return res.status(404).json(new apiResponse(404, responseMessage.getDataNotFound('profile'), {}))
    } catch (error) {
        return res.status(500).json(new apiResponse(500, responseMessage?.internalServerError, error));
    }
}

export const updateProfile = async (req: Request, res: Response) => {
    reqInfo(req)
    let body = req.body, user: any = req.header('user')
    body.updatedBy = user._id
    try {
        let response = await userModel.findOneAndUpdate({ _id: ObjectId((req.header('user') as any)?._id), isActive: true }, body, { new: true })
        if (response) {
            // if (body?.image != response?.image && response.image != null && body?.image != null && body?.image != undefined) {
            //     let [folder_name, image_name] = await URL_decode(response?.image)
            //     await deleteImage(image_name, folder_name)
            // }
            return res.status(200).json(new apiResponse(200, 'Profile updated successfully', response))
        }
        else return res.status(404).json(new apiResponse(404, 'Database error while updating profile', {}))
    } catch (error) {
        return res.status(500).json(new apiResponse(500, responseMessage?.internalServerError, error));
    }
}

export const switchWorkSpace = async (req: Request, res: Response) => {
    reqInfo(req)
    let user: any = req.header('user'), response: any, body = req.body;
    // console.log(req);
    try {
        let findWorkSpace = await workSpaceModel.findOne({ _id: ObjectId(req.params.id), isActive: true })
        if (findWorkSpace) {
            response = await userModel.findOneAndUpdate({ _id: ObjectId(user._id), isActive: true, $or: [{ userType: 1 }, { userType: 2 }] }, { workSpaceId: ObjectId(req.params.id) }, { new: true })
            if (response) return res.status(200).json(new apiResponse(200, "Work space switched successfully!", response))
            else return res.status(400).json(new apiResponse(400, "You can not switch workspace!", {}))
        } else {
            return res.status(400).json(new apiResponse(400, responseMessage.getDataNotFound('work space'), {}))
        }
    } catch (error) {
        console.log(error);
        return res.status(500).json(new apiResponse(500, responseMessage?.internalServerError, error));
    }
}

export const getVolunteers = async (req: Request, res: Response) => {
    reqInfo(req)
    let user: any = req.header('user'), response: any, match: any = {}
    let queryname: any = req.headers.name || ''
    let phonenumber : any = req.headers.number || ''
    try {
        // admins and super volunteers can view volunteers from all the workspaces where as a volunteer can view volunteers from his/her workspace only
        let getUserWorkSpace = await userModel.findOne({ _id: ObjectId(user._id), isActive: true },{workSpaceId: 1})
        let userAuthority = await userModel.findOne({ _id: ObjectId(user._id), isActive: true },{userType: 1})
        let workSpaceId = getUserWorkSpace?.workSpaceId
        if (userAuthority.userType == 1 || userAuthority.userType == 2) {
           workSpaceId = req.body?.workSpaceId
        }

        response = await userModel.aggregate([
            {
                $match: {
                    workSpaceId: ObjectId(workSpaceId),
                    isActive: true,
                }
            },
            {
              $project: {
                name: {
                  $concat: ["$firstName", " ", "$lastName"],
                },
                phonenumber: "$mobileNumber",
                isActive: 1,
                workSpaceId: 1,
                image: 1,
                userType: 1,
                userStatus: 1,
                createdAt: 1
              },
            },
            {
              $match: {
                name: {
                  $regex: queryname, // "i" makes the regex case-insensitive
                  $options: "i",
                },
              },
            },
            {
              $match: {
                phonenumber: {
                  $regex: "\\+" + phonenumber,
                  $options: "i",
                },
              },
            },
            {
                $sort:
                  {
                    createdAt: -1,
                  },
              },
          ])
        if (response) return res.status(200).json(new apiResponse(200, responseMessage.getDataSuccess('volunteers'), response))
        else return res.status(404).json(new apiResponse(404, responseMessage.getDataNotFound('volunteers'), {}))
    } catch (error) {
        return res.status(500).json(new apiResponse(500, responseMessage?.internalServerError, error));
    }
}

// This function is responsible for retrieving the details of a volunteer.
// It checks the user's permission and returns the volunteer's information if the user is an admin or a super-volunteer.
// The volunteer ID is required as a parameter in the request.
// If the volunteer is found, it returns a success response with the volunteer's details.
// If the volunteer is not found, it returns a not found response.
// If the user does not have the necessary permission, it returns an unauthorized response.
// If there is an error during the process, it returns a server error response.
export const getVolunteer = async (req: Request, res: Response) => {
    reqInfo(req)
    const user: any = req.header('user') || '';
    try {
        const userStatus = await userModel.findOne({ _id: ObjectId(user._id) }, { userType: 1 });
        if (userStatus?.userType === 1 || userStatus?.userType === 2) {
            if (!req.params.id) {
                return res.status(400).json(new apiResponse(400, 'Volunteer ID is required!', {}));
            }
            const response = await userModel.findById(req.params.id, { otp: 0, otpExpireTime: 0, device_token: 0 });
            if (response) {
                return res.status(200).json(new apiResponse(200, responseMessage.getDataSuccess('volunteer'), response));
            } else {
                return res.status(404).json(new apiResponse(404, responseMessage.getDataNotFound('volunteer'), {}));
            }
        } else {
            return res.status(401).json(new apiResponse(401, responseMessage.deniedPermission, {}));
        }
    } catch (error) {
        return res.status(500).json(new apiResponse(500, responseMessage?.internalServerError, error));
    }
}

export const updateVolunteerPosition = async (req: Request, res: Response) => {
    reqInfo(req)
    let body = req.body, response, user: any = req.header('user');
    let userAuthority = await userModel.findOne({ _id: ObjectId(user._id), isActive: true })
    try {
        if (userAuthority.userStatus == 1) {
            response = await userModel.findOneAndUpdate({ _id: ObjectId(body.id), isActive: true }, body, { new: true })
        }
        if (response) {
            return res.status(200).json(new apiResponse(200, 'Volunteer information updated successfully!', {}))
        }
        else return res.status(404).json(new apiResponse(404, 'You need to have admin privilages to update volunteer information', {}))
    } catch (error) {
        return res.status(500).json(new apiResponse(500, responseMessage?.internalServerError, error));
    }
}

// This function is responsible for adding a new volunteer which can be performed by an admin or a super-volunteer.
export const addVolunteer = async (req: Request, res: Response) => {
    reqInfo(req)
    let body = req.body,
        user: any = req.header('user')
    try {
        let isAlready: any = await userModel.findOne({ $or: [{ email: body.email }, { mobileNumber: body.mobileNumber }], isActive: true })
        if (isAlready?.email == body?.email) return res.status(409).json(new apiResponse(409, responseMessage?.alreadyEmail, {}))
        if (isAlready?.mobileNumber == body?.mobileNumber) return res.status(409).json(new apiResponse(409, responseMessage?.alreadyMobileNumber, {}))
        body.volunteerId = await generateVolunteerCode();
        let response = await new userModel(body).save();
        if (response) {
            return res.status(200).json(new apiResponse(200, 'Volunteer added successfully!', {}))
        }
        else return res.status(404).json(new apiResponse(404, 'Volunteer add time some error occur!', {}))
    } catch (error) {
        return res.status(500).json(new apiResponse(500, responseMessage?.internalServerError, error));
    }
}

export const deleteUser = async (req: Request, res: Response) => {
    reqInfo(req)
    let user: any = req.header('user')
    try {
        let response = await userModel.findOneAndUpdate({ _id: ObjectId(user._id), isActive: true }, { isActive: false });
        if (response) {
            return res.status(200).json(new apiResponse(200, 'User successfully deleted!', {}))
        }
        else return res.status(404).json(new apiResponse(501, responseMessage?.updateDataError('User'), {}))
    } catch (error) {
        return res.status(500).json(new apiResponse(500, responseMessage?.internalServerError, error));
    }
}

export const logoutUser = async (req: Request, res: Response) => {
    reqInfo(req);
    let user: any = req.header('user');
    try {
        const user_session = await deleteSession(user._id, req.headers['authorization']);
        if (user_session.deletedCount > 0) {
            return res.status(200).json(new apiResponse(200, responseMessage?.logoutSuccess, {}));
        } else {
            return res.status(404).json(new apiResponse(501, responseMessage?.logoutFailure('User'), {}));
        }
    } catch (error) {
        return res.status(500).json(new apiResponse(500, responseMessage?.internalServerError, error.message));
    }      
}

export const getUnverifiedVolunteers = async (req: Request, res: Response) => {
    reqInfo(req);
    let user: any = req.header('user');
    let workspaceId = req.query.workSpaceId; // Get workspaceId from query string parameter
    try {
        const response = await userModel.find({ workSpaceId: ObjectId(workspaceId), isActive: true, userStatus: 0 },{ otp: 0, otpExpireTime: 0, device_token: 0, loginType: 0, createdAt: 0, updatedAt: 0 });
        if (response) {
            return res.status(200).json(new apiResponse(200, responseMessage.getDataSuccess('unverified volunteers'), response));
        } else {
            return res.status(404).json(new apiResponse(404, responseMessage.getDataNotFound('unverified volunteers'), {}));
        }
    } catch (error) {
        return res.status(500).json(new apiResponse(500, responseMessage?.internalServerError, error.message));
    }
}