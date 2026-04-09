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

// @desc    Get Optimal Route and Mode recommendation
// @route   GET /api/transport/optimize
const getOptimalRoute = async (req, res) => {
    try {
        const { origin, destination, weight } = req.query;
        const load = parseFloat(weight);

        // Mock optimization logic
        let modes = [
            { name: "Van", costPerKm: 15, capacity: 500, timeScale: 1.0 },
            { name: "Lorry", costPerKm: 12, capacity: 2000, timeScale: 1.2 },
            { name: "Train", costPerKm: 8, capacity: 5000, timeScale: 1.5 }
        ];

        // Filter valid modes by capacity
        const validModes = modes.filter(m => m.capacity >= load);
        
        // Find cheapest valid mode
        const recommended = validModes.sort((a,b) => a.costPerKm - b.costPerKm)[0];

        res.json({
            recommendedMode: recommended.name,
            estimatedCost: recommended.costPerKm * 100, // Hardcoded 100km for now
            efficiencyScore: 0.92,
            route: `${origin} -> ${destination} (Express Highway)`,
            impact: "Carbon footprint reduced by 12% using " + recommended.name
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get estimated time of arrival for a route
// @route   GET /api/transport/eta
const getTransportETA = async (req, res) => {
    try {
        const { mode } = req.query;
        const baseETA = {
            "Van": "3.5 Hours",
            "Lorry": "5.2 Hours",
            "Train": "4.8 Hours",
            "TukTuk": "2.1 Hours"
        };

        res.json({
            mode: mode || "Van",
            eta: baseETA[mode] || "4.0 Hours",
            reliability: 0.88,
            congested: false
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = {
    getOrderStatus,
    getTransportAnalytics,
    getTransportETA,
    getOptimalRoute
};
