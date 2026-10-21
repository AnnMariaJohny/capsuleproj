import WorkspaceRecord from '../models/WorkspaceRecord.js'

const allowedKinds = new Set(['checklist', 'rewards', 'inventory', 'refurbish', 'corporate', 'community'])
const rewardCosts = new Map([
  ['₹100 partner voucher', 300],
  ['Earth-friendly store coupon', 450],
  ['Recycled notebook set', 600],
])
const stages = new Set([0, 1, 2, 3])

function validProofRecord(record) {
  return record
    && typeof record.bagId === 'string' && record.bagId.trim().length > 0 && record.bagId.length <= 80
    && typeof record.photoName === 'string' && record.photoName.length <= 180
    && typeof record.photoData === 'string' && record.photoData.length <= 1_400_000
    && /^data:image\/(?:jpeg|png|webp);base64,[A-Za-z0-9+/]+=*$/.test(record.photoData)
    && typeof record.signatureData === 'string' && record.signatureData.length <= 180_000
    && /^data:image\/png;base64,[A-Za-z0-9+/]+=*$/.test(record.signatureData)
}

function validData(kind, data) {
  if (!data || typeof data !== 'object' || Array.isArray(data)) return false
  if (kind === 'checklist') {
    return Array.isArray(data.checkedSteps)
      && data.checkedSteps.length <= 4
      && data.checkedSteps.every((step) => Number.isInteger(step) && step >= 0 && step <= 3)
  }
  if (kind === 'rewards') {
    return Array.isArray(data.items)
      && data.items.length <= 500
      && data.items.every((item) => item && rewardCosts.get(item.name) === item.cost)
  }
  if (kind === 'inventory') {
    return Array.isArray(data.items)
      && data.items.length <= 500
      && data.items.every((item) => item
        && typeof item.id === 'string' && item.id.length <= 80
        && Number.isInteger(item.stage) && stages.has(item.stage))
  }
  if (kind === 'refurbish') return ['', 'functional', 'repairable', 'end-of-life'].includes(data.decision)
  if (kind === 'corporate') {
    return typeof data.companyName === 'string' && data.companyName.trim().length > 0 && data.companyName.length <= 120
      && Number.isInteger(data.quantity) && data.quantity >= 1 && data.quantity <= 10000
      && ['No', 'Yes — request quote'].includes(data.shredding)
      && typeof data.email === 'string' && data.email.length <= 254
      && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)
  }
  return kind === 'community' && data.joined === true
}

export async function getWorkspace(req, res, next) {
  try {
    const records = WorkspaceRecord.db.readyState === 1
      ? await WorkspaceRecord.find({ userId: req.user.id }).lean()
      : [...WorkspaceRecord.memoryRecords.values()].filter((record) => record.userId === req.user.id)
    const communityCount = WorkspaceRecord.db.readyState === 1
      ? await WorkspaceRecord.countDocuments({ kind: 'community', 'data.joined': true })
      : [...WorkspaceRecord.memoryRecords.values()].filter((record) => record.kind === 'community' && record.data.joined).length
    return res.json({
      records: records.map(({ kind, data }) => ({
        kind,
        data: kind === 'proofs'
          ? { records: data.records.map(({ bagId, photoName }) => ({ bagId, photoName })) }
          : data,
      })),
      communityCount,
    })
  } catch (error) {
    return next(error)
  }
}

export async function appendPickupProof(req, res, next) {
  try {
    const { record } = req.body || {}
    if (!validProofRecord(record)) return res.status(400).json({ message: 'Pickup proof must include a valid bag ID, condition photo, and signature.' })
    const id = `${req.user.id}:proofs`
    if (WorkspaceRecord.db.readyState !== 1) {
      const existing = WorkspaceRecord.memoryRecords.get(id)
      const records = existing?.data.records || []
      if (records.length >= 4 || JSON.stringify([...records, record]).length > 5_500_000) {
        return res.status(409).json({ message: 'This account has reached the secure pickup proof storage limit.' })
      }
      const data = { records: [...records, record] }
      WorkspaceRecord.memoryRecords.set(id, { userId: req.user.id, kind: 'proofs', data, updatedAt: new Date().toISOString() })
      return res.status(201).json({ bagId: record.bagId, photoName: record.photoName })
    }

    let workspace = await WorkspaceRecord.findOne({ userId: req.user.id, kind: 'proofs' })
    if (!workspace) {
      try {
        workspace = await WorkspaceRecord.create({ userId: req.user.id, kind: 'proofs', data: { records: [record] } })
      } catch (error) {
        if (error.code === 11000) return res.status(409).json({ message: 'A pickup proof was saved at the same time. Please reload and try again.' })
        throw error
      }
    } else {
      if (workspace.data.records.length >= 4
        || JSON.stringify([...workspace.data.records, record]).length > 5_500_000) {
        return res.status(409).json({ message: 'This account has reached the secure pickup proof storage limit.' })
      }
      workspace.data.records.push(record)
      workspace.markModified('data')
      await workspace.save()
    }
    return res.status(201).json({ bagId: record.bagId, photoName: record.photoName })
  } catch (error) {
    return next(error)
  }
}

export async function saveWorkspaceRecord(req, res, next) {
  try {
    const { kind } = req.params
    const { data } = req.body || {}
    if (!allowedKinds.has(kind)) return res.status(404).json({ message: 'Workspace feature not found.' })
    if (!validData(kind, data)) return res.status(400).json({ message: 'Workspace feature data is invalid.' })

    if (WorkspaceRecord.db.readyState === 1) {
      const record = await WorkspaceRecord.findOneAndUpdate(
        { userId: req.user.id, kind },
        { $set: { data } },
        { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true },
      ).lean()
      return res.json({ kind: record.kind, data: record.data })
    }

    const id = `${req.user.id}:${kind}`
    const record = { userId: req.user.id, kind, data, updatedAt: new Date().toISOString() }
    WorkspaceRecord.memoryRecords.set(id, record)
    return res.json({ kind, data: record.data })
  } catch (error) {
    return next(error)
  }
}
