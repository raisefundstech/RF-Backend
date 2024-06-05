import express from "express";
import { reportController } from "../controllers";
import { reportValidation } from "../validation";
import { userJWT } from "../helpers/jwt";
const router = express.Router();

//  ------   Authentication   ------
router.use(userJWT);

//  ------  Reports  ------
router.post(
  "/event/volunteers",
  reportValidation.volunteerReport,
  reportController.getEventVolunteers
);

export const reportRouter = router;
