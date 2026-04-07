const express = require('express');
const router = express.Router();
const { sendMessage, getMessages, getChat } = require('../controllers/messageController');
const { protect } = require('../middleware/authMiddleware');

router.use(protect); // Protect all routes in this file

router.route('/')
    .get(getMessages)
    .post(sendMessage);

router.route('/chat/:userId')
    .get(getChat);

module.exports = router;
