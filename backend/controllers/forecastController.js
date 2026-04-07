// @desc    Get forecast data for a spice
// @route   GET /api/forecast/:spice
exports.getForecast = async (req, res) => {
    try {
        const spice = req.params.spice;
        // Mocking predictive engine output for the specified spice
        const basePriceMap = {
            "Cinnamon": 2100,
            "Pepper": 1600,
            "Cardamom": 3200,
            "Clove": 2600,
            "Nutmeg": 2400
        };

        const base = basePriceMap[spice] || 2000;

        res.status(200).json({
            spice,
            priceForecast: {
                currentPrice: base,
                predictedPrice: base * 1.07, // 7% increase
                growthRate: 7.0,
                trend: "UPWARD"
            },
            demandHotspots: [
                { district: "Colombo", index: 92 },
                { district: "Kandy", index: 78 }
            ]
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
