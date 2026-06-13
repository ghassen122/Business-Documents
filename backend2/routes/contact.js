'use strict';

const express    = require('express');
const router     = express.Router();
const nodemailer = require('nodemailer');

// POST /api/contact
// Body: { name, email, subject, message }
// Sends an email to the admin.
router.post('/', async (req, res) => {
  const { name, email, subject, message } = req.body || {};

  if (!name || !email || !message) {
    return res.status(400).json({ error: 'name, email et message sont requis.' });
  }

  const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRe.test(email)) {
    return res.status(400).json({ error: 'Email invalide.' });
  }

  try {
    const smtpUser = String(process.env.SMTP_USER || '');
    const smtpPass = String(process.env.SMTP_PASS || '');
    const adminTo  = process.env.ADMIN_EMAIL || 'ghassen1harbaoui1@gmail.com';

    const transporter = nodemailer.createTransport({
      host:   String(process.env.SMTP_HOST  || 'smtp.gmail.com'),
      port:   parseInt(process.env.SMTP_PORT || '587', 10),
      secure: process.env.SMTP_SECURE === 'true',
      auth:   { type: 'LOGIN', user: smtpUser, pass: smtpPass },
      tls:    { rejectUnauthorized: false },
    });

    await transporter.sendMail({
      from:     String(process.env.SMTP_FROM || `DocGen <${smtpUser}>`),
      to:       adminTo,
      replyTo:  `${name} <${email}>`,
      subject:  `[DocGen Contact] ${subject || 'Nouveau message'} — de ${name}`,
      text: [
        `Nom     : ${name}`,
        `Email   : ${email}`,
        `Sujet   : ${subject || '—'}`,
        ``,
        `Message :`,
        message,
      ].join('\n'),
      html: `
        <div style="font-family:sans-serif;max-width:520px;margin:0 auto;color:#111">
          <div style="background:#226d68;padding:18px 24px;border-radius:8px 8px 0 0">
            <span style="font-size:18px;color:#fff;font-weight:800">📄 DocGen — Nouveau contact</span>
          </div>
          <div style="background:#f8f7f3;padding:24px;border-radius:0 0 8px 8px;border:1px solid #e5e7eb">
            <table style="width:100%;border-collapse:collapse;margin-bottom:16px">
              <tr><td style="padding:6px 0;color:#6b7280;font-size:13px;width:80px">Nom</td><td style="padding:6px 0;font-weight:600">${name}</td></tr>
              <tr><td style="padding:6px 0;color:#6b7280;font-size:13px">Email</td><td style="padding:6px 0"><a href="mailto:${email}">${email}</a></td></tr>
              <tr><td style="padding:6px 0;color:#6b7280;font-size:13px">Sujet</td><td style="padding:6px 0">${subject || '—'}</td></tr>
            </table>
            <div style="border-top:1px solid #e5e7eb;padding-top:14px">
              <p style="color:#6b7280;font-size:12px;margin:0 0 6px">Message :</p>
              <p style="margin:0;white-space:pre-wrap">${message}</p>
            </div>
          </div>
        </div>
      `,
    });

    res.json({ success: true });
  } catch (err) {
    console.error('[contact] Erreur envoi email:', err.message);
    res.status(500).json({ error: 'Erreur lors de l\'envoi du message.' });
  }
});

module.exports = router;
