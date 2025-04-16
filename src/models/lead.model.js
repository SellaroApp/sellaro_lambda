import mongoose, { Schema, Types } from 'mongoose'

const LeadSchema = new Schema({
    leadRef: { type: String, required: true, unique: true },
    name: { type: String, default: null },
    surname: { type: String, default: null },
    email: { type: String, default: null },
    telephone: { type: String, default: null },
    extraFields: { type: Schema.Types.Mixed, default: {} },
    pageId: {
        type: Schema.Types.Mixed,
        default: null,
        validate: {
            validator: function (v) {
                if (v === null) return true
                if (Types.ObjectId.isValid(v)) {
                    this.pageId = new Types.ObjectId(v)
                    return true
                }
                return typeof v === 'string'
            },
            message:
                'pageId must be null, an ObjectId, or a string for virtual pages',
        },
    },
    funnelId: { type: Types.ObjectId, default: null },
    ownerId: { type: Types.ObjectId, default: null },
    assistantManagerId: { type: Types.ObjectId, default: null },
    assistantManagerType: { type: String, default: null },
    visitedPagesIds: {
        type: [Schema.Types.Mixed],
        default: [],
        validate: {
            validator: function (v) {
                return v.every(id => {
                    if (Types.ObjectId.isValid(id)) {
                        const idx = v.indexOf(id)
                        v[idx] = new Types.ObjectId(id)
                        return true
                    }
                    return typeof id === 'string'
                })
            },
            message:
                'visitedPagesIds must contain only ObjectIds or strings for virtual pages',
        },
    },
    // Campo atualizado quando a plataforma envia mensagem ao Lead ou quando o Lead responde
    lastMessageUpdatedAt: { type: Date, default: null },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
    deletedAt: { type: Date, default: null },
})

LeadSchema.pre('save', function (next) {
    if (this.pageId && Types.ObjectId.isValid(this.pageId)) {
        this.pageId = new Types.ObjectId(this.pageId)
    }

    if (this.visitedPagesIds) {
        this.visitedPagesIds = this.visitedPagesIds.map(id =>
            Types.ObjectId.isValid(id) ? new Types.ObjectId(id) : id,
        )
    }

    next()
})

const LeadModel = mongoose.model('Lead', LeadSchema, 'leads')

export default LeadModel