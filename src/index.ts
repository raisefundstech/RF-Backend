import * as bodyParser from 'body-parser';
import express, { Request, Response } from 'express';
import http from 'http';
import cors from 'cors'
import * as packageInfo from '../package.json'
import { messageModel, mongooseConnection, notificationModel, roomModel, userModel } from './database'
import { router } from './routes'
import async from 'async'
import { notification_types } from './common';
import { createRoom } from './helpers/cron';
import { notification_to_multiple_user, notification_to_user } from './helpers/notification';

const app = express();
const ObjectId = require('mongoose').Types.ObjectId

console.log(process.env.NODE_ENV || 'localhost');
app.use(mongooseConnection)
app.use(cors())
app.use(bodyParser.json({ limit: "50mb" }))
app.use(bodyParser.urlencoded({ limit: "50mb", extended: true, parameterLimit: 50000 }))

const health = (req, res) => {
    return res.status(200).json({
        message: "Raise fund backend server is running",
        app: packageInfo.name,
        version: packageInfo.version,
        license: packageInfo.license,
    })
}
const bad_gateway = (req, res) => { return res.status(502).json({ status: 502, message: "Raise fund Backend API Bad Gateway" }) }
app.get('/', health);
app.get('/health', health);
app.get('/isServerUp', (req, res) => {
    res.send('Server is running ');
});

createRoom.start();

app.use(router)
app.use('*', bad_gateway);

let server = new http.Server(app);

let io = require('socket.io')(server, {
    cors: {
        origin: "*"
    },
})
app.set('io', io);

let users = {}, roomMember = []
io.on('connection', (socket) => {
    console.log(`New user arrived!`, socket.id);

    socket.on('join_room', async (data) => {
        // console.log('join_room', data);

        // roomMember.push(`${data?.roomId}_${data?.userId}`)

        socket.room = data.roomId;

        // socket.userId = data.userId;

        // users[`${data?.userId}`] = (socket.id)

        socket.join(data.roomId);

        socket.on('send_message', async (data) => {
            console.log('send_message', data);

            let { roomId, senderId, receiverIds, message } = data, status = 0

            let roomData = await roomModel.findOneAndUpdate({ _id: ObjectId(data?.roomId), isActive: true }, { isActive: true }, { new: true })

            // if (roomMember.indexOf(`${roomId}_${receiverIds}`) != -1) status = 2
            // if (users[`${receiverIds}`] != null && status == 0) status = 1

            let messageData: any = await new messageModel({ receiverIds: receiverIds, senderId: ObjectId(senderId), message, roomId: ObjectId(roomId) }).save()


            let response = await messageModel.aggregate([
                { $match: { _id: ObjectId(messageData?._id), isActive: true } },
                { $sort: { createdAt: -1 } },
                {
                    $lookup: {
                        from: "users",
                        let: { senderId: "$senderId" },
                        pipeline: [
                            {
                                $match: {
                                    $expr: {
                                        $and: [
                                            { $eq: ["$_id", "$$senderId"] },
                                            // { $ne: ["$_id", ObjectId(user?._id)] },
                                            { $eq: ["$isActive", true] },
                                        ]
                                    }
                                }
                            },
                            {
                                $project: {
                                    firstName: 1, lastName: 1, image: 1, mobileNumber: 1
                                }
                            }
                        ],
                        as: "sender"
                    }
                },
                {
                    $lookup: {
                        from: "users",
                        let: { receiverIds: "$receiverIds" },
                        pipeline: [
                            {
                                $match: {
                                    $expr: {
                                        $and: [
                                            { $in: ["$_id", "$$receiverIds"] },
                                            // { $ne: ["$_id", ObjectId(user?._id)] },
                                            { $eq: ["$isActive", true] },
                                        ]
                                    }
                                }
                            },
                            {
                                $project: {
                                    firstName: 1, lastName: 1, image: 1, mobileNumber: 1
                                }
                            }
                        ],
                        as: "receiversData"
                    }
                },
                {
                    $project: {
                        roomId: 1, message: 1, senderId: 1, receiverIds: 1, createdAt: 1, senderData: { $first: "$sender" }, receiversData: 1
                    }
                }
            ])

            data = { senderId, receiverIds, message, roomId, _id: messageData?._id }

            io.to(socket?.id).emit('receive_message', response[0]);

            socket.to(`${roomId}`).emit('receive_message', response[0])

            // send notification to receiver
            let senderData = await userModel.findOne({ _id: ObjectId(response[0].senderId) })

            let receiverData = await userModel.find({ _id: { $in: response[0].receiverIds } }, { _id: 1, device_token: 1 })

            senderData.message = message;
            senderData.roomData = roomData;

            let receiverIdsArray = [];
            await receiverData.map((e) => {
                receiverIdsArray.push(e._id)
            })

            // if (!receiverData.isOnline) {
            let notificationData: any = await notification_types.new_message_to_receiver(senderData)

            await async.parallel([
                (callback) => {
                    new notificationModel({
                        title: "new message arrived",
                        description: notificationData.template.body,
                        notificationData: notificationData.data,
                        notificationType: notificationData.data.type,
                        roomId: ObjectId(roomId),
                        createdBy: ObjectId(senderData?._id),
                        receivedIds: receiverIdsArray
                    }).save().then(data => { callback(null, data) }).catch(err => { console.log(err) })
                },
                (callback) => { notification_to_multiple_user(receiverData, notificationData?.data, notificationData?.template).then(data => { callback(null, data) }).catch(err => { console.log(err) }) }
            ])
            // }
        });
    });

    socket.on('left_room', function (data) {
        console.log('left_room');
        socket.leave(socket.room);
    });

})

export default server;
