const Stripe        = require('stripe');
const JSZip         = require('jszip');
const Order         = require('../models/Order');
const Template      = require('../models/Template');
const UserDocument  = require('../models/UserDocument');
const { getUserFromRequest } = require('../lib/auth');
const { generateInvoicePdf } = require('../lib/pdfGenerator');
const { sendPdfToGuest, sendPaymentFailed } = require('../lib/mailer');
const { sendInvoicePdf } = require('../lib/mailer');
const { createInvoice} = require('../services/invoiceService');
const { convertDocxToPdfLibreOffice } = require('../lib/libreOfficePdf');
const { buildFilledLoPdfBuffer } = require('../services/fillService');
const User            = require('../models/User');

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// ─── helpers ────────────────────────────────────────────────────────────────

function escapeXmlVal(str) {
  return String(str)
    .replace(/&/g,  '&amp;')
    .replace(/</g,  '&lt;')
    .replace(/>/g,  '&gt;')
    .replace(/"/g,  '&quot;')
    .replace(/'/g,  '&apos;');
}

// ─── GET /api/orders/my ──────────────────────────────────────────────────────
// Returns the authenticated user's paid orders (most recent first).
const getMyOrders = async (req, res) => {
  const user = getUserFromRequest(req);
  if (!user) return res.status(401).json({ error: 'Non connecté.' });

  try {
    const orders = await Order.findAll({
      where: { userId: user.id, payment: true },
      order: [['createdAt', 'DESC']],
    });
    res.json(orders.map(o => ({
      _id:          o.id,
      templateId:   o.templateId,
      templateName: o.templateName,
      amount:       o.amount,
      createdAt:    o.createdAt,
    })));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ─── POST /api/orders/:id/download ───────────────────────────────────────────
// Fills the DOCX with stored values and streams it — only if order is paid.
const downloadOrder = async (req, res) => {
  const user = getUserFromRequest(req);
  if (!user) return res.status(401).json({ error: 'Non connecté.' });

  try {
    const order = await Order.findByPk(req.params.id);
    if (!order) return res.status(404).json({ error: 'Commande introuvable.' });
    if (order.userId !== user.id) return res.status(403).json({ error: 'Accès refusé.' });
    if (!order.payment) return res.status(402).json({ error: 'Paiement requis pour télécharger.' });

    const template = await Template.findByPk(order.templateId);
    if (!template) return res.status(404).json({ error: 'Template introuvable.' });
    if (!template.originalDocx) {
      return res.status(400).json({ error: 'DOCX original introuvable, re-publiez ce template.' });
    }

    const docxBuffer = Buffer.from(template.originalDocx, 'base64');
    const zip = await JSZip.loadAsync(docxBuffer);
    const docXmlFile = zip.file('word/document.xml');
    if (!docXmlFile) return res.status(500).json({ error: 'DOCX invalide : document.xml manquant.' });

    let xmlStr = await docXmlFile.async('string');

    const sortedBlanks = [...(template.blanks || [])].sort(
      (a, b) => b.marker.length - a.marker.length
    );
    for (const blank of sortedBlanks) {
      const value = order.values?.[String(blank.id)] ?? '';
      xmlStr = xmlStr.split(blank.marker).join(escapeXmlVal(value));
    }

    zip.file('word/document.xml', xmlStr);
    const filled = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });

    const safeName = (template.fileName || 'document.docx').replace(/[^a-zA-Z0-9_\-.]/g, '_');
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    res.setHeader('Content-Disposition', `attachment; filename="${safeName}"`);
    res.send(filled);
  } catch (err) {
    console.error('downloadOrder error:', err);
    res.status(500).json({ error: err.message });
  }
};

// ─── POST /api/orders/:id/download-lo-pdf ────────────────────────────────────
// Fills the DOCX and converts via LibreOffice — only if order is paid.
const downloadOrderLoPdf = async (req, res) => {
  const user = getUserFromRequest(req);
  if (!user) return res.status(401).json({ error: 'Non connecté.' });

  try {
    const order = await Order.findByPk(req.params.id);
    if (!order) return res.status(404).json({ error: 'Commande introuvable.' });
    if (order.userId !== user.id) return res.status(403).json({ error: 'Accès refusé.' });
    if (!order.payment) return res.status(402).json({ error: 'Paiement requis pour télécharger.' });

    const template = await Template.findByPk(order.templateId);
    if (!template) return res.status(404).json({ error: 'Template introuvable.' });
    if (!template.originalDocx) return res.status(400).json({ error: 'DOCX original introuvable.' });

    const pdfBuffer = await buildFilledLoPdfBuffer(template, {
      values:    order.values    || {},
      civValues: order.civValues || {},
    });

    const baseName = (template.fileName || 'document').replace(/\.docx$/i, '').replace(/[^a-zA-Z0-9_.\-]/g, '_');
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${baseName}.pdf"`);
    res.send(pdfBuffer);
  } catch (err) {
    console.error('downloadOrderLoPdf error:', err);
    res.status(500).json({ error: err.message });
  }
};

// ─── GET /api/orders/list — admin only ───────────────────────────────────────
const listOrders = async (req, res) => {
  try {
    const orders = await Order.findAll({ order: [['createdAt', 'DESC']] });
    res.json({ success: true, orders });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ─── POST /api/orders/guest/create ──────────────────────────────────────────
// No auth required. Body: { templateId, templateName, values, price, guestEmail }
// Creates a pending guest order then opens a Stripe Checkout session.
const createGuestOrder = async (req, res) => {
  const { templateId, templateName, values = {}, price, guestEmail } = req.body || {};

  if (!templateId || price === undefined || !guestEmail) {
    return res.status(400).json({ error: 'templateId, price et guestEmail sont requis.' });
  }

  const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRe.test(guestEmail)) {
    return res.status(400).json({ error: 'Email invalide.' });
  }

  try {
    const order = await Order.create({
      userId:       `guest_${Date.now()}`,
      templateId,
      templateName: templateName || '',
      values,
      amount:       price,
      status:       'pending',
      payment:      false,
      guestEmail,
    });

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3001';

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'payment',
      customer_email: guestEmail,
      line_items: [
        {
          price_data: {
            currency: 'eur',
            product_data: { name: templateName || 'Document' },
            unit_amount: Math.round(price * 100),
          },
          quantity: 1,
        },
      ],
      // success_url carries the order id so the webhook can match it
      success_url: `${frontendUrl}/fill/${templateId}?guest_order=${order.id}&paid=1`,
      cancel_url:  `${frontendUrl}/fill/${templateId}`,
    });

    order.sessionId = session.id;
    await order.save();

    res.json({ sessionUrl: session.url, orderId: order.id });
  } catch (err) {
    console.error('createGuestOrder error:', err);
    res.status(500).json({ error: err.message });
  }
};

// ─── POST /api/orders/webhook ────────────────────────────────────────────────
// Stripe sends a checkout.session.completed event here.
// We generate + sign the PDF and email it to the guest.
const handleStripeWebhook = async (req, res) => {
  const sig    = req.headers['stripe-signature'];
  const secret = process.env.STRIPE_WEBHOOK_SECRET;

  let event;
  try {
    event = secret
      ? stripe.webhooks.constructEvent(req.body, sig, secret)
      : JSON.parse(req.body.toString());
  } catch (err) {
    console.error('Webhook signature error:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    try {
      const order = await Order.findOne({ where: { sessionId: session.id } });
      if (!order) return res.sendStatus(200); // unknown session — ignore

      // Mark as paid
      order.status  = 'paid';
      order.payment = true;
      await order.save();

      // Generate PDF + invoice and send by email
      if (order.guestEmail) {
        try {
          const template = await Template.findByPk(order.templateId);
          if (template) {
            const pdfBuf = await buildFilledLoPdfBuffer(template, {
              values:    order.values    || {},
              civValues: order.civValues || {},
            });
            const fname = (template.fileName || 'document').replace(/\.docx$/i, '') + '.pdf';
            await sendPdfToGuest(order.guestEmail, template.name || template.fileName, pdfBuf, fname);
            console.log(`[webhook:checkout] PDF envoyé à ${order.guestEmail}`);
          }
        } catch (pdfErr) {
          console.error('[webhook:checkout] Erreur envoi PDF:', pdfErr.message);
        }

        try {
          const { invoice, pdfBuffer } = await createInvoice({ orderId: order.id, amount: order.amount });
          await sendInvoicePdf(order.guestEmail, order.templateName || 'Document', pdfBuffer, `Invoice_${invoice.invoiceId}.pdf`);
          console.log(`[webhook:checkout] Facture envoyée à ${order.guestEmail}`);
        } catch (invErr) {
          console.error('[webhook:checkout] Erreur envoi facture:', invErr.message);
        }
      }
    } catch (err) {
      console.error('[webhook] Erreur traitement:', err.message);
    }
  }

  // Handle inline PaymentIntent confirmations (Elements flow)
  if (event.type === 'payment_intent.succeeded') {
    const pi = event.data.object;
    const orderId = pi.metadata?.orderId;
    if (!orderId) return res.sendStatus(200);

    try {
      const order = await Order.findByPk(orderId);
      if (!order) return res.sendStatus(200);

      if (!order.payment) {
        order.status  = 'paid';
        order.payment = true;
        await order.save();
      }

      // Only send PDF + invoice if not already sent by confirmGuestPayment
      if (order.guestEmail && !order.emailSent) {
        try {
          const template = await Template.findByPk(order.templateId);
          if (template) {
            const pdfBuf = await buildFilledLoPdfBuffer(template, {
              values:    order.values    || {},
              civValues: order.civValues || {},
            });
            const fname = (template.fileName || 'document').replace(/\.docx$/i, '') + '.pdf';
            await sendPdfToGuest(order.guestEmail, template.name || template.fileName, pdfBuf, fname);
            order.emailSent = true;
            await order.save();
            console.log(`[webhook:pi] PDF envoyé à ${order.guestEmail}`);
          }
        } catch (pdfErr) {
          console.error('[webhook:pi] Erreur envoi PDF:', pdfErr.message);
        }

        try {
          const { invoice, pdfBuffer } = await createInvoice({ orderId: order.id, amount: order.amount });
          await sendInvoicePdf(order.guestEmail, order.templateName || 'Document', pdfBuffer, `Invoice_${invoice.invoiceId}.pdf`);
          console.log(`[webhook:pi] Facture envoyée à ${order.guestEmail}`);
        } catch (invErr) {
          console.error('[webhook:pi] Erreur envoi facture:', invErr.message);
        }
      }
    } catch (err) {
      console.error('[webhook] Erreur traitement PI:', err.message);
    }
  }

  res.sendStatus(200);
};

// ─── POST /api/orders/guest-payment-intent ───────────────────────────────────
// Works for both authenticated and guest users.
// Body: { templateId, templateName, values, price, email }
// Auth cookie is optional — if present the order is linked to the user's account.
// Returns: { clientSecret, orderId }
const createGuestPaymentIntent = async (req, res) => {
  const authUser = getUserFromRequest(req);
  const { templateId, templateName, values = {}, civValues = {}, price, email } = req.body || {};

  // Accept email from body; fall back to JWT email if authenticated
  const recipientEmail = (typeof email === 'string' ? email.trim() : '') || authUser?.email || '';

  if (!templateId || price === undefined || !recipientEmail) {
    return res.status(400).json({ error: 'templateId, price et email sont requis.' });
  }
  const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRe.test(recipientEmail)) {
    return res.status(400).json({ error: 'Email invalide.' });
  }

  try {
    const order = await Order.create({
      userId:       authUser?.id || null,
      templateId,
      templateName: templateName || '',
      values,
      civValues:    civValues || {},
      amount:       price,
      status:       'pending',
      payment:      false,
      guestEmail:   recipientEmail,
    });

    const paymentIntent = await stripe.paymentIntents.create({
      amount:   Math.round(price * 100),
      currency: 'eur',
      metadata: { orderId: order.id },
    });

    order.paymentIntentId = paymentIntent.id;
    await order.save();

    res.json({ clientSecret: paymentIntent.client_secret, orderId: order.id });
  } catch (err) {
    console.error('createGuestPaymentIntent error:', err);
    res.status(500).json({ error: err.message });
  }
};

