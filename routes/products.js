import express from 'express';
import jwt from 'jsonwebtoken';
import Product from '../models/Product.js';
import { updateAllProductPrices, updatePricesForExpiringProducts, getProductPricing } from '../utils/priceUpdater.js';
import { filterProductsByLocation, sortProductsByDistance, calculateDistance } from '../utils/locationUtils.js';
import User from '../models/User.js';
import { cleanupExpiredProducts } from '../utils/expiredProductCleanup.js';

const router = express.Router();

const isExpiredProduct = (expiry) => {
  if (!expiry) return false;
  const expiryDate = new Date(`${expiry}T23:59:59.999Z`);
  if (Number.isNaN(expiryDate.getTime())) return true;
  return expiryDate <= new Date();
};

// Ensure expired products are removed before serving product endpoints
router.use(async (req, res, next) => {
  try {
    await cleanupExpiredProducts();
  } catch (_error) {
    // Do not block product APIs if cleanup fails transiently
  }
  next();
});

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

    // Resolve requester role (if authenticated) to enforce donation visibility
    let requesterRole = null;
    try {
      const token = req.headers.authorization?.split(' ')[1];
      if (token) {
        const jwtSecret = process.env.JWT_SECRET || 'fallback-jwt-secret-key-for-development';
        const decoded = jwt.verify(token, jwtSecret);
        const requester = await User.findById(decoded.userId).select('role');
        requesterRole = String(requester?.role || '').trim().toLowerCase() || null;
      }
    } catch (_authError) {
      requesterRole = null;
    }

    // Build filter object
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = today.toISOString().slice(0, 10);
    const filter = { status: 'Active', expiry: { $gte: todayStr } };
    if (requesterRole !== 'ngo') {
      filter.type = 'sell';
    }
    
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
          const jwtSecret = process.env.JWT_SECRET || 'fallback-jwt-secret-key-for-development';
          const decoded = jwt.verify(token, jwtSecret);
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
      .populate('seller', 'username profile.firstName profile.lastName profile.organizationName profile.shopRating')
      .sort(sort)
      .limit(fetchLimit);

    // Strictly remove any expired records that may still exist due to legacy data
    const expiredIds = products
      .filter((product) => isExpiredProduct(product.expiry))
      .map((product) => product._id);
    if (expiredIds.length > 0) {
      await Product.deleteMany({ _id: { $in: expiredIds } });
      products = products.filter((product) => !expiredIds.some((id) => id.toString() === product._id.toString()));
    }

    // Hide direct NGO donation requests from marketplace until they are rejected
    // (direct request is identified by seller !== uploader).
    // Once rejected, we reassign seller to uploader, so it becomes a normal public donation.
    products = products.filter((product) => {
      if (product.type !== 'donate') return true;
      return String(product.seller?._id || product.seller) === String(product.uploader);
    });

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

