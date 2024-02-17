import { Request, Response } from "express";
import { workSpaceModel } from "../database/models/workSpace";
import { reqInfo, logger } from "../helpers/winston_logger";

const ObjectId = require("mongoose").Types.ObjectId;

/**
 * Retrieves the details of a stadium by its workspace ID within an event.
 * @param workSpaceId - The ID of the event.
 * @param stadiumId - The ID of the workspace.
 * @returns If the stadium is found, an object containing its details (name, address, latitude, longitude, stadiumPolicy).
 * If the stadium is not found, an object with an error message.
 */
export const getStadiumDetailsByWorkSpace = async (
  workSpaceId: string,
  stadiumId: string
) => {
  logger.info("logging info" + " " + workSpaceId + " " + stadiumId);
  try {
    let response = await workSpaceModel.findOne(
      {
        _id: ObjectId(workSpaceId),
        isActive: true,
        stadiums: { $elemMatch: { _id: ObjectId(stadiumId) } },
      },
      { "stadiums.$": 1 }
    );
    if (response) {
      const stadium = response.stadiums[0];
      const { name, address, latitude, longitude, stadiumPolicy } = stadium;
      return {
        _id: response._id,
        name,
        address,
        latitude,
        longitude,
        stadiumPolicy,
      };
    } else {
      return { error: "No stadium found" };
    }
  } catch (error) {
    return { error: error.message };
  }
};
