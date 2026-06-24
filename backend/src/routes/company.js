const express = require('express');
const router = express.Router();
const companyController = require('../controllers/company');
const authMiddleware = require('../middleware/auth');

// All company routes are protected by authMiddleware
router.use(authMiddleware);

router.get('/', companyController.getCompanies);
router.post('/', companyController.createCompany);
router.get('/:id', companyController.getCompany);
router.put('/:id', companyController.updateCompany);
router.delete('/:id', companyController.deleteCompany);

module.exports = router;