// All listings the current user uploaded (sale + donation) until sold out, completed, or expiry (expired docs removed by cleanup)
router.get('/my-listings', async (req, res) => {
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

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = today.toISOString().slice(0, 10);

    const products = await Product.find({
      uploader: decoded.userId,
      expiry: { $gte: todayStr },
      quantity: { $gt: 0 },
      status: { $nin: ['Sold', 'Inactive'] }
    })
      .populate('seller', 'username profile.firstName profile.lastName profile.organizationName profile.avatar')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      data: {
        products
      }
    });
  } catch (error) {
    console.error('Get my listings error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

router.get('/my-listings/history', async (req, res) => {
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

    const products = await Product.find({
      uploader: decoded.userId,
      $or: [
        { status: { $in: ['Sold', 'Inactive'] } },
        { quantity: { $lte: 0 } }
      ]
    })
      .populate('seller', 'username profile.firstName profile.lastName profile.organizationName profile.avatar')
      .sort({ updatedAt: -1 })
      .limit(100);

    res.json({
      success: true,
      data: {
        products
      }
    });
  } catch (error) {
    console.error('Get my listings history error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

// Get current user's donation listings (including direct NGO donations)
router.get('/my-donations/list', async (req, res) => {
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

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = today.toISOString().slice(0, 10);

    const products = await Product.find({
      type: 'donate',
      uploader: decoded.userId,
      expiry: { $gte: todayStr },
      quantity: { $gt: 0 },
      status: { $nin: ['Sold', 'Inactive'] }
    })
      .populate('seller', 'username profile.firstName profile.lastName profile.organizationName')
      .sort({ createdAt: -1 });

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

// Get current NGO user's received donation listings with donor contact details
router.get('/my-received-donations/list', async (req, res) => {
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
    const ngoUser = await User.findById(decoded.userId);

    if (!ngoUser || ngoUser.role !== 'ngo') {
      return res.status(403).json({
        success: false,
        message: 'Only NGOs can view received donations'
      });
    }

    const products = await Product.find({
      type: 'donate',
      seller: decoded.userId,
      donationDecision: 'pending'
    })
      .populate('uploader', 'username email profile.firstName profile.lastName profile.phone profile.address location.address location.city location.state location.country location.zipCode')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      data: {
        products
      }
    });
  } catch (error) {
    console.error('Get received donations error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

// Get products by seller (public storefront)
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

    // Ensure expired products are never shown on details pages
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = today.toISOString().slice(0, 10);
    if (product.expiry && String(product.expiry) < todayStr) {
      await Product.findByIdAndDelete(product._id);
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    if (String(product.type || '').toLowerCase() === 'donate') {
      let isNgo = false;
      try {
        const token = req.headers.authorization?.split(' ')[1];
        if (token) {
          const jwtSecret = process.env.JWT_SECRET || 'fallback-jwt-secret-key-for-development';
          const decoded = jwt.verify(token, jwtSecret);
          const requester = await User.findById(decoded.userId).select('role');
          isNgo = String(requester?.role || '').toLowerCase() === 'ngo';
        }
      } catch (_e) {
        isNgo = false;
      }
      if (!isNgo) {
        return res.status(404).json({
          success: false,
          message: 'Product not found'
        });
      }
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

// NGO accepts/rejects a direct donation
router.put('/:id/donation-decision', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'No token provided'
      });
    }

    const { decision } = req.body;
    if (!['accepted', 'rejected'].includes(String(decision || '').toLowerCase())) {
      return res.status(400).json({
        success: false,
        message: 'Invalid decision. Use accepted or rejected'
      });
    }

    const jwtSecret = process.env.JWT_SECRET || 'fallback-jwt-secret-key-for-development';
    const decoded = jwt.verify(token, jwtSecret);
    const ngoUser = await User.findById(decoded.userId);

    if (!ngoUser || ngoUser.role !== 'ngo') {
      return res.status(403).json({
        success: false,
        message: 'Only NGOs can decide donations'
      });
    }

    const product = await Product.findById(req.params.id).populate('uploader', 'username email profile.firstName');
    if (!product || product.type !== 'donate') {
      return res.status(404).json({
        success: false,
        message: 'Donation not found'
      });
    }

    if (String(product.seller) !== String(decoded.userId)) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to decide this donation'
      });
    }

    if (product.donationDecision !== 'pending') {
      return res.status(400).json({
        success: false,
        message: 'Donation is already processed'
      });
    }

    const normalizedDecision = decision.toLowerCase();
    product.donationDecision = normalizedDecision;
    if (normalizedDecision === 'accepted') {
      const donationName = product.name;
      const donorId = product.uploader?._id || product.uploader;
      await Product.findByIdAndDelete(product._id);
      // Notify donor for accepted direct donation
      try {
        const ngoName = ngoUser.profile?.organizationName || ngoUser.username || ngoUser.email;
        await User.findByIdAndUpdate(donorId, {
          $push: {
            notifications: {
              id: `donation-accepted-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
              message: `${ngoName} accepted your donation "${donationName}". Item has been completed and removed.`,
              type: 'donation',
              read: false,
              createdAt: new Date()
            }
          }
        });
      } catch (notifyError) {
        console.error('Failed to notify donor for accepted donation:', notifyError.message);
      }

      return res.json({
        success: true,
        message: 'Donation accepted successfully and removed from active listings'
      });
    } else {
      // On rejection, convert direct NGO request into a public donation listing.
      // This keeps it hidden while pending, but makes it available after rejection.
      product.status = 'Active';
      product.seller = product.uploader;
      product.donationDecision = 'rejected';
    }
    await product.save();

    // Notify donor with NGO decision
    try {
      const ngoName = ngoUser.profile?.organizationName || ngoUser.username || ngoUser.email;
      const message = normalizedDecision === 'accepted'
        ? `${ngoName} accepted your donation "${product.name}".`
        : `${ngoName} rejected your donation "${product.name}".`;

      await User.findByIdAndUpdate(product.uploader?._id || product.uploader, {
        $push: {
          notifications: {
            id: `donation-decision-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
            message,
            type: 'donation',
            read: false,
            createdAt: new Date()
          }
        }
      });
    } catch (notifyError) {
      console.error('Failed to notify donor for donation decision:', notifyError.message);
    }

    res.json({
      success: true,
      message: `Donation ${normalizedDecision} successfully`,
      data: product
    });
  } catch (error) {
    console.error('Donation decision error:', error);
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

    const jwtSecret = process.env.JWT_SECRET || 'fallback-jwt-secret-key-for-development';
    const decoded = jwt.verify(token, jwtSecret);

    // Load user and enforce role
    const { default: User } = await import('../models/User.js');
    const user = await User.findById(decoded.userId);
    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid user' });
    }
    if (user.role === 'admin') {
      return res.status(403).json({ success: false, message: 'Admin accounts cannot create product listings' });
    }
    if (user.role === 'ngo') {
      return res.status(403).json({
        success: false,
        message: 'NGO accounts cannot create listings; you can purchase priced and donation items from the marketplace'
      });
    }

    const isDonation = String(req.body?.type || '').toLowerCase() === 'donate';
    const isAllowedRole = user.role === 'seller' || (user.role === 'customer' && isDonation);
    if (!isAllowedRole) {
      return res.status(403).json({
        success: false,
        message: 'Customers may list donations only; sellers may list items for sale or donation'
      });
    }
    
    // For direct donations to NGO, allow seller to be the NGO ID from request
    // Otherwise, use the current user as seller
    let sellerId = decoded.userId;
    if (isDonation && req.body.seller && req.body.seller !== decoded.userId.toString()) {
      // Direct NGO donation requires donor profile/contact details to be complete
      if (!user.isProfileComplete()) {
        return res.status(400).json({
          success: false,
          message: 'Please complete your profile (phone and address) before donating directly to an NGO'
        });
      }

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

    if (isDonation && String(sellerId) !== String(decoded.userId)) {
      // Direct donations to NGOs start as pending until NGO accepts/rejects
      productData.status = 'Pending';
      productData.donationDecision = 'pending';
    }

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

    // Notify NGO when a direct donation is created for them by another uploader
    if (isDonation && String(sellerId) !== String(decoded.userId)) {
      try {
        const donorName =
          user.profile?.firstName ||
          user.username ||
          user.email;
        const donorPhone = user.profile?.phone || 'Not provided';
        const donorEmail = user.email || 'Not provided';

        await User.findByIdAndUpdate(
          sellerId,
          {
            $push: {
              notifications: {
                id: `donation-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
                message: `${donorName} donated "${product.name}" to your NGO. Contact: ${donorPhone} | ${donorEmail}`,
                type: 'donation',
                read: false,
                createdAt: new Date()
              }
            }
          }
        );
      } catch (notificationError) {
        console.error('Failed to create donation notification:', notificationError.message);
      }
    }

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

    const jwtSecret = process.env.JWT_SECRET || 'fallback-jwt-secret-key-for-development';
    const decoded = jwt.verify(token, jwtSecret);

    const actingUser = await User.findById(decoded.userId).select('role');
    if (!actingUser) {
      return res.status(401).json({
        success: false,
        message: 'Invalid user'
      });
    }
    if (actingUser.role === 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Admin accounts cannot modify product listings'
      });
    }

    const product = await Product.findById(req.params.id);
    
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    const userId = String(decoded.userId);
    const isSeller = String(product.seller) === userId;
    const isUploader = String(product.uploader) === userId;
    if (!isSeller && !isUploader) {
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

    const jwtSecret = process.env.JWT_SECRET || 'fallback-jwt-secret-key-for-development';
    const decoded = jwt.verify(token, jwtSecret);

    const actingUser = await User.findById(decoded.userId).select('role');
    if (!actingUser) {
      return res.status(401).json({
        success: false,
        message: 'Invalid user'
      });
    }
    if (actingUser.role === 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Admin accounts cannot delete product listings'
      });
    }

    const product = await Product.findById(req.params.id);
    
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    const userId = String(decoded.userId);
    const isSeller = String(product.seller) === userId;
    const isUploader = String(product.uploader) === userId;
    if (!isSeller && !isUploader) {
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

export default router;
