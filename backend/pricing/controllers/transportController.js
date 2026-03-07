const TransportLog = require('../models/TransportLog');
const Order = require('../models/Order');

// @desc    Get order tracking status
// @route   GET /api/orders/:id/status
const getOrderStatus = async (req, res) => {
    try {
        const log = await TransportLog.findOne({ orderId: req.params.id }).sort({ timestamp: -1 });
        if (!log) {
            return res.status(404).json({ message: 'Tracking data not found for this order' });
        }
        res.json(log);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get transport analytics
// @route   GET /api/transport/analytics
const getTransportAnalytics = async (req, res) => {
    try {
        const mockData = {
            costDistribution: { Van: 12000, Lorry: 8000, Train: 4500, TukTuk: 15000 },
            deliveryTimes: [2.5, 2.1, 3.4, 1.8, 2.2], // Mon-Fri
            usage: [
                { name: "Van", value: 45 },
                { name: "Lorry", value: 35 },
                { name: "Train", value: 15 },
                { name: "TukTuk", value: 5 }
            ],
            fastestRoute: "Matale -> Kandy",
            cheapestRoute: "Matale -> Colombo"
        };

        // In a real DB scenario, we would aggregate TrnasportLogs here.
        res.json(mockData);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get transport ETA
// @route   GET /api/transport/eta
const getTransportETA = async (req, res) => {
    try {
        const { origin, destination, mode } = req.query;
        // Simple logic for ETA estimation based on mode
        let baseTime = 2.0; // hours
        if (mode === "Train") baseTime = 3.5;
        if (mode === "Van") baseTime = 1.8;

        res.json({
            eta: `${Math.floor(baseTime)}h ${Math.round((baseTime % 1) * 60)}m`,
            distance: "140 km"
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = {
    getOrderStatus,
    getTransportAnalytics,
    getTransportETA
};
