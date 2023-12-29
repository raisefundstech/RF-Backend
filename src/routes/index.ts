import express from 'express'
import { userRouter } from './user'
import { uploadRouter } from './upload'

const router = express.Router()

router.use('/user', userRouter)
router.use('/upload', uploadRouter)

export { router }