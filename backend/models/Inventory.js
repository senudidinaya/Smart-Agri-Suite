const mongoose = require('mongoose');

const inventorySchema = mongoose.Schema({
    farmerId: {
        type: String, // Using name as ID for current frontend compatibility
        required: true,
        index: true
    },
    farmerName: {
        type: String,
        required: true
    },
    hubName: {
        type: String,
        required: true
    },
    region: {
        type: String,
        required: true
    },
    lat: {
        type: Number,
        required: true
    },
    lng: {
        type: Number,
        required: true
    },
    spice: {
        type: String,
        required: true
    },
    variety: {
        type: String,
        required: true
    },
    price: {
        type: Number, // LKR per kg
        required: true
    },
    totalStock: {
        type: Number,
        required: true
    },
    stock: {
        type: Number,
        required: true
    },
    reserved: {
        type: Number,
        default: 0
    },
    rating: {
        type: Number,
        default: 4.5
    },
    reviews: {
        type: Number,
        default: 0
    },
    status: {
        type: String,
        enum: ['Active', 'SoldOut', 'Paused'],
        default: 'Active'
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('Inventory', inventorySchema);
