import { userSessionModel, userModel } from "../database";
import { logger } from "../helpers/winston_logger"
import { ObjectId } from "mongodb";

/**
 * Deletes user sessions and removes device token for a given user.
 * @param userId - The ID of the user.
 * @returns A promise that resolves to a string indicating the result of the operation.
 * @throws If an error occurs during the operation.
 */
export async function deleteUserSessions(userId: string): Promise<string> {
    try {
        const response: any = await userSessionModel.deleteMany({ createdBy: userId });
        const remove_device_token = await userModel.findOneAndUpdate(
            { _id: new ObjectId(userId) },
            { $set: { device_token: [] } }, // Set device_token to an empty array
            { new: true }
        );
        let message = `Deleted ${response?.deletedCount} sessions for user ${userId} and removed device token from the user ${remove_device_token}`;
        logger.info(message);
        return message;
    } catch (error) {
        throw error;
    }
}
