import { userSessionModel } from "../database";
import { logger } from "../helpers/winston_logger"

export async function deleteUserSessions(userId: string): Promise<string> {
    try {
        const response: any = await userSessionModel.deleteMany({ createdBy: userId });
        let message = `Deleted ${response?.deletedCount} sessions for user ${userId}`;
        logger.info(message);
        return message;
    } catch (error) {
        throw error;
    }
}
