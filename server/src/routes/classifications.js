import { Router } from 'express'
import { classifyItemPhoto } from '../controllers/classificationController.js'
import { authenticate } from '../middleware/authenticate.js'
import { limitAuthAttempts } from '../middleware/authRateLimit.js'

const router = Router()

router.use(authenticate, limitAuthAttempts)
router.post('/', classifyItemPhoto)

export default router
