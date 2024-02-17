import { statsModel } from "../database/models/stats";

/**
 * Pushes a user event record to the stats model.
 * If the stats model for the given volunteerId exists, the event information is added to the existing stats.
 * If the stats model does not exist, a new stats model is created with the event information.
 * @param userEventdata The data of the user event record.
 * @returns A Promise that resolves to the saved stats model or an error object.
 */
async function pushUserEventRecord(userEventdata: any): Promise<any> {
  try {
    const existingStats = await statsModel.findOne({
      volunteerId: userEventdata.volunteerId,
    });
    if (existingStats) {
      existingStats.eventInformation.push({
        eventId: userEventdata.eventId,
        rfCoins: userEventdata.rfCoins,
      });
      await existingStats.save();
    } else {
      const userStats = new statsModel({
        workSpaceId: userEventdata.workSpaceId,
        volunteerId: userEventdata.volunteerId,
        eventInformation: [
          {
            eventId: userEventdata.eventId,
            rfCoins: userEventdata.rfCoins,
          },
        ],
      });
      await userStats.save();
    }
  } catch (error) {
    console.error("Error creating/updating user stats model:", error);
    return { error: `Error creating/updating user stats model: ${error}` };
  }
}

export { pushUserEventRecord };
