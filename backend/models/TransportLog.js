const mongoose = require('mongoose');

const TransportLogSchema = new mongoose.Schema({
    orderId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Order',
        required: true,
    },
    origin: {
        type: String,
        required: true,
    },
    destination: {
        type: String,
        required: true,
    },
    transportMode: {
        type: String,
        required: true,
    },
    distance: {
        type: Number,
        required: true,
    },
    status: {
        type: String,
        enum: ['Confirmed', 'Dispatched', 'In Transit', 'Near Destination', 'Delivered'],
        default: 'Confirmed',
    },
    eta: {
        type: String,
    },
    timestamp: {
        type: Date,
        default: Date.now,
    },
});

module.exports = mongoose.model('TransportLog', TransportLogSchema);
