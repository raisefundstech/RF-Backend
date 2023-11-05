import express from 'express'
import { authenticationController, userController } from '../controllers'
import { userJWT } from '../helpers/jwt'
import { eventValidation, ourTeamValidation, userValidation, workSpaceValidation } from '../validation'
const router = express.Router()

router.post('/signUp', userValidation?.userSignUp, authenticationController?.userSignUp)
router.post('/login', userValidation?.userSignIn, authenticationController?.userSignIn)
router.post('/otpVerification', userValidation?.otpVerification, authenticationController?.otpVerification)
router.post('/resendOTP', userValidation.resendOTP, authenticationController?.resendOTP)
router.get('/workSpaces', userController.getWorkSpace)
router.post('/sendOTP', userValidation.resendOTP, authenticationController?.sendOTP)
router.post('/verifyOTP', userValidation.verifyOTP, authenticationController?.verifyOTP)
// router.get('/addColumn', userController.add_column)

//  ------   Authentication   ------  
router.use(userJWT)

router.get('/sendCSVFile', userController.sendCSVFile)

//  ------  Account Routes  -------
router.get('/profile', userController?.getProfile)
router.put('/profile/update', userController?.updateProfile)

//  ------  Home Page Routes  ------
router.get('/homePage', userController.homePage)

//  ------  Work Space Routes  ------
router.get('/workSpace/:id', workSpaceValidation.by_id, userController.getWorkSpaceById)
router.post('/workSpace/get', userController.get_workSpace_pagination)
router.post('/workSpace/add', workSpaceValidation.createWorkSpace, userController.createWorkSpace)
router.put('/workSpace/update', workSpaceValidation.updateWorkSpace, userController.updateWorkSpace)
router.delete('/workSpace/:id', workSpaceValidation.by_id, userController.deleteWorkSpace)
router.put('/workSpace/switch/:id', workSpaceValidation.by_id, userController.switchWorkSpace)
router.get('/workSpace/volunteer/:id', workSpaceValidation.by_id, userController.getVolunteerByWorkSpace)
router.get('/workSpaces/manager', userController.getWorkSpaceByManager)

//  ------  Event Routes  ------
router.get('/events', userController.getEvents)
router.post('/event/get', userController.get_event_pagination)
router.post('/event/volunteer/page', userController.get_event_pagination_for_volunteers)
router.post('/event/add', eventValidation.createEvent, userController.createEvent)
router.get('/event/:id', eventValidation.by_id, userController.getEventById)
router.put('/event/update', eventValidation.updateEvent, userController.updateEvent)
router.delete('/event/:id', eventValidation.by_id, userController.deleteEvent)
router.post('/event/apply', userController.applyOnEvent)
router.put('/event/request/status', eventValidation.changeEventRequestStatus, userController.changeEventRequestStatus)
router.post('/event/request/attendance', eventValidation.addEventAttendance, userController.addEventAttendance)
router.delete('/event/request/delete/:id', eventValidation.by_id, userController.deleteRequestEvent)
router.post('/event/timeOfRequest/get', userController.getAllOpenMyEventList)
router.post('/event/volunteers/get', userController.getVolunteerByEvent)
router.put('/event/volunteers/add', userController.addVolunteerToEvent)

//  -------  Volunteers  -------
router.get('/volunteers', userController.getVolunteers)
router.put('/volunteer/position', userValidation.volunteerUpdate, userController.updateVolunteerPosition)
router.post('/volunteer/add', userValidation.userSignUp, userController.addVolunteer)

//  -------  Attendance  --------
router.get('/events/attendance/get', userController.getAttendanceBeforeEvents)
router.get('/events/attendance/volunteer/:id', eventValidation.by_id, userController.getVolunteerByEventAttendance)

//  -------  Meet Our Team  --------
router.get('/meetOurTeams', userController.getOurTeam)
router.post('/meetOurTeam/add', ourTeamValidation.createOurTeam, userController.createOurTeam)
router.put('/meetOurTeam/update', ourTeamValidation.updateOurTeam, userController.updateOurTeam)

//  ------ Room Routes -------
router.get('/room/get/:id', eventValidation.by_id, userController.get_room_v1)

// -------  Message Routes -------
router.get('/message', userController.get_message)

// ------ Deletion ------------
router.delete('/deleteUser', userController.deleteUser)
router.delete('/logout',userController.logoutUser)
// 
export const userRouter = router;