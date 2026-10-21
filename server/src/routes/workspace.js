import { Router } from 'express'
import { appendPickupProof, getWorkspace, saveWorkspaceRecord } from '../controllers/workspaceController.js'
import { authenticate } from '../middleware/authenticate.js'

const router = Router()
router.use(authenticate)
router.get('/', getWorkspace)
router.post('/proofs', appendPickupProof)
router.put('/:kind', saveWorkspaceRecord)

export default router
