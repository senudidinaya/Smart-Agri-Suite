const express = require('express');
const router = express.Router();
const { getInventory, updateInventory, initInventory } = require('../controllers/inventoryController');

router.get('/', getInventory);
router.post('/update', updateInventory);
router.post('/init', initInventory);

module.exports = router;
