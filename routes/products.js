import express from 'express';
import Product from '../models/Product.js';
import { updateAllProductPrices, updatePricesForExpiringProducts, getProductPricing } from '../utils/priceUpdater.js';

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
      sortOrder = 'desc'
    } = req.query;

    // Build filter object
    const filter = { status: 'active' };
    
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

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Execute query
    const products = await Product.find(filter)
      .populate('seller', 'username profile.firstName profile.lastName')
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Product.countDocuments(filter);
    
    console.log('Products filter:', filter);
    console.log('Found products:', products.length, 'Total:', total);

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
        }
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

// Create product (protected route)
router.post('/', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    
    console.log('Product creation request - Token:', token ? token.substring(0, 20) + '...' : 'No token');
    console.log('Product creation request - Body:', req.body);
    
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'No token provided'
      });
    }

    const jwt = await import('jsonwebtoken');
    const jwtSecret = process.env.JWT_SECRET || 'fallback-jwt-secret-key-for-development';
    const decoded = jwt.default.verify(token, jwtSecret);
    
    const productData = {
      ...req.body,
      seller: decoded.userId
    };

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
      status: 'active'
    })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Product.countDocuments({ 
      seller: req.params.sellerId,
      status: 'active'
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
