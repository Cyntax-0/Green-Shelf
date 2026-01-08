import express from 'express';
import Cart from '../models/Cart.js';
import Product from '../models/Product.js';

const router = express.Router();

// Get user's cart
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

    let cart = await Cart.findOne({ user: decoded.userId })
      .populate('items.product', 'name price image images expiry category quantity quantityUnit originalPrice type discountType currentDiscount seller');

    if (!cart) {
      cart = new Cart({ user: decoded.userId, items: [] });
      await cart.save();
    }

    res.json({
      success: true,
      data: cart
    });
  } catch (error) {
    console.error('Get cart error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

// Add item to cart
router.post('/add', async (req, res) => {
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

    const { productId, quantity = 1 } = req.body;

    // Check if product exists and is active
    const product = await Product.findById(productId);
    if (!product || product.status !== 'Active') {
      return res.status(404).json({
        success: false,
        message: 'Product not found or not available'
      });
    }

    // Check if product is available in required quantity
    if (product.quantity < quantity) {
      return res.status(400).json({
        success: false,
        message: 'Insufficient quantity available'
      });
    }

    // Get or create cart
    let cart = await Cart.findOne({ user: decoded.userId });
    if (!cart) {
      cart = new Cart({ user: decoded.userId, items: [] });
    }

    // Add item to cart
    await cart.addItem(productId, quantity);

    // Populate the cart with product details
    await cart.populate('items.product', 'name price image images expiry category quantity quantityUnit originalPrice type discountType currentDiscount seller');

    res.json({
      success: true,
      message: 'Item added to cart successfully',
      data: cart
    });
  } catch (error) {
    console.error('Add to cart error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

// Update item quantity in cart
router.put('/update', async (req, res) => {
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

    const { productId, quantity } = req.body;

    let cart = await Cart.findOne({ user: decoded.userId });
    if (!cart) {
      return res.status(404).json({
        success: false,
        message: 'Cart not found'
      });
    }

    // Update quantity
    await cart.updateQuantity(productId, quantity);

    // Populate the cart with product details
    await cart.populate('items.product', 'name price image images expiry category quantity quantityUnit originalPrice type discountType currentDiscount seller');

    res.json({
      success: true,
      message: 'Cart updated successfully',
      data: cart
    });
  } catch (error) {
    console.error('Update cart error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

// Remove item from cart
router.delete('/remove', async (req, res) => {
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

    const { productId } = req.body;

    let cart = await Cart.findOne({ user: decoded.userId });
    if (!cart) {
      return res.status(404).json({
        success: false,
        message: 'Cart not found'
      });
    }

    // Remove item
    await cart.removeItem(productId);

    // Populate the cart with product details
    await cart.populate('items.product', 'name price image images expiry category quantity quantityUnit originalPrice type discountType currentDiscount seller');

    res.json({
      success: true,
      message: 'Item removed from cart successfully',
      data: cart
    });
  } catch (error) {
    console.error('Remove from cart error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

// Clear entire cart
router.delete('/clear', async (req, res) => {
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

    let cart = await Cart.findOne({ user: decoded.userId });
    if (!cart) {
      return res.status(404).json({
        success: false,
        message: 'Cart not found'
      });
    }

    // Clear cart
    await cart.clearCart();

    res.json({
      success: true,
      message: 'Cart cleared successfully',
      data: cart
    });
  } catch (error) {
    console.error('Clear cart error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

export default router;
