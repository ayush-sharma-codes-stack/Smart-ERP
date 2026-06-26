const express = require('express');
const router = express.Router();
const customerController = require('../controllers/customer');
const authMiddleware = require('../middleware/auth');

// Protect all customer routes
router.use(authMiddleware);

router.get('/', customerController.getCustomers);
router.get('/:id', customerController.getCustomer);
router.post('/', customerController.createCustomer);
router.put('/:id', customerController.updateCustomer);
router.delete('/:id', customerController.deleteCustomer);

module.exports = router;
