const express = require('express');
const router = express.Router();
const groupController = require('../controllers/group');
const authMiddleware = require('../middleware/auth');

router.use(authMiddleware);

router.get('/', groupController.getGroups);
router.post('/', groupController.createGroup);
router.put('/:id', groupController.updateGroup);
router.delete('/:id', groupController.deleteGroup);

module.exports = router;
