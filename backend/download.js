const express = require('express')
const router = express.Router()
const fetch = require('node-fetch')

// POST /api/download
// Transmet le SFDT au service .NET pour export DOCX, retourne le fichier téléchargeable
router.post('/', async (req, res) => {
  try {
    const { sfdt, fileName } = req.body
    if (!sfdt) return res.status(400).json({ error: 'sfdt manquant' })

    const upstream = await fetch('http://localhost:5000/api/documenteditor/export', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sfdt, fileName: fileName || 'document' }),
    })

    if (!upstream.ok) {
      const txt = await upstream.text().catch(() => '')
      return res.status(502).end('Export failed: ' + txt)
    }

    const buffer = await upstream.buffer()
    const name = (fileName || 'document').replace(/\.docx$/i, '') + '_rempli.docx'
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document')
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(name)}"`)
    return res.send(buffer)
  } catch (err) {
    console.error('Download error:', err)
    return res.status(500).json({ error: err.message })
  }
})

module.exports = router
