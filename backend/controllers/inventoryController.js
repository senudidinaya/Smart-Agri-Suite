const Inventory = require('../models/Inventory');

// @desc    Get all inventory
// @route   GET /api/inventory
exports.getInventory = async (req, res) => {
    try {
        const inventory = await Inventory.find();
        res.status(200).json(inventory);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Update spice inventory (Increment/Decrement)
// @route   POST /api/inventory/update
exports.updateInventory = async (req, res) => {
    const { spice, quantity, action } = req.body;
    try {
        let item = await Inventory.findOne({ spice });
        if (!item) {
            item = new Inventory({ farmerId: 'default', spice, quantity: 0, quality: 'A' });
        }
        
        if (action === 'ADD') item.quantity += parseFloat(quantity);
        else if (action === 'SUBTRACT') item.quantity = Math.max(0, item.quantity - parseFloat(quantity));
        
        await item.save();
        res.status(200).json(item);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

// @desc    Initialize default inventory if empty
// @route   POST /api/inventory/init
exports.initInventory = async (req, res) => {
    try {
        const count = await Inventory.countDocuments();
        if (count === 0) {
            const defaults = [
                { farmerId: 'F1', spice: 'Cinnamon', quantity: 450, quality: 'A' },
                { farmerId: 'F1', spice: 'Pepper', quantity: 280, quality: 'A' },
                { farmerId: 'F1', spice: 'Cardamom', quantity: 150, quality: 'B' },
                { farmerId: 'F1', spice: 'Clove', quantity: 310, quality: 'A' }
            ];
            await Inventory.insertMany(defaults);
            res.status(201).json({ message: 'Inventory initialized' });
        } else {
            res.status(200).json({ message: 'Inventory already exists' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
