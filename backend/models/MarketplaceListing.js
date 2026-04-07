const mongoose = require('mongoose');

const marketplaceListingSchema = mongoose.Schema({
    id: { type: String, required: true },
    farmerId: { type: String, required: true },
    farmerName: { type: String, required: true },
    spice: { type: String, required: true },
    quantity: { type: Number, required: true },
    totalPrice: { type: Number, required: true },
    region: { type: String, required: true },
    transportMode: { type: String, default: 'Truck' },
    status: { type: String, default: 'Available', enum: ['Available', 'Sold', 'Pending'] },
    timestamp: { type: String, default: () => new Date().toISOString() }
});

module.exports = mongoose.model('MarketplaceListing', marketplaceListingSchema);
