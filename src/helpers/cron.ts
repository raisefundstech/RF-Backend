import { CronJob } from 'cron';
import { logger } from './winston_logger'
import { eventModel, roomModel } from '../database';
const ObjectId = require('mongoose').Types.ObjectId

export const createRoom = new CronJob('* * * * *', async () => {
    logger.info('Create Room Cron Job Start');

    let dateIs = new Date();
    dateIs.setHours(dateIs.getHours() + 5);
    let findEvent = await eventModel.find({
        isActive: true,
        startTime: { $lte: new Date(dateIs) }
    })

    for (let i = 0; i < findEvent.length; i++) {
        let responseData = findEvent[i]?.volunteerRequest.filter(data => data.requestStatus === "APPROVED")

        let findRoom = await roomModel.findOne({ eventId: ObjectId(findEvent[i]?._id) })
        if (!findRoom) {
            let volunteerIdArray: any = [];
            for (let k = 0; k < responseData.length; k++) {
                volunteerIdArray.push(ObjectId(responseData[k].volunteerId))
            }

            if (volunteerIdArray.length >= 2) {

                let response = await roomModel.findOneAndUpdate({
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
                })
                if (!response) {
                    let createRoom = await new roomModel({
                        roomName: findEvent[i]?.name + " " + "group",
                        eventId: ObjectId(findEvent[i]?._id),
                        volunteerIds: volunteerIdArray,
                    }).save()

                    await eventModel.findOneAndUpdate({ _id: ObjectId(findEvent[i]._id) }, { isGroupCreated: true })
                }
            }
        } else {
            let volunteerIdArray: any = [];
            for (let k = 0; k < responseData.length; k++) {
                volunteerIdArray.push(ObjectId(responseData[k].volunteerId))
            }

            if (volunteerIdArray.length >= 2) {

                await roomModel.findOneAndUpdate({
                    eventId: ObjectId(findEvent[i]?._id),
                    isActive: true
                }, {
                    roomName: findEvent[i]?.name + " " + "group",
                    volunteerIds: volunteerIdArray,
                    isActive: true
                }, {
                    new: true
                })
            }
        }
    }
    logger.info('Create Room Cron Job Finished')
})