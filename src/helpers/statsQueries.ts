import { statsModel } from "../database/models/stats"

async function pushUserEventRecord(userEventdata: any): Promise<any> {
    try {
        const existingStats = await statsModel.findOne({ volunteerId: userEventdata.volunteerId });
        if (existingStats) {
            existingStats.eventInformation.push({
                eventId: userEventdata.eventId,
                rfCoins: userEventdata.rfCoins
            });
            await existingStats.save();
        } else {
            const userStats = new statsModel({
                workSpaceId: userEventdata.workSpaceId,
                volunteerId: userEventdata.volunteerId,
                eventInformation: [{
                    eventId: userEventdata.eventId,
                    rfCoins: userEventdata.rfCoins
                }]
            });
            await userStats.save();
        }
    } catch (error) {
        console.error("Error creating/updating user stats model:", error);
        return { error: `Error creating/updating user stats model: ${error}` }
    }
}

export {
    pushUserEventRecord
}
