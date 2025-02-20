import express from "express";
import { authenticationController, userController } from "../controllers";
import { userJWT } from "../helpers/jwt";
import {
  eventValidation,
  ourTeamValidation,
  userValidation,
  workSpaceValidation,
} from "../validation";
const router = express.Router();

router.post(
  "/signUp",
  userValidation?.userSignUp,
  authenticationController?.userSignUp
);
router.post(
  "/login",
  userValidation?.userSignIn,
  authenticationController?.userSignIn
);
router.post(
  "/otpVerification",
  userValidation?.otpVerification,
  authenticationController?.otpVerification
);
// router.post('/resendOTP', userValidation.resendOTP, authenticationController?.resendOTP)
router.get("/workSpaces", userController.getWorkSpace);
router.post(
  "/validate",
  userValidation?.userSignIn,
  authenticationController?.validate
);
router.post(
  "/sendOTP",
  userValidation.resendOTP,
  authenticationController?.sendOTP
);
router.post(
  "/verifyOTP",
  userValidation.verifyOTP,
  authenticationController?.verifyOTP
);
// router.get('/addColumn', userController.add_column)

//  ------   Authentication   ------
router.use(userJWT);

router.get("/sendCSVFile", userController.sendCSVFile);

//  ------  Account Routes  -------
router.get("/profile", userController?.getProfile);
router.put(
  "/profile/update",
  userValidation?.profileUpdate,
  userController?.updateProfile
);

//  ------  Home Page Routes  ------
router.get("/homePage", userController.homePage);

//  ------  Work Space Routes  ------
router.get(
  "/workSpace/:id",
  workSpaceValidation.by_id,
  userController.getWorkSpaceById
);
router.post("/workSpace/get", userController.get_workSpace_pagination);
router.post(
  "/workSpace/add",
  workSpaceValidation.createWorkSpace,
  userController.createWorkSpace
);
router.put(
  "/workSpace/update",
  workSpaceValidation.updateWorkSpace,
  userController.updateWorkSpace
);
router.delete(
  "/workSpace/:id",
  workSpaceValidation.by_id,
  userController.deleteWorkSpace
);
router.put(
  "/workSpace/switch/:id",
  workSpaceValidation.by_id,
  userController.switchWorkSpace
);
router.get(
  "/workSpace/volunteer/:id",
  workSpaceValidation.by_id,
  userController.getVolunteerByWorkSpace
);
router.get("/workSpaces/manager", userController.getWorkSpaceByManager);
router.get(
  "/workSpace/stadiums/:id",
  workSpaceValidation.fetch_stadium,
  userController.getStadiumDetailsByWorkSpace
);
router.post(
  "/workSpace/stadiums/add",
  workSpaceValidation.add_stadiums,
  userController.addStadiumByWorkspace
);
router.put(
  "/workSpace/stadiums/update",
  workSpaceValidation.updateStadium,
  userController.updateStadiumByWorkSpace
);

//  ------  Event Routes  ------
router.get("/myevents", userController.getMyEvents);
router.get("/events", userController.getEvents);
router.post("/event/get", userController.get_event_pagination);
router.post(
  "/event/volunteer/page",
  userController.get_event_pagination_for_volunteers
);
router.post(
  "/event/add",
  eventValidation.createEvent,
  userController.createEvent
);
router.get(
  "/event/:id",
  eventValidation.by_event_id,
  userController.getEventById
);
router.get(
  "/event/volunteers/:id",
  eventValidation.by_event_id,
  userController.getVolunteersByEvent
);
router.put(
  "/event/update",
  eventValidation.updateEvent,
  userController.updateEvent
);
router.delete(
  "/event/:id",
  eventValidation.by_event_id,
  userController.deleteEvent
);
router.post("/event/apply", eventValidation.applyToEvent, userController.apply);
router.delete(
  "/event/withdraw/:id",
  eventValidation.by_event_id,
  userController.withdraw
);
router.post("/event/volunteers/get", userController.getVolunteerByEvent);
router.put("/event/volunteers/add", userController.addVolunteerToEvent);
router.patch(
  "/event/volunteers/request",
  eventValidation.update_volunteer_request_status,
  userController.updateVolunteers
);

//  -------  Volunteers  -------
router.get(
  "/volunteers",
  userValidation.checkWorkSpaceId,
  userController.getVolunteers
);
router.get("/volunteer/:id", userValidation.by_id, userController.getVolunteer);
router.put(
  "/volunteer/position",
  userValidation.volunteerUpdate,
  userController.updateVolunteerPosition
);
router.post(
  "/volunteer/add",
  userValidation.userSignUp,
  userController.addVolunteer
);
router.get(
  "/unverified/volunteers",
  userValidation.checkWorkSpaceId,
  userController.getUnverifiedVolunteers
);

//  -------  Attendance  --------
router.patch(
  "/attendance/checkin",
  eventValidation.checkInOutEvent,
  userController.volunteerCheckIn
);
router.patch(
  "/attendance/checkout",
  eventValidation.checkInOutEvent,
  userController.volunteerCheckOut
);

//  -------  Meet Our Team  --------
router.get("/meetOurTeams", userController.getOurTeam);
router.post(
  "/meetOurTeam/add",
  ourTeamValidation.createOurTeam,
  userController.createOurTeam
);
router.put(
  "/meetOurTeam/update",
  ourTeamValidation.updateOurTeam,
  userController.updateOurTeam
);

// -------  Message Routes -------
router.get("/message", userController.get_message);

// ------ Deletion ------------
router.delete("/deleteUser", userController.deleteUser);
router.delete("/logout", userController.logoutUser);
//
export const userRouter = router;