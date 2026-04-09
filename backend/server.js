const express = require('express');
const cors = require('cors');
require('dotenv').config();
const mongoose = require('mongoose');
const orderRoutes = require('./routes/orders');
const marketRoutes = require('./routes/markets');
const forecastRoutes = require('./routes/forecast');
const transportRoutes = require('./routes/transportRoutes');
const demandRoutes = require('./routes/demandRoutes');
const seasonalRoutes = require('./routes/seasonalRoutes');
const productRoutes = require('./routes/products');
const userRoutes = require('./routes/users');
const inventoryRoutes = require('./routes/inventory');
const app = express();

app.use(cors());
app.use(express.json());

app.use('/api/orders', orderRoutes);
app.use('/api/markets', marketRoutes);
app.use('/api/forecast', forecastRoutes);
app.use('/api/transport', transportRoutes);
app.use('/api/demand-map', demandRoutes);
app.use('/api/seasonal-analytics', seasonalRoutes);
app.use('/api/products', productRoutes);
app.use('/api/users', userRoutes);
app.use('/api/inventory', inventoryRoutes);
const PORT = process.env.PORT || 5000;

// Connect to MongoDB
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/smart_agri_suite';
mongoose.connect(MONGODB_URI)
    .then(() => console.log('Connected to MongoDB gracefully'))
    .catch(err => console.error('MongoDB connection error:', err));

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
