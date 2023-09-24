"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const bodyParser = __importStar(require("body-parser"));
const express_1 = __importDefault(require("express"));
const http_1 = __importDefault(require("http"));
const cors_1 = __importDefault(require("cors"));
const packageInfo = __importStar(require("../package.json"));
const database_1 = require("./database");
const routes_1 = require("./routes");
const async_1 = __importDefault(require("async"));
const common_1 = require("./common");
const cron_1 = require("./helpers/cron");
const notification_1 = require("./helpers/notification");
const app = (0, express_1.default)();
const ObjectId = require('mongoose').Types.ObjectId;
console.log(process.env.NODE_ENV || 'localhost');
app.use(database_1.mongooseConnection);
app.use((0, cors_1.default)());
app.use(bodyParser.json({ limit: "50mb" }));
app.use(bodyParser.urlencoded({ limit: "50mb", extended: true, parameterLimit: 50000 }));
const health = (req, res) => {
    return res.status(200).json({
        message: "Raise fund backend server is running",
        app: packageInfo.name,
        version: packageInfo.version,
        license: packageInfo.license,
    });
};
const bad_gateway = (req, res) => { return res.status(502).json({ status: 502, message: "Raise fund Backend API Bad Gateway" }); };
app.get('/', health);
app.get('/health', health);
app.get('/isServerUp', (req, res) => {
    res.send('Server is running ');
});
cron_1.createRoom.start();
app.use(routes_1.router);
app.use('*', bad_gateway);
let server = new http_1.default.Server(app);
let io = require('socket.io')(server, {
    cors: {
        origin: "*"
    },
});
app.set('io', io);
let users = {}, roomMember = [];
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
            let { roomId, senderId, receiverIds, message } = data, status = 0;
            let roomData = await database_1.roomModel.findOneAndUpdate({ _id: ObjectId(data?.roomId), isActive: true }, { isActive: true }, { new: true });
            // if (roomMember.indexOf(`${roomId}_${receiverIds}`) != -1) status = 2
            // if (users[`${receiverIds}`] != null && status == 0) status = 1
            let messageData = await new database_1.messageModel({ receiverIds: receiverIds, senderId: ObjectId(senderId), message, roomId: ObjectId(roomId) }).save();
            let response = await database_1.messageModel.aggregate([
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
            ]);
            data = { senderId, receiverIds, message, roomId, _id: messageData?._id };
            io.to(socket?.id).emit('receive_message', response[0]);
            socket.to(`${roomId}`).emit('receive_message', response[0]);
            // send notification to receiver
            let senderData = await database_1.userModel.findOne({ _id: ObjectId(response[0].senderId) });
            let receiverData = await database_1.userModel.find({ _id: { $in: response[0].receiverIds } }, { _id: 1, device_token: 1 });
            senderData.message = message;
            senderData.roomData = roomData;
            let receiverIdsArray = [];
            await receiverData.map((e) => {
                receiverIdsArray.push(e._id);
            });
            // if (!receiverData.isOnline) {
            let notificationData = await common_1.notification_types.new_message_to_receiver(senderData);
            await async_1.default.parallel([
                (callback) => {
                    new database_1.notificationModel({
                        title: "new message arrived",
                        description: notificationData.template.body,
                        notificationData: notificationData.data,
                        notificationType: notificationData.data.type,
                        roomId: ObjectId(roomId),
                        createdBy: ObjectId(senderData?._id),
                        receivedIds: receiverIdsArray
                    }).save().then(data => { callback(null, data); }).catch(err => { console.log(err); });
                },
                (callback) => { (0, notification_1.notification_to_multiple_user)(receiverData, notificationData?.data, notificationData?.template).then(data => { callback(null, data); }).catch(err => { console.log(err); }); }
            ]);
            // }
        });
    });
    socket.on('left_room', function (data) {
        console.log('left_room');
        socket.leave(socket.room);
    });
});
exports.default = server;
//# sourceMappingURL=index.js.map