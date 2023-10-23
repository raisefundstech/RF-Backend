"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getVolunteerByWorkSpace = exports.get_workSpace_pagination = exports.deleteWorkSpace = exports.getWorkSpaceById = exports.getWorkSpaceByManager = exports.getWorkSpace = exports.updateWorkSpace = exports.createWorkSpace = void 0;
const async_1 = __importDefault(require("async"));
const winston_logger_1 = require("../../helpers/winston_logger");
const common_1 = require("../../common");
const helpers_1 = require("../../helpers");
const database_1 = require("../../database");
const ObjectId = require('mongoose').Types.ObjectId;
const createWorkSpace = async (req, res) => {
    (0, winston_logger_1.reqInfo)(req);
    let user = req.header('user'), response, body = req.body, search = new RegExp(`^${body.name}$`, "ig");
    try {
        let isExist = await database_1.workSpaceModel.findOne({ name: { $regex: search }, isActive: true });
        if (isExist) {
            return res.status(409).json(new common_1.apiResponse(409, helpers_1.responseMessage?.dataAlreadyExist('work space'), {}));
        }
        body.createdBy = user?._id;
        response = await new database_1.workSpaceModel(body).save();
        if (response)
            return res.status(200).json(new common_1.apiResponse(200, helpers_1.responseMessage.addDataSuccess('work space'), response));
        else
            return res.status(400).json(new common_1.apiResponse(400, helpers_1.responseMessage.addDataError, {}));
    }
    catch (error) {
        return res.status(500).json(new common_1.apiResponse(500, helpers_1.responseMessage?.internalServerError, error));
    }
};
exports.createWorkSpace = createWorkSpace;
const updateWorkSpace = async (req, res) => {
    (0, winston_logger_1.reqInfo)(req);
    let user = req.header('user'), response, body = req.body;
    try {
        body.updatedBy = user?._id;
        response = await database_1.workSpaceModel.findOneAndUpdate({ _id: ObjectId(body.id), isActive: true }, body, { new: true });
        if (response)
            return res.status(200).json(new common_1.apiResponse(200, helpers_1.responseMessage.updateDataSuccess('work space'), response));
        else
            return res.status(400).json(new common_1.apiResponse(400, helpers_1.responseMessage.updateDataError('work space'), {}));
    }
    catch (error) {
        return res.status(500).json(new common_1.apiResponse(500, helpers_1.responseMessage?.internalServerError, error));
    }
};
exports.updateWorkSpace = updateWorkSpace;
const getWorkSpace = async (req, res) => {
    (0, winston_logger_1.reqInfo)(req);
    let user = req.header('user'), response;
    try {
        response = await database_1.workSpaceModel.find({ isActive: true }, { name: 1, address: 1, latitude: 1, longitude: 1 }).sort({ createdAt: -1 });
        if (response)
            return res.status(200).json(new common_1.apiResponse(200, helpers_1.responseMessage.getDataSuccess('work space'), response));
        else
            return res.status(400).json(new common_1.apiResponse(400, helpers_1.responseMessage.getDataNotFound('work space'), {}));
    }
    catch (error) {
        return res.status(500).json(new common_1.apiResponse(500, helpers_1.responseMessage?.internalServerError, error));
    }
};
exports.getWorkSpace = getWorkSpace;
const getWorkSpaceByManager = async (req, res) => {
    (0, winston_logger_1.reqInfo)(req);
    let user = req.header('user'), response;
    try {
        if (user.type == 2) {
            response = await database_1.workSpaceModel.find({ isActive: true, createdBy: ObjectId(user._id) }).sort({ createdAt: -1 });
            return res.status(200).json(new common_1.apiResponse(200, helpers_1.responseMessage.getDataSuccess('work space'), response));
        }
        else {
            return res.status(400).json(new common_1.apiResponse(400, helpers_1.responseMessage.getDataNotFound('work space'), []));
        }
    }
    catch (error) {
        return res.status(500).json(new common_1.apiResponse(500, helpers_1.responseMessage?.internalServerError, error));
    }
};
exports.getWorkSpaceByManager = getWorkSpaceByManager;
const getWorkSpaceById = async (req, res) => {
    (0, winston_logger_1.reqInfo)(req);
    let user = req.header('user'), response;
    try {
        response = await database_1.workSpaceModel.findOne({ _id: ObjectId(req.params.id), isActive: true });
        if (response)
            return res.status(200).json(new common_1.apiResponse(200, helpers_1.responseMessage.getDataSuccess('work space'), response));
        else
            return res.status(400).json(new common_1.apiResponse(400, helpers_1.responseMessage.getDataNotFound('work space'), {}));
    }
    catch (error) {
        return res.status(500).json(new common_1.apiResponse(500, helpers_1.responseMessage?.internalServerError, error));
    }
};
exports.getWorkSpaceById = getWorkSpaceById;
const deleteWorkSpace = async (req, res) => {
    (0, winston_logger_1.reqInfo)(req);
    let user = req.header('user'), response;
    try {
        response = await database_1.workSpaceModel.findOneAndUpdate({ _id: ObjectId(req.params.id), isActive: true }, { isActive: false });
        if (response)
            return res.status(200).json(new common_1.apiResponse(200, helpers_1.responseMessage.deleteDataSuccess('work space'), {}));
        else
            return res.status(400).json(new common_1.apiResponse(400, helpers_1.responseMessage.getDataNotFound('work space'), {}));
    }
    catch (error) {
        return res.status(500).json(new common_1.apiResponse(500, helpers_1.responseMessage?.internalServerError, error));
    }
};
exports.deleteWorkSpace = deleteWorkSpace;
const get_workSpace_pagination = async (req, res) => {
    (0, winston_logger_1.reqInfo)(req);
    let { search, page, limit } = req.body, workSpace_data, match = {}, workSpace_count;
    try {
        if (search) {
            var nameArray = [];
            search = search.split(" ");
            search.forEach(data => {
                nameArray.push({ name: { $regex: data, $options: 'si' } });
            });
            match.$or = [{ $and: nameArray }];
        }
        [workSpace_data, workSpace_count] = await async_1.default.parallel([
            (callback) => {
                database_1.workSpaceModel.aggregate([
                    { $match: { isActive: true, ...match } },
                    { $sort: { createdAt: -1 } },
                    { $skip: ((page) - 1) * (limit) },
                    { $limit: (limit) }
                ]).then(data => { callback(null, data); }).catch(err => { console.log(err); });
            },
            (callback) => { database_1.workSpaceModel.countDocuments({ isActive: true, ...match }).then(data => { callback(null, data); }).catch(err => { console.log(err); }); },
        ]);
        return res.status(200).json(new common_1.apiResponse(200, helpers_1.responseMessage.getDataSuccess('work space'), {
            workSpace_data: workSpace_data,
            state: {
                page: page,
                limit: limit,
                page_limit: Math.ceil(workSpace_count / (limit))
            }
        }));
    }
    catch (error) {
        console.log(error);
        return res.status(500).json(new common_1.apiResponse(500, helpers_1.responseMessage?.internalServerError, {}));
    }
};
exports.get_workSpace_pagination = get_workSpace_pagination;
const getVolunteerByWorkSpace = async (req, res) => {
    (0, winston_logger_1.reqInfo)(req);
    let user = req.header('user'), response;
    try {
        console.log("logging info" + " " + req.params);
        response = await database_1.userModel.find({ workSpaceId: ObjectId(req.params.id), isActive: true }, { countryOfOrigin: 0, createdAt: 0, updatedAt: 0, yearOfEducationCompletion: 0, YearOfCameToUSA: 0, otp: 0, otpExpireTime: 0, device_token: 0, latitude: 0, longitude: 0, loginType: 0 }).sort({ createdAt: -1 });
        if (response)
            return res.status(200).json(new common_1.apiResponse(200, helpers_1.responseMessage.getDataSuccess('user'), response));
        else
            return res.status(400).json(new common_1.apiResponse(400, helpers_1.responseMessage.getDataNotFound('user'), {}));
    }
    catch (error) {
        return res.status(500).json(new common_1.apiResponse(500, helpers_1.responseMessage?.internalServerError, error));
    }
};
exports.getVolunteerByWorkSpace = getVolunteerByWorkSpace;
//# sourceMappingURL=workSpace.js.map