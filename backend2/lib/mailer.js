'use strict';

const nodemailer = require('nodemailer');

/**
 * Send the signed PDF to the guest's email after payment.
 * @param {string} to          — recipient email
 * @param {string} docName     — document display name
 * @param {Buffer} pdfBuffer   — signed PDF bytes
 * @param {string} fileName    — attachment file name (e.g. contrat.pdf)
 */
async function sendPdfToGuest(to, docName, pdfBuffer, fileName) {
  // Create transporter here (not at module load) so env vars are always available
  const smtpUser = String(process.env.SMTP_USER || '');
  const smtpPass = String(process.env.SMTP_PASS || '');
  console.log('[mailer] SMTP user:', smtpUser, '| pass length:', smtpPass.length);

  const transporter = nodemailer.createTransport({
    host:   String(process.env.SMTP_HOST  || 'smtp.ethereal.email'),
    port:   parseInt(process.env.SMTP_PORT || '587', 10),
    secure: process.env.SMTP_SECURE === 'true',
    auth:   { type: 'LOGIN', user: smtpUser, pass: smtpPass },
    tls:    { rejectUnauthorized: false },
  });

  const from = String(process.env.SMTP_FROM || 'DocGen <noreply@docgen.fr>');

  await transporter.sendMail({
    from,
    to,
    subject: `Votre document "${docName}" — DocGen`,
    text: [
      `Bonjour,`,
      ``,
      `Votre paiement a été confirmé. Vous trouverez votre document "${docName}" en pièce jointe.`,
      ``,
      `Merci d'avoir utilisé DocGen.`,
    ].join('\n'),
    html: `
      <div style="font-family:sans-serif;max-width:520px;margin:0 auto;color:#111">
        <div style="background:#226d68;padding:20px 28px;border-radius:8px 8px 0 0">
          <span style="font-size:20px;color:#fff;font-weight:800">📄 DocGen</span>
        </div>
        <div style="background:#f8f7f3;padding:28px;border-radius:0 0 8px 8px;border:1px solid #e5e7eb">
          <p>Bonjour,</p>
          <p>
            Votre paiement a été confirmé.<br>
            Vous trouverez votre document <strong>${docName}</strong> en pièce jointe.
          </p>
          <p style="color:#6b7280;font-size:13px">
            Ce document a été signé numériquement par DocGen.
          </p>
          <p>Merci d'avoir utilisé DocGen.</p>
        </div>
      </div>
    `,
    attachments: [
      {
        filename:    fileName,
        content:     pdfBuffer,
        contentType: 'application/pdf',
      },
    ],
  });
}
async function sendPdfToAdmin(to) {
  // Create transporter here (not at module load) so env vars are always available
  const smtpUser = String(process.env.SMTP_USER || '');
  const smtpPass = String(process.env.SMTP_PASS || '');
  console.log('[mailer] SMTP user:', smtpUser, '| pass length:', smtpPass.length);

  const transporter = nodemailer.createTransport({
    host:   String(process.env.SMTP_HOST  || 'smtp.ethereal.email'),
    port:   parseInt(process.env.SMTP_PORT || '587', 10),
    secure: process.env.SMTP_SECURE === 'true',
    auth:   { type: 'LOGIN', user: smtpUser, pass: smtpPass },
    tls:    { rejectUnauthorized: false },
  });

  const from = String(process.env.SMTP_FROM || 'DocGen <noreply@docgen.fr>');

  await transporter.sendMail({
    from,
    to,
    subject: `Votre document "${docName}" — DocGen`,
    text: [
      `Bonjour,`,
      ``,
      `Votre paiement a été confirmé. Vous trouverez votre document "${docName}" en pièce jointe.`,
      ``,
      `Merci d'avoir utilisé DocGen.`,
    ].join('\n'),
    html: `
      <div style="font-family:sans-serif;max-width:520px;margin:0 auto;color:#111">
        <div style="background:#226d68;padding:20px 28px;border-radius:8px 8px 0 0">
          <span style="font-size:20px;color:#fff;font-weight:800">📄 DocGen</span>
        </div>
        <div style="background:#f8f7f3;padding:28px;border-radius:0 0 8px 8px;border:1px solid #e5e7eb">
          <p>Bonjour,</p>
          <p>
            Votre paiement a été confirmé.<br>
            Vous trouverez votre document <strong>${docName}</strong> en pièce jointe.
          </p>
          <p style="color:#6b7280;font-size:13px">
            Ce document a été signé numériquement par DocGen.
          </p>
          <p>Merci d'avoir utilisé DocGen.</p>
        </div>
      </div>
    `,
    attachments: [
      {
        filename:    fileName,
        content:     pdfBuffer,
        contentType: 'application/pdf',
      },
    ],
  });
}

