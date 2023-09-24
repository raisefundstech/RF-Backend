"use strict"
import { Router } from 'express'
// import { userJWT } from '../helpers/jwt'
import { compress_image, image_compress_response, delete_file, uploadS3 } from '../helpers/s3'
import { apiResponse, file_path } from '../common'
import { Request, Response } from 'express'
import { userJWT } from '../helpers/jwt'

const router = Router();
const file_type = async (req: Request, res: Response, next: any) => {
    if (!file_path.includes(req.params.file)) return res.status(400).json(new apiResponse(400, 'invalid file type', { action: file_path }))
    next();
}

//  ------   Authentication ------  
router.post('/:file', file_type, uploadS3.single('image'), image_compress_response)

router.use(userJWT)

router.post('/compress/:file', file_type, compress_image.single('image'), image_compress_response)

// Delete
router.delete('/delete_file/:folder-:file', delete_file)

export const uploadRouter = router