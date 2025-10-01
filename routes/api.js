import express from 'express';
import bcrypt from 'bcrypt';
import User from '../models/User.js';
import Product from '../models/Product.js';
import Order from '../models/Order.js';
import Cart from '../models/Cart.js';

const router = express.Router();

// Middleware to check authentication
const authenticateUser = (req, res, next) => {
    if (req.session.user) {
        next();
    } else {
        res.status(401).json({ success: false, message: 'Authentication required' });
    }
};

// Middleware to check user role
const checkRole = (roles) => {
    return (req, res, next) => {
        if (req.session.user && roles.includes(req.session.user.role)) {
            next();
        } else {
            res.status(403).json({ success: false, message: 'Insufficient permissions' });
        }
    };
};

// Auth Routes
router.post('/signup', async (req, res) => {
    try {
        const { email, password, firstName, lastName, role = 'Customer' } = req.body;
        
        if (!email || !password || !firstName || !lastName) {
            return res.status(400).json({ 
                success: false, 
                message: 'Email, password, first name, and last name are required' 
            });
        }

        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(409).json({ 
                success: false, 
                message: 'This email is already registered!' 
            });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const user = new User({ 
            email, 
            password: hashedPassword, 
            firstName,
            lastName,
            role
        });
        
        await user.save();
        
        req.session.user = { 
            id: user._id, 
            email: user.email, 
            role: user.role,
            firstName: user.firstName,
            lastName: user.lastName
        };
        
        res.json({ 
            success: true, 
            message: 'Signup successful', 
            user: {
                id: user._id,
                email: user.email,
                firstName: user.firstName,
                lastName: user.lastName,
                role: user.role
            }
        });
    } catch (err) {
        console.error('Signup error:', err);
        res.status(500).json({ 
            success: false, 
            message: 'Server error during signup' 
        });
    }
});

router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        
        if (!email || !password) {
            return res.status(400).json({ 
                success: false, 
                message: 'Email and password are required' 
            });
        }

        const user = await User.findOne({ email });
        if (!user) {
            return res.status(401).json({ 
                success: false, 
                message: 'Invalid email or password' 
            });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({ 
                success: false, 
                message: 'Invalid email or password' 
            });
        }

        // Update last login
        user.lastLogin = new Date();
        await user.save();

        req.session.user = { 
            id: user._id, 
            email: user.email, 
            role: user.role,
            firstName: user.firstName,
            lastName: user.lastName
        };

        res.json({ 
            success: true, 
            message: 'Login successful', 
            user: {
                id: user._id,
                email: user.email,
                firstName: user.firstName,
                lastName: user.lastName,
                role: user.role
            }
        });
    } catch (err) {
        console.error('Login error:', err);
        res.status(500).json({ 
            success: false, 
            message: 'Server error during login' 
        });
    }
});

router.get('/check-session', (req, res) => {
    if (req.session.user) {
        res.json({ 
            loggedIn: true, 
            user: req.session.user 
        });
    } else {
        res.json({ 
            loggedIn: false 
        });
    }
});

router.post('/logout', (req, res) => {
    req.session.destroy(err => {
        if (err) {
            console.error('Logout error:', err);
            return res.status(500).json({ success: false });
        }
        res.clearCookie('sessionId');
        res.json({ success: true });
    });
});

// Product Routes
router.get('/products', async (req, res) => {
    try {
        const { 
            category, 
            search, 
            minPrice, 
            maxPrice, 
            location, 
            page = 1, 
            limit = 20,
            sortBy = 'createdAt',
            sortOrder = 'desc'
        } = req.query;

        const query = { status: 'active' };
        
        if (category && category !== 'All') {
            query.category = category;
        }
        
        if (search) {
            query.$or = [
                { name: { $regex: search, $options: 'i' } },
                { description: { $regex: search, $options: 'i' } },
                { tags: { $in: [new RegExp(search, 'i')] } }
            ];
        }
        
        if (minPrice || maxPrice) {
            query.price = {};
            if (minPrice) query.price.$gte = parseFloat(minPrice);
            if (maxPrice) query.price.$lte = parseFloat(maxPrice);
        }
        
        if (location) {
            query['store.location.city'] = { $regex: location, $options: 'i' };
        }

        const sortOptions = {};
        sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;

        const products = await Product.find(query)
            .populate('seller', 'firstName lastName email')
            .sort(sortOptions)
            .limit(limit * 1)
            .skip((page - 1) * limit);

        const total = await Product.countDocuments(query);

        res.json({
            success: true,
            products,
            pagination: {
                currentPage: parseInt(page),
                totalPages: Math.ceil(total / limit),
                totalProducts: total,
                hasNext: page < Math.ceil(total / limit),
                hasPrev: page > 1
            }
        });
    } catch (err) {
        console.error('Products fetch error:', err);
        res.status(500).json({ 
            success: false, 
            message: 'Error fetching products' 
        });
    }
});

router.get('/products/:id', async (req, res) => {
    try {
        const product = await Product.findById(req.params.id)
            .populate('seller', 'firstName lastName email profile.phone');
        
        if (!product) {
            return res.status(404).json({ 
                success: false, 
                message: 'Product not found' 
            });
        }

        // Increment view count
        product.views += 1;
        await product.save();

        res.json({ success: true, product });
    } catch (err) {
        console.error('Product fetch error:', err);
        res.status(500).json({ 
            success: false, 
            message: 'Error fetching product' 
        });
    }
});

