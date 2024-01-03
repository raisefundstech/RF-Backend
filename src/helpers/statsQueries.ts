import { statsModel } from "../database/models/stats"

async function pushUserEventRecord(userEventdata: any): Promise<any> {
    try {
        const userStats = new statsModel({
            workSpaceId: userEventdata.workSpaceId,
            volunteerId: userEventdata.volunteerId,
            eventInformation: [{
                eventId: userEventdata.eventId,
                rfCoins: userEventdata.rfCoins
            }]
        });
        await userStats.save(); 
    } catch (error) {
        console.error("Error creating user stats model:", error);
        return { error: `Error creating user stats model: ${error}` }
    }
}

export {
    pushUserEventRecord
}