// ─── POST /api/orders/guest-confirm ──────────────────────────────────────────
// No auth required. Body: { paymentIntentId, orderId }
// Verifies PI is succeeded, marks order paid, sends email, streams signed PDF.
const confirmGuestPayment = async (req, res) => {
  const { paymentIntentId, orderId } = req.body || {};
  if (!paymentIntentId || !orderId) {
    return res.status(400).json({ error: 'paymentIntentId et orderId sont requis.' });
  }

  try {
    const pi = await stripe.paymentIntents.retrieve(paymentIntentId);
    if (pi.status !== 'succeeded') {
      return res.status(402).json({ error: 'Paiement non confirmé.' });
    }

    const order = await Order.findByPk(orderId);
    if (!order) return res.status(404).json({ error: 'Commande introuvable.' });

    // Idempotent: mark paid if not already
    if (!order.payment) {
      order.status  = 'paid';
      order.payment = true;
    }

    const template = await Template.findByPk(order.templateId);
    if (!template) return res.status(404).json({ error: 'Template introuvable.' });

    // ── Save UserDocument (fire-and-forget, idempotent upsert) ────────────────
    if (order.guestEmail) {
      const labels = {};
      for (const b of (template.blanks || [])) labels[String(b.id)] = b.name;
      UserDocument.upsert({
        email:        order.guestEmail,
        templateId:   order.templateId,
        templateName: order.templateName || template.name || '',
        values:       order.values || {},
        labels,
        savedAt:      new Date(),
      }).catch(e => console.error('[confirm] Erreur sauvegarde UserDocument:', e.message));
    }

    const pdfBuf = await buildFilledLoPdfBuffer(template, {
      values:    order.values    || {},
      civValues: order.civValues || {},
    });
    const fname = (template.fileName || 'document').replace(/\.docx$/i, '') + '.pdf';

    // Send document PDF by email
    if (order.guestEmail && !order.emailSent) {
      try {
        order.emailSent = true;
        await sendPdfToGuest(order.guestEmail, template.name || template.fileName, pdfBuf, fname);
        console.log(`[confirm] PDF envoyé à ${order.guestEmail}`);
      } catch (mailErr) {
        console.error('[confirm] Erreur envoi PDF:', mailErr.message);
      }
    }

    // Generate and send invoice
    if (order.guestEmail) {
      try {
        const { invoice, pdfBuffer } = await createInvoice({ orderId: order.id, amount: order.amount });
        await sendInvoicePdf(order.guestEmail, order.templateName || 'Document', pdfBuffer, `Invoice_${invoice.invoiceId}.pdf`);
        console.log(`[confirm] Facture envoyée à ${order.guestEmail}`);
      } catch (invErr) {
        console.error('[confirm] Erreur envoi facture:', invErr.message);
      }
    }

    await order.save();

    const baseName = (template.fileName || 'document')
      .replace(/\.docx$/i, '')
      .replace(/[^a-zA-Z0-9_.\-]/g, '_');

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${baseName}.pdf"`);
    res.send(pdfBuf);
  } catch (err) {
    console.error('confirmGuestPayment error:', err);
    res.status(500).json({ error: err.message });
  }
};

