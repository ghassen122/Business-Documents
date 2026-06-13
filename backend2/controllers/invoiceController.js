const { createInvoice, getInvoiceByTemplate } = require('../services/invoiceService');
const { sendInvoicePdf } = require('../lib/mailer');

exports.createInvoiceController = async (req, res) => {

  try {

    const { orderId, amount } = req.body;

    const result = await createInvoice({
      orderId,
      amount
    });

    return res.status(201).json({
      message: 'Invoice created',
      invoice: result.invoice
    });

  } catch (error) {

    return res.status(500).json({
      error: error.message
    });

  }
};
exports.getInvoiceByTemplateController = async (req, res) => {

  try { 
  const { templateName } = req.body;

   const { pdfBuffer } = await getInvoiceByTemplate(templateName);

    return res.send(pdfBuffer);

  } catch (error) {

    return res.status(500).json({
      error: error.message
    });

  }
};

exports.sendInvoiceByEmailController = async (req, res) => {
  try {
    const { templateName, email } = req.body;
    if (!email || !templateName) return res.status(400).json({ error: 'email et templateName requis' });
    const { pdfBuffer } = await getInvoiceByTemplate(templateName);
    await sendInvoicePdf(email, templateName, pdfBuffer, `Facture_${templateName}.pdf`);
    return res.json({ ok: true });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};