/**
 * Notify the client that their payment failed / was not completed.
 * @param {string} to         — recipient email
 * @param {string} docName    — template / document name
 * @param {string} retryUrl   — link back to the fill page so they can retry
 */
async function sendPaymentFailed(to, docName, retryUrl) {
  const smtpUser = String(process.env.SMTP_USER || '');
  const smtpPass = String(process.env.SMTP_PASS || '');
  console.log('[mailer:paymentFailed] SMTP host:', process.env.SMTP_HOST || 'smtp.ethereal.email (DÉFAUT — EMAIL NON LIVRÉ)');
  console.log('[mailer:paymentFailed] SMTP user:', smtpUser || '(vide — PAS DE CONFIG SMTP)');
  console.log('[mailer:paymentFailed] destinataire:', to);

  const transporter = nodemailer.createTransport({
    host:   String(process.env.SMTP_HOST  || 'smtp.ethereal.email'),
    port:   parseInt(process.env.SMTP_PORT || '587', 10),
    secure: process.env.SMTP_SECURE === 'true',
    auth:   { type: 'LOGIN', user: smtpUser, pass: smtpPass },
    tls:    { rejectUnauthorized: false },
  });

  const from = String(process.env.SMTP_FROM || 'DocGen <noreply@docgen.fr>');

  await transporter.sendMail({
    from,
    to,
    subject: `Échec du paiement — "${docName}" — DocGen`,
    text: [
      `Bonjour,`,
      ``,
      `Votre paiement pour le document "${docName}" n'a pas pu être traité.`,
      ``,
      `Vous pouvez réessayer en cliquant sur le lien suivant :`,
      retryUrl,
      ``,
      `Si le problème persiste, vérifiez les informations de votre carte ou contactez votre banque.`,
      ``,
      `L'équipe DocGen`,
    ].join('\n'),
    html: `
      <div style="font-family:sans-serif;max-width:520px;margin:0 auto;color:#111">
        <div style="background:#b91c1c;padding:20px 28px;border-radius:8px 8px 0 0">
          <span style="font-size:20px;color:#fff;font-weight:800">❌ DocGen — Paiement échoué</span>
        </div>
        <div style="background:#f8f7f3;padding:28px;border-radius:0 0 8px 8px;border:1px solid #e5e7eb">
          <p>Bonjour,</p>
          <p>
            Votre paiement pour le document <strong>${docName}</strong> n'a pas pu être traité.
          </p>
          <p>
            <a href="${retryUrl}" style="display:inline-block;background:#226d68;color:#fff;padding:10px 22px;border-radius:6px;text-decoration:none;font-weight:700">
              Réessayer le paiement
            </a>
          </p>
          <p style="color:#6b7280;font-size:13px">
            Si le problème persiste, vérifiez les informations de votre carte ou contactez votre banque.
          </p>
          <p>L'équipe DocGen</p>
        </div>
      </div>
    `,
  });
}
async function sendInvoicePdf(
  to,
  docName,
  pdfBuffer,
  fileName
) {
  const smtpUser = String(process.env.SMTP_USER || '');
  const smtpPass = String(process.env.SMTP_PASS || '');

  console.log('[mailer:sendInvoicePdf] SMTP host:', process.env.SMTP_HOST || 'smtp.ethereal.email (DÉFAUT)');
  console.log('[mailer:sendInvoicePdf] SMTP user:', smtpUser || '(vide)');
  console.log('[mailer:sendInvoicePdf] destinataire:', to);

  const transporter = nodemailer.createTransport({
    host: String(process.env.SMTP_HOST || 'smtp.ethereal.email'),
    port: parseInt(process.env.SMTP_PORT || '587', 10),
    secure: process.env.SMTP_SECURE === 'true',
    auth: { type: 'LOGIN', user: smtpUser, pass: smtpPass },
    tls: { rejectUnauthorized: false },
  });

  const from = String(process.env.SMTP_FROM || 'DocGen <noreply@docgen.fr>');

  await transporter.sendMail({
    from,
    to,
    subject: `Votre facture "${docName}"`,
    text: [
      `Bonjour,`,
      ``,
      `Votre paiement a été confirmé.`,
      `Votre facture "${docName}" est en pièce jointe.`,
      ``,
      `Merci.`
    ].join('\n'),

    html: `
      <div style="font-family:sans-serif;max-width:520px;margin:0 auto;color:#111">
        <h2>DocGen</h2>
        <p>Votre paiement a été confirmé.</p>
        <p>Facture : <strong>${docName}</strong></p>
      </div>
    `,

    attachments: [
      {
        filename: fileName,
        content: pdfBuffer,
        contentType: 'application/pdf',
      },
    ],
  });
}

module.exports = { sendPdfToGuest, sendPaymentFailed , sendInvoicePdf };
