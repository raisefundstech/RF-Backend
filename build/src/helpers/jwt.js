"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.userJWT = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const config_1 = __importDefault(require("config"));
const database_1 = require("../database");
const mongoose_1 = __importDefault(require("mongoose"));
const common_1 = require("../common");
const response_1 = require("./response");
const ObjectId = mongoose_1.default.Types.ObjectId;
const jwt_token_secret = config_1.default.get('jwt_token_secret');
const userJWT = async (req, res, next) => {
    let { authorization } = req.headers, result;
    if (authorization) {
        try {
            let isVerifyToken = jsonwebtoken_1.default.verify(authorization, jwt_token_secret);
            result = await database_1.userModel.findOne({ _id: new ObjectId(isVerifyToken?._id), isActive: true });
            if (result?.isActive == true) {
                req.headers.user = isVerifyToken;
                return next();
            }
            else {
                return res.status(401).json(new common_1.apiResponse(401, response_1.responseMessage.invalidToken, {}));
            }
        }
        catch (err) {
            if (err.message == "invalid signature")
                return res.status(401).json(new common_1.apiResponse(401, response_1.responseMessage.differentToken, {}));
            console.log(err);
            return res.status(401).json(new common_1.apiResponse(401, response_1.responseMessage.invalidToken, {}));
        }
    }
    else {
        return res.status(401).json(new common_1.apiResponse(401, response_1.responseMessage.tokenNotFound, {}));
    }
};
exports.userJWT = userJWT;
//# sourceMappingURL=jwt.js.map