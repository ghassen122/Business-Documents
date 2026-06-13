const express = require('express');
const router  = express.Router();
const { createInvoiceController, getInvoiceByTemplateController, sendInvoiceByEmailController } = require('../controllers/invoiceController');

router.post('/create', createInvoiceController);
router.post('/by-templateName', getInvoiceByTemplateController);
router.post('/send-by-email', sendInvoiceByEmailController);
module.exports = router;