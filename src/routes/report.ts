import express from "express";
import { reportController } from "../controllers";
import {
  eventValidation,
  ourTeamValidation,
  userValidation,
  workSpaceValidation,
} from "../validation";
import { userJWT } from "../helpers/jwt";
const router = express.Router();


//  ------   Authentication   ------
router.use(userJWT);

//  ------  Reports  ------
router.get(
  "/event/volunteers/:id",
  eventValidation.by_event_id,
  reportController.getEventVolunteers
);

export const reportRouter = router;
