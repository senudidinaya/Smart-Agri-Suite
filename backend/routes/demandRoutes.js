const express = require('express');
const router = express.Router();
const { getDemandMap } = require('../controllers/demandController');

router.get('/', getDemandMap);

module.exports = router;
