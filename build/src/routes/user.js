"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.userRouter = void 0;
const express_1 = __importDefault(require("express"));
const controllers_1 = require("../controllers");
const jwt_1 = require("../helpers/jwt");
const validation_1 = require("../validation");
const router = express_1.default.Router();
router.post('/signUp', validation_1.userValidation?.userSignUp, controllers_1.authenticationController?.userSignUp);
router.post('/login', validation_1.userValidation?.userSignIn, controllers_1.authenticationController?.userSignIn);
router.post('/otpVerification', validation_1.userValidation?.otpVerification, controllers_1.authenticationController?.otpVerification);
router.post('/resendOTP', validation_1.userValidation.resendOTP, controllers_1.authenticationController?.resendOTP);
router.get('/workSpaces', controllers_1.userController.getWorkSpace);
router.post('/sendOTP', validation_1.userValidation.resendOTP, controllers_1.authenticationController?.sendOTP);
router.post('/verifyOTP', validation_1.userValidation.verifyOTP, controllers_1.authenticationController?.verifyOTP);
// router.get('/addColumn', userController.add_column)
//  ------   Authentication   ------  
router.use(jwt_1.userJWT);
router.get('/sendCSVFile', controllers_1.userController.sendCSVFile);
//  ------  Account Routes  -------
router.get('/profile', controllers_1.userController?.getProfile);
router.put('/profile/update', controllers_1.userController?.updateProfile);
//  ------  Home Page Routes  ------
router.get('/homePage', controllers_1.userController.homePage);
//  ------  Work Space Routes  ------
router.get('/workSpace/:id', validation_1.workSpaceValidation.by_id, controllers_1.userController.getWorkSpaceById);
router.post('/workSpace/get', controllers_1.userController.get_workSpace_pagination);
router.post('/workSpace/add', validation_1.workSpaceValidation.createWorkSpace, controllers_1.userController.createWorkSpace);
router.put('/workSpace/update', validation_1.workSpaceValidation.updateWorkSpace, controllers_1.userController.updateWorkSpace);
router.delete('/workSpace/:id', validation_1.workSpaceValidation.by_id, controllers_1.userController.deleteWorkSpace);
router.put('/workSpace/switch/:id', validation_1.workSpaceValidation.by_id, controllers_1.userController.switchWorkSpace);
router.get('/workSpace/volunteer/:id', validation_1.workSpaceValidation.by_id, controllers_1.userController.getVolunteerByWorkSpace);
router.get('/workSpaces/manager', controllers_1.userController.getWorkSpaceByManager);
//  ------  Event Routes  ------
router.get('/events', controllers_1.userController.getEvents);
router.post('/event/get', controllers_1.userController.get_event_pagination);
router.post('/event/volunteer/page', controllers_1.userController.get_event_pagination_for_volunteers);
router.post('/event/add', validation_1.eventValidation.createEvent, controllers_1.userController.createEvent);
router.get('/event/:id', validation_1.eventValidation.by_id, controllers_1.userController.getEventById);
router.put('/event/update', validation_1.eventValidation.updateEvent, controllers_1.userController.updateEvent);
router.delete('/event/:id', validation_1.eventValidation.by_id, controllers_1.userController.deleteEvent);
router.post('/event/apply', controllers_1.userController.applyOnEvent);
router.put('/event/request/status', validation_1.eventValidation.changeEventRequestStatus, controllers_1.userController.changeEventRequestStatus);
router.post('/event/request/attendance', validation_1.eventValidation.addEventAttendance, controllers_1.userController.addEventAttendance);
router.delete('/event/request/delete/:id', validation_1.eventValidation.by_id, controllers_1.userController.deleteRequestEvent);
router.post('/event/timeOfRequest/get', controllers_1.userController.getAllOpenMyEventList);
router.post('/event/volunteers/get', controllers_1.userController.getVolunteerByEvent);
router.put('/event/volunteers/add', controllers_1.userController.addVolunteerToEvent);
//  -------  Volunteers  -------
router.get('/volunteers', controllers_1.userController.getVolunteers);
router.get('/volunteer/:id', validation_1.userValidation.by_id, controllers_1.userController.getVolunteer),
    router.get('/unverified/volunteers', validation_1.userValidation.checkWorkSpaceId, controllers_1.userController.getUnverifiedVolunteers),
    router.put('/volunteer/position', validation_1.userValidation.volunteerUpdate, controllers_1.userController.updateVolunteerPosition);
router.post('/volunteer/add', validation_1.userValidation.userSignUp, controllers_1.userController.addVolunteer);
//  -------  Attendance  --------
router.get('/events/attendance/get', controllers_1.userController.getAttendanceBeforeEvents);
router.get('/events/attendance/volunteer/:id', validation_1.eventValidation.by_id, controllers_1.userController.getVolunteerByEventAttendance);
//  -------  Meet Our Team  --------
router.get('/meetOurTeams', controllers_1.userController.getOurTeam);
router.post('/meetOurTeam/add', validation_1.ourTeamValidation.createOurTeam, controllers_1.userController.createOurTeam);
router.put('/meetOurTeam/update', validation_1.ourTeamValidation.updateOurTeam, controllers_1.userController.updateOurTeam);
//  ------ Room Routes -------
router.get('/room/get/:id', validation_1.eventValidation.by_id, controllers_1.userController.get_room_v1);
// -------  Message Routes -------
router.get('/message', controllers_1.userController.get_message);
// ------ Deletion ------------
router.delete('/deleteUser', controllers_1.userController.deleteUser);
router.delete('/logout', controllers_1.userController.logoutUser);
// 
exports.userRouter = router;
//# sourceMappingURL=user.js.map