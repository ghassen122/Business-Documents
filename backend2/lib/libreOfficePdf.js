'use strict';

const os            = require('os');
const path          = require('path');
const fs            = require('fs');
const { execFile }  = require('child_process');
const { promisify } = require('util');

const execFileAsync = promisify(execFile);

function getSofficePath() {
  if (process.env.SOFFICE_PATH) return process.env.SOFFICE_PATH;
  const candidates = [
    'C:\\Program Files\\LibreOffice\\program\\soffice.exe',
    'C:\\Program Files (x86)\\LibreOffice\\program\\soffice.exe',
    '/usr/bin/soffice',
    '/usr/local/bin/soffice',
  ];
  for (const p of candidates) {
    if (fs.existsSync(p)) return p;
  }
  throw new Error('LibreOffice introuvable. Installez LibreOffice ou définissez SOFFICE_PATH dans .env');
}

/**
 * Convert a DOCX Buffer to PDF using LibreOffice headless.
 * @param {Buffer} docxBuffer
 * @returns {Promise<Buffer>} PDF buffer
 */
async function convertDocxToPdfLibreOffice(docxBuffer) {
  const tmpDir   = fs.mkdtempSync(path.join(os.tmpdir(), 'lo-'));
  const docxPath = path.join(tmpDir, 'document.docx');
  const pdfPath  = path.join(tmpDir, 'document.pdf');
  try {
    fs.writeFileSync(docxPath, docxBuffer);
    const soffice = getSofficePath();
    await execFileAsync(soffice, [
      '--headless', '--convert-to', 'pdf', '--outdir', tmpDir, docxPath,
    ], { timeout: 60000 });
    if (!fs.existsSync(pdfPath)) throw new Error('LibreOffice n\'a pas produit de PDF');
    return fs.readFileSync(pdfPath);
  } finally {
    try { fs.unlinkSync(docxPath); } catch {}
    try { fs.unlinkSync(pdfPath);  } catch {}
    try { fs.rmdirSync(tmpDir);    } catch {}
  }
}

module.exports = { convertDocxToPdfLibreOffice };
