import { Expo } from 'expo-server-sdk';
import { logger } from './winston_logger';
import { userModel } from '../database';

export const sendNotification = async (expoPushTokens: String[], users: Object, data: Object) => {

    const expo = new Expo();
    let messages: any = [];

    for(let pushToken of expoPushTokens) {
        if (!Expo.isExpoPushToken(pushToken)) {
            logger.error(`Push token ${pushToken} is not a valid Expo push token`);
            continue;
        }
        messages.push({
            to: pushToken,
            sound: 'default',
            title: data['title'],
            body: data['message'],
            data: data['data']
        })
    }

    // The Expo push notification service accepts batches of notifications so
    // that the server dosen't need to send 1000 requests to send 1000 notifications.
    // Recommendation is to batch the notifications to reduce the number of requests
    // and to compress them (notifications with similar content will get compressed.
    let chunks = expo.chunkPushNotifications(messages);
    let tickets = [];
    (async () => {
    // Send the chunks to the Expo push notification service. There are
    // different strategies you could use. A simple one is to send one chunk at a
    // time, which nicely spreads the load out over time:
    for (let chunk of chunks) {
        try{
            let ticketChunk = await expo.sendPushNotificationsAsync(chunk);
            logger.info(ticketChunk);
            tickets.push(...ticketChunk);
            // NOTE: If a ticket contains an error code in ticket.details.error,
            // handle it appropriately. The error codes are listed in the Expo
            // documentation:
            // https://docs.expo.io/push-notifications/sending-notifications/#individual-errors
        } catch (error) {
            logger.error(error);
        }
    }})();

    for (const ticket of tickets) {

        if (ticket.status === "error") {
            if (ticket.details && ticket.details.error === "DeviceNotRegistered") {
                let message = ticket.message;
                let match = message.match(/"ExponentPushToken\[(.*?)\]"/);
                let token = match ? match[0] : null;
                // Delete expo token since the device is not registered anymore
                await userModel.findOneAndUpdate({_id: users['token'],device_token: token}, { $pull: { device_token: token } })
                logger.error(`Push notification status: ${ticket.status} failed with following error message: ${message}`)
            }
        }

        if (ticket.status === "ok") {
            logger.info(`Push notification ticket ${ticket.id} status: ${ticket.status}`)
        }     
    }
} 

export const fetchUserTokens = async (volunteerId: string) => {
    var tokens: any = [];
    tokens = await userModel.findOne({_id: volunteerId}, {device_token: 1});
    return tokens?.device;
}

export const mapTokensToUser = async (volunteerId: string, tokens: string[]) => {
    var users: any = {};
    for (const token of tokens) {
        const key = token.toString(); // Convert token to string if necessary
        users[key] = volunteerId.toString();
    }
    return users;
}