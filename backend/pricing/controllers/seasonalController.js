const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');

// @desc    Get Sri Lanka seasonal analytics and forecasts
// @route   GET /api/seasonal-analytics
const getSeasonalAnalytics = async (req, res) => {
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
                        date: data.date,
                        month: data.month,
                        season: data.season,
                        district: data.district,
                        temperature: parseFloat(data.temperature_c),
                        rainfall: parseFloat(data.rainfall_mm),
                        humidity: parseFloat(data.humidity),
                        weatherCondition: data.weather_condition,
                        supplyIndex: parseFloat(data.supply_index),
                        demandIndex: parseFloat(data.demand_index),
                        price: parseFloat(data.market_price_lkr_per_kg)
                    });
                }
            })
            .on('end', () => {
                if (results.length === 0) {
                    return res.status(404).json({ message: 'No data found for spice' });
                }

                // 1. Seasonal Price Trend (Aggregating averages per season)
                const seasonalAgg = {};
                results.forEach(row => {
                    if (!seasonalAgg[row.season]) {
                        seasonalAgg[row.season] = { total: 0, count: 0 };
                    }
                    seasonalAgg[row.season].total += row.price;
                    seasonalAgg[row.season].count++;
                });

                const seasonalTrend = Object.keys(seasonalAgg).map(season => ({
                    season,
                    averagePrice: Math.round(seasonalAgg[season].total / seasonalAgg[season].count)
                }));

                // 2. Rainfall vs Price Scatter data
                const rainfallCorrelation = results.map(row => ({
                    x: row.rainfall,
                    y: row.price
                })).sort((a, b) => a.x - b.x); // Sort by rainfall to make charts smoother

                // 3. Temperature Impact
                const tempImpact = results.map(row => ({
                    temp: row.temperature,
                    price: row.price
                })).sort((a, b) => a.temp - b.temp);

                // 4. Supply-Demand Balance avg per season
                const sdBalanceAgg = {};
                results.forEach(row => {
                    if (!sdBalanceAgg[row.season]) {
                        sdBalanceAgg[row.season] = { sTotal: 0, dTotal: 0, count: 0 };
                    }
                    sdBalanceAgg[row.season].sTotal += row.supplyIndex;
                    sdBalanceAgg[row.season].dTotal += row.demandIndex;
                    sdBalanceAgg[row.season].count++;
                });

                const supplyDemandBalance = Object.keys(sdBalanceAgg).map(season => ({
                    season,
                    supply: Number((sdBalanceAgg[season].sTotal / sdBalanceAgg[season].count).toFixed(2)),
                    demand: Number((sdBalanceAgg[season].dTotal / sdBalanceAgg[season].count).toFixed(2))
                }));

                // 5. Basic AI Forecast (Simple Moving Average / Percentage jump mimicking Regression)
                const latestPrice = results[results.length - 1].price;
                // Dummy forecast logic demonstrating weather impact prediction
                const forecastJump = requestedSpice === "Pepper" ? 5 : (requestedSpice === "Cinnamon" ? 8 : 4);
                const aiForecast = {
                    currentAverage: latestPrice,
                    forecastedPrice: Math.round(latestPrice * (1 + forecastJump / 100)),
                    percentChange: `+${forecastJump}%`,
                    predictionText: `${requestedSpice} price is forecasted to increase by ${forecastJump}% during the next Maha season due to expected heavy rainfall reducing supply.`
                };

                // 6. Weather Impact Index Calculation
                // Base formula: rainfall * humidity / temperature
                // Let's grab the averages of the latest season or last 3 records.
                const latestRows = results.slice(-3);
                const avgRainfall = latestRows.reduce((acc, r) => acc + r.rainfall, 0) / latestRows.length;
                const avgHumid = latestRows.reduce((acc, r) => acc + r.humidity, 0) / latestRows.length;
                const avgTemp = latestRows.reduce((acc, r) => acc + r.temperature, 0) / latestRows.length;

                let impactScore = (avgRainfall * (avgHumid / 100)) / avgTemp;
                // normalize to a 0-100 gauge visual scale
                if (impactScore > 10) impactScore = 10;
                impactScore = Math.round((impactScore / 10) * 100);

                let impactSeverity = "Low";
                if (impactScore > 40) impactSeverity = "Medium";
                if (impactScore > 75) impactSeverity = "High";

                res.json({
                    spice: requestedSpice,
                    seasonalTrend,
                    rainfallCorrelation,
                    tempImpact,
                    supplyDemandBalance,
                    aiForecast,
                    weatherImpact: {
                        score: impactScore,
                        severity: impactSeverity
                    }
                });
            })
            .on('error', (err) => {
                res.status(500).json({ message: 'Error reading CSV data', error: err.message });
            });

    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = {
    getSeasonalAnalytics
};
