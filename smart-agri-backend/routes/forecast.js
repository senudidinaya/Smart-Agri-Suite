const express = require('express');
const router = express.Router();
const { getForecast } = require('../controllers/forecastController');

router.route('/:spice').get(getForecast);

module.exports = router;