// ─── POST /api/orders/:id/payment-failed ────────────────────────────────────
// Called by the frontend when Stripe returns a card error (client-side decline).
// Does NOT require auth — the orderId is sufficient proof of knowledge.
const notifyPaymentFailed = async (req, res) => {
  try {
    console.log('[payment-failed] orderId reçu:', req.params.id);
    const order = await Order.findByPk(req.params.id);
    if (!order) { console.log('[payment-failed] commande introuvable'); return res.status(404).json({ error: 'Commande introuvable.' }); }
    if (order.payment) return res.json({ sent: false, reason: 'already_paid' });

    const recipientEmail = order.guestEmail || null;
    console.log('[payment-failed] email destinataire:', recipientEmail);
    if (!recipientEmail) return res.json({ sent: false, reason: 'no_email' });

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3001';
    const retryUrl = `${frontendUrl}/fill/${order.templateId}`;
    console.log('[payment-failed] envoi email à', recipientEmail);
    await sendPaymentFailed(recipientEmail, order.templateName || 'Document', retryUrl);
    console.log('[payment-failed] email envoyé avec succès');

    res.json({ sent: true });
  } catch (err) {
    console.error('notifyPaymentFailed error:', err);
    res.status(500).json({ error: err.message });
  }
};

module.exports = { getMyOrders, downloadOrder, downloadOrderLoPdf, listOrders, createGuestOrder, handleStripeWebhook, createGuestPaymentIntent, confirmGuestPayment, notifyPaymentFailed };
