const Market = require('../models/Market');

// @desc    Get market data
// @route   GET /api/markets
exports.getMarkets = async (req, res) => {
    try {
        const markets = await Market.find();

        if (markets.length === 0) {
            // Logical mock data generation if DB empty
            const spices = [
                { name: "Cinnamon", base: 2100, variance: 50 },
                { name: "Pepper", base: 1600, variance: 30 },
                { name: "Cardamom", base: 3200, variance: 100 },
                { name: "Clove", base: 2600, variance: 40 },
                { name: "Nutmeg", base: 2400, variance: 20 },
            ];
            
            const results = spices.map(s => {
                const trend = (Math.random() * 10 - 4).toFixed(1); // Random trend -4 to +6
                return {
                    name: s.name,
                    basePrice: s.base + (Math.random() * s.variance),
                    demandScore: 60 + Math.random() * 30,
                    supplyScore: 30 + Math.random() * 40,
                    trend: parseFloat(trend)
                };
            });
            return res.status(200).json(results);
        }
        res.status(200).json(markets);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
