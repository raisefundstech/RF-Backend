import { eventModel, userModel, workSpaceModel } from "../database";
import { logger } from "./winston_logger";
import { volunteerRequestStatus } from "../controllers/types";
const ObjectId = require("mongoose").Types.ObjectId;

/**
 * Retrieves volunteer information for a specific event.
 * @param req - The request object.
 * @param user - The user object.
 * @returns A promise that resolves to an array of event documents.
 */
async function volunteerInfoByEvent(req: any, user: any): Promise<any> {
  const events = [
    {
      $match: {
        _id: ObjectId(req?.params?.id),
        isActive: true,
      },
    },
    {
      $lookup: {
        from: "users",
        localField: "volunteerRequest.volunteerId",
        foreignField: "_id",
        as: "volunteerDetails",
      },
    },
    {
      $project: {
        _id: 1,
        workSpaceId: 1,
        volunteerRequest: {
          $map: {
            input: "$volunteerRequest",
            as: "volReq",
            in: {
              volunteerId: "$$volReq.volunteerId",
              requestStatus: "$$volReq.requestStatus",
              attendance: "$$volReq.attendance",
              appliedAt: "$$volReq.appliedAt",
              checkedIn: "$$volReq.checkedIn",
              checkedOut: "$$volReq.checkedOut",
              userDetails: {
                $let: {
                  vars: {
                    userDetails: {
                      $arrayElemAt: [
                        {
                          $filter: {
                            input: "$volunteerDetails",
                            as: "volunteerDetail",
                            cond: {
                              $eq: [
                                "$$volunteerDetail._id",
                                "$$volReq.volunteerId",
                              ],
                            },
                          },
                        },
                        0,
                      ],
                    },
                  },
                  in: {
                    firstName: "$$userDetails.firstName",
                    lastName: "$$userDetails.lastName",
                    mobileNumber: "$$userDetails.mobileNumber",
                    image: "$$userDetails.image",
                    rbsImage: "$$userDetails.rbsImage",
                    isRBSAvailable: "$$userDetails.isRBSAvailable",
                  },
                },
              },
            },
          },
        },
        isApply: {
          $cond: [
            {
              $eq: [
                {
                  $filter: {
                    input: "$volunteerRequest",
                    as: "volunteerRequest",
                    cond: {
                      $eq: [
                        "$$volunteerRequest.volunteerId",
                        ObjectId(user._id),
                      ],
                    },
                  },
                },
                [],
              ],
            },
            false,
            true,
          ],
        },
        isEventOwn: {
          $cond: [{ $eq: ["$createdBy", ObjectId(user._id)] }, true, false],
        },
      },
    },
  ];
  return events;
}

/**
 * Applies the volunteer's request on an event.
 *
 * @param req - The request object.
 * @param userId - The ID of the volunteer.
 * @returns A promise that resolves to the response object.
 * @throws If an error occurs during the process.
 */
async function applyOnEvent(req: any, userId: string): Promise<any> {
  try {
    let response: any = {},
      body = req.body;
    const getEventData = await eventModel.findOne(
      { _id: ObjectId(body._id), isActive: true },
      { date: 1, startTime: 1, endTime: 1 }
    );
    const eventsAppliedOnSameDay = await eventModel.aggregate([
      {
        $match: {
          workSpaceId: ObjectId(body?.workSpaceId),
          isActive: true,
          $expr: {
            $eq: [
              {
                $dateToString: {
                  format: "%Y-%m-%d",
                  date: "$date",
                  timezone: "America/Los_Angeles",
                },
              },
              {
                $dateToString: {
                  format: "%Y-%m-%d",
                  date: getEventData.date,
                  timezone: "America/Los_Angeles",
                },
              },
            ],
          },
          volunteerRequest: {
            $elemMatch: { volunteerId: ObjectId(userId) },
          },
        },
      },
    ]);

    // console.log(eventsAppliedOnSameDay);
    if (eventsAppliedOnSameDay.length > 0) {
      response[
        "error"
      ] = `Volunteer has already applied to ${eventsAppliedOnSameDay?.[0]?.name} on the same day, please withdraw from this event and try again.`;
      return response;
    }

    // logger.info(eventsAppliedOnSameDay);

    // Check if volunteer has already applied
    const existingApplication = await eventModel.findOne({
      _id: ObjectId(body?._id),
      isActive: true,
      volunteerRequest: {
        $elemMatch: { volunteerId: ObjectId(userId) },
      },
    });

    if (existingApplication) {
      response["error"] = "Volunteer has already applied to this event.";
      return response;
    }

    response = await eventModel.findOneAndUpdate(
      {
        _id: ObjectId(body._id),
        isActive: true,
      },
      {
        $push: {
          volunteerRequest: {
            volunteerId: ObjectId(userId),
            requestStatus: "PENDING",
            appliedAt: new Date(),
          },
        },
      },
      { new: true }
    );
    return response;
  } catch (error) {
    throw error;
  }
}

