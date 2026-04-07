const mongoose = require('mongoose');

const inventorySchema = mongoose.Schema({
    farmerId: { type: String, required: true },
    spice: { type: String, required: true },
    quantity: { type: Number, required: true },
    quality: { type: String, enum: ['A', 'B', 'C'], default: 'A' },
    lastUpdated: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Inventory', inventorySchema);
