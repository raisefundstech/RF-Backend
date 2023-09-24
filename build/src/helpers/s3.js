"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.delete_file = exports.image_compress_response = exports.file_upload_response = exports.uploadS3 = exports.compress_image = exports.upload_all_type = exports.deleteImage = void 0;
const multer_1 = __importDefault(require("multer"));
const aws_sdk_1 = __importDefault(require("aws-sdk"));
const config_1 = __importDefault(require("config"));
const winston_logger_1 = require("./winston_logger");
const multer_s3_1 = __importDefault(require("multer-s3"));
const common_1 = require("../common");
const multer_s3_transform_1 = __importDefault(require("multer-s3-transform"));
const sharp_1 = __importDefault(require("sharp"));
const response_1 = require("./response");
const { S3Client } = require("@aws-sdk/client-s3");
const aws = config_1.default.get("aws");
const s3 = new aws_sdk_1.default.S3({
    accessKeyId: aws.accessKeyId,
    secretAccessKey: aws.secretAccessKey,
    region: aws.region,
});
const bucket_name = aws.bucket_name;
const bucket_url = aws.bucket_url;
const s3s = new S3Client({
    region: aws.region,
    credentials: {
        accessKeyId: aws.accessKeyId,
        secretAccessKey: aws.secretAccessKey,
    },
});
const deleteImage = async function (file, folder) {
    return new Promise(async function (resolve, reject) {
        try {
            const bucketPath = `${bucket_name}/${folder}`;
            let params = {
                Bucket: bucketPath,
                Key: file,
            };
            await s3.deleteObject(params, function (err, data) {
                if (err) {
                    console.log(err);
                    reject(err);
                }
                else {
                    winston_logger_1.logger.info("File successfully delete");
                    resolve("File successfully delete");
                }
            });
        }
        catch (error) {
            console.log(error);
            reject();
        }
    });
};
exports.deleteImage = deleteImage;
const upload_all_type = async function (image, bucketPath) {
    return new Promise(async function (resolve, reject) {
        try {
            // image.data = await compressImage(image)
            var params = {
                Bucket: `${bucket_name}/${bucketPath}`,
                Key: image.name,
                Body: image.data,
                ContentType: image.mimetype,
                ACL: "public-read",
            };
            winston_logger_1.logger.debug("Uploading S3");
            s3.upload(params, function (err, data) {
                if (err) {
                    console.log(err);
                    reject();
                }
                else {
                    winston_logger_1.logger.debug("Successfully uploaded data ");
                    resolve(data.Location);
                }
            });
        }
        catch (error) {
            console.log(error);
            reject();
        }
    });
};
exports.upload_all_type = upload_all_type;
exports.compress_image = (0, multer_1.default)({
    storage: (0, multer_s3_transform_1.default)({
        s3: s3,
        bucket: bucket_name,
        acl: "public-read",
        contentType: multer_s3_1.default.AUTO_CONTENT_TYPE,
        shouldTransform: function (req, file, cb) {
            cb(null, { fieldName: file.fieldname });
        },
        transforms: [
            {
                id: "thumbnail",
                key: function (req, file, cb) {
                    const file_type = file.originalname.split(".");
                    req.body.location = `${req.params.file}/${Date.now().toString()}.${file_type[file_type.length - 1]}`;
                    cb(null, `${req.params.file}/${Date.now().toString()}.${file_type[file_type.length - 1]}`);
                },
                transform: function (req, file, cb) {
                    winston_logger_1.logger.info("compress image successfully upload");
                    cb(null, (0, sharp_1.default)().withMetadata().jpeg({ quality: 50 }));
                },
            },
        ],
    }),
});
exports.uploadS3 = (0, multer_1.default)({
    storage: (0, multer_s3_1.default)({
        s3: s3s,
        bucket: bucket_name,
        acl: "public-read",
        contentType: multer_s3_1.default.AUTO_CONTENT_TYPE,
        metadata: function (req, file, cb) {
            cb(null, { fieldName: file.fieldname });
        },
        key: function (req, file, cb) {
            winston_logger_1.logger.info("file successfully upload");
            const file_type = file.originalname.split(".");
            req.body.location = `${bucket_url}/${req.params.file}/${Date.now().toString()}.${file_type[file_type.length - 1]}`;
            cb(null, `${req.params.file}/${Date.now().toString()}.${file_type[file_type.length - 1]}`);
        },
    }),
});
const file_upload_response = async (req, res) => {
    (0, winston_logger_1.reqInfo)(req);
    try {
        return res.status(200).json(new common_1.apiResponse(200, response_1.responseMessage.fileUploadSuccess, {
            image: req.body.location,
        }));
    }
    catch (error) {
        console.log(error);
        return res
            .status(500)
            .json(new common_1.apiResponse(500, response_1.responseMessage.internalServerError, error));
    }
};
exports.file_upload_response = file_upload_response;
const image_compress_response = async (req, res) => {
    (0, winston_logger_1.reqInfo)(req);
    try {
        return res.status(200).json(new common_1.apiResponse(200, response_1.responseMessage.fileUploadSuccess, {
            image: req.body.location,
        }));
    }
    catch (error) {
        console.log(error);
        return res
            .status(500)
            .json(new common_1.apiResponse(500, response_1.responseMessage.internalServerError, error));
    }
};
exports.image_compress_response = image_compress_response;
const delete_file = async (req, res) => {
    (0, winston_logger_1.reqInfo)(req);
    let { file, folder } = req.params;
    try {
        let message = await (0, exports.deleteImage)(file, folder);
        return res.status(200).json(new common_1.apiResponse(200, `${message}`, {}));
    }
    catch (error) {
        console.log(error);
        return res
            .status(500)
            .json(new common_1.apiResponse(500, response_1.responseMessage.internalServerError, error));
    }
};
exports.delete_file = delete_file;
//# sourceMappingURL=s3.js.map