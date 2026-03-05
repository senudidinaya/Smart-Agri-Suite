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
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('Order', orderSchema);
