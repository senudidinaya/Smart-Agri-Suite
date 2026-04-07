const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db');
const orderRoutes = require('./routes/orders');
const marketRoutes = require('./routes/markets');
const forecastRoutes = require('./routes/forecast');
const transportRoutes = require('./routes/transportRoutes');
const demandRoutes = require('./routes/demandRoutes');
const seasonalRoutes = require('./routes/seasonalRoutes');
const intelligenceRoutes = require('./routes/intelligence');
const inventoryRoutes = require('./routes/inventory');
const marketplaceRoutes = require('./routes/marketplace');
const authRoutes = require('./routes/auth');
const messageRoutes = require('./routes/messages');

const app = express();

// Connect to Database
connectDB();

app.use(cors());
app.use(express.json());

app.use('/api/orders', orderRoutes);
app.use('/api/markets', marketRoutes);
app.use('/api/forecast', forecastRoutes);
app.use('/api/transport', transportRoutes);
app.use('/api/demand-map', demandRoutes);
app.use('/api/seasonal-analytics', seasonalRoutes);
app.use('/api/intelligence', intelligenceRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/marketplace', marketplaceRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/messages', messageRoutes);

const PORT = process.env.PORT || 5000;

app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT} (Listening on all interfaces)`);
});
