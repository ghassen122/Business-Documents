const UserDocument = require('../models/UserDocument')
const { getUserFromRequest } = require('../lib/auth')

// GET /api/user/documents
exports.getDocuments = async (req, res) => {
  const user = getUserFromRequest(req)
  if (!user) return res.status(401).json({ error: 'Non connecté.' })
  try {
    const docs = await UserDocument.find({ userId: user.id }).sort({ savedAt: -1 })
    return res.status(200).json(docs.map(d => ({
      templateId: d.templateId,
      templateName: d.templateName,
      fileName: d.fileName,
      savedAt: d.savedAt,
    })))
  } catch (err) {
    return res.status(500).json({ error: err.message })
  }
}

// POST /api/user/documents
exports.saveDocument = async (req, res) => {
  const user = getUserFromRequest(req)
  if (!user) return res.status(401).json({ error: 'Non connecté.' })
  const { templateId, templateName, fileName } = req.body || {}
  if (!templateId) return res.status(400).json({ error: 'templateId manquant' })
  try {
    // upsert — évite les doublons
    await UserDocument.updateOne(
      { userId: user.id, templateId },
      { $set: { templateName, fileName, savedAt: new Date() } },
      { upsert: true }
    )
    const docs = await UserDocument.find({ userId: user.id }).sort({ savedAt: -1 })
    return res.status(200).json(docs.map(d => ({
      templateId: d.templateId,
      templateName: d.templateName,
      fileName: d.fileName,
      savedAt: d.savedAt,
    })))
  } catch (err) {
    return res.status(500).json({ error: err.message })
  }
}

// DELETE /api/user/documents
exports.removeDocument = async (req, res) => {
  const user = getUserFromRequest(req)
  if (!user) return res.status(401).json({ error: 'Non connecté.' })
  const { templateId } = req.body || {}
  if (!templateId) return res.status(400).json({ error: 'templateId manquant' })
  try {
    await UserDocument.deleteOne({ userId: user.id, templateId })
    const docs = await UserDocument.find({ userId: user.id }).sort({ savedAt: -1 })
    return res.status(200).json(docs.map(d => ({
      templateId: d.templateId,
      templateName: d.templateName,
      fileName: d.fileName,
      savedAt: d.savedAt,
    })))
  } catch (err) {
    return res.status(500).json({ error: err.message })
  }
}
