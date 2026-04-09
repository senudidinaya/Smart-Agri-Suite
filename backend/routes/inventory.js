const express = require('express');
const router = express.Router();
const Inventory = require('../models/Inventory');

// GET farmer's inventory
router.get('/:farmerId', async (req, res) => {
    try {
        const inventory = await Inventory.find({ farmerId: req.params.farmerId });
        res.json(inventory);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// POST add item to inventory
router.post('/add', async (req, res) => {
    try {
        const { farmerId, spiceType, quantity, unit, quality, district } = req.body;
        const newItem = new Inventory({
            farmerId,
            spiceType,
            quantity,
            unit,
            quality,
            district
        });
        const savedItem = await newItem.save();
        res.status(201).json(savedItem);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// DELETE remove item from inventory
router.delete('/:id', async (req, res) => {
    try {
        await Inventory.findByIdAndDelete(req.params.id);
        res.json({ message: 'Item removed from inventory' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

module.exports = router;
