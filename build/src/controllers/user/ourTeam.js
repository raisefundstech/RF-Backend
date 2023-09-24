"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getOurTeam = exports.updateOurTeam = exports.createOurTeam = void 0;
const winston_logger_1 = require("../../helpers/winston_logger");
const common_1 = require("../../common");
const helpers_1 = require("../../helpers");
const database_1 = require("../../database");
const ObjectId = require('mongoose').Types.ObjectId;
const createOurTeam = async (req, res) => {
    (0, winston_logger_1.reqInfo)(req);
    let response, body = req.body;
    try {
        response = await new database_1.ourTeamModel(body).save();
        if (response)
            return res.status(200).json(new common_1.apiResponse(200, helpers_1.responseMessage.addDataSuccess('meet our team'), response));
        else
            return res.status(400).json(new common_1.apiResponse(400, helpers_1.responseMessage.addDataError, {}));
    }
    catch (error) {
        return res.status(500).json(new common_1.apiResponse(500, helpers_1.responseMessage?.internalServerError, error));
    }
};
exports.createOurTeam = createOurTeam;
const updateOurTeam = async (req, res) => {
    (0, winston_logger_1.reqInfo)(req);
    let response, body = req.body;
    try {
        response = await database_1.ourTeamModel.findOneAndUpdate({ _id: ObjectId(body.id), isActive: true }, body, { new: true });
        if (response)
            return res.status(200).json(new common_1.apiResponse(200, helpers_1.responseMessage.updateDataSuccess('meet our team'), response));
        else
            return res.status(400).json(new common_1.apiResponse(400, helpers_1.responseMessage.updateDataError('meet our team'), {}));
    }
    catch (error) {
        return res.status(500).json(new common_1.apiResponse(500, helpers_1.responseMessage?.internalServerError, error));
    }
};
exports.updateOurTeam = updateOurTeam;
const getOurTeam = async (req, res) => {
    (0, winston_logger_1.reqInfo)(req);
    let response;
    try {
        response = await database_1.ourTeamModel.find({ isActive: true });
        if (response)
            return res.status(200).json(new common_1.apiResponse(200, helpers_1.responseMessage.getDataSuccess('meet our team'), response));
        else
            return res.status(400).json(new common_1.apiResponse(400, helpers_1.responseMessage.getDataNotFound('meet our team'), {}));
    }
    catch (error) {
        return res.status(500).json(new common_1.apiResponse(500, helpers_1.responseMessage?.internalServerError, error));
    }
};
exports.getOurTeam = getOurTeam;
//# sourceMappingURL=ourTeam.js.map