const express = require('express');
const router = express.Router();
const { getListings, sellSpice, getFarmerListings, initMarketplace } = require('../controllers/marketplaceController');

router.get('/', getListings);
router.post('/sell', sellSpice);
router.get('/farmer/:farmerId', getFarmerListings);
router.post('/init', initMarketplace);

module.exports = router;
