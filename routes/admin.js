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
    
    // Admin credentials check (password kept only in code, not DB)
    const ADMIN_EMAIL = 'admin@mail.com';
    const ADMIN_PASSWORD = '123456';

    if (email === ADMIN_EMAIL && password === ADMIN_PASSWORD) {
      // Create or get admin user
      let adminUser = await User.findOne({ email: ADMIN_EMAIL, role: 'admin' });
      if (!adminUser) {
        // Store a random password in DB so the real admin password is never persisted
        const randomPassword = Math.random().toString(36).slice(2) + Date.now().toString(36);
        adminUser = new User({
          username: 'admin',
          email: ADMIN_EMAIL,
          password: randomPassword,
          role: 'admin'
        });
        await adminUser.save();
      }
      
      const jwtExpires = (process.env.JWT_EXPIRES_IN || '15d').trim() || '15d';
      const token = jwt.sign(
        { userId: adminUser._id, role: 'admin' },
        process.env.JWT_SECRET || 'fallback-jwt-secret-key-for-development',
        { expiresIn: jwtExpires }
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
    
    // Get NGOs that are not verified
    // Exclude NGOs that have been rejected unless they've resubmitted (verificationSubmittedAt exists and is after rejection)
    const allNgos = await User.find({ 
      role: 'ngo', 
      'profile.verified': { $ne: true }
    })
      .select('username email profile createdAt');
    
    // Filter out rejected NGOs that haven't resubmitted
    const ngos = allNgos.filter(ngo => {
      if (!ngo.profile || !ngo.profile.rejectionReason) {
        return true; // Never rejected, include
      }
      
      // If rejected, check if they've resubmitted
      if (ngo.profile.verificationSubmittedAt) {
        // Find last rejection timestamp
        const adminHistory = ngo.profile.adminHistory || [];
        const lastRejection = adminHistory
          .filter(h => h.action === 'rejected')
          .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))[0];
        
        if (lastRejection) {
          // Include if resubmitted after rejection
          return new Date(ngo.profile.verificationSubmittedAt) > new Date(lastRejection.timestamp);
        }
      }
      
      // Rejected but not resubmitted, exclude
      return false;
    });
    
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
    
    // Mark as verified in profile
    if (!ngo.profile) ngo.profile = {};
    ngo.profile.verified = true;
    ngo.profile.verifiedAt = new Date();
    ngo.profile.rejectionReason = null; // Clear rejection reason on approval
    
    // Track admin history
    if (!Array.isArray(ngo.profile.adminHistory)) ngo.profile.adminHistory = [];
    ngo.profile.adminHistory.push({
      action: 'approved',
      adminId: admin._id,
      adminEmail: admin.email,
      timestamp: new Date()
    });
    
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
    
    const rejectionReason = req.body.reason || 'Rejected by admin';
    
    if (!ngo.profile) ngo.profile = {};
    ngo.profile.verified = false;
    ngo.profile.rejectionReason = rejectionReason;
    
    // Track admin history
    if (!Array.isArray(ngo.profile.adminHistory)) ngo.profile.adminHistory = [];
    ngo.profile.adminHistory.push({
      action: 'rejected',
      adminId: admin._id,
      adminEmail: admin.email,
      reason: rejectionReason,
      timestamp: new Date()
    });
    
    // Push rejection notification
    const note = {
      id: `reject-${Date.now()}`,
      message: `Your NGO verification was rejected. Reason: ${rejectionReason}`,
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

