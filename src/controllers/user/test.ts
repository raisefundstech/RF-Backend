import { apiResponse } from "../../common"
import { userModel } from "../../database"
import { reqInfo } from "../../helpers"
import { Request, Response } from 'express'

export const add_column = async (req: Request, res: Response) => {
    reqInfo(req)
    try {
        await userModel.updateMany({}, { $unset: { deviceToken: [] } })
        return res.status(200).json(new apiResponse(200, 'Testing successfully done!', {}))
    } catch (error) {
        console.log(error)
        return res.status(500).json(new apiResponse(500, "Internal Server Error", {}))
    }
}