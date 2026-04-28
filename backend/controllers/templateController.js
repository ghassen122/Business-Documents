const Template = require('../models/Template')
const { fixSfdt } = require('../lib/sfdtFixer')

// GET /api/templates
exports.list = async (req, res) => {
  try {
    const templates = await Template.find({}, 'name fileName blanks createdAt').sort({ createdAt: -1 })
    return res.status(200).json(templates.map(t => ({
      id: t._id.toString(),
      name: t.name,
      fileName: t.fileName,
      createdAt: t.createdAt,
      blanksCount: t.blanks.length,
    })))
  } catch (err) {
    return res.status(500).json({ error: err.message })
  }
}

// POST /api/templates
exports.create = async (req, res) => {
  const { name, fileName, sfdt, blanks } = req.body || {}
  if (!name || !sfdt || !blanks)
    return res.status(400).json({ error: 'Champs manquants' })
  try {
    const template = await Template.create({ name, fileName, sfdt, blanks })
    return res.status(201).json({ id: template._id.toString() })
  } catch (err) {
    return res.status(500).json({ error: err.message })
  }
}

// GET /api/templates/:id
exports.getById = async (req, res) => {
  try {
    const template = await Template.findById(req.params.id)
    if (!template) return res.status(404).json({ error: 'Modèle introuvable' })
    return res.status(200).json({
      id: template._id.toString(),
      name: template.name,
      fileName: template.fileName,
      sfdt: fixSfdt(template.sfdt),
      blanks: template.blanks,
      createdAt: template.createdAt,
    })
  } catch (err) {
    return res.status(500).json({ error: err.message })
  }
}

// DELETE /api/templates/:id
exports.remove = async (req, res) => {
  try {
    const deleted = await Template.findByIdAndDelete(req.params.id)
    if (!deleted) return res.status(404).json({ error: 'Modèle introuvable' })
    return res.status(200).json({ ok: true })
  } catch (err) {
    return res.status(500).json({ error: err.message })
  }
}
