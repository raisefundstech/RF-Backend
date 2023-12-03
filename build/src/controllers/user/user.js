"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getUnverifiedVolunteers = exports.logoutUser = exports.deleteUser = exports.addVolunteer = exports.updateVolunteerPosition = exports.getVolunteer = exports.getVolunteers = exports.switchWorkSpace = exports.updateProfile = exports.getProfile = void 0;
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
// This function is responsible for retrieving the details of a volunteer.
// It checks the user's permission and returns the volunteer's information if the user is an admin or a super-volunteer.
// The volunteer ID is required as a parameter in the request.
// If the volunteer is found, it returns a success response with the volunteer's details.
// If the volunteer is not found, it returns a not found response.
// If the user does not have the necessary permission, it returns an unauthorized response.
// If there is an error during the process, it returns a server error response.
const getVolunteer = async (req, res) => {
    (0, winston_logger_1.reqInfo)(req);
    const user = req.header('user') || '';
    try {
        const userStatus = await database_1.userModel.findOne({ _id: ObjectId(user._id) }, { userType: 1 });
        if (userStatus?.userType === 1 || userStatus?.userType === 2) {
            if (!req.params.id) {
                return res.status(400).json(new common_1.apiResponse(400, 'Volunteer ID is required!', {}));
            }
            const response = await database_1.userModel.findById(req.params.id, { otp: 0, otpExpireTime: 0, device_token: 0 });
            if (response) {
                return res.status(200).json(new common_1.apiResponse(200, helpers_1.responseMessage.getDataSuccess('volunteer'), response));
            }
            else {
                return res.status(404).json(new common_1.apiResponse(404, helpers_1.responseMessage.getDataNotFound('volunteer'), {}));
            }
        }
        else {
            return res.status(401).json(new common_1.apiResponse(401, helpers_1.responseMessage.deniedPermission, {}));
        }
    }
    catch (error) {
        return res.status(500).json(new common_1.apiResponse(500, helpers_1.responseMessage?.internalServerError, error));
    }
};
exports.getVolunteer = getVolunteer;
const updateVolunteerPosition = async (req, res) => {
    (0, winston_logger_1.reqInfo)(req);
    let body = req.body, response, user = req.header('user');
    let userAuthority = await database_1.userModel.findOne({ _id: ObjectId(user._id), isActive: true }, { userType: 1 });
    try {
        if (userAuthority == 1 || userAuthority == 2) {
            if (!body.workSpaceId) {
                return res.status(404).json(new common_1.apiResponse(400, 'workSpaceId is required!', {}));
            }
            response = await database_1.userModel.findOneAndUpdate({ _id: ObjectId(body.id), isActive: true }, body, { new: true });
        }
        if (response) {
            return res.status(200).json(new common_1.apiResponse(200, 'Volunteer position or tags changed!', {}));
        }
        else
            return res.status(404).json(new common_1.apiResponse(404, 'Error occured while updating volunteer information', {}));
    }
    catch (error) {
        return res.status(500).json(new common_1.apiResponse(500, helpers_1.responseMessage?.internalServerError, error));
    }
};
exports.updateVolunteerPosition = updateVolunteerPosition;
// This function is responsible for adding a new volunteer which can be performed by an admin or a super-volunteer.
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
        const user_session = await (0, jwt_1.deleteSession)(user._id, req.headers['authorization']);
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
const getUnverifiedVolunteers = async (req, res) => {
    (0, winston_logger_1.reqInfo)(req);
    let user = req.header('user');
    let workspaceId = req.header('workspaceId'); // Scan workspaceId from request header
    try {
        const response = await database_1.userModel.find({ workSpaceId: workspaceId, isActive: true, userRole: "NOT_VERIFIED" });
        if (response) {
            return res.status(200).json(new common_1.apiResponse(200, helpers_1.responseMessage.getDataSuccess('unverified volunteers'), response));
        }
        else {
            return res.status(404).json(new common_1.apiResponse(404, helpers_1.responseMessage.getDataNotFound('unverified volunteers'), {}));
        }
    }
    catch (error) {
        return res.status(500).json(new common_1.apiResponse(500, helpers_1.responseMessage?.internalServerError, error.message));
    }
};
exports.getUnverifiedVolunteers = getUnverifiedVolunteers;
//# sourceMappingURL=user.js.map