const { getFilledDocx, getFilledPdf, getFilledLibreOfficePdf } = require('../services/fillService');
const { sendPdfToGuest } = require('../lib/mailer');

// POST /api/fill/:id
async function fillTemplate(req, res) {
  try {
    const result = await getFilledDocx(req.params.id, req.body);
    if (!result) return res.status(404).json({ error: 'Not found' });
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    res.setHeader('Content-Disposition', `attachment; filename="${result.fileName}"`);
    res.send(result.buffer);
  } catch (err) {
    console.error('fillTemplate error:', err);
    if (err.name === 'CastError') return res.status(404).json({ error: 'Not found' });
    res.status(err.status || 500).json({ error: err.message });
  }
}

// POST /api/fill/:id/pdf
async function fillTemplatePdf(req, res) {
  try {
    const result = await getFilledPdf(req.params.id, req.body);
    if (!result) return res.status(404).json({ error: 'Not found' });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${result.fileName}"`);
    res.send(result.buffer);
  } catch (err) {
    console.error('fillTemplatePdf error:', err);
    if (err.name === 'CastError') return res.status(404).json({ error: 'Not found' });
    res.status(err.status || 500).json({ error: err.message });
  }
}

// POST /api/fill/:id/lo-pdf
async function fillTemplateLibreOfficePdf(req, res) {
  try {
    const result = await getFilledLibreOfficePdf(req.params.id, req.body);
    if (!result) return res.status(404).json({ error: 'Not found' });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${result.fileName}"`);
    res.send(result.buffer);
  } catch (err) {
    console.error('fillTemplateLibreOfficePdf error:', err);
    if (err.name === 'CastError') return res.status(404).json({ error: 'Not found' });
    res.status(err.status || 500).json({ error: err.message });
  }
}

// POST /api/fill/:id/send-pdf
// Body: { email, values, civValues? }
async function sendTemplatePdf(req, res) {
  const { email, values = {}, civValues = {} } = req.body || {};
  if (!email) return res.status(400).json({ error: 'email requis.' });
  const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRe.test(email)) return res.status(400).json({ error: 'Email invalide.' });

  try {
    const result = await getFilledLibreOfficePdf(req.params.id, { values, civValues });
    if (!result) return res.status(404).json({ error: 'Template introuvable.' });
    await sendPdfToGuest(email, result.fileName.replace(/\.pdf$/i, ''), result.buffer, result.fileName);
    res.json({ success: true, message: `PDF envoyé à ${email}` });
  } catch (err) {
    console.error('sendTemplatePdf error:', err);
    if (err.name === 'CastError') return res.status(404).json({ error: 'Introuvable.' });
    res.status(err.status || 500).json({ error: err.message });
  }
}

module.exports = { fillTemplate, fillTemplatePdf, fillTemplateLibreOfficePdf, sendTemplatePdf };
