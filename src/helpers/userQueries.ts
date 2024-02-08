import { userModel } from "../database"
const ObjectId = require('mongoose').Types.ObjectId

/**
 * Retrieves a user from the database based on the provided user ID and isActive flag.
 * @param {string} userId - The ID of the user to retrieve.
 * @param {boolean} isActive - Indicates whether the user is active or not.
 * @returns {Promise<User | null>} - A promise that resolves to the retrieved user object, or null if no user is found.
 */
export const getUser = async (userId: string, isActive: boolean) => { 
  const user = await userModel.findOne({
    _id: ObjectId(userId),
    isActive: isActive
  })
  return user
}