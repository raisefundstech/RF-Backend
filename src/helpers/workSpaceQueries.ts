import { Request, Response } from 'express'
import { workSpaceModel } from '../database/models/workSpace'
import { reqInfo,logger } from '../helpers/winston_logger'

const ObjectId = require('mongoose').Types.ObjectId

/**
 * Retrieves the details of a stadium by its workspace ID within an event.
 * @param eventId - The ID of the event.
 * @param workSpaceId - The ID of the workspace.
 * @returns If the stadium is found, an object containing its details (name, address, latitude, longitude, stadiumPolicy).
 * If the stadium is not found, an object with an error message.
 */
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

