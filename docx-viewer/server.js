/**
 * server.js — DOCX Viewer Express server
 *
 * GET  /                  → viewer (index.html)
 * GET  /admin             → admin page (admin.html)
 * POST /parse             → parse docx, return raw blocks (viewer)
 * POST /api/parse-admin   → parse docx + detect blanks (admin import)
 * GET  /api/templates     → list saved templates
 * POST /api/templates     → save a new template
 * DELETE /api/templates/:id → delete a template
 */

const express = require('express');
const cors    = require('cors');
const multer  = require('multer');
const path    = require('path');
const fs      = require('fs');
const JSZip   = require('jszip');
const { parseDocx }     = require('./parser/docxParser');
const { detectBlanks }  = require('./parser/blankDetector');

const app    = express();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 20 * 1024 * 1024 } });
const PORT   = 4000;

// ---- Data directory for templates ----
const DATA_DIR = path.join(__dirname, 'data', 'templates');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

// ---- Middleware ----
app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: '30mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// ---- Serve admin.html at /admin ----
app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

// ---- /parse endpoint (viewer) ----
app.post('/parse', upload.single('docx'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    const result = await parseDocx(req.file.buffer);
    res.json(result);
  } catch (err) {
    console.error('Parse error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ---- /api/parse-admin (admin import: parse + detect blanks) ----
app.post('/api/parse-admin', upload.single('docx'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    const { layout, blocks, hyperlinks } = await parseDocx(req.file.buffer);
    const { blanks, patchedBlocks } = detectBlanks(blocks);
    res.json({ layout, blocks: patchedBlocks, hyperlinks, blanks });
  } catch (err) {
    console.error('Parse-admin error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ---- GET /api/templates ----
app.get('/api/templates', (req, res) => {
  try {
    const files = fs.readdirSync(DATA_DIR).filter(f => f.endsWith('.json'));
    const list = files.map(f => {
      const t = JSON.parse(fs.readFileSync(path.join(DATA_DIR, f), 'utf8'));
      return { id: t.id, name: t.name, fileName: t.fileName, blanksCount: t.blanks.length, createdAt: t.createdAt };
    }).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    res.json(list);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ---- POST /api/templates ----
app.post('/api/templates', (req, res) => {
  try {
    const { name, fileName, layout, blocks, hyperlinks, blanks, originalDocx } = req.body;
    if (!name || !blocks) return res.status(400).json({ error: 'name and blocks are required' });
    const id = Date.now().toString();
    const template = { id, name, fileName: fileName || '', layout, blocks, hyperlinks: hyperlinks || {}, blanks: blanks || [], originalDocx: originalDocx || null, createdAt: new Date().toISOString() };
    fs.writeFileSync(path.join(DATA_DIR, `${id}.json`), JSON.stringify(template));
    res.status(201).json({ id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ---- GET /api/templates/:id ----
app.get('/api/templates/:id', (req, res) => {
  try {
    const file = path.join(DATA_DIR, `${req.params.id}.json`);
    if (!fs.existsSync(file)) return res.status(404).json({ error: 'Not found' });
    const template = JSON.parse(fs.readFileSync(file, 'utf8'));
    // Omit originalDocx from this response to keep it lean
    const { originalDocx: _omit, ...safe } = template;
    res.json(safe);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ---- POST /api/fill/:id — generate filled DOCX ----
function escapeXmlVal(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

app.post('/api/fill/:id', async (req, res) => {
  try {
    const file = path.join(DATA_DIR, `${req.params.id}.json`);
    if (!fs.existsSync(file)) return res.status(404).json({ error: 'Not found' });
    const template = JSON.parse(fs.readFileSync(file, 'utf8'));
    if (!template.originalDocx) {
      return res.status(400).json({ error: 'No original DOCX stored. Re-publish this template from the admin panel.' });
    }
    const { values } = req.body; // { "0": "John", "1": "date", ... }
    const docxBuffer = Buffer.from(template.originalDocx, 'base64');
    const zip = await JSZip.loadAsync(docxBuffer);
    const docXmlFile = zip.file('word/document.xml');
    if (!docXmlFile) return res.status(500).json({ error: 'Invalid DOCX: no document.xml' });
    let xmlStr = await docXmlFile.async('string');
    // Sort by marker length descending — replace longest markers first so that
    // shorter markers (e.g. "_____") never accidentally match inside longer ones
    // (e.g. "_______"), which would fill every blank with the same first value.
    const sortedBlanks = [...(template.blanks || [])].sort((a, b) => b.marker.length - a.marker.length);
    for (const blank of sortedBlanks) {
      const value = (values && values[String(blank.id)] !== undefined) ? values[String(blank.id)] : '';
      xmlStr = xmlStr.split(blank.marker).join(escapeXmlVal(value));
    }
    zip.file('word/document.xml', xmlStr);
    const filled = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });
    const safeName = (template.fileName || 'document.docx').replace(/[^a-zA-Z0-9_\-.]/g, '_');
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    res.setHeader('Content-Disposition', `attachment; filename="${safeName}"`);
    res.send(filled);
  } catch (err) {
    console.error('Fill error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ---- GET /api/debug/:id — dump paragraph pPr for diagnosing style issues ----
app.get('/api/debug/:id', (req, res) => {
  try {
    const file = path.join(DATA_DIR, `${req.params.id}.json`);
    if (!fs.existsSync(file)) return res.status(404).json({ error: 'Not found' });
    const template = JSON.parse(fs.readFileSync(file, 'utf8'));
    const debug = (template.blocks || [])
      .filter(b => b.type === 'paragraph')
      .map(b => ({
        styleId: b.styleId,
        align:   b.pPr?.align || null,
        text:    (b.runs || []).map(r => r.text).join('').slice(0, 60),
        pPr:     b.pPr,
      }));
    res.json(debug);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ---- DELETE /api/templates/:id ----
app.delete('/api/templates/:id', (req, res) => {
  try {
    const file = path.join(DATA_DIR, `${req.params.id}.json`);
    if (!fs.existsSync(file)) return res.status(404).json({ error: 'Not found' });
    fs.unlinkSync(file);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`DOCX Viewer running at http://localhost:${PORT}`);
  console.log(`Admin panel  →  http://localhost:${PORT}/admin`);
}).on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`\n❌  Port ${PORT} is already in use.`);
    console.error(`   Run this to free it (PowerShell):`);
    console.error(`   Stop-Process -Id (Get-NetTCPConnection -LocalPort ${PORT} -State Listen).OwningProcess -Force\n`);
  } else {
    console.error('Server error:', err);
  }
  process.exit(1);
});
