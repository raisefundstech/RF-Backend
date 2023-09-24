"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.stringToObjectIdConvert = exports.notification_types = exports.SMS_message = exports.userStatus = exports.file_path = exports.not_first_one = exports.URL_decode = exports.message_status = exports.loginType = exports.getArea = exports.apiResponse = void 0;
const mongoose_1 = require("mongoose");
const ObjectId = mongoose_1.Types.ObjectId;
class apiResponse {
    constructor(status, message, data) {
        this.status = status;
        this.message = message;
        this.data = data;
    }
}
exports.apiResponse = apiResponse;
const getArea = (current, RadiusInKm) => {
    const differenceForLat = RadiusInKm / 111.12;
    const curve = Math.abs(Math.cos((2 * Math.PI * parseFloat(current.lat)) / 360.0));
    const differenceForLong = RadiusInKm / (curve * 111.12);
    const minLat = parseFloat(current.lat) - differenceForLat;
    const maxLat = parseFloat(current.lat) + differenceForLat;
    const minlon = parseFloat(current.long) - differenceForLong;
    const maxlon = parseFloat(current.long) + differenceForLong;
    return {
        min: {
            lat: minLat,
            long: minlon,
        },
        max: {
            lat: maxLat,
            long: maxlon,
        },
    };
};
exports.getArea = getArea;
exports.loginType = {
    custom: 0,
    google: 1,
    facebook: 2,
    apple: 3
};
exports.message_status = {
    sent: 0,
    delivered: 1,
    view: 2
};
const URL_decode = (url) => {
    let folder_name = [], image_name;
    url.split("/").map((value, index, arr) => {
        image_name = url.split("/")[url.split("/").length - 1];
        folder_name = (url.split("/"));
        folder_name.splice(url.split("/").length - 1, 1);
    });
    return [folder_name.join('/'), image_name];
};
exports.URL_decode = URL_decode;
const not_first_one = (a1, a2) => {
    var a = [], diff = [];
    for (var i = 0; i < a1?.length; i++) {
        a[a1[i]] = true;
    }
    for (var i = 0; i < a2?.length; i++) {
        if (a[a2[i]]) {
            delete a[a2[i]];
        }
    }
    for (var k in a) {
        diff.push(k);
    }
    return diff;
};
exports.not_first_one = not_first_one;
exports.file_path = ['profile'];
exports.userStatus = {
    user: 0,
    admin: 1,
};
exports.SMS_message = {
    OTP_verification: `Finder: Find you partner OTP verification code: `,
};
exports.notification_types = {
    event_request_approved: async (data) => {
        return {
            template: {
                title: `${data.title}`, body: `${data.message}`
            },
            data: {
                type: 1, eventId: data?.eventId, click_action: "FLUTTER_NOTIFICATION_CLICK"
            }
        };
    },
    new_message_to_receiver: async (data) => {
        return {
            template: {
                title: `${data.firstName} ${data.lastName}`, body: `${data.message}`
            },
            data: {
                type: 1, roomId: data?.roomData?._id, click_action: "FLUTTER_NOTIFICATION_CLICK"
            }
        };
    },
};
const stringToObjectIdConvert = async (items) => {
    return new Promise(async (resolve, reject) => {
        try {
            items = items.map(data => new ObjectId(data));
            resolve(items);
        }
        catch (error) {
            reject(error);
        }
    });
};
exports.stringToObjectIdConvert = stringToObjectIdConvert;
//# sourceMappingURL=index.js.map