import { Expo } from 'expo-server-sdk';
import { logger } from './winston_logger';
import { userModel } from '../database';

const ObjectId = require('mongoose').Types.ObjectId

// Function to send push notifications to multiple Expo push tokens
/**
 * Sends push notifications to Expo push tokens.
 * 
 * @param expoPushTokens - An array of Expo push tokens.
 * @param users - An object containing user information.
 * @param data - An object containing notification data.
 */
export const sendNotification = async (expoPushTokens: String[], users: Object, data: Object) => {
    const expo = new Expo();
    let messages: any = [];

    // Iterate through each push token
    for(let pushToken of expoPushTokens) {
        // Check if the push token is a valid Expo push token
        if (!Expo.isExpoPushToken(pushToken)) {
            logger.error(`Push token ${pushToken} is not a valid Expo push token`);
            continue;
        }
        // Create a message object with push token, title, body, and data
        messages.push({
            to: pushToken,
            sound: 'default',
            title: data['title'],
            body: data['message'],
            data: data['data']
        })
    }

    // The Expo push notification service accepts batches of notifications
    // to reduce the number of requests and compress similar notifications
    let chunks = expo.chunkPushNotifications(messages);
    let tickets = [];

    // Send each chunk of notifications to the Expo push notification service
    for (let chunk of chunks) {
        try {
            let ticketChunk = await expo.sendPushNotificationsAsync(chunk);
            logger.info(ticketChunk);
            tickets.push(...ticketChunk);
        } catch (error) {
            logger.error(error);
        }
    }

    // Process the response tickets from the Expo push notification service
    for (const ticket of tickets) {
        if (ticket.status === "error") {
            if (ticket.details && ticket.details.error === "DeviceNotRegistered") {
                let message = ticket.message;
                let match = message.match(/"ExponentPushToken\[(.*?)\]"/);
                let token = match ? match[0] : null;
                // Delete the Expo token since the device is not registered anymore
                await userModel.findOneAndUpdate({_id: users['token'],device_token: token}, { $pull: { device_token: token } })
                logger.error(`Push notification status: ${ticket.status} failed with following error message: ${message}`)
            }
        }

        if (ticket.status === "ok") {
            logger.info(`Push notification ticket ${ticket.id} status: ${ticket.status}`)
        }     
    }
} 

/**
 * Fetches the user tokens for the given volunteer ID.
 * @param volunteerId The ID of the volunteer.
 * @returns The device tokens associated with the volunteer.
 */
export const fetchUserTokens = async (volunteerId: string) => {
    var tokens: any = [];
    tokens = await userModel.findOne({_id: ObjectId(volunteerId)}, {device_token: 1});
    return tokens?.device_token;
}

/**
 * Maps tokens to a user ID.
 * 
 * @param volunteerId - The ID of the volunteer.
 * @param tokens - An array of tokens.
 * @returns An object mapping tokens to the volunteer ID.
 */
export const mapTokensToUser = async (volunteerId: string, tokens: string[]) => {
    var users: any = {};
    for (const token of tokens) {
        const key = token.toString(); // Convert token to string if necessary
        users[key] = volunteerId.toString();
    }
    return users;
}