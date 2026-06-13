const express = require('express');
const router  = express.Router();
const { fillTemplate, fillTemplatePdf, fillTemplateLibreOfficePdf, sendTemplatePdf } = require('../controllers/fillController');

// POST /api/fill/:id         — generate and download a filled DOCX
router.post('/:id', fillTemplate);
// POST /api/fill/:id/pdf     — generate and download a filled PDF (pdfmake)
router.post('/:id/pdf', fillTemplatePdf);
// POST /api/fill/:id/lo-pdf  — generate and download a filled PDF (LibreOffice, fidèle)
router.post('/:id/lo-pdf', fillTemplateLibreOfficePdf);
// POST /api/fill/:id/send-pdf — generate LO PDF and email it
router.post('/:id/send-pdf', sendTemplatePdf);

module.exports = router;
