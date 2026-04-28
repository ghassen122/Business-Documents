const express = require('express')
const router = express.Router()
const multer = require('multer')
const fs = require('fs')
const FormData = require('form-data')
const fetch = require('node-fetch')

// Stockage temporaire des fichiers uploadés
const upload = multer({ dest: require('os').tmpdir() })

// POST /api/documenteditor/convert
// Reçoit un fichier DOCX, le transmet au service .NET local (port 5000), retourne le SFDT
router.post('/convert', upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).end('file missing')

  try {
    const { path: tmpPath, originalname, mimetype } = req.file

    const form = new FormData()
    form.append('file', fs.createReadStream(tmpPath), {
      filename: originalname || 'upload.docx',
      contentType: mimetype || 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    })

    // Use local .NET DocEditorService (avoids SSL issues with remote Syncfusion cloud)
    const target = 'http://localhost:5000/api/documenteditor/convert'
    let resp
    try {
      resp = await fetch(target, { method: 'POST', body: form, headers: form.getHeaders() })
    } catch (err) {
      fs.unlink(tmpPath, () => {})
      return res.status(502).end('Service .NET indisponible (port 5000). Démarrez DocEditorService.')
    }

    // Nettoyage du fichier temporaire
    fs.unlink(tmpPath, () => {})

    if (!resp.ok) {
      const text = await resp.text().catch(() => '')
      return res.status(502).end('Erreur upstream: ' + resp.status + ' ' + text)
    }

    const sfdt = await resp.text()
    res.status(200).setHeader('Content-Type', 'application/json').send(sfdt)
  } catch (err) {
    console.error(err)
    res.status(500).end(String(err.message || err))
  }
})

module.exports = router
