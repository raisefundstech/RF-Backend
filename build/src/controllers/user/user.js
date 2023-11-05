"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.logoutUser = exports.deleteUser = exports.addVolunteer = exports.updateVolunteerPosition = exports.getVolunteers = exports.switchWorkSpace = exports.updateProfile = exports.getProfile = void 0;
const winston_logger_1 = require("../../helpers/winston_logger");
const common_1 = require("../../common");
const helpers_1 = require("../../helpers");
const database_1 = require("../../database");
const generateCode_1 = require("../../helpers/generateCode");
const jwt_1 = require("../../helpers/jwt");
const ObjectId = require('mongoose').Types.ObjectId;
const getProfile = async (req, res) => {
    (0, winston_logger_1.reqInfo)(req);
    let user = req.header('user'), response;
    try {
        // response = await userModel.findOne({ _id: ObjectId(user._id), isActive: true }, { otp: 0, otpExpireTime: 0, device_token: 0, __v: 0 })
        response = await database_1.userModel.aggregate([
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
        ]);
        if (response)
            return res.status(200).json(new common_1.apiResponse(200, helpers_1.responseMessage.getDataSuccess('Your profile'), response[0]));
        else
            return res.status(404).json(new common_1.apiResponse(404, helpers_1.responseMessage.getDataNotFound('profile'), {}));
    }
    catch (error) {
        return res.status(500).json(new common_1.apiResponse(500, helpers_1.responseMessage?.internalServerError, error));
    }
};
exports.getProfile = getProfile;
const updateProfile = async (req, res) => {
    (0, winston_logger_1.reqInfo)(req);
    let body = req.body, user = req.header('user');
    body.updatedBy = user._id;
    try {
        let response = await database_1.userModel.findOneAndUpdate({ _id: ObjectId(req.header('user')?._id), isActive: true }, body, { new: true });
        if (response) {
            // if (body?.image != response?.image && response.image != null && body?.image != null && body?.image != undefined) {
            //     let [folder_name, image_name] = await URL_decode(response?.image)
            //     await deleteImage(image_name, folder_name)
            // }
            return res.status(200).json(new common_1.apiResponse(200, 'Profile updated successfully', response));
        }
        else
            return res.status(404).json(new common_1.apiResponse(404, 'Database error while updating profile', {}));
    }
    catch (error) {
        return res.status(500).json(new common_1.apiResponse(500, helpers_1.responseMessage?.internalServerError, error));
    }
};
exports.updateProfile = updateProfile;
const switchWorkSpace = async (req, res) => {
    (0, winston_logger_1.reqInfo)(req);
    let user = req.header('user'), response, body = req.body;
    console.log(req);
    try {
        let findWorkSpace = await database_1.workSpaceModel.findOne({ _id: ObjectId(req.params.id), isActive: true });
        if (findWorkSpace) {
            response = await database_1.userModel.findOneAndUpdate({ _id: ObjectId(user._id), isActive: true, $or: [{ userType: 1 }, { userType: 2 }] }, { workSpaceId: ObjectId(req.params.id) }, { new: true });
            if (response)
                return res.status(200).json(new common_1.apiResponse(200, "Work space switched successfully!", response));
            else
                return res.status(400).json(new common_1.apiResponse(400, "You can not switch workspace!", {}));
        }
        else {
            return res.status(400).json(new common_1.apiResponse(400, helpers_1.responseMessage.getDataNotFound('work space'), {}));
        }
    }
    catch (error) {
        console.log(error);
        return res.status(500).json(new common_1.apiResponse(500, helpers_1.responseMessage?.internalServerError, error));
    }
};
exports.switchWorkSpace = switchWorkSpace;
const getVolunteers = async (req, res) => {
    (0, winston_logger_1.reqInfo)(req);
    let user = req.header('user'), response, match = {};
    let queryname = req.headers.name || '';
    let phonenumber = req.headers.number || '';
    try {
        if (user?.workSpaceId) {
            match.$or = [{ workSpaceId: ObjectId(user?.workSpaceId) }, { workSpaceId: null }];
        }
        else {
            match.workSpaceId = null;
        }
        response = await database_1.userModel.aggregate([
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
                        $regex: queryname,
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
                            workSpaceId: ObjectId(user?.workSpaceId),
                        },
                    ],
                },
            },
            {
                $sort: {
                    createdAt: -1,
                },
            },
        ]);
        if (response)
            return res.status(200).json(new common_1.apiResponse(200, helpers_1.responseMessage.getDataSuccess('volunteers'), response));
        else
            return res.status(404).json(new common_1.apiResponse(404, helpers_1.responseMessage.getDataNotFound('volunteers'), {}));
    }
    catch (error) {
        return res.status(500).json(new common_1.apiResponse(500, helpers_1.responseMessage?.internalServerError, error));
    }
};
exports.getVolunteers = getVolunteers;
const updateVolunteerPosition = async (req, res) => {
    (0, winston_logger_1.reqInfo)(req);
    let body = req.body, response, user = req.header('user');
    try {
        if (body.userType == 0) {
            if (!body.workSpaceId) {
                return res.status(404).json(new common_1.apiResponse(400, 'workSpaceId is required!', {}));
            }
            response = await database_1.userModel.findOneAndUpdate({ _id: ObjectId(body.id), isActive: true }, body, { new: true });
        }
        else if (body.userType == 1) {
            // body.workSpaceId = null;
            if (!body.workSpaceId) {
                return res.status(404).json(new common_1.apiResponse(400, 'workSpaceId is required!', {}));
            }
            response = await database_1.userModel.findOneAndUpdate({ _id: ObjectId(body.id), isActive: true }, body, { new: true });
        }
        else {
            if (!body.workSpaceId) {
                return res.status(404).json(new common_1.apiResponse(400, 'workSpaceId is required!', {}));
            }
            response = await database_1.userModel.findOneAndUpdate({ _id: ObjectId(body.id), isActive: true }, body, { new: true });
        }
        if (response) {
            return res.status(200).json(new common_1.apiResponse(200, 'Volunteer position or tags changed!', {}));
        }
        else
            return res.status(404).json(new common_1.apiResponse(404, 'Database error while changing volunteer position and tags', {}));
    }
    catch (error) {
        return res.status(500).json(new common_1.apiResponse(500, helpers_1.responseMessage?.internalServerError, error));
    }
};
exports.updateVolunteerPosition = updateVolunteerPosition;
const addVolunteer = async (req, res) => {
    (0, winston_logger_1.reqInfo)(req);
    let body = req.body, user = req.header('user');
    try {
        let isAlready = await database_1.userModel.findOne({ $or: [{ email: body.email }, { mobileNumber: body.mobileNumber }], isActive: true });
        if (isAlready?.email == body?.email)
            return res.status(409).json(new common_1.apiResponse(409, helpers_1.responseMessage?.alreadyEmail, {}));
        if (isAlready?.mobileNumber == body?.mobileNumber)
            return res.status(409).json(new common_1.apiResponse(409, helpers_1.responseMessage?.alreadyMobileNumber, {}));
        body.volunteerId = await (0, generateCode_1.generateVolunteerCode)();
        let response = await new database_1.userModel(body).save();
        if (response) {
            return res.status(200).json(new common_1.apiResponse(200, 'Volunteer added successfully!', {}));
        }
        else
            return res.status(404).json(new common_1.apiResponse(404, 'Volunteer add time some error occur!', {}));
    }
    catch (error) {
        return res.status(500).json(new common_1.apiResponse(500, helpers_1.responseMessage?.internalServerError, error));
    }
};
exports.addVolunteer = addVolunteer;
const deleteUser = async (req, res) => {
    (0, winston_logger_1.reqInfo)(req);
    let user = req.header('user');
    try {
        let response = await database_1.userModel.findOneAndUpdate({ _id: ObjectId(user._id), isActive: true }, { isActive: false });
        if (response) {
            return res.status(200).json(new common_1.apiResponse(200, 'User successfully deleted!', {}));
        }
        else
            return res.status(404).json(new common_1.apiResponse(501, helpers_1.responseMessage?.updateDataError('User'), {}));
    }
    catch (error) {
        return res.status(500).json(new common_1.apiResponse(500, helpers_1.responseMessage?.internalServerError, error));
    }
};
exports.deleteUser = deleteUser;
const logoutUser = async (req, res) => {
    (0, winston_logger_1.reqInfo)(req);
    let user = req.header('user');
    try {
        const user_session = await (0, jwt_1.deleteSession)(user._id);
        if (user_session.deletedCount > 0) {
            return res.status(200).json(new common_1.apiResponse(200, helpers_1.responseMessage?.logoutSuccess, {}));
        }
        else {
            return res.status(404).json(new common_1.apiResponse(501, helpers_1.responseMessage?.logoutFailure('User'), {}));
        }
    }
    catch (error) {
        return res.status(500).json(new common_1.apiResponse(500, helpers_1.responseMessage?.internalServerError, error.message));
    }
};
exports.logoutUser = logoutUser;
//# sourceMappingURL=user.js.map