const mongoose = require('mongoose')

const userDocumentSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  templateId: { type: String, required: true },
  templateName: { type: String },
  fileName: { type: String },
  savedAt: { type: Date, default: Date.now },
})

// Un utilisateur ne peut pas sauvegarder le même template deux fois
userDocumentSchema.index({ userId: 1, templateId: 1 }, { unique: true })

module.exports = mongoose.model('UserDocument', userDocumentSchema)
