const express = require('express');
const router = express.Router();
const reportsController = require('../controllers/reports');
const authMiddleware = require('../middleware/auth');

router.use(authMiddleware);

router.get('/trial-balance',   reportsController.getTrialBalance);
router.get('/balance-sheet',   reportsController.getBalanceSheet);
router.get('/profit-loss',     reportsController.getProfitLoss);
router.get('/ledger-account',  reportsController.getLedgerAccount);
router.get('/stock-summary',   reportsController.getStockSummary);

module.exports = router;
