import mongoose, { Schema, Types } from 'mongoose'

const statusMessage = ['read', 'unread']

const messageSchema = new Schema({
  whatsappMessageId: { type: String, required: true },
  createdByAssistantId: { type: String, default: null },
  message: { type: String, required: true },
  status: { type: String, enum: statusMessage, required: true },
  sentBy: { type: String, required: true },
  senderName: { type: String, default: null },
  isLastMessage: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
  deletedAt: { type: Date, default: null },
  sentToOpenAI: { type: Boolean, default: false },
  audioUrl: { type: String, default: null },
})

const leadsSchema = new Schema({
  leadId: { type: Types.ObjectId, required: false },
})

const whatsappChatSchema = new Schema({
  userId: { type: Types.ObjectId, required: true },
  leadId: { type: Types.ObjectId, required: false },
  hasMessages: { type: Boolean, default: false },
  nameUser: { type: String, required: false },
  photoUser: { type: String, required: false },
  phoneUser: { type: String, required: false },
  phoneCustomer: { type: String, required: false },
  event: { type: String, required: false },
  assistantId: { type: String, default: null },
  threadId: { type: String, default: null },
  messages: [messageSchema],
  leads: [leadsSchema],
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
  deletedAt: { type: Date, default: null },
  lastOfficialWppMessageAt: { type: Date, default: null },
})

const WhatsAppMessagesToRetrySendSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  phone: { type: String, required: true },
  message: { type: String, required: true },
  senderName: { type: String, required: true },
  sentBy: { type: String, required: true },
  isLastMessage: { type: Boolean, default: false },
  threadId: { type: String, default: null },
  alreadySent: { type: Boolean, default: false },
  mustSend: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now },
  assistantManagerId: { type: String, default: null },
  assistantManagerType: { type: String, default: null },
})

const WhatsappOfficialApiConnectionSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, required: true },
  apiToken: {
    type: String,
    required: true,
    default: null,
  },
  phone: {
    type: String,
    required: true,
    default: null,
  },
  phoneId: {
    type: String,
    required: true,
    default: null,
  },
  isActive: {
    type: Boolean,
    default: false,
  },
  wabaId: {
    type: String,
    required: true,
    default: null,
  },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
})

const placeholdersMapper = new mongoose.Schema({
  position: { type: Number, required: true },
  placeholder: { type: String, required: true },
})

const WhatsappOfficialTemplateSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, required: true },
  assistantId: {
    type: String,
    required: false,
    default: null,
  },
  templateId: {
    type: String,
    required: true,
    default: null,
  },
  status: {
    type: String,
    required: true,
    default: null,
  },
  name: {
    type: String,
    required: false,
    default: null,
  },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
  placeholdersMapper: [placeholdersMapper],
})

export const WhatsappOfficialTemplateModel = mongoose.model(
  'WhatsappOfficialTemplate',
  WhatsappOfficialTemplateSchema,
  'WhatsappOfficialTemplate',
)

export const WhatsappChatModel = mongoose.model(
  'WhatsappChats',
  whatsappChatSchema,
  'whatsappChats',
)

export const WhatsAppMessagesToRetrySendModel = mongoose.model(
  'WhatsAppMessagesToRetrySend',
  WhatsAppMessagesToRetrySendSchema,
  'whatsAppMessagesToRetrySend',
)

export const WhatsappOfficialApiConnectionModel = mongoose.model(
  'WhatsappOfficialApiConnection',
  WhatsappOfficialApiConnectionSchema,
  'WhatsappOfficialApiConnection',
)