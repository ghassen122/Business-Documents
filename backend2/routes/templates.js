const express = require('express');
const router  = express.Router();
const {
  uploadMiddleware,
  parseAdmin,
  listTemplates,
  createTemplate,
  getTemplate,
  deleteTemplate,
  debugTemplate,
  reparseTemplate,
} = require('../controllers/templateController');

// POST /api/parse-admin — upload + parse DOCX, return blocks + blanks
router.post('/parse-admin', uploadMiddleware, parseAdmin);

// GET  /api/templates       — list all templates (summary only)
// POST /api/templates       — save a new template
router.get('/',    listTemplates);
router.post('/',   createTemplate);

// GET    /api/templates/:id — get full template (without originalDocx)
// DELETE /api/templates/:id — remove template
router.get('/:id',    getTemplate);
router.delete('/:id', deleteTemplate);

// GET /api/templates/:id/debug — dump pPr data for debugging
router.get('/:id/debug', debugTemplate);

// POST /api/templates/:id/reparse — re-parse stored DOCX with current parser
router.post('/:id/reparse', reparseTemplate);

module.exports = router;
