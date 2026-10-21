import mongoose from 'mongoose'

const workspaceRecordSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  kind: {
    type: String,
    required: true,
    enum: ['checklist', 'rewards', 'proofs', 'inventory', 'refurbish', 'corporate', 'community'],
  },
  data: { type: mongoose.Schema.Types.Mixed, required: true },
}, { timestamps: true })

workspaceRecordSchema.index({ userId: 1, kind: 1 }, { unique: true })

const WorkspaceRecord = mongoose.models.WorkspaceRecord
  || mongoose.model('WorkspaceRecord', workspaceRecordSchema)
WorkspaceRecord.memoryRecords = WorkspaceRecord.memoryRecords || new Map()

export default WorkspaceRecord
