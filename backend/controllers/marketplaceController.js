const MarketplaceListing = require('../models/MarketplaceListing');
const axios = require('axios');

// @desc    Get all active listings
// @route   GET /api/marketplace
exports.getListings = async (req, res) => {
    try {
        const listings = await MarketplaceListing.find({ status: 'Available' }).sort({ timestamp: -1 });
        res.status(200).json(listings);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Farmer records capacity & selling quantity (Trigger from Stock System)
// @route   POST /api/marketplace/sell
exports.sellSpice = async (req, res) => {
    const { farmerId, farmerName, spice, quantity, region } = req.body;
    
    try {
        // Curate Price separately using Python ML service
        const mlPayload = {
            month: new Date().getMonth() + 1,
            region: region || "Matale", 
            spice: spice,
            temp_c: 28.5, // Mock defaults for curation
            rainfall_mm: 120.0,
            humidity_pct: 75,
            monsoon_sw_flag: 0,
            monsoon_ne_flag: 0,
            qty_sold_kg_4w_ma: 500,
            market_price_LKR_4w_ma: 1500,
            rainfall_mm_4w_ma: 100,
            temp_c_4w_ma: 27
        };

        const response = await axios.post('http://localhost:8000/predict', mlPayload);
        const curatedPricePerKg = response.data.predicted_price_LKR;
        const totalRevenue = curatedPricePerKg * quantity;

        const newListing = new MarketplaceListing({
            id: 'listing_' + Date.now(),
            farmerId,
            farmerName,
            spice,
            quantity,
            totalPrice: totalRevenue,
            region,
            status: 'Available',
            timestamp: new Date().toISOString()
        });

        const saved = await newListing.save();

        res.status(201).json({
            message: "Marketplace request triggered successfully",
            curatedPricePerKg,
            totalRevenue,
            listing: saved
        });
    } catch (error) {
        console.error("Pricing Curation Error:", error.message);
        res.status(500).json({ message: "Failed to curate price and add listing", error: error.message });
    }
};

// @desc    Get listings for a specific farmer (Dashboard)
// @route   GET /api/marketplace/farmer/:farmerId
exports.getFarmerListings = async (req, res) => {
    try {
        const listings = await MarketplaceListing.find({ farmerId: req.params.farmerId });
        const totalRevenue = listings.reduce((sum, item) => sum + item.totalPrice, 0);
        
        res.status(200).json({
            listings,
            totalRevenue,
            activeCount: listings.filter(l => l.status === 'Available').length
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Initialize marketplace data
// @route   POST /api/marketplace/init
exports.initMarketplace = async (req, res) => {
    try {
        const count = await MarketplaceListing.countDocuments();
        if (count === 0) {
            const defaults = [
                {
                    id: 'L1',
                    farmerId: 'F1',
                    farmerName: 'Mahinda Perera',
                    spice: 'Cinnamon',
                    quantity: 120,
                    totalPrice: 264000,
                    region: 'Matale',
                    status: 'Available',
                    timestamp: new Date().toISOString()
                },
                {
                    id: 'L2',
                    farmerId: 'F2',
                    farmerName: 'Sunil J.',
                    spice: 'Pepper',
                    quantity: 85,
                    totalPrice: 153000,
                    region: 'Kandy',
                    status: 'Available',
                    timestamp: new Date().toISOString()
                }
            ];
            await MarketplaceListing.insertMany(defaults);
            res.status(201).json({ message: 'Marketplace initialized' });
        } else {
            res.status(200).json({ message: 'Marketplace already exists' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
