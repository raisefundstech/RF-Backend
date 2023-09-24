"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createRoom = void 0;
const cron_1 = require("cron");
const winston_logger_1 = require("./winston_logger");
const database_1 = require("../database");
const ObjectId = require('mongoose').Types.ObjectId;
exports.createRoom = new cron_1.CronJob('* * * * *', async () => {
    winston_logger_1.logger.info('Create Room Cron Job Start');
    let dateIs = new Date();
    dateIs.setHours(dateIs.getHours() + 5);
    let findEvent = await database_1.eventModel.find({
        isActive: true,
        startTime: { $lte: new Date(dateIs) }
    });
    for (let i = 0; i < findEvent.length; i++) {
        let responseData = findEvent[i]?.volunteerRequest.filter(data => data.requestStatus === "APPROVED");
        let findRoom = await database_1.roomModel.findOne({ eventId: ObjectId(findEvent[i]?._id) });
        if (!findRoom) {
            let volunteerIdArray = [];
            for (let k = 0; k < responseData.length; k++) {
                volunteerIdArray.push(ObjectId(responseData[k].volunteerId));
            }
            if (volunteerIdArray.length >= 2) {
                let response = await database_1.roomModel.findOneAndUpdate({
                    eventId: ObjectId(findEvent[i]?._id),
                    volunteerIds: volunteerIdArray,
                    isActive: true
                }, {
                    roomName: findEvent[i]?.name + " " + "group",
                    eventId: ObjectId(findEvent[i]?._id),
                    volunteerIds: volunteerIdArray,
                    isActive: true
                }, {
                    // upsert: true,
                    new: true
                });
                if (!response) {
                    let createRoom = await new database_1.roomModel({
                        roomName: findEvent[i]?.name + " " + "group",
                        eventId: ObjectId(findEvent[i]?._id),
                        volunteerIds: volunteerIdArray,
                    }).save();
                    await database_1.eventModel.findOneAndUpdate({ _id: ObjectId(findEvent[i]._id) }, { isGroupCreated: true });
                }
            }
        }
        else {
            let volunteerIdArray = [];
            for (let k = 0; k < responseData.length; k++) {
                volunteerIdArray.push(ObjectId(responseData[k].volunteerId));
            }
            if (volunteerIdArray.length >= 2) {
                await database_1.roomModel.findOneAndUpdate({
                    eventId: ObjectId(findEvent[i]?._id),
                    isActive: true
                }, {
                    roomName: findEvent[i]?.name + " " + "group",
                    volunteerIds: volunteerIdArray,
                    isActive: true
                }, {
                    new: true
                });
            }
        }
    }
    winston_logger_1.logger.info('Create Room Cron Job Finished');
});
//# sourceMappingURL=cron.js.map