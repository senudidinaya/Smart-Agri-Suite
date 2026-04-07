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

// @desc    Get shared shipments for region-based pooling (Logan Style)
// @route   GET /api/transport/shared
const getSharedLogistics = async (req, res) => {
    try {
        const { region } = req.query;
        // Mock data representing a "Pooled" shipment approach (Uber-Logistics style)
        const pooledShipments = [
            { id: 'POOL_01', region: region || 'Colombo', orders: 4, sharedCostSaved: 1200, status: 'POOLING', eta: '45m' },
            { id: 'POOL_02', region: region || 'Kandy', orders: 2, sharedCostSaved: 850, status: 'EN_ROUTE', eta: '1h 12m' }
        ];
        res.json(pooledShipments);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get Live Tracking Coordinates (Real-time Simulation)
// @route   GET /api/transport/tracking/:id
const getLiveTracking = async (req, res) => {
    try {
        // Simulated tracking points for the PickMe Map
        const trackingPoints = {
            orderId: req.params.id,
            origin: { lat: 7.4675, lng: 80.6234, label: "Matale Farm" },
            destination: { lat: 6.9271, lng: 79.8612, label: "Colombo Hub" },
            currentPos: { lat: 7.2906 + (Math.random() * 0.01), lng: 80.6337 + (Math.random() * 0.01) },
            courierInfo: { name: "Anura K.", vehicle: "Small Truck", phone: "+94 771234567", temp: 24.5 },
            status: "TRANSIT"
        };
        res.json(trackingPoints);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = {
    getOrderStatus,
    getTransportAnalytics,
    getTransportETA,
    getSharedLogistics,
    getLiveTracking
};
