import { userModel } from "../database"

export const getUser = async (userId: string,isActive: boolean) => { 
  const user = await userModel.findOne({
    id: userId,
    isActive: isActive
  })
  return user
}