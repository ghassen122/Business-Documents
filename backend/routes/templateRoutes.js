const express = require('express')
const router = express.Router()
const { list, create, getById, remove } = require('../controllers/templateController')

router.get('/', list)
router.post('/', create)
router.get('/:id', getById)
router.delete('/:id', remove)

module.exports = router
