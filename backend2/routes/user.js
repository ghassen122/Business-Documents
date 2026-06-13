
const express = require('express');
const router  = express.Router();
const { getDocuments, saveDocument, removeDocument, getDocumentsByEmail, updateDocumentByAdmin } = require('../controllers/userController');

router.get('/documents',                     getDocuments);
router.get('/documents/by-email/:email',     getDocumentsByEmail);
router.post('/documents',                   saveDocument);
router.put('/documents/:id',                updateDocumentByAdmin);
router.delete('/documents',                 removeDocument);

module.exports = router;
