import mongoose from 'mongoose'

const numberSchema = new mongoose.Schema({
  apelido: { type: String, required: true },
  numberPhone: { type: String, required: false },
  status: { 
    type: String, 
    enum: ['CONECTADO', 'NÃO CONECTADO'],
    default: 'NÃO CONECTADO' 
  },
  ownerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
})

// Middleware para atualizar o campo updatedAt antes de salvar
numberSchema.pre('save', function(next) {
  this.updatedAt = new Date()
  next()
})

const Number = mongoose.model('Number', numberSchema)
export default Number 