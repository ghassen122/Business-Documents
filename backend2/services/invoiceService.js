const Invoice = require('../models/Invoice');
const Order = require('../models/Order');

const { generateInvoicePdf } = require('../lib/pdfGenerator');

const createInvoice = async ({ orderId, amount }) => {

  try {

    // Vérifier si commande existe
    const order = await Order.findByPk(orderId);

    if (!order) {
      throw new Error('Order not found');
    }

    // Créer facture
    const invoice = await Invoice.create({
      orderId,
      amount,
      mail:       order.guestEmail || '',
      templateName: order.templateName,
      invoiceUrl: `https://fake-invoice-service.com/invoices/${orderId}.pdf`,
      invoiceId:  `INV-${orderId}`,
      status:     'paid',
    });

    // Génération PDF
    const pdfBuffer = await generateInvoicePdf(invoice);

    // Retour service (PAS res.json)
    return {
      invoice,
      pdfBuffer
    };

  } catch (error) {

    console.error('Error creating invoice:', error);

    throw error;
  }
};

const getInvoiceByTemplate = async (templateName) => {
  try {
    const invoice = await Invoice.findOne({ where: { templateName } });
    if (!invoice) {
      throw new Error('Invoice not found');
    }
    const pdfBuffer = await generateInvoicePdf(invoice);

    return {
      invoice,
      pdfBuffer
    };
  } catch (error) {
    console.error('Error fetching invoice:', error.message);
    throw error;
  }
};

module.exports = {
  createInvoice,
  getInvoiceByTemplate
};
