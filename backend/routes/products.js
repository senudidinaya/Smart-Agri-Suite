const express = require('express');
const router = express.Router();
const Product = require('../models/Product');
const User = require('../models/User');

// GET marketplace feed for customer
router.get('/marketplace', async (req, res) => {
    try {
        // Ideally we would fetch actual data, but we can return mock data or query the DB
        // For now, if DB is empty, return a mock array, otherwise DB data
        const products = await Product.find({ status: 'AVAILABLE' }).populate('farmerId', 'name location');
        
        let targetProducts = products;

        if (products.length === 0) {
            // Mock data fallback if DB is empty for demo purposes
            targetProducts = [
                {
                    _id: 'mock1',
                    spiceType: 'Cinnamon',
                    availableQuantityKg: 50,
                    basePrice: 2000,
                    district: 'Colombo',
                    farmerName: 'Sunil Perera',
                    status: 'AVAILABLE'
                },
                {
                    _id: 'mock2',
                    spiceType: 'Pepper',
                    availableQuantityKg: 100,
                    basePrice: 1200,
                    district: 'Kandy',
                    farmerName: 'Kamal Silva',
                    status: 'AVAILABLE'
                },
                {
                    _id: 'mock3',
                    spiceType: 'Cardamom',
                    availableQuantityKg: 20,
                    basePrice: 3500,
                    district: 'Matale',
                    farmerName: 'Nimal Bandara',
                    status: 'AVAILABLE'
                }
            ];
        }

        // Map products and inject ML price
        const enrichedProducts = await Promise.all(targetProducts.map(async (prod) => {
            try {
                 // 1. Get Environmental Factors (Mocking live sensor/weather data)
                 const environmentalData = {
                     temp_c: 28.5,
                     rainfall_mm: 12.0,
                     humidity_pct: 65,
                     monsoon_sw_flag: 0,
                     monsoon_ne_flag: 1,
                     month: new Date().getMonth() + 1
                 };

                // 2. Call Python ML service to ascertain price dynamically
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 5000);
                
                const mlResponse = await fetch('http://127.0.0.1:8000/predict', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        spice: prod.spiceType,
                        qty_sold_kg: prod.availableQuantityKg,
                        region: prod.district,
                        ...environmentalData
                    }),
                    signal: controller.signal
                });
                clearTimeout(timeoutId);
                
                const mlData = await mlResponse.json();
                
                // If it's a real DB document it will have _doc
                const prodData = prod._doc ? prod._doc : prod;

                return {
                    ...prodData,
                    mlAscertainedPrice: mlData.predicted_price_LKR || (prodData.basePrice * prodData.availableQuantityKg)
                };
            } catch (err) {
                console.error("ML Pricing Error:", err);
                const prodData = prod._doc ? prod._doc : prod;
                return { ...prodData, mlAscertainedPrice: prodData.basePrice * prodData.availableQuantityKg };
            }
        }));

        res.json(enrichedProducts);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// POST list a new product (Farmer listing from stock)
router.post('/list', async (req, res) => {
    try {
        const { farmerId, spiceType, availableQuantityKg, basePrice, district } = req.body;
        
        // Here we would call the friend's stock management API to deduct or reserve the quantity
        // Example logic:
        // await fetch('http://friends-stock-api/reserve', { method: 'POST', body: ... })

        const newProduct = new Product({
            farmerId,
            spiceType,
            availableQuantityKg,
            basePrice,
            district,
            status: 'AVAILABLE'
        });

        const savedProduct = await newProduct.save();
        res.status(201).json(savedProduct);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

module.exports = router;
