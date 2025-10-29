import express from 'express';
import authRoutes from './auth.js';
import productRoutes from './products.js';
import cartRoutes from './cart.js';
import orderRoutes from './orders.js';

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

// Route handlers
router.use('/auth', authRoutes);
router.use('/products', productRoutes);
router.use('/cart', cartRoutes);
router.use('/orders', orderRoutes);

export default router;
