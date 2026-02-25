import express from 'express';
import Product from '../models/Product.js';
import { updateAllProductPrices, updatePricesForExpiringProducts, getProductPricing } from '../utils/priceUpdater.js';
import { filterProductsByLocation, sortProductsByDistance, calculateDistance } from '../utils/locationUtils.js';
import User from '../models/User.js';

const router = express.Router();

// Get all products with filtering and pagination
router.get('/', async (req, res) => {
  try {
    const {
      page = 1,
      limit = 12,
      category,
      minPrice,
      maxPrice,
      condition,
      search,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      useLocation = 'true', // Enable location filtering by default
      maxRadius = 50 // Maximum serviceability radius in kilometers
    } = req.query;

    // Build filter object
    const filter = { status: 'Active' };
    
    if (category) filter.category = category;
    if (condition) filter.condition = condition;
    if (minPrice || maxPrice) {
      filter.price = {};
      if (minPrice) filter.price.$gte = parseFloat(minPrice);
      if (maxPrice) filter.price.$lte = parseFloat(maxPrice);
    }
    if (search) {
      filter.$text = { $search: search };
    }

    // Build sort object
    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

    // Get user location if token is provided and location filtering is enabled
    let userLocation = null;
    if (useLocation === 'true') {
      try {
        const token = req.headers.authorization?.split(' ')[1];
        if (token) {
          const jwt = await import('jsonwebtoken');
          const jwtSecret = process.env.JWT_SECRET || 'fallback-jwt-secret-key-for-development';
          const decoded = jwt.default.verify(token, jwtSecret);
          const user = await User.findById(decoded.userId);
          if (user?.location?.latitude && user?.location?.longitude) {
            userLocation = {
              latitude: user.location.latitude,
              longitude: user.location.longitude
            };
          }
        }
      } catch (authError) {
        // If auth fails, continue without location filtering
        console.log('Location filtering skipped:', authError.message);
      }
    }

    // Execute query (fetch more initially if location filtering will be applied)
    const fetchLimit = userLocation ? parseInt(limit) * 3 : parseInt(limit);
    let products = await Product.find(filter)
      .populate('seller', 'username profile.firstName profile.lastName')
      .sort(sort)
      .limit(fetchLimit);

    // Apply location-based filtering if user location is available
    if (userLocation && useLocation === 'true') {
      products = filterProductsByLocation(products, userLocation, parseFloat(maxRadius));
      
      // Sort by distance if location is available
      products = sortProductsByDistance(products, userLocation);
    }

    // Calculate pagination after location filtering
    const total = products.length;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    products = products.slice(skip, skip + parseInt(limit));

    // Add distance information to products if location is available
    if (userLocation) {
      products = products.map(product => {
        const distance = product.location?.latitude && product.location?.longitude
          ? calculateDistance(
              userLocation.latitude,
              userLocation.longitude,
              product.location.latitude,
              product.location.longitude
            )
          : null;
        return {
          ...product.toObject(),
          distance: distance ? parseFloat(distance.toFixed(2)) : null
        };
      });
    }

    res.json({
      success: true,
      data: {
        products,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(total / parseInt(limit)),
          totalProducts: total,
          hasNext: skip + products.length < total,
          hasPrev: parseInt(page) > 1
        },
        location: userLocation ? {
          latitude: userLocation.latitude,
          longitude: userLocation.longitude,
          maxRadius: parseFloat(maxRadius)
        } : null
      }
    });
  } catch (error) {
    console.error('Get products error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

// Get single product
router.get('/:id', async (req, res) => {
  try {
    const product = await Product.findById(req.params.id)
      .populate('seller', 'username profile.firstName profile.lastName profile.avatar');

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    // Increment view count
    product.views += 1;
    await product.save();

    res.json({
      success: true,
      data: product
    });
  } catch (error) {
    console.error('Get product error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

// Get current user's active donation listings
router.get('/my-donations/list', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'No token provided'
      });
    }

    const jwt = await import('jsonwebtoken');
    const jwtSecret = process.env.JWT_SECRET || 'fallback-jwt-secret-key-for-development';
    const decoded = jwt.default.verify(token, jwtSecret);

    // Compute today's date string (YYYY-MM-DD) to filter out expired donations
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = today.toISOString().slice(0, 10);

    const products = await Product.find({
      type: 'donate',
      uploader: decoded.userId,
      status: 'Active',
      expiry: { $gte: todayStr }
    }).sort({ createdAt: -1 });

    res.json({
      success: true,
      data: {
        products
      }
    });
  } catch (error) {
    console.error('Get my donations error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

// Create product (protected route)
router.post('/', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'No token provided'
      });
    }

    const jwt = await import('jsonwebtoken');
    const jwtSecret = process.env.JWT_SECRET || 'fallback-jwt-secret-key-for-development';
    const decoded = jwt.default.verify(token, jwtSecret);

    // Load user and enforce role + profile completeness
    const { default: User } = await import('../models/User.js');
    const user = await User.findById(decoded.userId);
    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid user' });
    }
    const isDonation = String(req.body?.type || '').toLowerCase() === 'donate';
    const isAllowedRole = (user.role === 'seller') || (user.role === 'ngo') || (user.role === 'customer' && isDonation);
    if (!isAllowedRole) {
      return res.status(403).json({ success: false, message: 'Only sellers/NGOs can create listings; customers may create donations only' });
    }
    if (!user.isProfileComplete()) {
      return res.status(403).json({ success: false, message: 'Complete your profile to create products or donations' });
    }
    
    // For direct donations to NGO, allow seller to be the NGO ID from request
    // Otherwise, use the current user as seller
    let sellerId = decoded.userId;
    if (isDonation && req.body.seller && req.body.seller !== decoded.userId.toString()) {
      // Verify the seller ID is a valid NGO
      const ngoSeller = await User.findById(req.body.seller);
      if (ngoSeller && ngoSeller.role === 'ngo' && ngoSeller.profile?.verified) {
        sellerId = req.body.seller; // Use NGO as seller
      } else {
        return res.status(400).json({
          success: false,
          message: 'Invalid NGO ID or NGO is not verified'
        });
      }
    }
    
    // Get seller's location if available (use the actual seller's location)
    const actualSeller = sellerId === decoded.userId ? user : await User.findById(sellerId);
    const sellerLocation = actualSeller?.location || {};
    
    const productData = {
      ...req.body,
      seller: sellerId,
      uploader: decoded.userId // Always use current user as uploader
    };

    // If product doesn't have location but seller does, use seller's location
    if (!productData.location?.latitude && sellerLocation.latitude) {
      productData.location = {
        latitude: sellerLocation.latitude,
        longitude: sellerLocation.longitude,
        address: productData.location?.address || sellerLocation.address || '',
        city: productData.location?.city || sellerLocation.city || '',
        state: productData.location?.state || sellerLocation.state || '',
        country: productData.location?.country || sellerLocation.country || '',
        zipCode: productData.location?.zipCode || sellerLocation.zipCode || ''
      };
    }

    // Set default serviceability radius if not provided
    if (!productData.serviceability) {
      productData.serviceability = {
        radius: 50, // Default 50km radius
        enabled: true
      };
    }

    // Normalize status casing to match schema enum
    if (productData.status) {
      const map = { active: 'Active', inactive: 'Inactive', sold: 'Sold', pending: 'Pending' };
      const lower = String(productData.status).toLowerCase();
      productData.status = map[lower] || productData.status;
    }

    // Set initial amount if not provided for sell products
    if (productData.type === 'sell' && !productData.initialAmount) {
      productData.initialAmount = productData.originalPrice || 0;
    }

    const product = new Product(productData);
    
    // Calculate initial price based on expiry
    if (productData.type === 'sell') {
      await product.updatePriceBasedOnExpiry();
    }
    
    await product.save();

    res.status(201).json({
      success: true,
      message: 'Product created successfully',
      data: product
    });
  } catch (error) {
    console.error('Create product error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

// Update product (protected route)
router.put('/:id', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'No token provided'
      });
    }

    const jwt = await import('jsonwebtoken');
    const jwtSecret = process.env.JWT_SECRET || 'fallback-jwt-secret-key-for-development';
    const decoded = jwt.default.verify(token, jwtSecret);

    const product = await Product.findById(req.params.id);
    
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    // Check if user is the seller
    if (product.seller.toString() !== decoded.userId) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this product'
      });
    }

    // Update product
    Object.keys(req.body).forEach(key => {
      if (req.body[key] !== undefined) {
        product[key] = req.body[key];
      }
    });

    await product.save();

    res.json({
      success: true,
      message: 'Product updated successfully',
      data: product
    });
  } catch (error) {
    console.error('Update product error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

// Delete product (protected route)
router.delete('/:id', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'No token provided'
      });
    }

    const jwt = await import('jsonwebtoken');
    const jwtSecret = process.env.JWT_SECRET || 'fallback-jwt-secret-key-for-development';
    const decoded = jwt.default.verify(token, jwtSecret);

    const product = await Product.findById(req.params.id);
    
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    // Check if user is the seller
    if (product.seller.toString() !== decoded.userId) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this product'
      });
    }

    await Product.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: 'Product deleted successfully'
    });
  } catch (error) {
    console.error('Delete product error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

// Get products by seller
router.get('/seller/:sellerId', async (req, res) => {
  try {
    const { page = 1, limit = 12 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const products = await Product.find({ 
      seller: req.params.sellerId,
      status: 'Active'
    })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Product.countDocuments({ 
      seller: req.params.sellerId,
      status: 'Active'
    });

    res.json({
      success: true,
      data: {
        products,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(total / parseInt(limit)),
          totalProducts: total
        }
      }
    });
  } catch (error) {
    console.error('Get seller products error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

// Update product prices based on expiry (for automatic discount system)
router.put('/update-prices', async (req, res) => {
  try {
    const { daysThreshold } = req.query;
    
    let result;
    if (daysThreshold) {
      result = await updatePricesForExpiringProducts(parseInt(daysThreshold));
    } else {
      result = await updateAllProductPrices();
    }

    if (!result.success) {
      return res.status(500).json({
        success: false,
        message: 'Failed to update prices',
        error: result.error
      });
    }

    res.json({
      success: true,
      message: `Updated prices for ${result.updatedCount} out of ${result.totalProducts} products`,
      data: result.results
    });
  } catch (error) {
    console.error('Update prices error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

// Get product with dynamic pricing
router.get('/:id/pricing', async (req, res) => {
  try {
    const result = await getProductPricing(req.params.id);
    
    if (!result.success) {
      return res.status(404).json({
        success: false,
        message: result.error
      });
    }

    res.json({
      success: true,
      data: result.data
    });
  } catch (error) {
    console.error('Get product pricing error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

// Test route to check if products are being created
router.get('/test', async (req, res) => {
  try {
    const allProducts = await Product.find({});
    console.log('All products in database:', allProducts.length);
    res.json({
      success: true,
      data: {
        totalProducts: allProducts.length,
        products: allProducts.map(p => ({
          id: p._id,
          name: p.name,
          status: p.status,
          seller: p.seller
        }))
      }
    });
  } catch (error) {
    console.error('Test route error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

export default router;
