"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendCSVFile = exports.homePage = void 0;
const config_1 = __importDefault(require("config"));
const s3_1 = __importDefault(require("aws-sdk/clients/s3"));
const fs_1 = __importDefault(require("fs"));
const winston_logger_1 = require("../../helpers/winston_logger");
const common_1 = require("../../common");
const helpers_1 = require("../../helpers");
const database_1 = require("../../database");
const mail_1 = require("../../helpers/mail");
const csvWriter = require('csv-writer').createObjectCsvWriter;
const ObjectId = require('mongoose').Types.ObjectId;
const aws = config_1.default.get("aws");
const s3 = new s3_1.default({
    accessKeyId: aws.accessKeyId,
    secretAccessKey: aws.secretAccessKey,
    region: aws.region,
});
const bucket_name = aws.bucket_name;
const bucket_url = aws.bucket_url;
const homePage = async (req, res) => {
    (0, winston_logger_1.reqInfo)(req);
    let { workSpaceId } = req.query;
    let user = req.header('user'), response, match = {};
    try {
        if (workSpaceId)
            match.workSpaceId = ObjectId(workSpaceId);
        let currentEvent = await database_1.eventModel.aggregate([
            { $match: { isActive: true, ...match, startTime: { $lte: new Date() }, endTime: { $gte: new Date() } } },
            {
                $project: {
                    workSpaceId: 1,
                    name: 1,
                    address: 1,
                    latitude: 1,
                    longitude: 1,
                    date: 1,
                    startTime: 1,
                    endTime: 1,
                    volunteerSize: 1,
                    notes: 1,
                    isActive: 1,
                    volunteerRequest: 1,
                    isGroupCreated: {
                        $cond: [{
                                $eq: [{
                                        $filter: {
                                            input: '$volunteerRequest',
                                            as: 'volunteerRequest',
                                            cond: { $and: [{ $eq: ['$$volunteerRequest.volunteerId', ObjectId(user._id)] }, { $eq: ['$$volunteerRequest.requestStatus', "APPROVED"] }, { $eq: ['$isGroupCreated', true] }] }
                                        }
                                    }, []]
                            }, false, true]
                    },
                    createdAt: 1,
                    updatedAt: 1,
                }
            }
        ]);
        let allEventCount = await database_1.eventModel.countDocuments({ isActive: true, ...match });
        let dateIs = new Date();
        dateIs.setHours(dateIs.getHours() + 2);
        let openEventCount = await database_1.eventModel.countDocuments({ isActive: true, ...match, $or: [{ startTime: { $gte: new Date() } }, { startTime: { $lte: new Date() }, endTime: { $gte: new Date() } }] });
        let myEventCount = await database_1.eventModel.countDocuments({
            isActive: true, ...match, volunteerRequest: {
                $elemMatch: { volunteerId: ObjectId(user._id), requestStatus: { $ne: "DECLINED" } }
            }
        });
        let nextEvent = await database_1.eventModel.aggregate([
            { $match: { isActive: true, ...match, startTime: { $gte: new Date() } } },
            { $sort: { startTime: 1 } },
            { $limit: 1 },
            {
                $project: {
                    workSpaceId: 1,
                    name: 1,
                    address: 1,
                    latitude: 1,
                    longitude: 1,
                    date: 1,
                    startTime: 1,
                    endTime: 1,
                    volunteerSize: 1,
                    notes: 1,
                    isActive: 1,
                    volunteerRequest: 1,
                    isGroupCreated: {
                        $cond: [{
                                $eq: [{
                                        $filter: {
                                            input: '$volunteerRequest',
                                            as: 'volunteerRequest',
                                            cond: { $and: [{ $eq: ['$$volunteerRequest.volunteerId', ObjectId(user._id)] }, { $eq: ['$$volunteerRequest.requestStatus', "APPROVED"] }, { $eq: ['$isGroupCreated', true] }] }
                                        }
                                    }, []]
                            }, false, true]
                    },
                    createdAt: 1,
                    updatedAt: 1,
                }
            },
        ]);
        return res.status(200).json(new common_1.apiResponse(200, helpers_1.responseMessage.getDataSuccess('events'), {
            allEventCount,
            openEventCount,
            myEventCount,
            currentEvent,
            nextEvent
        }));
    }
    catch (error) {
        return res.status(500).json(new common_1.apiResponse(500, helpers_1.responseMessage?.internalServerError, error));
    }
};
exports.homePage = homePage;
const sendCSVFile = async (req, res) => {
    (0, winston_logger_1.reqInfo)(req);
    let { eventId } = req.query;
    let user = req.header('user'), response, match = {};
    try {
        let findEvent = await database_1.eventModel.aggregate([
            { $match: { _id: ObjectId(eventId), isActive: true } },
            {
                $lookup: {
                    from: "users",
                    let: { volunteerIds: "$volunteerRequest.volunteerId" },
                    pipeline: [
                        {
                            $match: {
                                $expr: {
                                    $and: [
                                        { $in: ["$_id", "$$volunteerIds"] },
                                    ]
                                }
                            }
                        },
                        { $project: { firstName: 1, lastName: 1, mobileNumber: 1, tags: 1, workTime: 1, RBSId: 1, image: 1 } }
                    ],
                    as: 'volunteerData'
                }
            },
            {
                $project: {
                    name: 1,
                    address: 1,
                    date: 1,
                    startTime: 1,
                    endTime: 1,
                    volunteerRequest: {
                        $map: {
                            input: "$volunteerRequest",
                            as: "request",
                            in: {
                                _id: "$$request._id",
                                volunteerId: "$$request.volunteerId",
                                requestStatus: "$$request.requestStatus",
                                attendance: "$$request.attendance",
                                volunteerData: {
                                    $arrayElemAt: [
                                        {
                                            $filter: {
                                                input: "$volunteerData",
                                                cond: { $eq: ["$$this._id", "$$request.volunteerId"] }
                                            }
                                        },
                                        0
                                    ]
                                }
                            }
                        }
                    },
                }
            }
        ]);
        let responseData = findEvent[0]?.volunteerRequest.filter(data => data.requestStatus === "APPROVED");
        let declinedResponseData = findEvent[0]?.volunteerRequest.filter(data => data.requestStatus === "DECLINED");
        await responseData.sort(function (a, b) {
            const firstNameA = a.volunteerData.firstName.toUpperCase();
            const firstNameB = b.volunteerData.firstName.toUpperCase();
            if (firstNameA < firstNameB) {
                return -1;
            }
            if (firstNameA > firstNameB) {
                return 1;
            }
            return 0;
        });
        let csvData = [];
        await responseData.map((data) => {
            csvData.push({
                name: data.volunteerData?.firstName + " " + data.volunteerData?.lastName,
                mobileNumber: data.volunteerData?.mobileNumber,
                eventName: findEvent[0].name,
                address: findEvent[0].address,
                date: new Date(findEvent[0].date).toLocaleDateString(),
                // startTime: new Date(findEvent[0].startTime).toLocaleTimeString(),
                // endTime: new Date(findEvent[0].endTime).toLocaleTimeString(),
                attendance: data.attendance ? "PRESENT" : "ABSENT",
                status: data.requestStatus
            });
        });
        await declinedResponseData.sort(function (a, b) {
            const firstNameA = a.volunteerData.firstName.toUpperCase();
            const firstNameB = b.volunteerData.firstName.toUpperCase();
            if (firstNameA < firstNameB) {
                return -1;
            }
            if (firstNameA > firstNameB) {
                return 1;
            }
            return 0;
        });
        await declinedResponseData.map((data) => {
            csvData.push({
                name: data.volunteerData?.firstName + " " + data.volunteerData?.lastName,
                mobileNumber: data.volunteerData?.mobileNumber,
                eventName: findEvent[0].name,
                address: findEvent[0].address,
                date: new Date(findEvent[0].date).toLocaleDateString(),
                // startTime: new Date(findEvent[0].startTime).toLocaleTimeString(),
                // endTime: new Date(findEvent[0].endTime).toLocaleTimeString(),
                attendance: data.attendance ? "PRESENT" : "ABSENT",
                status: data.requestStatus
            });
        });
        let findAdminData = await database_1.userModel.find({ userType: 1, isActive: true }, { email: 1 });
        let emailData = [];
        await findAdminData.map((e) => {
            emailData.push(e.email);
        });
        const csvFilePath = `${findEvent[0]?.name}-event-attendance.csv`;
        const s3Key = `csv/${csvFilePath}`;
        // const s3Key = csvFilePath;
        const csvWriterObj = csvWriter({
            path: csvFilePath,
            header: [
                { id: 'name', title: 'Full Name' },
                { id: 'mobileNumber', title: 'Mobile Number' },
                { id: 'eventName', title: 'Event Name' },
                { id: 'date', title: 'Date' },
                // { id: 'startTime', title: 'Start Time' },
                // { id: 'endTime', title: 'End Time' },
                { id: 'attendance', title: 'Attendance' },
                { id: 'status', title: 'Status' },
                { id: 'address', title: 'Location' },
            ]
        });
        csvWriterObj.writeRecords(csvData) // returns a promise
            .then(() => {
            const fileContent = fs_1.default.readFileSync(csvFilePath);
            const params = {
                Bucket: bucket_name,
                Key: s3Key,
                Body: fileContent
            };
            s3.upload(params, async (err, data) => {
                if (err) {
                    console.error('Error uploading file to S3:', err);
                }
                else {
                    console.log('File uploaded to S3 successfully.');
                    // Send email with the attached CSV file
                    await (0, mail_1.CSV_file_mail)(emailData, csvFilePath, s3Key);
                }
            });
        });
        return res.status(200).json(new common_1.apiResponse(200, "Email sent successfully", {}));
    }
    catch (error) {
        return res.status(500).json(new common_1.apiResponse(500, helpers_1.responseMessage?.internalServerError, error));
    }
};
exports.sendCSVFile = sendCSVFile;
//# sourceMappingURL=homePage.js.map