/**
 * Checks the creation time of an event.
 *
 * @param req - The request object containing the event details.
 * @returns A promise that resolves to the result of the check.
 * @throws An error if the event date, start time, or end time is null, or if the event duration is less than 3 hours.
 */
async function checkEventCreationTime(req: any): Promise<any> {
  const {
    date,
    startTime,
    endTime,
  }: { date: any; startTime: any; endTime: any } = req.body;

  if (date == null || startTime == null || endTime == null) {
    throw new Error("Event date and Start/End Time cannot be null.");
  }

  const eventDate = new Date(date);
  const currentDate = new Date();
  const eventStartTime = new Date(startTime);
  const eventEndTime = new Date(endTime);

  logger.info(
    eventDate.toString(),
    currentDate.toString(),
    eventStartTime.toString(),
    eventEndTime.toString()
  );

  // Duration check
  if (startTime - endTime < 3 * 3600000) {
    throw new Error("Event duration cannot be less than 3 hours.");
  }
}

/**
 * Withdraws a user from an event.
 *
 * @param req - The request object containing the user information.
 * @returns A Promise that resolves to the updated event object after the user is withdrawn.
 * @throws An error if the volunteer request is not found.
 */
async function withdrawFromEvent(req: any): Promise<any> {
  try {
    let user: any = req.header("user"),
      response: any;
    response = await eventModel.findOneAndUpdate(
      {
        _id: ObjectId(req?.params?.id),
        isActive: true,
        volunteerRequest: {
          $elemMatch: { volunteerId: ObjectId(user._id) },
        },
      },
      {
        $pull: {
          volunteerRequest: {
            volunteerId: ObjectId(user._id),
          },
        },
      }
    );
    if (!response) {
      throw new Error("Volunteer request not found.");
    }
    return response;
  } catch (error) {
    throw error;
  }
}

/**
 * Updates the request status and user note for a volunteer in the event model.
 * @param req - The request object.
 * @param volunteerId - The ID of the volunteer.
 * @param status - The new request status.
 * @param userNote - The user note to be added.
 * @returns A promise that resolves to the updated event model.
 */
async function updateVolunteersRequestStatus(
  req: any,
  volunteerId: string,
  status: string,
  userNote: string
): Promise<any> {
  try {
    const { body } = req;
    let user: any = req.header("user");
    // Functionality to check if the volunteer has already checked-out and attendance is true, if already checked-out then return error
    const volunteerCheckOutStatus = await eventModel.findOne({
      _id: ObjectId(body._id),
      isActive: true,
      volunteerRequest: {
        $elemMatch: {
          volunteerId: ObjectId(volunteerId),
          attendance: true,
        },
      },
    });

    if (volunteerCheckOutStatus) {
      logger.error("Volunteer has attended the event, cant update the status.");
      throw new Error(
        "Volunteer has attended the event, can't update the status."
      );
    }

    const updateQuery: any = {
      $set: {
        "volunteerRequest.$.requestStatus": status,
      },
    };

    if (userNote && userNote.trim() !== "") {
      updateQuery.$push = {
        "volunteerRequest.$.userNote": {
          note: userNote,
          createdBy: ObjectId(user._id),
        },
      };
    }

    const response = await eventModel.findOneAndUpdate(
      {
        _id: ObjectId(body._id),
        isActive: true,
        "volunteerRequest.volunteerId": ObjectId(volunteerId),
      },
      updateQuery,
      { new: true }
    );

    if (!response) {
      logger.error("update volunteer request failed.", response);
      throw new Error("Volunteer not found or criteria did not match.");
    }
    logger.info("Volunteer request successfully updated");
    return response;
  } catch (error) {
    logger.error("Error updating volunteer request:", error.message);
    return { error: error.message };
  }
}

