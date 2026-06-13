'use strict';

const path               = require('path');
const fs                 = require('fs');
const { plainAddPlaceholder } = require('@signpdf/placeholder-plain');
const { SignPdf }        = require('@signpdf/signpdf');
const { P12Signer }      = require('@signpdf/signer-p12');

const CERT_PATH     = path.join(__dirname, '..', 'certs', 'docgen.p12');
const CERT_PASSWORD = process.env.PDF_CERT_PASSWORD || 'docgen';

/**
 * Sign a PDF buffer with the DocGen self-signed certificate.
 * @param {Buffer} pdfBuffer — raw PDF bytes from pdfmake
 * @returns {Promise<Buffer>} signed PDF bytes
 */
async function signPdf(pdfBuffer) {
  // 1. Inject a PKCS#7 placeholder into the PDF
  const pdfWithPlaceholder = plainAddPlaceholder({
    pdfBuffer,
    reason:   'Document généré et signé par DocGen',
    contactInfo: 'docgen@example.com',
    name:     'DocGen',
    location: 'France',
  });

  // 2. Load the P12 certificate
  const p12Buffer = fs.readFileSync(CERT_PATH);
  const signer    = new P12Signer(p12Buffer, { passphrase: CERT_PASSWORD });

  // 3. Sign
  const signPdf = new SignPdf();
  const signed  = await signPdf.sign(pdfWithPlaceholder, signer);
  return signed;
}

module.exports = { signPdf };
