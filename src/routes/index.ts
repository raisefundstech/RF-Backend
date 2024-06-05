import express from 'express'
import { userRouter } from './user'
import { uploadRouter } from './upload'
import { reportRouter } from './report'

const router = express.Router()

router.use('/user', userRouter)
router.use('/upload', uploadRouter)
router.use('/report', reportRouter)

export { router }