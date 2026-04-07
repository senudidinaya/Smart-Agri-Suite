const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');

// @desc    Get executive-level smart suggestions derived from data
// @route   GET /api/intelligence/suggestions
router.get('/suggestions', async (req, res) => {
    try {
        const dataPath = path.join(__dirname, '../ml/data/spice_weather_price_dataset.csv');
        const results = [];
        
        fs.createReadStream(dataPath)
            .pipe(csv())
            .on('data', (data) => { results.push(data); })
            .on('end', () => {
                if (results.length === 0) return res.json({ suggestion: "Platform ready for market intelligence." });

                // Find a spice with low supply high demand
                const opportunities = results.filter(r => parseFloat(r.supply_index) < 0.5 && parseFloat(r.demand_index) > 0.7);
                
                if (opportunities.length > 0) {
                    const top = opportunities[0];
                    res.json({
                        suggestion: `Critical arbitrage detected in ${top.spice} within ${top.district}. Supply constraints (+${Math.round(top.demand_index*100)}% demand) suggest immediate stock liquidation.`,
                        level: "CRITICAL"
                    });
                } else {
                    res.json({
                        suggestion: "Markets stabilized. Recommendation: Maintain current inventory levels for the next Maha cycle.",
                        level: "STABLE"
                    });
                }
            });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

module.exports = router;
