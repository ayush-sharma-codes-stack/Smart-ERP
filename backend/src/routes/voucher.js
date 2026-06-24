const express = require('express');
const router = express.Router();
const voucherController = require('../controllers/voucher');
const authMiddleware = require('../middleware/auth');

router.use(authMiddleware);

router.get('/',     voucherController.getVouchers);
router.get('/:id',  voucherController.getVoucher);
router.post('/',    voucherController.createVoucher);
router.put('/:id',  voucherController.updateVoucher);
router.delete('/:id', voucherController.deleteVoucher);

module.exports = router;
