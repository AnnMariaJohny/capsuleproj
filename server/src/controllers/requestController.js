import Request from '../models/Request.js'

const validCategories = ['Phones & tablets', 'Computers', 'Accessories', 'Home electronics', 'Other']
const validStatuses = ['Pending', 'Pickup scheduled', 'Collected', 'Processed']
const partners = [
  { area: 'indiranagar', name: 'GreenLoop Recycling' },
  { area: 'koramangala', name: 'EcoCycle Partners' },
  { area: 'domlur', name: 'EarthForward Collective' },
]
const pointsPerKg = {
  'Phones & tablets': 8,
  Computers: 6,
  Accessories: 3,
  'Home electronics': 5,
  Other: 2,
}
const creditPerKg = {
  'Phones & tablets': 80,
  Computers: 45,
  Accessories: 15,
  'Home electronics': 20,
  Other: 8,
}
let memoryRequests = []
let memoryId = 1

function assignedPartner(area) {
  const match = partners.find((partner) => area.toLowerCase().includes(partner.area))
  return match?.name || 'GreenLoop Recycling'
}

function calculateRewardPoints(category, weightKg, ageYears) {
  const categoryRate = pointsPerKg[category] || pointsPerKg.Other
  return Math.floor(weightKg * categoryRate * (1 + Math.min(ageYears, 10) * 0.04))
}

function calculateEcoCredit(category, weightKg, ageYears) {
  const categoryRate = creditPerKg[category] || creditPerKg.Other
  const ageMultiplier = Math.max(0.5, 1 - Math.min(ageYears, 12) * 0.04)
  return Math.round(weightKg * categoryRate * ageMultiplier)
}

function filterMemoryRequests({ category, area, userId }) {
  return memoryRequests.filter((request) => {
    return request.userId === userId
      && (!category || request.category === category)
      && (!area || request.area.toLowerCase().includes(area.toLowerCase()))
  })
}

export async function listRequests(req, res, next) {
  try {
    const { category } = req.query
    const area = req.query.area
    if (category && !validCategories.includes(category)) {
      return res.status(400).json({ message: 'Unknown item category.' })
    }
    if (area !== undefined && (typeof area !== 'string' || area.length > 80)) {
      return res.status(400).json({ message: 'Area must be a string of 80 characters or fewer.' })
    }
    const requests = Request.db.readyState === 1
      ? await Request.find({
        userId: req.user.id,
        ...(category ? { category } : {}),
        ...(area ? { area: { $regex: area.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' } } : {}),
      }).sort({ createdAt: -1 }).lean()
      : filterMemoryRequests({ category, area, userId: req.user.id })
    return res.json(requests)
  } catch (error) {
    return next(error)
  }
}

export async function createRequest(req, res, next) {
  try {
    const { item, category, quantity, address, area, date, pinCode, preferredSlot } = req.body || {}
    const companyName = req.user.role === 'company' ? req.user.companyName : ''
    const ageYears = req.body?.ageYears === undefined ? 0 : Number(req.body.ageYears)
    const weightKg = req.body?.weightKg === undefined ? 0 : Number(req.body.weightKg)
    if (typeof item !== 'string' || !item.trim() || item.trim().length > 80
      || !validCategories.includes(category)
      || !Number.isInteger(Number(quantity)) || Number(quantity) < 1 || Number(quantity) > 100
      || typeof address !== 'string' || !address.trim() || address.trim().length > 180
      || typeof area !== 'string' || !area.trim() || area.trim().length > 80
      || !date || Number.isNaN(Date.parse(date))
      || typeof pinCode !== 'string' || !/^\d{6}$/.test(pinCode)
      || (preferredSlot !== undefined && !['09:00–11:00', '11:00–13:00', '14:00–16:00', '16:00–18:00'].includes(preferredSlot))
      || !Number.isFinite(ageYears) || ageYears < 0 || ageYears > 50
      || !Number.isFinite(weightKg) || weightKg < 0 || weightKg > 1000) {
      return res.status(400).json({ message: 'Please provide valid item, category, quantity, address, area, date, age, and weight details.' })
    }

    const earnedPoints = calculateRewardPoints(category, weightKg, ageYears)
    const newRequest = {
      item: item.trim(),
      userId: req.user.id,
      category,
      quantity: Number(quantity),
      address: address.trim(),
      area: area.trim(),
      date: new Date(date),
      pinCode,
      preferredSlot,
      companyName,
      ageYears,
      weightKg,
      rewardPoints: earnedPoints,
      estimatedCredit: calculateEcoCredit(category, weightKg, ageYears),
      status: 'Pending',
      partner: assignedPartner(area.trim()),
    }
    const saved = Request.db.readyState === 1
      ? await Request.create(newRequest)
      : { ...newRequest, _id: `RL-${String(memoryId++).padStart(4, '0')}`, createdAt: new Date().toISOString() }
    if (Request.db.readyState !== 1) memoryRequests.unshift(saved)
    return res.status(201).json(saved)
  } catch (error) {
    return next(error)
  }
}

export async function updateRequestStatus(req, res, next) {
  try {
    if (req.user.role !== 'partner') {
      return res.status(403).json({ message: 'Only an authorized recycling partner can update a collection status.' })
    }
    const { status } = req.body || {}
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ message: 'Status must be Pending, Pickup scheduled, Collected, or Processed.' })
    }
    if (Request.db.readyState === 1) {
      const updated = await Request.findOneAndUpdate({ _id: req.params.id, userId: req.user.id }, { status }, { new: true, runValidators: true })
      return updated ? res.json(updated) : res.status(404).json({ message: 'Pickup request not found.' })
    }
    const index = memoryRequests.findIndex((request) => request._id === req.params.id && request.userId === req.user.id)
    if (index < 0) return res.status(404).json({ message: 'Pickup request not found.' })
    memoryRequests[index] = { ...memoryRequests[index], status }
    return res.json(memoryRequests[index])
  } catch (error) {
    return next(error)
  }
}
