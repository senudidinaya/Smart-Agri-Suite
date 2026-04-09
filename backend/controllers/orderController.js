const Order = require('../models/Order');
const Product = require('../models/Product');

// @desc    Get all orders
// @route   GET /api/orders
exports.getOrders = async (req, res) => {
    try {
        const orders = await Order.find().sort({ createdAt: -1 });
        res.status(200).json(orders);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Create new order
// @route   POST /api/orders
exports.createOrder = async (req, res) => {
    try {
        const { spice, quantity, productId } = req.body;
        
        // 1. Save the order
        const order = new Order(req.body);
        const createdOrder = await order.save();

        // 2. Initialize Transport Log (Logistics Flow)
        const TransportLog = require('../models/TransportLog');
        
        // Basic optimization logic: Choose vehicle based on weight
        let recommendedMode = 'Van';
        if (quantity < 10) recommendedMode = 'Bike';
        else if (quantity > 500) recommendedMode = 'Lorry';

        const initialLog = new TransportLog({
            orderId: createdOrder._id,
            status: 'ORDER_PLACED',
            location: 'Farmer Warehouse',
            details: `Order received. Optimized for ${recommendedMode} based on load.`,
            driverName: 'Auto-Optimized',
            vehicleNo: 'TBD'
        });
        await initialLog.save();

        // Update order with recommended mode
        createdOrder.logisticsMode = recommendedMode;
        await createdOrder.save();

        // 3. Decrement product stock if productId is provided
        if (productId) {
            const product = await Product.findById(productId);
            if (product) {
                product.availableQuantityKg -= quantity;
                if (product.availableQuantityKg <= 0) {
                    product.availableQuantityKg = 0;
                    product.status = 'SOLD_OUT';
                }
                await product.save();
            }
        }

        res.status(201).json(createdOrder);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

// @desc    Update order status
// @route   PUT /api/orders/:id
exports.updateOrderStatus = async (req, res) => {
    try {
        const order = await Order.findById(req.params.id);
        if (order) {
            order.status = req.body.status || order.status;
            const updatedOrder = await order.save();
            res.status(200).json(updatedOrder);
        } else {
            res.status(404).json({ message: 'Order not found' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
}
