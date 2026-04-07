const mongoose = require('mongoose');

const messageSchema = mongoose.Schema({
    sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    receiver: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    text: { type: String, required: true },
    read: { type: Boolean, default: false },
    listingId: { type: String } // Optional: link to a marketplace listing
}, {
    timestamps: true
});

module.exports = mongoose.model('Message', messageSchema);
