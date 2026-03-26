const express = require('express');
const cors = require('cors');
require('dotenv').config();

const orderRoutes = require('./routes/orders');
const marketRoutes = require('./routes/markets');
const forecastRoutes = require('./routes/forecast');
const transportRoutes = require('./routes/transportRoutes');
const demandRoutes = require('./routes/demandRoutes');
const seasonalRoutes = require('./routes/seasonalRoutes');

const app = express();

app.use(cors());
app.use(express.json());

app.use('/api/orders', orderRoutes);
app.use('/api/markets', marketRoutes);
app.use('/api/forecast', forecastRoutes);
app.use('/api/transport', transportRoutes);
app.use('/api/demand-map', demandRoutes);
app.use('/api/seasonal-analytics', seasonalRoutes);

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
