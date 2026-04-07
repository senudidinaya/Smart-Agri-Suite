const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');

// @desc    Get Sri Lanka demand map data
// @route   GET /api/demand-map
const getDemandMap = async (req, res) => {
    try {
        const { spice } = req.query;
        const requestedSpice = spice || "Cinnamon";
        const dataPath = path.join(__dirname, '../ml/data/spice_weather_price_dataset.csv');

        const results = [];
        fs.createReadStream(dataPath)
            .pipe(csv())
            .on('data', (data) => {
                if (data.spice === requestedSpice) {
                    results.push({
                        district: data.district,
                        demandIndex: parseFloat(data.demand_index)
                    });
                }
            })
            .on('end', () => {
                if (results.length === 0) {
                     // Fallback
                     return res.json({ regions: { Colombo: "HIGH" } });
                }

                // Aggregate demand index by district
                const distAgg = {};
                results.forEach(r => {
                    if (!distAgg[r.district]) distAgg[r.district] = { sum: 0, count: 0 };
                    distAgg[r.district].sum += r.demandIndex;
                    distAgg[r.district].count++;
                });

                const regions = {};
                Object.keys(distAgg).forEach(d => {
                   const avg = distAgg[d].sum / distAgg[d].count;
                   // map to VERY_HIGH, HIGH, MEDIUM, LOW
                   if (avg > 0.8) regions[d] = "VERY_HIGH";
                   else if (avg > 0.6) regions[d] = "HIGH";
                   else if (avg > 0.4) regions[d] = "MEDIUM";
                   else regions[d] = "LOW";
                });

                res.json({
                    spice: requestedSpice,
                    regions
                });
            });

    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = {
    getDemandMap
};
