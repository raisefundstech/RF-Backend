"use strict";
import multer from "multer";
import AWS from "aws-sdk";
import config from "config";
import { logger, reqInfo } from "./winston_logger";
import multerS3 from "multer-s3";
import { Request, Response } from "express";
import { apiResponse } from "../common";
import multer_s3_transform from "multer-s3-transform";
import sharp from "sharp";
import { responseMessage } from "./response";
const { S3Client } = require("@aws-sdk/client-s3");

const aws: any = config.get("aws");
const s3 = new AWS.S3({
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
export const deleteImage = async function (file: any, folder: any) {
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
        } else {
          logger.info("File successfully delete");
          resolve("File successfully delete");
        }
      });
    } catch (error) {
      console.log(error);
      reject();
    }
  });
};

export const upload_all_type = async function (image, bucketPath) {
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
      logger.debug("Uploading S3");
      s3.upload(params, function (err, data) {
        if (err) {
          console.log(err);
          reject();
        } else {
          logger.debug("Successfully uploaded data ");
          resolve(data.Location);
        }
      });
    } catch (error) {
      console.log(error);
      reject();
    }
  });
};

export const compress_image = multer({
  storage: multer_s3_transform({
    s3: s3,
    bucket: bucket_name,
    acl: "public-read",
    contentType: multerS3.AUTO_CONTENT_TYPE,
    shouldTransform: function (req, file, cb) {
      cb(null, { fieldName: file.fieldname });
    },
    transforms: [
      {
        id: "thumbnail",
        key: function (req, file, cb) {
          const file_type = file.originalname.split(".");
          req.body.location = `${req.params.file
            }/${Date.now().toString()}.${file_type[file_type.length - 1]}`;
          cb(
            null,
            `${req.params.file
            }/${Date.now().toString()}.${file_type[file_type.length - 1]}`
          );
        },
        transform: function (req, file, cb) {
          logger.info("compress image successfully upload");
          cb(null, sharp().withMetadata().jpeg({ quality: 50 }));
        },
      },
    ],
  }),
});

export const uploadS3 = multer({
  storage: multerS3({
    s3: s3s,
    bucket: bucket_name,
    acl: "public-read",
    contentType: multerS3.AUTO_CONTENT_TYPE,
    metadata: function (req: any, file, cb) {
      cb(null, { fieldName: file.fieldname });
    },
    key: function (req: any, file, cb) {
      logger.info("file successfully upload");
      const file_type = file.originalname.split(".");
      req.body.location = `${bucket_url}/${req.params.file
        }/${Date.now().toString()}.${file_type[file_type.length - 1]}`;
      cb(
        null,
        `${req.params.file
        }/${Date.now().toString()}.${file_type[file_type.length - 1]}`
      );
    },
  }),
});

export const file_upload_response = async (req: Request, res: Response) => {
  reqInfo(req);
  try {
    return res.status(200).json(
      new apiResponse(200, responseMessage.fileUploadSuccess, {
        image: req.body.location,
      })
    );
  } catch (error) {
    console.log(error);
    return res
      .status(500)
      .json(new apiResponse(500, responseMessage.internalServerError, error));
  }
};

export const image_compress_response = async (req: Request, res: Response) => {
  reqInfo(req);
  try {
    return res.status(200).json(
      new apiResponse(200, responseMessage.fileUploadSuccess, {
        image: req.body.location,
      })
    );
  } catch (error) {
    console.log(error);
    return res
      .status(500)
      .json(new apiResponse(500, responseMessage.internalServerError, error));
  }
};

export const delete_file = async (req: Request, res: Response) => {
  reqInfo(req);
  let { file, folder } = req.params;
  try {
    let message = await deleteImage(file, folder);
    return res.status(200).json(new apiResponse(200, `${message}`, {}));
  } catch (error) {
    console.log(error);
    return res
      .status(500)
      .json(new apiResponse(500, responseMessage.internalServerError, error));
  }
};
