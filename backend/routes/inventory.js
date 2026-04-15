const express = require('express');
const router = express.Router();
const Inventory = require('../models/Inventory');

// ── GET ALL LISTINGS (FOR MARKETPLACE) ─────────────────────────────────────────
router.get('/', async (req, res) => {
    try {
        const inventory = await Inventory.find().sort({ createdAt: -1 });
        res.json(inventory);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// ── GET FARMER'S SPECIFIC INVENTORY ───────────────────────────────────────────
router.get('/farmer/:farmerId', async (req, res) => {
    try {
        const inventory = await Inventory.find({ farmerId: req.params.farmerId });
        res.json(inventory);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// ── POST ADD LISTING ──────────────────────────────────────────────────────────
router.post('/add', async (req, res) => {
    try {
        const newItem = new Inventory(req.body);
        const savedItem = await newItem.save();
        res.status(201).json(savedItem);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// ── PUT UPDATE LISTING (STOCK OR PRICE) ───────────────────────────────────────
router.put('/:id', async (req, res) => {
    try {
        const updatedItem = await Inventory.findByIdAndUpdate(
            req.params.id, 
            { $set: req.body }, 
            { new: true }
        );
        if (!updatedItem) return res.status(404).json({ message: 'Item not found' });
        res.json(updatedItem);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// ── DELETE REMOVE LISTING ─────────────────────────────────────────────────────
router.delete('/:id', async (req, res) => {
    try {
        const deletedItem = await Inventory.findByIdAndDelete(req.params.id);
        if (!deletedItem) return res.status(404).json({ message: 'Item not found' });
        res.json({ message: 'Item removed from inventory' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

module.exports = router;
