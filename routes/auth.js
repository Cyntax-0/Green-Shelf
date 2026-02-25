import express from 'express';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';

const router = express.Router();

// Helper to build JWT options safely
function getJwtOptions() {
  const raw = (process.env.JWT_EXPIRES_IN || '').trim();
  const defaultExpires = '24h';

  // Accept numbers (seconds) or strings like 15m, 24h, 7d
  const isNumeric = raw !== '' && !Number.isNaN(Number(raw));
  const isDuration = /^\d+(s|m|h|d)$/.test(raw);

  const expiresIn = isNumeric ? Number(raw) : (isDuration ? raw : defaultExpires);
  return { expiresIn };
}

// Register
router.post('/register', async (req, res) => {
  try {
    const { username, email, password, role = 'customer' } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({
      $or: [{ email }, { username }]
    });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'User with this email or username already exists'
      });
    }

    // Create new user
    const user = new User({
      username,
      email,
      password,
      role
    });

    await user.save();

    // Generate JWT token
    const token = jwt.sign(
      { userId: user._id, role: user.role },
      process.env.JWT_SECRET || 'fallback-jwt-secret-key-for-development',
      getJwtOptions()
    );

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      data: {
        user: user.toJSON(),
        token
      }
    });
  } catch (error) {
    console.error('Registration error:', error);

    // Handle validation errors (e.g. username too short) with a clear 4xx response
    if (error.name === 'ValidationError') {
      const usernameErr = error.errors && error.errors.username;
      let message = 'Invalid registration data';

      if (usernameErr && usernameErr.kind === 'minlength') {
        message = 'Username must be at least 3 characters long.';
      } else if (error.errors) {
        const firstError = Object.values(error.errors)[0];
        if (firstError && typeof firstError.message === 'string') {
          message = firstError.message;
        }
      }

      return res.status(400).json({
        success: false,
        message
      });
    }

    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find user by email
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Check if user is active
    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Account is deactivated'
      });
    }

    // Verify password
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    // Generate JWT token
    const token = jwt.sign(
      { userId: user._id, role: user.role },
      process.env.JWT_SECRET || 'fallback-jwt-secret-key-for-development',
      getJwtOptions()
    );

    res.json({
      success: true,
      message: 'Login successful',
      data: {
        user: user.toJSON(),
        token
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

// Get current user profile
router.get('/profile', async (req, res) => {
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
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      data: user.toJSON()
    });
  } catch (error) {
    console.error('Profile error:', error);
    res.status(401).json({
      success: false,
      message: 'Invalid token'
    });
  }
});

// Update user profile
router.put('/profile', async (req, res) => {
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
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Update allowed fields with normalization
    const allowedUpdates = ['profile', 'username'];
    const updates = { ...req.body };

    // Normalize profile shape if provided
    if (updates.profile) {
      const incomingProfile = { ...updates.profile };
      // Prevent clients from spoofing verification fields; only admin can set these
      delete incomingProfile.verified;
      delete incomingProfile.verifiedAt;
      delete incomingProfile.rejectionReason;
      // If address was sent as a plain string, coerce to object { street }
      if (typeof incomingProfile.address === 'string') {
        incomingProfile.address = { street: incomingProfile.address };
      }
      // If address is missing but any flat address-like fields exist, build the object
      if (
        incomingProfile.address && typeof incomingProfile.address === 'object'
      ) {
        // ensure only expected keys are present
        const a = incomingProfile.address;
        incomingProfile.address = {
          street: a.street || a.line1 || a.addressLine1 || '',
          city: a.city || a.town || '',
          state: a.state || a.region || '',
          zipCode: a.zipCode || a.postalCode || a.zip || '',
          country: a.country || ''
        };
      }
      // Deep-merge profile to avoid wiping unrelated fields
      const currentProfile = (user.profile && user.profile.toObject) ? user.profile.toObject() : (user.profile || {});
      const mergedAddress = incomingProfile.address
        ? { ...(currentProfile.address || {}), ...incomingProfile.address }
        : currentProfile.address;
      const mergedProfile = { ...currentProfile, ...incomingProfile };
      if (incomingProfile.address) mergedProfile.address = mergedAddress;
      updates.profile = mergedProfile;
    }

    allowedUpdates.forEach(field => {
      if (updates[field] !== undefined) {
        user[field] = updates[field];
      }
    });

    await user.save();

    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: user.toJSON()
    });
  } catch (error) {
    console.error('Profile update error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

// Update user location
router.put('/location', async (req, res) => {
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
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Prevent sellers and NGOs from changing their location once set
    const isSellerOrNGO = user.role === 'seller' || user.role === 'ngo';
    const hasExistingLocation = user.location?.latitude && user.location?.longitude;
    
    if (isSellerOrNGO && hasExistingLocation) {
      return res.status(403).json({
        success: false,
        message: `As a ${user.role === 'seller' ? 'seller/shop' : 'NGO'}, your location cannot be changed once set. This ensures consistency for your customers and delivery serviceability.`
      });
    }

    // Validate location data
    const locationData = req.body.location || {};
    
    // Validate coordinates if provided
    if (locationData.latitude !== undefined) {
      if (typeof locationData.latitude !== 'number' || locationData.latitude < -90 || locationData.latitude > 90) {
        return res.status(400).json({
          success: false,
          message: 'Invalid latitude. Must be between -90 and 90'
        });
      }
    }
    
    if (locationData.longitude !== undefined) {
      if (typeof locationData.longitude !== 'number' || locationData.longitude < -180 || locationData.longitude > 180) {
        return res.status(400).json({
          success: false,
          message: 'Invalid longitude. Must be between -180 and 180'
        });
      }
    }

    // For sellers/NGOs, require coordinates
    if (isSellerOrNGO && (!locationData.latitude || !locationData.longitude)) {
      return res.status(400).json({
        success: false,
        message: 'Latitude and longitude are required for sellers and NGOs'
      });
    }

    // Update location, preserving existing data if not provided
    const currentLocation = user.location || {};
    user.location = {
      ...currentLocation,
      ...locationData,
      lastUpdated: new Date()
    };

    await user.save();

    res.json({
      success: true,
      message: 'Location updated successfully',
      data: user.toJSON()
    });
  } catch (error) {
    console.error('Location update error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

export default router;
