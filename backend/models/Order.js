const mongoose = require('mongoose');

const orderSchema = mongoose.Schema({
    spice: {
        type: String,
        required: true
    },
    quantity: {
        type: Number,
        required: true
    },
    unitPrice: {
        type: Number,
        required: true
    },
    transportCost: {
        type: Number,
        required: true
    },
    productionCost: {
        type: Number,
        required: true
    },
    revenue: {
        type: Number,
        required: true
    },
    totalCost: {
        type: Number,
        required: true
    },
    profit: {
        type: Number,
        required: true
    },
    customer: {
        type: String,
        required: true
    },
    status: {
        type: String,
        required: true,
        default: 'PENDING'
    },
    logisticsMode: {
        type: String,
        default: 'Van'
    },
    logisticsETA: {
        type: String,
        default: '3h 30m'
    },
    isPooled: {
        type: Boolean,
        default: false
    },
    region: {
        type: String,
        default: 'Unknown'
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('Order', orderSchema);
