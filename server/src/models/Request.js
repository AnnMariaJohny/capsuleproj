import mongoose from 'mongoose'

const requestSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
  item: { type: String, required: true, trim: true, maxlength: 80 },
  category: {
    type: String,
    required: true,
    enum: ['Phones & tablets', 'Computers', 'Accessories', 'Home electronics', 'Other'],
  },
  quantity: { type: Number, required: true, min: 1, max: 100 },
  address: { type: String, required: true, trim: true, maxlength: 180 },
  area: { type: String, required: true, trim: true, maxlength: 80 },
  date: { type: Date, required: true },
  pinCode: { type: String, trim: true, match: /^\d{6}$/ },
  preferredSlot: { type: String, enum: ['09:00–11:00', '11:00–13:00', '14:00–16:00', '16:00–18:00'] },
  companyName: { type: String, trim: true, maxlength: 120 },
  ageYears: { type: Number, min: 0, max: 50, default: 0 },
  weightKg: { type: Number, min: 0, max: 1000, default: 0 },
  rewardPoints: { type: Number, min: 0, default: 0 },
  estimatedCredit: { type: Number, min: 0, default: 0 },
  status: {
    type: String,
    enum: ['Pending', 'Pickup scheduled', 'Collected', 'Processed'],
    default: 'Pending',
  },
  partner: { type: String, default: 'Partner assignment pending' },
}, { timestamps: true })

requestSchema.index({ userId: 1, createdAt: -1 })

export default mongoose.models.Request || mongoose.model('Request', requestSchema)
