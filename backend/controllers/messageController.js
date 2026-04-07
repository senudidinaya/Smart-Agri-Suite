const Message = require('../models/Message');

// @desc    Send a message
// @route   POST /api/messages
exports.sendMessage = async (req, res) => {
    const { receiver, text, listingId } = req.body;
    try {
        const message = await Message.create({
            sender: req.user._id,
            receiver,
            text,
            listingId
        });
        const populated = await message.populate('sender receiver', 'name email');
        res.status(201).json(populated);
    } catch (e) {
        res.status(400).json({ message: e.message });
    }
};

// @desc    Get my messages (inbox & outbox)
// @route   GET /api/messages
exports.getMessages = async (req, res) => {
    try {
        const messages = await Message.find({
            $or: [{ sender: req.user._id }, { receiver: req.user._id }]
        }).sort({ createdAt: -1 }).populate('sender receiver', 'name email');
        res.status(200).json(messages);
    } catch (e) {
        res.status(500).json({ message: e.message });
    }
};

// @desc    Get chat with specific user
// @route   GET /api/messages/chat/:userId
exports.getChat = async (req, res) => {
    try {
        const chat = await Message.find({
            $or: [
                { sender: req.user._id, receiver: req.params.userId },
                { sender: req.params.userId, receiver: req.user._id }
            ]
        }).sort({ createdAt: 1 }).populate('sender receiver', 'name email');
        res.status(200).json(chat);
    } catch (e) {
        res.status(500).json({ message: e.message });
    }
};
