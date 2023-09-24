"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.notification_to_multiple_user = exports.notification_to_user = void 0;
const node_gcm_1 = __importDefault(require("node-gcm"));
const config_1 = __importDefault(require("config"));
const fcmKey = config_1.default.get("fcmKey");
const sender = new node_gcm_1.default.Sender(fcmKey);
const notification_to_user = async (sender_user_data, data, notification) => {
    return new Promise(async (resolve, reject) => {
        try {
            if (sender_user_data && data && notification && sender_user_data?.device_token?.length != 0 && sender_user_data != undefined && sender_user_data != null) {
                let message = new node_gcm_1.default.Message({
                    data: data,
                    notification: notification
                });
                sender.send(message, {
                    registrationTokens: sender_user_data?.device_token
                }, function (err, response) {
                    if (err) {
                        console.log('Error ', err);
                        reject(err);
                    }
                    else {
                        resolve(response);
                    }
                });
            }
            else {
                resolve(true);
            }
        }
        catch (error) {
            reject(error);
        }
    });
};
exports.notification_to_user = notification_to_user;
const notification_to_multiple_user = async (multiple_user_data, data, notification) => {
    return new Promise(async (resolve, reject) => {
        try {
            if (multiple_user_data && data && notification) {
                let device_token = [];
                for (let i = 0; i < multiple_user_data?.length; i++) {
                    device_token.push(...multiple_user_data[i]?.device_token);
                }
                if (device_token.length != 0) {
                    let message = new node_gcm_1.default.Message({
                        data: data,
                        notification: notification
                    });
                    sender.send(message, {
                        registrationTokens: device_token
                    }, function (err, response) {
                        if (err) {
                            console.log('Error ', err);
                            reject(err);
                        }
                        else {
                            resolve(response);
                        }
                    });
                }
                else {
                    resolve(true);
                }
            }
            else {
                resolve(true);
            }
        }
        catch (error) {
            reject(error);
        }
    });
};
exports.notification_to_multiple_user = notification_to_multiple_user;
//# sourceMappingURL=notification.js.map