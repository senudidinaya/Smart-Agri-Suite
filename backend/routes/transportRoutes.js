const express = require('express');
const router = express.Router();
const { getOrderStatus, getTransportAnalytics, getTransportETA, getSharedLogistics, getLiveTracking } = require('../controllers/transportController');

router.get('/analytics', getTransportAnalytics);
router.get('/shared', getSharedLogistics);
router.get('/eta', getTransportETA);
router.get('/tracking/:id', getLiveTracking);
router.get('/orders/:id/status', getOrderStatus);

module.exports = router;
