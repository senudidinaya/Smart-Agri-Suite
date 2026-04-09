const mongoose = require('mongoose');

const inventorySchema = mongoose.Schema({
    farmerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    spiceType: {
        type: String,
        required: true
    },
    quantity: {
        type: Number,
        required: true
    },
    unit: {
        type: String,
        default: 'kg'
    },
    quality: {
        type: String,
        required: true
    },
    district: {
        type: String,
        required: true
    },
    isListed: {
        type: Boolean,
        default: false
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('Inventory', inventorySchema);
