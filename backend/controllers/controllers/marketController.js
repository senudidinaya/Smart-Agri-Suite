const Market = require('../models/Market');

// @desc    Get market data
// @route   GET /api/markets
exports.getMarkets = async (req, res) => {
    try {
        // Since we don't have a populated DB initially, we can seed or return mock format if empty
        const markets = await Market.find();

        if (markets.length === 0) {
            return res.status(200).json([
                { name: "Cinnamon", basePrice: 2100, demandScore: 85, supplyScore: 40, trend: 5 },
                { name: "Pepper", basePrice: 1600, demandScore: 65, supplyScore: 80, trend: -2 },
                { name: "Cardamom", basePrice: 3200, demandScore: 92, supplyScore: 30, trend: 8 },
                { name: "Clove", basePrice: 2600, demandScore: 78, supplyScore: 50, trend: 4 },
                { name: "Nutmeg", basePrice: 2400, demandScore: 60, supplyScore: 60, trend: 1 },
            ]);
        }
        res.status(200).json(markets);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
