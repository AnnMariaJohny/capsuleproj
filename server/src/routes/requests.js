import { Router } from 'express'
import { createRequest, listRequests, updateRequestStatus } from '../controllers/requestController.js'
import { authenticate } from '../middleware/authenticate.js'

const router = Router()
router.use(authenticate)
router.get('/', listRequests)
router.post('/', createRequest)
router.patch('/:id/status', updateRequestStatus)

export default router
