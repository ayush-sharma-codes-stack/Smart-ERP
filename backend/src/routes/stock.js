const express = require('express');
const router = express.Router();
const stockController = require('../controllers/stock');
const authMiddleware = require('../middleware/auth');

router.use(authMiddleware);

// Units of Measure
router.get('/units', stockController.getUnits);
router.post('/units', stockController.createUnit);

// Stock Groups
router.get('/stock-groups', stockController.getStockGroups);
router.post('/stock-groups', stockController.createStockGroup);

// Stock Items
router.get('/items', stockController.getStockItems);
router.get('/items/:id', stockController.getStockItem);
router.post('/items', stockController.createStockItem);
router.put('/items/:id', stockController.updateStockItem);
router.delete('/items/:id', stockController.deleteStockItem);

module.exports = router;
