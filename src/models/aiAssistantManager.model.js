import mongoose, { Schema, Types } from 'mongoose'

const AiAssistantManagerSchema = new Schema({
    assistantId: { type: String, default: null },
    files: { type: Array, default: [] },
    name: { type: String, default: null },
    gptVersion: { type: String, default: null },
    startMsg: { type: String, default: null },
    goodByMsg: { type: String, default: null },
    idleTimeout: { type: String, default: null },
    idleTimeoutUnit: { type: String, default: 'm' },
    ownerId: { type: Types.ObjectId, default: null },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
    deletedAt: { type: Date, default: null },
})

const AiAssistantManager = mongoose.model(
    'aiAssistantManager',
    AiAssistantManagerSchema,
    'aiAssistantManagers',
)

export default AiAssistantManager