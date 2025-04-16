import mongoose, { Schema, Types } from 'mongoose'

export const webhookStatus = ['active', 'disabled']
export const webhookLogsStatus = ['success', 'error']

const CrmWebhookSchema = new Schema({
  ownerId: { type: Types.ObjectId, required: true },
  url: { type: String, default: null },
  status: { type: String, enum: webhookStatus, default: webhookStatus[0] },
  crmId: { type: Types.ObjectId, required: true },
  // Pode ser o id de item do model Page ou do model crmCustomColumns
  columnId: { type: Types.ObjectId, required: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
  deletedAt: { type: Date, default: null },
})

const CrmWebhookLogsSchema = new Schema({
  webhookId: { type: Types.ObjectId, required: true },
  status: {
    type: String,
    enum: webhookLogsStatus,
    default: webhookLogsStatus[0],
  },
  leadId: { type: Types.ObjectId, required: true },
  createdAt: { type: Date, default: Date.now },
})

export const CrmWebhookModel = mongoose.model(
  'CrmWebhook',
  CrmWebhookSchema,
  'crmWebhooks',
)
export const CrmWebhookLogsModel = mongoose.model(
  'CrmWebhookLogs',
  CrmWebhookLogsSchema,
  'crmWebhookLogs',
)