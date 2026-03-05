const express = require('express');
const router = express.Router();
const { getOrderStatus, getTransportAnalytics, getTransportETA } = require('../controllers/transportController');

router.get('/analytics', getTransportAnalytics);
router.get('/eta', getTransportETA);
// Mount /api/orders/:id/status in orderRoutes instead, or handle tracking generically
router.get('/orders/:id/status', getOrderStatus);

module.exports = router;
