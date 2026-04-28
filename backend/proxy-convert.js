const express = require('express')
const router = express.Router()
const fetch = require('node-fetch')
const { fixSfdt } = require('./lib/sfdtFixer')

// POST /api/proxy-convert
// Proxy vers le service .NET DocumentEditor local (port 5000)
// Ce router est monté AVANT express.json() pour que le stream reste intact (multipart/form-data)
router.post('/', async (req, res) => {
  try {
    const target = 'http://localhost:5000/api/documenteditor/convert'

    const headers = {}
    if (req.headers['content-type']) headers['content-type'] = req.headers['content-type']
    if (req.headers['content-length']) headers['content-length'] = req.headers['content-length']

    let upstream
    try {
      // req est un stream lisible — node-fetch v2 l'accepte directement comme body
      upstream = await fetch(target, { method: 'POST', body: req, headers })
    } catch (err) {
      console.error('Fetch to upstream failed:', err)
      return res.status(502).end('Fetch to upstream failed: ' + String(err && err.message ? err.message : err))
    }

    if (!upstream.ok) {
      const txt = await upstream.text().catch(() => '')
      console.error('Upstream returned error', upstream.status, txt)
      return res.status(502).end('Upstream error: ' + upstream.status + ' ' + txt)
    }

    const rawBody = await upstream.text()

    // Post-process the SFDT to fix common formatting issues:
    // – Headings using tab-based centering → true center alignment
    // – List paragraphs missing bullet characters → explicit inline bullet
    let responseBody = rawBody
    try {
      const parsed = JSON.parse(rawBody)
      // The .NET service may return { sfdt: "<compressed>" } or raw SFDT JSON
      if (parsed && typeof parsed.sfdt === 'string') {
        parsed.sfdt = fixSfdt(parsed.sfdt)
        responseBody = JSON.stringify(parsed)
      } else {
        responseBody = fixSfdt(rawBody)
      }
    } catch (e) {
      // If parsing fails just return raw body unchanged
      console.warn('sfdtFixer: could not process response, returning raw body')
    }

    res.status(200).setHeader('Content-Type', 'application/json')
    res.send(responseBody)
  } catch (err) {
    console.error(err)
    res.status(500).end(String(err.message || err))
  }
})

module.exports = router
