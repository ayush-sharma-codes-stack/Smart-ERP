const express = require('express');
const router = express.Router();
const invoiceController = require('../controllers/invoice');
const authMiddleware = require('../middleware/auth');

// Protect all invoice routes
router.use(authMiddleware);

router.get('/', invoiceController.getInvoices);
router.get('/:id', invoiceController.getInvoice);
router.post('/', invoiceController.createInvoice);

module.exports = router;
