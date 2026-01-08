import express from 'express';
import Order from '../models/Order.js';
import Cart from '../models/Cart.js';
import Product from '../models/Product.js';

const router = express.Router();

// Create order from cart
router.post('/create', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'No token provided'
      });
    }

    const jwt = await import('jsonwebtoken');
    const decoded = jwt.default.verify(token, process.env.JWT_SECRET);

    // Ensure customer has completed profile
    const { default: User } = await import('../models/User.js');
    const user = await User.findById(decoded.userId);
    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid user' });
    }
    if (user.role !== 'customer') {
      return res.status(403).json({ success: false, message: 'Only customers can place orders' });
    }
    if (!user.isProfileComplete()) {
      return res.status(403).json({ success: false, message: 'Complete your profile to place orders' });
    }

    const { shippingAddress, billingAddress, paymentMethod, shippingMethod } = req.body;

    // Get user's cart
    const cart = await Cart.findOne({ user: decoded.userId })
      .populate('items.product');

    if (!cart || cart.items.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Cart is empty'
      });
    }

    // Validate all products are still available
    for (const item of cart.items) {
      if (item.product.status !== 'active' || item.product.quantity < item.quantity) {
        return res.status(400).json({
          success: false,
          message: `Product "${item.product.name}" is no longer available in the required quantity`
        });
      }
    }

    // Calculate totals using current discounted prices
    let subtotal = 0;
    const orderItems = cart.items.map(item => {
      // Use the current price from the product (which includes discounts)
      const currentPrice = item.product.price;
      const itemTotal = currentPrice * item.quantity;
      subtotal += itemTotal;
      
      return {
        product: item.product._id,
        quantity: item.quantity,
        price: currentPrice,
        originalPrice: item.product.originalPrice,
        totalPrice: itemTotal
      };
    });

    const shippingCost = 0; // You can implement shipping calculation logic here
    const tax = subtotal * 0.1; // 10% tax - you can make this configurable
    const totalAmount = subtotal + shippingCost + tax;

    // Create order
    const order = new Order({
      customer: decoded.userId,
      items: orderItems,
      shippingAddress,
      billingAddress: billingAddress || shippingAddress,
      subtotal,
      shippingCost,
      tax,
      totalAmount,
      paymentMethod,
      shippingMethod
    });

    await order.save();

    // Update product quantities
    for (const item of cart.items) {
      await Product.findByIdAndUpdate(
        item.product._id,
        { $inc: { quantity: -item.quantity } }
      );
    }

    // Clear cart
    await cart.clearCart();

    res.status(201).json({
      success: true,
      message: 'Order created successfully',
      data: order
    });
  } catch (error) {
    console.error('Create order error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

// Get user's orders
router.get('/', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'No token provided'
      });
    }

    const jwt = await import('jsonwebtoken');
    const decoded = jwt.default.verify(token, process.env.JWT_SECRET);

    const { page = 1, limit = 10, status } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const filter = { customer: decoded.userId };
    if (status) filter.status = status;

    const orders = await Order.find(filter)
      .populate('items.product', 'name images')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Order.countDocuments(filter);

    res.json({
      success: true,
      data: {
        orders,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(total / parseInt(limit)),
          totalOrders: total
        }
      }
    });
  } catch (error) {
    console.error('Get orders error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

// Get single order
router.get('/:id', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'No token provided'
      });
    }

    const jwt = await import('jsonwebtoken');
    const decoded = jwt.default.verify(token, process.env.JWT_SECRET);

    const order = await Order.findById(req.params.id)
      .populate('items.product', 'name images')
      .populate('customer', 'username email profile.firstName profile.lastName');

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    // Check if user is authorized to view this order
    if (order.customer._id.toString() !== decoded.userId) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view this order'
      });
    }

    res.json({
      success: true,
      data: order
    });
  } catch (error) {
    console.error('Get order error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

// Update order status (for sellers/admin)
router.put('/:id/status', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'No token provided'
      });
    }

    const jwt = await import('jsonwebtoken');
    const decoded = jwt.default.verify(token, process.env.JWT_SECRET);

    const { status, trackingNumber, notes } = req.body;

    const order = await Order.findById(req.params.id);
    
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    // Update order
    order.status = status;
    if (trackingNumber) order.trackingNumber = trackingNumber;
    if (notes) order.sellerNotes = notes;

    if (status === 'delivered') {
      order.actualDelivery = new Date();
    }

    await order.save();

    res.json({
      success: true,
      message: 'Order status updated successfully',
      data: order
    });
  } catch (error) {
    console.error('Update order status error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

// Cancel order
router.put('/:id/cancel', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'No token provided'
      });
    }

    const jwt = await import('jsonwebtoken');
    const decoded = jwt.default.verify(token, process.env.JWT_SECRET);

    const order = await Order.findById(req.params.id);
    
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    // Check if user is authorized to cancel this order
    if (order.customer.toString() !== decoded.userId) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to cancel this order'
      });
    }

    // Check if order can be cancelled
    if (['shipped', 'delivered', 'cancelled'].includes(order.status)) {
      return res.status(400).json({
        success: false,
        message: 'Order cannot be cancelled at this stage'
      });
    }

    // Update order status
    order.status = 'cancelled';
    await order.save();

    // Restore product quantities
    for (const item of order.items) {
      await Product.findByIdAndUpdate(
        item.product,
        { $inc: { quantity: item.quantity } }
      );
    }

    res.json({
      success: true,
      message: 'Order cancelled successfully',
      data: order
    });
  } catch (error) {
    console.error('Cancel order error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

export default router;
