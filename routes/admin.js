import express from 'express';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';

const router = express.Router();

// Admin health
router.get('/health', (req, res) => {
  res.json({ success: true, message: 'Admin API is up' });
});

// Admin login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    // Admin credentials check
    if (email === 'admin@mail.com' && password === '123456') {
      // Create or get admin user
      let adminUser = await User.findOne({ email: 'admin@mail.com', role: 'admin' });
      if (!adminUser) {
        adminUser = new User({
          username: 'admin',
          email: 'admin@mail.com',
          password: '123456',
          role: 'admin'
        });
        await adminUser.save();
      } else {
        // Verify password matches
        const isPasswordValid = await adminUser.comparePassword(password);
        if (!isPasswordValid) {
          return res.status(401).json({
            success: false,
            message: 'Invalid admin credentials'
          });
        }
      }
      
      const token = jwt.sign(
        { userId: adminUser._id, role: 'admin' },
        process.env.JWT_SECRET || 'fallback-jwt-secret-key-for-development',
        { expiresIn: '24h' }
      );
      
      return res.json({
        success: true,
        message: 'Admin login successful',
        data: {
          user: adminUser.toJSON(),
          token
        }
      });
    }
    
    return res.status(401).json({
      success: false,
      message: 'Invalid admin credentials'
    });
  } catch (error) {
    console.error('Admin login error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

// Get all NGOs pending verification
router.get('/ngos/pending', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({ success: false, message: 'No token provided' });
    }
    
    const jwtSecret = process.env.JWT_SECRET || 'fallback-jwt-secret-key-for-development';
    const decoded = jwt.verify(token, jwtSecret);
    const user = await User.findById(decoded.userId);
    
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Admin access required' });
    }
    
    const ngos = await User.find({ role: 'ngo', 'profile.verified': { $ne: true } })
      .select('username email profile createdAt');
    
    res.json({
      success: true,
      data: ngos
    });
  } catch (error) {
    console.error('Get pending NGOs error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

// Get all verified NGOs
router.get('/ngos/verified', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({ success: false, message: 'No token provided' });
    }

    const jwtSecret = process.env.JWT_SECRET || 'fallback-jwt-secret-key-for-development';
    const decoded = jwt.verify(token, jwtSecret);
    const user = await User.findById(decoded.userId);

    if (!user || user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Admin access required' });
    }

    const ngos = await User.find({ role: 'ngo', 'profile.verified': true })
      .select('username email profile createdAt');

    res.json({
      success: true,
      data: ngos
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

// Approve NGO
router.put('/ngos/:id/approve', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({ success: false, message: 'No token provided' });
    }
    
    const jwtSecret = process.env.JWT_SECRET || 'fallback-jwt-secret-key-for-development';
    const decoded = jwt.verify(token, jwtSecret);
    const admin = await User.findById(decoded.userId);
    
    if (!admin || admin.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Admin access required' });
    }
    
    const ngo = await User.findById(req.params.id);
    if (!ngo || ngo.role !== 'ngo') {
      return res.status(404).json({ success: false, message: 'NGO not found' });
    }
    
    // Mark as verified in profile (you can add a verified field)
    if (!ngo.profile) ngo.profile = {};
    ngo.profile.verified = true;
    ngo.profile.verifiedAt = new Date();
    // Push verification notification
    const note = {
      id: `verify-${Date.now()}`,
      message: 'Your NGO has been verified. You can now purchase products.',
      type: 'verification',
      read: false,
      createdAt: new Date()
    };
    if (!Array.isArray(ngo.notifications)) ngo.notifications = [];
    ngo.notifications.push(note);
    await ngo.save();
    
    res.json({
      success: true,
      message: 'NGO approved successfully',
      data: ngo.toJSON()
    });
  } catch (error) {
    console.error('Approve NGO error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

// Reject NGO
router.put('/ngos/:id/reject', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({ success: false, message: 'No token provided' });
    }
    
    const jwtSecret = process.env.JWT_SECRET || 'fallback-jwt-secret-key-for-development';
    const decoded = jwt.verify(token, jwtSecret);
    const admin = await User.findById(decoded.userId);
    
    if (!admin || admin.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Admin access required' });
    }
    
    const ngo = await User.findById(req.params.id);
    if (!ngo || ngo.role !== 'ngo') {
      return res.status(404).json({ success: false, message: 'NGO not found' });
    }
    
    if (!ngo.profile) ngo.profile = {};
    ngo.profile.verified = false;
    ngo.profile.rejectionReason = req.body.reason || 'Rejected by admin';
    // Push rejection notification
    const note = {
      id: `reject-${Date.now()}`,
      message: `Your NGO verification was rejected. Reason: ${req.body.reason || 'Rejected by admin'}`,
      type: 'verification',
      read: false,
      createdAt: new Date()
    };
    if (!Array.isArray(ngo.notifications)) ngo.notifications = [];
    ngo.notifications.push(note);
    await ngo.save();
    
    res.json({
      success: true,
      message: 'NGO rejected',
      data: ngo.toJSON()
    });
  } catch (error) {
    console.error('Reject NGO error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

export default router;

