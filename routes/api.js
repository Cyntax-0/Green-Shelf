import express from 'express';
import authRoutes from './auth.js';
import productRoutes from './products.js';
import cartRoutes from './cart.js';
import orderRoutes from './orders.js';
import adminRoutes from './admin.js';
import User from '../models/User.js';

const router = express.Router();

// Health check endpoint
router.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'GreenShelf API is running',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// Test endpoint
router.get('/test', (req, res) => {
  res.json({
    success: true,
    message: 'API test successful',
    timestamp: new Date().toISOString()
  });
});

// Get verified NGOs (public endpoint - accessible to customers and sellers for donations)
router.get('/ngos/verified', async (req, res) => {
  try {
    const ngos = await User.find({ 
      role: 'ngo', 
      'profile.verified': true,
      'location.latitude': { $exists: true, $ne: null },
      'location.longitude': { $exists: true, $ne: null }
    })
      .select('username email profile.firstName profile.lastName profile.phone profile.address location createdAt')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      data: ngos.map(ngo => ({
        _id: ngo._id,
        name: ngo.profile?.firstName || ngo.username || ngo.email,
        email: ngo.email,
        phone: ngo.profile?.phone || '',
        address: ngo.profile?.address || {},
        location: ngo.location || {},
        createdAt: ngo.createdAt
      }))
    });
  } catch (error) {
    console.error('Get verified NGOs error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

// Route handlers
router.use('/auth', authRoutes);
router.use('/products', productRoutes);
router.use('/cart', cartRoutes);
router.use('/orders', orderRoutes);
router.use('/admin', adminRoutes);

export default router;
