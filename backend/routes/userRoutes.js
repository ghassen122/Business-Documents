const express = require('express')
const router = express.Router()
const { getDocuments, saveDocument, removeDocument } = require('../controllers/userController')

router.get('/documents', getDocuments)
router.post('/documents', saveDocument)
router.delete('/documents', removeDocument)

module.exports = router