/**
 * Updates the check-in status of a volunteer for a specific event.
 * @param eventId - The ID of the event.
 * @param volunteerId - The ID of the volunteer.
 * @returns A Promise that resolves to the updated event object.
 */
async function updateVolunteersCheckInStatus(
  eventId: string,
  volunteerId: string
): Promise<any> {
  try {
    let checkUserStatus = await userModel.findOne(
      { _id: ObjectId(volunteerId), isActive: true },
      { userStatus: 1 }
    );
    if (!checkUserStatus) {
      logger.error("Volunteer Deleted thier account, cant perform check-in.");
      throw new Error(
        "Volunteer Deleted thier account, cant perform check-in."
      );
    }
    if (checkUserStatus?.userStatus === 2) {
      logger.error("Volunteer is banned, cant perform check-in.");
      throw new Error("Volunteer is banned, cant perform check-in.");
    }
    const response = await eventModel.findOneAndUpdate(
      {
        _id: ObjectId(eventId),
        isActive: true,
        "volunteerRequest.volunteerId": ObjectId(volunteerId),
      },
      {
        $set: {
          "volunteerRequest.$.checkedIn": new Date(),
        },
      },
      { new: true }
    );
    // logger.info(response)
    if (!response || response === null) {
      logger.error("update volunteer checkIn request failed.");
      throw new Error("update volunteer checkIn request failed.");
    }
    logger.info("Volunteer checkIn request updatedsuccessfully :", volunteerId);
    return response;
  } catch (error) {
    logger.error(
      `Invalid volunteerId ${volunteerId}, please correct the volunteerId and try again`
    );
    return {
      error: `Invalid volunteerId ${volunteerId}, please correct the VolunteerId and try again`,
    };
  }
}

/**
 * Updates the checkout status of a volunteer for a specific event.
 *
 * @param eventId - The ID of the event.
 * @param volunteerId - The ID of the volunteer.
 * @returns A Promise that resolves to the updated event object.
 * @throws An error if the volunteer has not checked in yet or if the volunteer ID is invalid.
 */
async function updateVolunteersCheckOutStatus(
  eventId: string,
  volunteerId: string
): Promise<any> {
  try {
    let checkUserStatus = await userModel.findOne(
      { _id: ObjectId(volunteerId), isActive: true },
      { userStatus: 1 }
    );
    if (!checkUserStatus) {
      logger.error("Volunteer Deleted thier account, cant perform check-out.");
      throw new Error(
        "Volunteer Deleted thier account, cant perform check-out."
      );
    }
    if (checkUserStatus?.userStatus === 2) {
      logger.error("Volunteer is banned, cant perform check-out.");
      throw new Error("Volunteer is banned, cant perform check-out.");
    }
    // check if volunteer has checked-in
    const event = await eventModel.findOne({
      _id: ObjectId(eventId),
      isActive: true,
      volunteerRequest: {
        $elemMatch: {
          volunteerId: ObjectId(volunteerId),
          checkedIn: { $ne: null },
        },
      },
    });

    if (!event) {
      logger.error("Volunteer has not checked-in yet.");
      throw new Error("Volunteer has not checked-in yet.");
    }

    const response = await eventModel.findOneAndUpdate(
      {
        _id: ObjectId(eventId),
        isActive: true,
        "volunteerRequest.volunteerId": ObjectId(volunteerId),
      },
      {
        $set: {
          "volunteerRequest.$.checkedOut": new Date(), // update checkout time
          "volunteerRequest.$.requestStatus": volunteerRequestStatus.ATTENDED, // update request status to "ATTENDED
          "volunteerRequest.$.attendance": true,
        },
      },
      { new: true }
    );
    if (!response) {
      // logger.error("Document not found or criteria did not match.");
      throw new Error(
        `Invalid volunteerId ${volunteerId}, please correct the VolunteerId and try again`
      );
    }
    logger.info(
      "Volunteer checkout request updated successfully :",
      volunteerId,
      "\t",
      response?.volunteerRequest?.requestStatus
    );
    return response;
  } catch (error) {
    logger.error(`${error.message}`);
    return { error: `${error.message}` };
  }
}

/**
 * Fetches admins and super volunteers based on the provided workspace ID.
 *
 * @param {string} workspaceId - The ID of the workspace.
 * @returns {Promise<any>} - A promise that resolves to the fetched admins and super volunteers.
 * @throws {Error} - If an error occurs while fetching the data.
 */
