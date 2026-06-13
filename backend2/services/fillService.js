const JSZip       = require('jszip');
const Template    = require('../models/Template');
const { generatePdf } = require('../lib/pdfGenerator');
const { signPdf }     = require('../lib/signPdf');
const { convertDocxToPdfLibreOffice } = require('../lib/libreOfficePdf');

// ── Helpers ───────────────────────────────────────────────────────────────────
function escapeXmlVal(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

// Fill a DOCX buffer with values + civValues, return filled nodebuffer
async function fillDocx(template, { values = {}, civValues = {} }) {
  if (!template.originalDocx) {
    const err = new Error('No original DOCX stored. Re-publish this template from the admin panel.');
    err.status = 400;
    throw err;
  }

  const docxBuffer = Buffer.from(template.originalDocx, 'base64');
  const zip        = await JSZip.loadAsync(docxBuffer);
  const docXmlFile = zip.file('word/document.xml');
  if (!docXmlFile) {
    const err = new Error('Invalid DOCX: no document.xml');
    err.status = 500;
    throw err;
  }

  let xmlStr = await docXmlFile.async('string');

  // Replace blank markers (longest first to avoid partial matches)
  const sortedBlanks = [...(template.blanks || [])].sort(
    (a, b) => b.marker.length - a.marker.length
  );
  for (const blank of sortedBlanks) {
    const value = values[String(blank.id)] ?? '';
    xmlStr = xmlStr.split(blank.marker).join(escapeXmlVal(value));
  }

  // Replace civility tokens {{CIV_N}}
  for (const civ of (template.civs || [])) {
    const token = `{{CIV_${civ.id}}}`;
    const word  = civValues[String(civ.intervenantIndex)] || civ.match || '';
    xmlStr = xmlStr.split(token).join(escapeXmlVal(word));
  }

  zip.file('word/document.xml', xmlStr);
  return zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });
}

// ── Public service functions ──────────────────────────────────────────────────
async function getFilledDocx(templateId, { values, civValues }) {
  const template = await Template.findByPk(templateId);
  if (!template) return null;
  const buffer   = await fillDocx(template, { values, civValues });
  const fileName = (template.fileName || 'document.docx').replace(/[^a-zA-Z0-9_\-.]/g, '_');
  return { buffer, fileName };
}

async function getFilledPdf(templateId, { values, civValues }) {
  const template = await Template.findByPk(templateId);
  if (!template) return null;
  const rawPdf    = await generatePdf(template, values || {});
  const pdfBuffer = await signPdf(rawPdf);
  const baseName  = (template.fileName || 'document').replace(/\.docx$/i, '').replace(/[^a-zA-Z0-9_\-.]/g, '_');
  return { buffer: pdfBuffer, fileName: `${baseName}.pdf` };
}

async function getFilledLibreOfficePdf(templateId, { values, civValues }) {
  const template = await Template.findByPk(templateId);
  if (!template) return null;
  const filledDocx = await fillDocx(template, { values, civValues });
  const pdfBuffer  = await convertDocxToPdfLibreOffice(filledDocx);
  const baseName   = (template.fileName || 'document').replace(/\.docx$/i, '').replace(/[^a-zA-Z0-9_\-.]/g, '_');
  return { buffer: pdfBuffer, fileName: `${baseName}.pdf` };
}

// Takes an already-loaded template object — avoids a second DB round-trip in orderController
async function buildFilledLoPdfBuffer(template, { values = {}, civValues = {} }) {
  const filledDocx = await fillDocx(template, { values, civValues });
  return convertDocxToPdfLibreOffice(filledDocx);
}

module.exports = { getFilledDocx, getFilledPdf, getFilledLibreOfficePdf, buildFilledLoPdfBuffer };
