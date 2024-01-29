import { userModel } from "../database"
const ObjectId = require('mongoose').Types.ObjectId

export const getUser = async (userId: string, isActive: boolean) => { 
  const user = await userModel.findOne({
    _id: ObjectId(userId),
    isActive: isActive
  })
  return user
}