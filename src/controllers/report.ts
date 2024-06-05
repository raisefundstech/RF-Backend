import { Request, Response } from "express";

import ExcelJS from "exceljs";

import { apiResponse } from "../common";
import { reqInfo, responseMessage } from "../helpers";
import { eventModel, userModel } from "../database";
import { userRoles } from "./types";
import { getVolunteersByEvent } from "./user";
import { volunteerInfoByEvent } from "../helpers/eventQueries";
import { S3 } from "aws-sdk";
import config from "config";

const ObjectId = require("mongoose").Types.ObjectId;

const aws: any = config.get("aws");
const s3 = new S3({
  accessKeyId: aws.accessKeyId,
  secretAccessKey: aws.secretAccessKey,
  region: aws.region,
});
/**
 * Retrieves Event Volunteers Report.
 *
 * @param req - The request object.
 * @param res - The response object.
 * @returns A JSON response with the volunteers' information.
 */
export const getEventVolunteers = async (req: Request, res: Response) => {
  reqInfo(req);
  let user: any = req.header("user"),
    response: any,
    body = req.body;
  let userStatus = await userModel.findOne({ _id: ObjectId(user._id) });
  if (userStatus?.userType == userRoles.VOLUNTEER) {
    return res
      .status(403)
      .json(new apiResponse(403, responseMessage?.deniedPermission, {}));
  }
  try {
    req.params.id = body.id;

    const pipeline = await volunteerInfoByEvent(req, user);
    response = await eventModel.aggregate(pipeline);

    if (response.length == 0) {
      return res
        .status(204)
        .json(
          new apiResponse(204, responseMessage.getDataNotFound("events"), {})
        );
    }

    const workbook = new ExcelJS.Workbook();

    const worksheet = workbook.addWorksheet("Event Volunteers");

    worksheet.columns = [
      { header: "First Name", key: "firstName", width: 20 },
      { header: "Last Name", key: "lastName", width: 20 },
      { header: "Mobile Number", key: "mobileNumber", width: 20 },
      { header: "RBS Id", key: "rbsId", width: 20 },
      { header: "RBS Image", key: "rbsImage", width: 20 },
    ];

    response[0].volunteerRequest
      .filter((v: any) => {
        return v.requestStatus === req.body.volunteersEventStatus;
      })
      .forEach((volunteer: any) => {
        worksheet.addRow({
          firstName: volunteer?.userDetails?.firstName,
          lastName: volunteer?.userDetails?.lastName,
          mobileNumber: volunteer?.userDetails?.mobileNumber,
          rbsId: volunteer?.userDetails?.rbsId,
          rbsImage: volunteer?.userDetails?.isRBSAvailable && {
            text: "Click to View Certificate",
            hyperlink: volunteer?.userDetails?.rbsImage,
          },
        });
      });

    // USE This for the image url
    //userProfile?.rbsImage.replace(
    //  /:\/\/(.[^/]+)/,
    //  `://${Constants.AWS_IMAGES_CDN_HOST}`
    //);
    const xls = workbook.xlsx.writeBuffer();

    let fileName = `event-volunteers-report-${new Date().getTime()}.xlsx`;
    let s3Location;

    // write this file to AWS S3
    workbook.xlsx.writeBuffer().then((data: any) => {
      const params = {
        Bucket: aws.bucket_name,
        Key: `reports/event-volunteers-report-${new Date().getTime()}.xlsx`,
        Body: data,
        ContentType:
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      };
      s3.upload(params, (err: any, data: any) => {
        if (err) {
          console.log("Error", err);
        }
        s3Location = data.Location;
        console.log("Upload Success", data.Location);

        return res.status(200).json(
          new apiResponse(200, responseMessage.getDataSuccess("events"), {
            s3Location,
          })
        );
      });
    });
  } catch (error) {
    return res
      .status(500)
      .json(new apiResponse(500, responseMessage?.customMessage(error), {}));
  }
};
