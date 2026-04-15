const TransportLog = require('../models/TransportLog');
const Order = require('../models/Order');

// Haversine formula to calculate distance between two coordinates in km
function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
        Math.sin(dLat/2) * Math.sin(dLat/2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
        Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
}

const VEHICLE_CONFIG = {
    'Bike':          { costPerKm: 20,  maxWeight: 5,   icon: 'bicycle' },
    'Three-Wheeler': { costPerKm: 45,  maxWeight: 30,  icon: 'car' },
    'Lorry':         { costPerKm: 85,  maxWeight: 150, icon: 'bus' },
    'Heavy Truck':   { costPerKm: 150, maxWeight: 1000,icon: 'trail-sign' }
};

// @desc    Get order tracking status
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
const getTransportAnalytics = async (req, res) => {
    try {
        const mockData = {
            costDistribution: { Bike: 5000, "Three-Wheeler": 12000, Lorry: 45000, "Heavy Truck": 18000 },
            deliveryTimes: [1.2, 1.5, 2.4, 0.8, 1.1],
            usage: [
                { name: "Bike", value: 30 },
                { name: "Three-Wheeler", value: 45 },
                { name: "Lorry", value: 20 },
                { name: "Heavy Truck", value: 5 }
            ],
            fastestRoute: "Galle -> Colombo (90m)",
            cheapestRoute: "Matara -> Galle"
        };
        res.json(mockData);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get Optimal Route and Mode recommendation based on REAL distance
// @route   GET /api/transport/optimize?lat1=...&lng1=...&lat2=...&lng2=...&weight=...
const getOptimalRoute = async (req, res) => {
    try {
        const { lat1, lng1, lat2, lng2, weight } = req.query;
        const load = parseFloat(weight);
        const distance = calculateDistance(parseFloat(lat1), parseFloat(lng1), parseFloat(lat2), parseFloat(lng2));

        // Determine mode based on weight
        let mode = 'Bike';
        if (load > 150) mode = 'Heavy Truck';
        else if (load > 30) mode = 'Lorry';
        else if (load > 5) mode = 'Three-Wheeler';

        const config = VEHICLE_CONFIG[mode];
        const estimatedCost = distance * config.costPerKm;

        res.json({
            recommendedMode: mode,
            distanceKm: Math.ceil(distance),
            estimatedCost: Math.ceil(estimatedCost),
            efficiencyScore: 0.95,
            impact: `Eco-friendly delivery via ${mode} selected for ${load}kg load.`
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get estimated time of arrival for a route
const getTransportETA = async (req, res) => {
    try {
        const { mode } = req.query;
        const baseETA = {
            "Bike": "45m",
            "Three-Wheeler": "1h 15m",
            "Lorry": "2h 30m",
            "Heavy Truck": "4h 0m"
        };

        res.json({
            mode: mode || "Lorry",
            eta: baseETA[mode] || "3h 30m",
            reliability: 0.94,
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
