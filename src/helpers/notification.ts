import gcm from 'node-gcm';
import config from "config";

const fcmKey: any = config.get("fcmKey");

const sender = new gcm.Sender(fcmKey);

export const notification_to_user = async (sender_user_data: any, data: any, notification: any) => {
    return new Promise(async (resolve, reject) => {
        try {
            if (sender_user_data && data && notification && sender_user_data?.device_token?.length != 0 && sender_user_data != undefined && sender_user_data != null) {
                let message = new gcm.Message({
                    data: data,
                    notification: notification
                });
                sender.send(message, {
                    registrationTokens: sender_user_data?.device_token
                }, function (err, response) {
                    if (err) {
                        console.log('Error ', err);
                        reject(err)
                    } else {
                        resolve(response)
                    }
                })
            }
            else {
                resolve(true)
            }
        } catch (error) {
            reject(error)
        }
    })
}

export const notification_to_multiple_user = async (multiple_user_data: any, data: any, notification: any) => {
    return new Promise(async (resolve, reject) => {
        try {
            if (multiple_user_data && data && notification) {
                let device_token: any = []
                for (let i = 0; i < multiple_user_data?.length; i++) {
                    device_token.push(...multiple_user_data[i]?.device_token)
                }
                if (device_token.length != 0) {
                    let message = new gcm.Message({
                        data: data,
                        notification: notification
                    });
                    sender.send(message, {
                        registrationTokens: device_token
                    }, function (err, response) {
                        if (err) {
                            console.log('Error ', err);
                            reject(err)
                        } else {
                            resolve(response)
                        }
                    })
                }
                else {
                    resolve(true)
                }
            }
            else {
                resolve(true)
            }
        } catch (error) {
            reject(error)
        }
    })
}