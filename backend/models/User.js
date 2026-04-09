const mongoose = require('mongoose');

const userSchema = mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true,
        unique: true
    },
    password: {
        type: String,
        required: true
    },
    role: {
        type: String,
        enum: ['FARMER', 'CUSTOMER'],
        required: true
    },
    location: {
        type: {
            lat: Number,
            lng: Number,
            district: String
        },
        required: false
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('User', userSchema);
