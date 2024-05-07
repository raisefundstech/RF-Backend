import { Request, Response } from "express";

import ExcelJS from "exceljs";

import { apiResponse } from "../common";
import { reqInfo, responseMessage } from "../helpers";
import { eventModel, userModel } from "../database";
import { userRoles } from "./types";
import { getVolunteersByEvent } from "./user";
import { volunteerInfoByEvent } from "../helpers/eventQueries";

const ObjectId = require("mongoose").Types.ObjectId;

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
  let userStatus = await userModel.findOne(
    { _id: ObjectId(user._id) },
    { userType: 1 }
  );
  if (userStatus?.userType == userRoles.VOLUNTEER) {
    return res
      .status(403)
      .json(new apiResponse(403, responseMessage?.deniedPermission, {}));
  }
  try {
    const pipeline = await volunteerInfoByEvent(req, user);
    response = await eventModel.aggregate(pipeline);
    // If the userStatus represent the user is a volunteer delete the volunteerRequest from the response
    if (userStatus?.userType === 0) {
      response[0].volunteerRequest = response[0]?.volunteerRequest.filter(
        (data: any) => data?.volunteerId?.toString() === user?._id?.toString()
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

    response[0].volunteerRequest.forEach((volunteer: any) => {
      worksheet.addRow({
        firstName: volunteer?.userDetails?.firstName,
        lastName: volunteer?.userDetails?.lastName,
        mobileNumber: volunteer?.userDetails?.mobileNumber,
        rbsId: volunteer?.userDetails?.rbsId,
        rbsImage: volunteer?.userDetails?.rbsImage,
      });
    });

    // USE This for the image url
    //userProfile?.rbsImage.replace(
    //  /:\/\/(.[^/]+)/,
    //  `://${Constants.AWS_IMAGES_CDN_HOST}`
    //);
    const xls = workbook.xlsx.writeBuffer();

    // res is a Stream object
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader(
      "Content-Disposition",
      "attachment; filename=" + "events.xlsx"
    );
    return workbook.xlsx.write(res).then(function () {
      res.status(200).end();
    });

    //if (response)
    //  return res
    //    .status(200)
    //    .json(
    //      new apiResponse(
    //        200,
    //        responseMessage.getDataSuccess("volunteers"),
    //        {}
    //      )
    //    );
    //else
    //  return res
    //    .status(404)
    //    .json(
    //      new apiResponse(404, responseMessage.getDataNotFound("events"), {})
    //    );
  } catch (error) {
    return res
      .status(500)
      .json(new apiResponse(500, responseMessage?.customMessage(error), {}));
  }
};
