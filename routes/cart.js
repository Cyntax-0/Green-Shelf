import express from 'express';
import jwt from 'jsonwebtoken';
import Cart from '../models/Cart.js';
import Product from '../models/Product.js';
import User from '../models/User.js';
import {
  canRoleShop,
  canRoleAddToCart,
  normalizeRole
} from '../utils/marketplaceRules.js';
import { productSellerKey, CART_SINGLE_VENDOR_MESSAGE } from '../utils/cartVendor.js';

const router = express.Router();
const jwtSecret = process.env.JWT_SECRET || 'fallback-jwt-secret-key-for-development';

const isProductExpired = (expiry) => {
  if (!expiry) return false;
  const expiryDate = new Date(`${expiry}T23:59:59.999Z`);
  if (Number.isNaN(expiryDate.getTime())) return false;
  return expiryDate <= new Date();
};

async function requireShoppingUser(req, res) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) {
    res.status(401).json({
      success: false,
      message: 'No token provided'
    });
    return null;
  }
  let decoded;
  try {
    decoded = jwt.verify(token, jwtSecret);
  } catch {
    res.status(401).json({
      success: false,
      message: 'Invalid token'
    });
    return null;
  }
  if (!decoded?.userId) {
    res.status(401).json({
      success: false,
      message: 'Invalid token'
    });
    return null;
  }
  const user = await User.findById(decoded.userId).select('role profile.verified');
  if (!user) {
    res.status(401).json({
      success: false,
      message: 'Invalid user'
    });
    return null;
  }
  if (!canRoleShop(user.role)) {
    res.status(403).json({
      success: false,
      message: 'This account cannot use the shopping cart'
    });
    return null;
  }
  return { user, decoded };
}

async function stripDisallowedCartItems(cart, role) {
  const r = normalizeRole(role);
  if (!r) return;
  if (r !== 'customer' && r !== 'seller') return;
  const existing = cart.items || [];
  const allowed = existing.filter(
    (item) =>
      item.product && String(item.product.type || 'sell').toLowerCase() === 'sell'
  );
  if (allowed.length !== existing.length) {
    cart.items = allowed;
    await cart.save();
  }
}

// Get user's cart
router.get('/', async (req, res) => {
  try {
    const auth = await requireShoppingUser(req, res);
    if (!auth) return;

    let cart = await Cart.findOne({ user: auth.decoded.userId })
      .populate('items.product', 'name price image images expiry category quantity quantityUnit originalPrice type discountType currentDiscount seller');

    if (!cart) {
      cart = new Cart({ user: auth.decoded.userId, items: [] });
      await cart.save();
    }

    const existingItems = cart.items || [];
    const validItems = existingItems.filter((item) => item.product && !isProductExpired(item.product.expiry));
    if (validItems.length !== existingItems.length) {
      cart.items = validItems;
      await cart.save();
      await cart.populate('items.product', 'name price image images expiry category quantity quantityUnit originalPrice type discountType currentDiscount seller');
    }

    await stripDisallowedCartItems(cart, auth.user.role);
    await cart.populate('items.product', 'name price image images expiry category quantity quantityUnit originalPrice type discountType currentDiscount seller');

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
    const auth = await requireShoppingUser(req, res);
    if (!auth) return;

    const { productId, quantity = 1 } = req.body;

    const product = await Product.findById(productId);
    if (!product || product.status !== 'Active') {
      return res.status(404).json({
        success: false,
        message: 'Product not found or not available'
      });
    }

    if (isProductExpired(product.expiry)) {
      await Product.findByIdAndDelete(productId);
      return res.status(400).json({
        success: false,
        message: 'This product has expired and was removed'
      });
    }

    if (!canRoleAddToCart(auth.user.role, product.type, auth.user.profile || {})) {
      const isDonate = String(product.type || '').toLowerCase() === 'donate';
      return res.status(403).json({
        success: false,
        message: isDonate
          ? 'Only verified NGO accounts can add donation items to the cart'
          : 'This account cannot add this item to the cart'
      });
    }

    if (product.seller && product.seller.toString() === auth.decoded.userId) {
      return res.status(403).json({
        success: false,
        message: 'You cannot add your own product to the cart'
      });
    }

    let cart = await Cart.findOne({ user: auth.decoded.userId });
    if (!cart) {
      cart = new Cart({ user: auth.decoded.userId, items: [] });
    } else if (cart.items.length > 0) {
      await cart.populate('items.product', 'seller');
      const existingKey = productSellerKey(cart.items[0]?.product);
      const newKey = productSellerKey(product);
      if (existingKey && newKey && existingKey !== newKey) {
        return res.status(400).json({
          success: false,
          message: CART_SINGLE_VENDOR_MESSAGE
        });
      }
    }

    if (product.quantity < quantity) {
      return res.status(400).json({
        success: false,
        message: 'Insufficient quantity available'
      });
    }

    await cart.addItem(productId, quantity);

    await cart.populate('items.product', 'name price image images expiry category quantity quantityUnit originalPrice type discountType currentDiscount seller');

    res.json({
      success: true,
      message: 'Item added to cart successfully',
      data: cart
    });
  } catch (error) {
    console.error('Add to cart error:', error?.message, error?.stack);
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
    const auth = await requireShoppingUser(req, res);
    if (!auth) return;

    const { productId, quantity } = req.body;

    let cart = await Cart.findOne({ user: auth.decoded.userId });
    if (!cart) {
      return res.status(404).json({
        success: false,
        message: 'Cart not found'
      });
    }

    const product = await Product.findById(productId).select('type seller status');
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }
    if (!canRoleAddToCart(auth.user.role, product.type, auth.user.profile || {})) {
      return res.status(403).json({
        success: false,
        message: 'You cannot keep this item in your cart'
      });
    }

    await cart.updateQuantity(productId, quantity);

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
    const auth = await requireShoppingUser(req, res);
    if (!auth) return;

    const { productId } = req.body;

    let cart = await Cart.findOne({ user: auth.decoded.userId });
    if (!cart) {
      return res.status(404).json({
        success: false,
        message: 'Cart not found'
      });
    }

    await cart.removeItem(productId);

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
    const auth = await requireShoppingUser(req, res);
    if (!auth) return;

    let cart = await Cart.findOne({ user: auth.decoded.userId });
    if (!cart) {
      return res.status(404).json({
        success: false,
        message: 'Cart not found'
      });
    }

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
