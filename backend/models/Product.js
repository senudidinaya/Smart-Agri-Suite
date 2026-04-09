const mongoose = require('mongoose');

const productSchema = mongoose.Schema({
    farmerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    spiceType: {
        type: String,
        required: true
    },
    availableQuantityKg: {
        type: Number,
        required: true
    },
    basePrice: {
        type: Number,
        required: true,
        description: "The historical/baseline price intended for the farmer"
    },
    district: {
        type: String,
        required: true
    },
    status: {
        type: String,
        enum: ['AVAILABLE', 'SOLD_OUT', 'UNAVAILABLE'],
        default: 'AVAILABLE'
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('Product', productSchema);
