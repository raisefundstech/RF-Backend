import { reqInfo } from '../../helpers/winston_logger'
import { apiResponse, userStatus } from '../../common'
import { Request, Response } from 'express'
import { responseMessage } from '../../helpers'
import { userModel, workSpaceModel } from '../../database'
import { generateVolunteerCode } from '../../helpers/generateCode'

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
    let body = req.body,
        user: any = req.header('user')
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
        if (user?.workSpaceId) {
            match.$or = [{ workSpaceId: ObjectId(user?.workSpaceId) }, { workSpaceId: null }]
        } else {
            match.workSpaceId = null
        }
        response = await userModel.aggregate([
            {
              $project: {
                name: {
                  $concat: ["$firstName", " ", "$lastName"],
                },
                phonenumber: "$mobileNumber",
                isActive: 1,
                workSpaceId: 1,
                createdAt: 1
              },
            },
            {
              $match: {
                name: {
                  $regex: queryname, // Your name regex here
                  $options: "i",
                }, // "i" makes the regex case-insensitive
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
              $match: {
                isActive: true,
                $or: [
                  {
                    workSpaceId: ObjectId(
                        user?.workSpaceId
                    ),
                  },
                ],
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

export const updateVolunteerPosition = async (req: Request, res: Response) => {
    reqInfo(req)
    let body = req.body, response,
        user: any = req.header('user')
    try {
        if (body.userType == 0) {
            if (!body.workSpaceId) {
                return res.status(404).json(new apiResponse(400, 'workSpaceId is required!', {}))
            }
            response = await userModel.findOneAndUpdate({ _id: ObjectId(body.id), isActive: true }, body, { new: true })
        } else if (body.userType == 1) {
            // body.workSpaceId = null;
            if (!body.workSpaceId) {
                return res.status(404).json(new apiResponse(400, 'workSpaceId is required!', {}))
            }
            response = await userModel.findOneAndUpdate({ _id: ObjectId(body.id), isActive: true }, body, { new: true })
        } else {
            if (!body.workSpaceId) {
                return res.status(404).json(new apiResponse(400, 'workSpaceId is required!', {}))
            }
            response = await userModel.findOneAndUpdate({ _id: ObjectId(body.id), isActive: true }, body, { new: true })
        }
        if (response) {
            return res.status(200).json(new apiResponse(200, 'Volunteer position or tags changed!', {}))
        }
        else return res.status(404).json(new apiResponse(404, 'Database error while changing volunteer position and tags', {}))
    } catch (error) {
        return res.status(500).json(new apiResponse(500, responseMessage?.internalServerError, error));
    }
}

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