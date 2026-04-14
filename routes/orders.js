import express from 'express';
import jwt from 'jsonwebtoken';
import Order from '../models/Order.js';
import Cart from '../models/Cart.js';
import Product from '../models/Product.js';
import User from '../models/User.js';
import { validateOrderCartForRole, canRoleShop } from '../utils/marketplaceRules.js';
import { productSellerKey, CART_SINGLE_VENDOR_MESSAGE } from '../utils/cartVendor.js';

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

    const jwtSecret = process.env.JWT_SECRET || 'fallback-jwt-secret-key-for-development';
    const decoded = jwt.verify(token, jwtSecret);

    const user = await User.findById(decoded.userId);
    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid user' });
    }
    if (!user.isProfileComplete()) {
      return res.status(400).json({
        success: false,
        message: 'Please complete your profile (name/organization, phone, address) before placing an order'
      });
    }

    const { shippingAddress, billingAddress, paymentMethod, shippingMethod, selectedAddress, orderNotes } = req.body;
    const profileAddress = user.profile?.address || {};
    const fallbackShippingAddress = {
      firstName: user.profile?.firstName || user.profile?.organizationName || user.username || 'User',
      lastName: user.profile?.lastName || '-',
      street: profileAddress.street || selectedAddress || '',
      city: profileAddress.city || '',
      state: profileAddress.state || '',
      zipCode: profileAddress.zipCode || '',
      country: profileAddress.country || '',
      phone: user.profile?.phone || ''
    };
    const resolvedShippingAddress = shippingAddress || fallbackShippingAddress;
    const resolvedBillingAddress = billingAddress || resolvedShippingAddress;
    const paymentMethodMap = {
      cash: 'cash_on_delivery',
      upi: 'upi_on_delivery'
    };
    const resolvedPaymentMethod = paymentMethodMap[paymentMethod] || paymentMethod || 'cash_on_delivery';
    if (!['cash_on_delivery', 'upi_on_delivery'].includes(resolvedPaymentMethod)) {
      return res.status(400).json({
        success: false,
        message: 'Payment method must be cash on delivery or UPI on delivery'
      });
    }
    const resolvedShippingMethod = shippingMethod || 'standard';

    // Get user's cart
    const cart = await Cart.findOne({ user: decoded.userId })
      .populate('items.product');

    if (!cart || cart.items.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Cart is empty'
      });
    }

    const orderRules = validateOrderCartForRole(user.role, cart.items, user.profile || {});
    if (!orderRules.ok) {
      return res.status(403).json({
        success: false,
        message: orderRules.message
      });
    }

    const vendorKeys = cart.items
      .map((i) => productSellerKey(i.product))
      .filter(Boolean);
    if (new Set(vendorKeys).size > 1) {
      return res.status(400).json({
        success: false,
        message: CART_SINGLE_VENDOR_MESSAGE
      });
    }

    // Validate all products are still available
    for (const item of cart.items) {
      if (!item.product || item.product.status !== 'Active' || item.product.quantity < item.quantity) {
        const productName = item.product?.name || 'This product';
        return res.status(400).json({
          success: false,
          message: `Product "${productName}" is no longer available in the required quantity`
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
        seller: item.product.seller,
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
      shippingAddress: resolvedShippingAddress,
      billingAddress: resolvedBillingAddress,
      subtotal,
      shippingCost,
      tax,
      totalAmount,
      paymentMethod: resolvedPaymentMethod,
      shippingMethod: resolvedShippingMethod,
      notes: orderNotes || ''
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

    // Notify sellers that an order has been placed
    const sellerIds = [...new Set(cart.items.map((item) => String(item.product?.seller || '')).filter(Boolean))];
    if (sellerIds.length > 0) {
      const buyerName = user.profile?.firstName || user.profile?.organizationName || user.username || user.email;
      await Promise.all(
        sellerIds.map((sellerId) =>
          User.findByIdAndUpdate(sellerId, {
            $push: {
              notifications: {
                id: `order-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
                message: `${buyerName} placed an order (Order #${order.orderNumber}).`,
                type: 'order',
                read: false,
                createdAt: new Date()
              }
            }
          })
        )
      );
    }

    const sellerSummaries = await User.find({ _id: { $in: [...new Set(orderItems.map((i) => i.seller))] } })
      .select('_id username profile.firstName profile.organizationName profile.shopRating');

    res.status(201).json({
      success: true,
      message: 'Order created successfully',
      data: {
        order,
        sellerSummaries: sellerSummaries.map((seller) => ({
          sellerId: seller._id,
          sellerName: seller.profile?.organizationName || seller.profile?.firstName || seller.username || 'Shop',
          rating: seller.profile?.shopRating || { average: 0, count: 0 }
        }))
      }
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

    const jwtSecret = process.env.JWT_SECRET || 'fallback-jwt-secret-key-for-development';
    const decoded = jwt.verify(token, jwtSecret);

    const viewer = await User.findById(decoded.userId).select('role');
    if (!viewer || !canRoleShop(viewer.role)) {
      return res.status(403).json({
        success: false,
        message: 'This account cannot access order history'
      });
    }

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

    const jwtSecret = process.env.JWT_SECRET || 'fallback-jwt-secret-key-for-development';
    const decoded = jwt.verify(token, jwtSecret);

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

    const jwtSecret = process.env.JWT_SECRET || 'fallback-jwt-secret-key-for-development';
    const decoded = jwt.verify(token, jwtSecret);

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

    const jwtSecret = process.env.JWT_SECRET || 'fallback-jwt-secret-key-for-development';
    const decoded = jwt.verify(token, jwtSecret);

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

// Rate seller/shop after successful purchase
router.post('/:id/rate-shop', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({ success: false, message: 'No token provided' });
    }

    const jwtSecret = process.env.JWT_SECRET || 'fallback-jwt-secret-key-for-development';
    const decoded = jwt.verify(token, jwtSecret);
    const { sellerId, rating, comment } = req.body;
    const normalizedRating = Number(rating);

    if (!sellerId || !Number.isFinite(normalizedRating) || normalizedRating < 1 || normalizedRating > 5) {
      return res.status(400).json({ success: false, message: 'Seller and valid rating (1-5) are required' });
    }

    const buyer = await User.findById(decoded.userId);
    if (!buyer) {
      return res.status(401).json({ success: false, message: 'Invalid user' });
    }
    if (!canRoleShop(buyer.role)) {
      return res.status(403).json({ success: false, message: 'This account cannot rate shops' });
    }

    const order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }
    if (String(order.customer) !== String(decoded.userId)) {
      return res.status(403).json({ success: false, message: 'Not authorized to rate this order' });
    }
    if (order.status === 'cancelled') {
      return res.status(400).json({ success: false, message: 'Cancelled orders cannot be rated' });
    }

    const sellerInOrder = order.items.some((item) => String(item.seller) === String(sellerId));
    if (!sellerInOrder) {
      return res.status(400).json({ success: false, message: 'Seller is not part of this order' });
    }

    const existing = (order.sellerRatings || []).find((r) => String(r.seller) === String(sellerId));
    if (existing) {
      return res.status(400).json({ success: false, message: 'You already rated this shop for this order' });
    }

    const br = String(buyer.role || 'customer').toLowerCase();
    const ratedByRole =
      br === 'ngo' ? 'ngo' : br === 'seller' ? 'seller' : br === 'admin' ? 'admin' : 'customer';

    order.sellerRatings.push({
      seller: sellerId,
      rating: normalizedRating,
      comment: comment || '',
      ratedByRole
    });
    await order.save();

    const seller = await User.findById(sellerId);
    if (!seller) {
      return res.status(404).json({ success: false, message: 'Seller not found' });
    }

    const currentEntries = seller.profile?.shopRatingEntries || [];
    const updatedEntries = [
      ...currentEntries,
      {
        orderId: order._id,
        ratedBy: buyer._id,
        ratedByRole,
        rating: normalizedRating,
        comment: comment || '',
        createdAt: new Date()
      }
    ];
    const avg = updatedEntries.reduce((sum, entry) => sum + Number(entry.rating || 0), 0) / updatedEntries.length;

    seller.profile = seller.profile || {};
    seller.profile.shopRatingEntries = updatedEntries;
    seller.profile.shopRating = {
      average: Number(avg.toFixed(2)),
      count: updatedEntries.length
    };
    await seller.save();

    res.json({
      success: true,
      message: 'Shop rated successfully',
      data: {
        sellerId: seller._id,
        shopRating: seller.profile.shopRating
      }
    });
  } catch (error) {
    console.error('Rate shop error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

export default router;
