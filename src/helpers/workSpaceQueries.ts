import { Request, Response } from 'express'
import { workSpaceModel } from '../database/models/workSpace'
import { reqInfo,logger } from '../helpers/winston_logger'

const ObjectId = require('mongoose').Types.ObjectId

export const getStadiumDetailsByWorkSpace = async (eventId: string, workSpaceId: string) => {
    logger.info("logging info"+" "+eventId+" "+workSpaceId)
    try {
        let response = await workSpaceModel.findOne(
            { 
                _id: ObjectId(eventId), 
                isActive: true, 
                stadiums: { $elemMatch: { _id: ObjectId(workSpaceId) } }
            },
            { 'stadiums.$': 1 } 
        );
        if (response) {
            const stadium = response.stadiums[0];
            const { name, address, latitude, longitude, stadiumPolicy } = stadium;
            return {
                _id: response._id,
                name,
                address,
                latitude,
                longitude,
                stadiumPolicy
            };
        } else {
            return {error: "No stadium found"};
        }
    } catch (error) {
        return {error: error.message};
    }
}

