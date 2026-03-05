const express = require('express');
const router = express.Router();
const { getSeasonalAnalytics } = require('../controllers/seasonalController');

router.get('/', getSeasonalAnalytics);

module.exports = router;
