const mongoose = require('mongoose');

const marketSchema = mongoose.Schema({
    spice: { type: String, required: true },
    region: { type: String, required: true },
    demandIndex: { type: Number, required: true },
    basePrice: { type: Number, required: true },
    supplyLevel: { type: Number, required: true },
    date: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Market', marketSchema);