async function fetchAdminsAndSuperVolunteers(
  workspaceId: string
): Promise<any> {
  try {
    let response: any;
    response = await userModel.find(
      {
        isActive: true,
        userType: { $in: [1, 2] },
        workSpaceId: ObjectId(workspaceId),
      },
      {
        firstName: 1,
        lastName: 1,
        device_token: 1,
      }
    );
    return response;
  } catch (error) {
    throw error;
  }
}

/**
 * Retrieves information about an event.
 * @param eventId - The ID of the event.
 * @returns A Promise that resolves to the event information.
 * @throws If an error occurs while retrieving the event information.
 */
async function getEventInfo(eventId: string): Promise<any> {
  try {
    let response: any;
    response = await eventModel.findOne(
      {
        _id: ObjectId(eventId),
        isActive: true,
      },
      {
        name: 1,
        date: 1,
        startTime: 1,
        endTime: 1,
        workSpaceId: 1,
      }
    );
    return response;
  } catch (error) {
    throw error;
  }
}

/**
 * Updates the user associated with an event.
 * @param {string} eventId - The ID of the event.
 * @param {string} userId - The ID of the user.
 * @throws {Error} If an error occurs while updating the user.
 */
async function userUpdated(eventId: string, userId: string) {
  try {
    let response: any;
    response = await eventModel.findOneAndUpdate(
      {
        _id: ObjectId(eventId),
        isActive: true,
      },
      {
        updatedBy: ObjectId(userId),
      }
    );
  } catch (error) {
    throw error;
  }
}

/**
 * Retrieves the details of a stadium associated with an event.
 * @param eventId - The ID of the event.
 * @returns A promise that resolves to the stadium details.
 * @throws If an error occurs while retrieving the stadium details.
 */
async function getStadiumDetails(eventId: string) {
  try {
    const eventStadiumInfo = await eventModel.aggregate([
      {
        $match: {
          _id: ObjectId(eventId), // Replace with your event ID
        },
      },
      {
        $lookup: {
          from: "workspaces",
          localField: "workSpaceId",
          foreignField: "_id",
          as: "workspace",
        },
      },
      {
        $unwind: "$workspace",
      },
      {
        $project: {
          _id: 1,
          workspaceId: "$workspace._id",
          stadium: {
            $filter: {
              input: "$workspace.stadiums",
              as: "stadium",
              cond: {
                $eq: ["$$stadium._id", "$stadiumId"],
              },
            },
          },
        },
      },
      {
        $unwind: "$stadium",
      },
      {
        $project: {
          _id: 1,
          name: "$stadium.name",
          address: "$stadium.address",
          stadiumPolicy: "$stadium.stadiumPolicy",
          latitude: "$stadium.latitude",
          longitude: "$stadium.longitude",
        },
      },
    ]);
    return eventStadiumInfo;
  } catch (error) {
    throw error;
  }
}

/**
 * Adds stadium details to the events payload.
 * @param eventsPayload - The array of events payload.
 * @returns The updated events payload with stadium details.
 * @throws If an error occurs while retrieving stadium details.
 */
async function addStadiumDetails(eventsPayload: any) {
  try {
    let idx = 0;
    const result = await Promise.all(
      eventsPayload.map(async (event: any) => {
        let response = await workSpaceModel.findOne(
          {
            _id: ObjectId(event.workSpaceId),
            isActive: true,
            stadiums: { $elemMatch: { _id: ObjectId(event.stadiumId) } },
          },
          { "stadiums.$": 1 }
        );
        if (response) {
          const stadium = response.stadiums[0];
          const { name, address, latitude, longitude, stadiumPolicy } = stadium;
          event.stadiumName = name;
          event.stadiumAddress = address;
          event.latitude = latitude;
          event.longitude = longitude;
          event.stadiumPolicy = stadiumPolicy;
        }
        eventsPayload[idx] = event;
        idx++;
        return event;
      })
    );
    return eventsPayload;
  } catch (error) {
    throw error;
  }
}

export {
  volunteerInfoByEvent,
  applyOnEvent,
  withdrawFromEvent,
  updateVolunteersRequestStatus,
  fetchAdminsAndSuperVolunteers,
  getEventInfo,
  updateVolunteersCheckInStatus,
  updateVolunteersCheckOutStatus,
  checkEventCreationTime,
  userUpdated,
  getStadiumDetails,
  addStadiumDetails,
};
