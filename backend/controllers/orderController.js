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

        // 2. Smart Transport Pooling Algorithm
        let recommendedMode = 'Van';
        let isPooled = false;
        let poolMessage = '';
        
        // Find if there are other PENDING orders (simulate same region logic)
        const pendingOrders = await Order.find({ status: 'PENDING' });
        
        if (pendingOrders.length > 0) {
            const totalGroupWeight = quantity + pendingOrders.reduce((sum, o) => sum + o.quantity, 0);
            if (totalGroupWeight > 100) {
                recommendedMode = 'Shared Lorry (Pooled)';
                isPooled = true;
                poolMessage = `Pooled with ${pendingOrders.length} order(s). Shared freight selected.`;
                
                // Update previous orders to pooled (simplified for demo)
                await Order.updateMany(
                    { status: 'PENDING' },
                    { $set: { isPooled: true, logisticsMode: 'Shared Lorry (Pooled)' } }
                );
            }
        }
        
        if (!isPooled) {
            if (quantity < 10) recommendedMode = 'Bike';
            else if (quantity > 500) recommendedMode = 'Lorry';
        }

        const TransportLog = require('../models/TransportLog');

        const initialLog = new TransportLog({
            orderId: createdOrder._id,
            status: 'ORDER_PLACED',
            location: 'Farmer Warehouse (Hub)',
            details: isPooled ? poolMessage : `Order received. Optimized for ${recommendedMode} based on load.`,
            driverName: 'Auto-Optimized',
            vehicleNo: 'TBD'
        });
        await initialLog.save();

        // Update order with recommended mode and pool flag
        createdOrder.logisticsMode = recommendedMode;
        createdOrder.isPooled = isPooled;
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
