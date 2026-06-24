const express = require('express');
const router = express.Router();
const ledgerController = require('../controllers/ledger');
const authMiddleware = require('../middleware/auth');

router.use(authMiddleware);

router.get('/', ledgerController.getLedgers);
router.get('/:id', ledgerController.getLedger);
router.post('/', ledgerController.createLedger);
router.put('/:id', ledgerController.updateLedger);
router.delete('/:id', ledgerController.deleteLedger);

module.exports = router;
