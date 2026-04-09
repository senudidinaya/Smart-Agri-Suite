const express = require('express');
const router = express.Router();
const User = require('../models/User');

// POST register user
router.post('/register', async (req, res) => {
    try {
        const { name, email, password, role, location } = req.body;
        
        const newUser = new User({
            name,
            email,
            password,
            role,
            location
        });

        const savedUser = await newUser.save();
        res.status(201).json(savedUser);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

module.exports = router;
