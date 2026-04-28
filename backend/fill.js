const express = require('express')
const router = express.Router()
const multer = require('multer')
const fs = require('fs')
const PizZip = require('pizzip')

const upload = multer({ dest: require('os').tmpdir() })

// POST /api/fill
// Reçoit un fichier DOCX + valeurs JSON, remplace les blancs (___) et retourne le DOCX rempli
router.post('/', upload.single('file'), (req, res) => {
  try {
    const values = req.body.values ? JSON.parse(req.body.values) : {}
    if (!req.file) return res.status(400).end('Fichier manquant')

    const data = fs.readFileSync(req.file.path)
    const z = new PizZip(data)
    let xml = z.file('word/document.xml').asText()

    let i = 0
    xml = xml.replace(/_{3,}/g, () => {
      const key = `field_${i}`
      const val = values[key] || ''
      i++
      return val
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
    })

    z.file('word/document.xml', xml)
    const out = z.generate({ type: 'nodebuffer' })

    // Nettoyage du fichier temporaire
    fs.unlink(req.file.path, () => {})

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document')
    res.setHeader('Content-Disposition', 'attachment; filename=filled.docx')
    res.send(out)
  } catch (err) {
    console.error(err)
    res.status(500).end(String(err.message || err))
  }
})

module.exports = router
