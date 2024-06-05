import { Request, Response } from "express";
import Joi from "joi";
import { isValidObjectId } from "mongoose";
import { apiResponse } from "../common";

export const volunteerReport = async (
  req: Request,
  res: Response,
  next: any
) => {
  const schema = Joi.object({
    id: Joi.string()
      .trim()
      .required()
      .error(new Error("event id is required!")),
    volunteersEventStatus: Joi.string()
      .equal("PENDING", "APPROVED", "DECLINED", "ATTENDED")
      .error(new Error("volunteersEventStatus is required!")),
  });
  schema
    .validateAsync(req.body)
    .then((result) => {
      if (!isValidObjectId(result.id))
        return res.status(400).json(new apiResponse(400, "invalid id", {}));
      req.body = result;
      return next();
    })
    .catch((error) => {
      res.status(400).json(new apiResponse(400, error.message, {}));
    });
};