router.post('/products', authenticateUser, checkRole(['Seller']), async (req, res) => {
    try {
        const productData = {
            ...req.body,
            seller: req.session.user.id
        };

        const product = new Product(productData);
        await product.save();

        res.status(201).json({ 
            success: true, 
            message: 'Product created successfully',
            product 
        });
    } catch (err) {
        console.error('Product creation error:', err);
        res.status(500).json({ 
            success: false, 
            message: 'Error creating product' 
        });
    }
});

// Cart Routes
router.get('/cart', authenticateUser, async (req, res) => {
    try {
        let cart = await Cart.findOne({ user: req.session.user.id })
            .populate('items.product')
            .populate('store', 'firstName lastName email');

        if (!cart) {
            cart = new Cart({ user: req.session.user.id, items: [] });
            await cart.save();
        }

        res.json({ success: true, cart });
    } catch (err) {
        console.error('Cart fetch error:', err);
        res.status(500).json({ 
            success: false, 
            message: 'Error fetching cart' 
        });
    }
});

router.post('/cart/add', authenticateUser, async (req, res) => {
    try {
        const { productId, quantity = 1 } = req.body;

        if (!productId) {
            return res.status(400).json({ 
                success: false, 
                message: 'Product ID is required' 
            });
        }

        const product = await Product.findById(productId);
        if (!product) {
            return res.status(404).json({ 
                success: false, 
                message: 'Product not found' 
            });
        }

        let cart = await Cart.findOne({ user: req.session.user.id });
        if (!cart) {
            cart = new Cart({ user: req.session.user.id, items: [] });
        }

        // Check if adding from different store
        if (cart.store && cart.store.toString() !== product.seller.toString()) {
            return res.status(400).json({ 
                success: false, 
                message: 'You can only buy from one store at a time. Clear your cart to buy from a different store.' 
            });
        }

        // Set store if not set
        if (!cart.store) {
            cart.store = product.seller;
        }

        await cart.addItem(productId, quantity);

        res.json({ 
            success: true, 
            message: 'Item added to cart',
            cart 
        });
    } catch (err) {
        console.error('Cart add error:', err);
        res.status(500).json({ 
            success: false, 
            message: 'Error adding item to cart' 
        });
    }
});

router.delete('/cart/clear', authenticateUser, async (req, res) => {
    try {
        const cart = await Cart.findOne({ user: req.session.user.id });
        if (cart) {
            await cart.clear();
        }

        res.json({ 
            success: true, 
            message: 'Cart cleared successfully' 
        });
    } catch (err) {
        console.error('Cart clear error:', err);
        res.status(500).json({ 
            success: false, 
            message: 'Error clearing cart' 
        });
    }
});

// Order Routes
router.post('/orders', authenticateUser, async (req, res) => {
    try {
        const cart = await Cart.findOne({ user: req.session.user.id })
            .populate('items.product')
            .populate('store');

        if (!cart || cart.items.length === 0) {
            return res.status(400).json({ 
                success: false, 
                message: 'Cart is empty' 
            });
        }

        const orderItems = cart.items.map(item => ({
            product: item.product._id,
            quantity: item.quantity,
            price: item.product.price,
            totalPrice: item.product.price * item.quantity
        }));

        const subtotal = orderItems.reduce((sum, item) => sum + item.totalPrice, 0);
        const tax = subtotal * 0.08; // 8% tax
        const shipping = subtotal > 50 ? 0 : 5; // Free shipping over $50
        const total = subtotal + tax + shipping;

        const order = new Order({
            customer: req.session.user.id,
            seller: cart.store._id,
            items: orderItems,
            subtotal,
            tax,
            shipping,
            total,
            paymentMethod: req.body.paymentMethod || 'cash',
            shippingAddress: req.body.shippingAddress
        });

        await order.save();
        await cart.clear();

        res.status(201).json({ 
            success: true, 
            message: 'Order created successfully',
            order 
        });
    } catch (err) {
        console.error('Order creation error:', err);
        res.status(500).json({ 
            success: false, 
            message: 'Error creating order' 
        });
    }
});

router.get('/orders', authenticateUser, async (req, res) => {
    try {
        const { status, page = 1, limit = 10 } = req.query;
        
        const query = { customer: req.session.user.id };
        if (status) query.status = status;

        const orders = await Order.find(query)
            .populate('items.product', 'name price images')
            .populate('seller', 'firstName lastName email')
            .sort({ createdAt: -1 })
            .limit(limit * 1)
            .skip((page - 1) * limit);

        const total = await Order.countDocuments(query);

        res.json({
            success: true,
            orders,
            pagination: {
                currentPage: parseInt(page),
                totalPages: Math.ceil(total / limit),
                totalOrders: total
            }
        });
    } catch (err) {
        console.error('Orders fetch error:', err);
        res.status(500).json({ 
            success: false, 
            message: 'Error fetching orders' 
        });
    }
});

// Health check
router.get('/health', (req, res) => {
    res.json({ 
        status: 'API is running', 
        timestamp: new Date().toISOString(),
        version: '1.0.0'
    });
});

export default router;
