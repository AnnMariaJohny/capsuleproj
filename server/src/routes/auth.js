import { Router } from 'express'
import { currentUser, login, register } from '../controllers/authController.js'
import { authenticate } from '../middleware/authenticate.js'
import { limitAuthAttempts } from '../middleware/authRateLimit.js'

const router = Router()

router.post('/register', limitAuthAttempts, register)
router.post('/login', limitAuthAttempts, login)
router.get('/me', authenticate, currentUser)

export default router
