const multer = require('multer');
const {
  parseDocxBuffer,
  getAllTemplates,
  getTemplateById,
  createTemplate,
  deleteTemplate,
  getTemplateBlocks,
  reparseTemplate,
} = require('../services/templateService');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 },
});

const uploadMiddleware = upload.single('docx');

// POST /api/parse-admin
async function parseAdmin(req, res) {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    const result = await parseDocxBuffer(req.file.buffer);
    res.json(result);
  } catch (err) {
    console.error('parseAdmin error:', err);
    res.status(500).json({ error: err.message });
  }
}

// GET /api/templates
async function listTemplates(req, res) {
  try {
    res.json(await getAllTemplates());
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// POST /api/templates
async function createTemplateHandler(req, res) {
  try {
    const { name, blocks } = req.body;
    if (!name || !blocks) return res.status(400).json({ error: 'name and blocks are required' });
    const id = await createTemplate(req.body);
    res.status(201).json({ id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// GET /api/templates/:id
async function getTemplateHandler(req, res) {
  try {
    const template = await getTemplateById(req.params.id);
    if (!template) return res.status(404).json({ error: 'Not found' });
    res.json(template);
  } catch (err) {
    if (err.name === 'CastError') return res.status(404).json({ error: 'Not found' });
    res.status(500).json({ error: err.message });
  }
}

// DELETE /api/templates/:id
async function deleteTemplateHandler(req, res) {
  try {
    const found = await deleteTemplate(req.params.id);
    if (!found) return res.status(404).json({ error: 'Not found' });
    res.json({ ok: true });
  } catch (err) {
    if (err.name === 'CastError') return res.status(404).json({ error: 'Not found' });
    res.status(500).json({ error: err.message });
  }
}

// GET /api/debug/:id
async function debugTemplate(req, res) {
  try {
    const blocks = await getTemplateBlocks(req.params.id);
    if (!blocks) return res.status(404).json({ error: 'Not found' });
    const debug = blocks
      .filter(b => b.type === 'paragraph')
      .map(b => ({
        styleId: b.styleId,
        align:   b.pPr?.align || null,
        text:    (b.runs || []).map(r => r.text).join('').slice(0, 60),
        pPr:     b.pPr,
      }));
    res.json(debug);
  } catch (err) {
    if (err.name === 'CastError') return res.status(404).json({ error: 'Not found' });
    res.status(500).json({ error: err.message });
  }
}

// POST /api/templates/:id/reparse
async function reparseTemplateHandler(req, res) {
  try {
    const result = await reparseTemplate(req.params.id);
    if (!result) return res.status(404).json({ error: 'Not found' });
    res.json({ ok: true, ...result });
  } catch (err) {
    console.error('reparseTemplate error:', err);
    if (err.name === 'CastError') return res.status(404).json({ error: 'Not found' });
    res.status(err.status || 500).json({ error: err.message });
  }
}

module.exports = {
  uploadMiddleware,
  parseAdmin,
  listTemplates,
  createTemplate:   createTemplateHandler,
  getTemplate:      getTemplateHandler,
  deleteTemplate:   deleteTemplateHandler,
  debugTemplate,
  reparseTemplate:  reparseTemplateHandler,
};
