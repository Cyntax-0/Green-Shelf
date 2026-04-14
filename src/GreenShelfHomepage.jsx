import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import "./styles/Homepage.css";
import api from './services/api';
import { productSellerKey, CART_SINGLE_VENDOR_MESSAGE } from '../utils/cartVendor.js';

function mapServerCartLine(ci) {
    const p = ci.product || {};
    return {
        id: p._id || p.id,
        name: p.name,
        image: p.image || (p.images && p.images[0]) || '',
        price: p.price || p.originalPrice || 0,
        originalPrice: p.originalPrice || p.price || 0,
        expiry: p.expiry,
        category: p.category,
        quantityUnit: p.quantityUnit,
        type: p.type,
        discountType: p.discountType,
        currentDiscount: p.currentDiscount,
        store: p.store,
        sellerId: p.seller?._id || p.seller,
        quantity: ci.quantity || 1
    };
}

const GreenShelfHomepage = ({ onNavigateToLogin, onAdminLogin, loggedIn, currentUser }) => {
    const [cart, setCart] = useState([]);
    const [cartStore, setCartStore] = useState(null);
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [filterType, setFilterType] = useState('All');
    const [filterLocation, setFilterLocation] = useState('');
    const [filterProductType, setFilterProductType] = useState('All');
    const [message, setMessage] = useState('');
    const [authMessage, setAuthMessage] = useState('');
    const [publicDonations, setPublicDonations] = useState([]);
    const navigate = useNavigate();
    const location = useLocation();

    useEffect(() => {
        const fetchProducts = async () => {
            try {
                setLoading(true);
                // Enable location-based filtering if user is logged in
                const filters = { 
                    useLocation: loggedIn ? 'true' : 'false', 
                    maxRadius: 50 
                };
                
                const token = loggedIn ? localStorage.getItem('authToken') : null;
                const response = await api.products.getAll(filters, token);
                
                if (response.success) {
                    setProducts(response.data?.products || []);
                } else {
                    setProducts([]);
                }
            } catch (error) {
                console.error('Error fetching products:', error);
                setProducts([]);
            } finally {
                setLoading(false);
            }
        };
        fetchProducts();
    }, [loggedIn]);

    // Load persisted cart from server when authenticated
    useEffect(() => {
        const loadServerCart = async () => {
            try {
                const token = localStorage.getItem('authToken');
                if (!loggedIn || !token) return;
                const response = await api.cart.get(token);
                if (response.success && response.data) {
                    const serverItems = (response.data.items || []).map(mapServerCartLine);
                    setCart(serverItems);
                    setCartStore(serverItems.length ? (serverItems[0].store || null) : null);
                }
            } catch (_) {}
        };
        loadServerCart();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [loggedIn]);

    // Check if user was redirected from a protected route
    useEffect(() => {
        if (location.state?.from) {
            setAuthMessage('Please log in to access that page.');
            setTimeout(() => setAuthMessage(''), 5000);
        }
    }, [location.state]);

    const userRole = String(currentUser?.role ?? '').trim().toLowerCase();
    const displayProductType =
        userRole !== 'ngo' && filterProductType === 'donate' ? 'All' : filterProductType;

    useEffect(() => {
        try {
            const existing = JSON.parse(localStorage.getItem('publicDonations') || '[]');
            setPublicDonations(existing);
        } catch (e) {
            setPublicDonations([]);
        }
        const onStorage = (e) => {
            if (e.key === 'publicDonations') {
                try {
                    setPublicDonations(JSON.parse(e.newValue || '[]'));
                } catch (err) {}
            }
        };
        window.addEventListener('storage', onStorage);
        return () => window.removeEventListener('storage', onStorage);
    }, []);

    const handleProfileNavigation = () => {
        if (loggedIn) {
            const role = String(currentUser?.role || 'customer').trim().toLowerCase();
            const target = role === 'seller' ? '/seller' : role === 'ngo' ? '/ngo' : '/customer';
            navigate(target);
        } else {
            onNavigateToLogin();
        }
    };

    const displayName = currentUser?.profile?.firstName
        || currentUser?.username
        || (currentUser?.email ? currentUser.email.split('@')[0] : '');

    const getDiscountedPrice = (product) => {
        if (product.type === 'donate') {
            return { finalPrice: 0, discount: 100, daysToExpiry: Math.ceil((new Date(product.expiry) - new Date()) / (1000 * 60 * 60 * 24)) };
        }

        const daysToExpiry = Math.ceil(
            (new Date(product.expiry) - new Date()) / (1000 * 60 * 60 * 24)
        );

        // Use the current price from database (which already includes discounts)
        const finalPrice = product.price || product.originalPrice || 0;
        
        // Calculate discount percentage for display
        const originalPrice = product.originalPrice || product.price || 0;
        const discount = originalPrice > 0 ? ((originalPrice - finalPrice) / originalPrice) * 100 : 0;
        
        return { 
            finalPrice: finalPrice.toFixed(2), 
            discount: Math.round(discount), 
            daysToExpiry 
        };
    };

    const addToCart = async (product) => {
        const addRole = userRole;

        if (addRole === 'admin') {
            setMessage('Admin accounts cannot use the shopping cart.');
            setTimeout(() => setMessage(''), 4000);
            return;
        }

        if ((addRole === 'customer' || addRole === 'seller') && product.type === 'donate') {
            setMessage('Only NGO accounts can add donation items to the cart.');
            setTimeout(() => setMessage(''), 4000);
            return;
        }

        if (
            addRole === 'ngo' &&
            !currentUser?.profile?.verified &&
            product.type === 'donate'
        ) {
            setMessage(
                'Verified NGO accounts can order donation items. You can still add priced marketplace items to your cart.'
            );
            setTimeout(() => setMessage(''), 5000);
            return;
        }

        const productSellerId = product?.seller?._id || product?.seller;
        const currentUserId = currentUser?._id;
        if (addRole === 'seller' && currentUserId && productSellerId && String(productSellerId) === String(currentUserId)) {
            setMessage('You cannot add your own product to the cart.');
            setTimeout(() => setMessage(''), 3000);
            return;
        }

        const vendorKey = productSellerKey(product);
        if (!vendorKey) {
            setMessage('This listing cannot be added (missing seller).');
            setTimeout(() => setMessage(''), 4000);
            return;
        }
        if (cart.length > 0) {
            const firstKey = cart[0].sellerId;
            if (firstKey && String(firstKey) !== String(vendorKey)) {
                setMessage(CART_SINGLE_VENDOR_MESSAGE);
                setTimeout(() => setMessage(''), 6000);
                return;
            }
        }

        const token = localStorage.getItem('authToken');
        const productId = product._id || product.id;
        try {
            if (loggedIn && token && productId) {
                const resp = await api.cart.add(token, productId, 1);
                if (resp.success && resp.data) {
                    const serverItems = (resp.data.items || []).map(mapServerCartLine);
                    setCart(serverItems);
                    setCartStore(serverItems.length ? (serverItems[0].store || null) : null);
                }
            } else {
                const existingItem = cart.find(item => item.id === productId);
                if (existingItem) {
                    setCart(cart.map(item => 
                        item.id === productId 
                            ? { ...item, quantity: item.quantity + 1 }
                            : item
                    ));
                } else {
                    setCart([...cart, {
                        ...product,
                        id: productId,
                        quantity: 1,
                        sellerId: vendorKey,
                        store: product.store
                    }]);
                }
                if (!cart.length) {
                    setCartStore(product.store || null);
                }
            }
            setMessage(`${product.name} added to cart!`);
            setTimeout(() => setMessage(''), 3000);
        } catch (e) {
            const errorMsg = e?.message || 'Failed to add to cart.';
            setMessage(errorMsg);
            setTimeout(() => setMessage(''), 3000);
        }
    };

    const removeFromCart = async (index) => {
        const token = localStorage.getItem('authToken');
        const target = cart[index];
        const productId = target?.id;
        try {
            if (loggedIn && token && productId) {
                const resp = await api.cart.remove(token, productId);
                if (resp.success && resp.data) {
                    const serverItems = (resp.data.items || []).map(mapServerCartLine);
                    setCart(serverItems);
                    setCartStore(serverItems.length ? (serverItems[0].store || null) : null);
                }
            } else {
                const newCart = cart.filter((_, i) => i !== index);
                setCart(newCart);
                if (newCart.length === 0) {
                    setCartStore(null);
                }
            }
        } catch (_) {
        }
    };

    const clearCart = async () => {
        const token = localStorage.getItem('authToken');
        try {
            if (loggedIn && token) {
                await api.cart.clear(token);
            }
        } catch (_) {}
        setCart([]);
        setCartStore(null);
        setMessage('Cart cleared!');
        setTimeout(() => setMessage(''), 3000);
    };

    const proceedToCheckout = () => {
        if (!loggedIn) {
            setAuthMessage('Please log in before proceeding to checkout.');
            onNavigateToLogin();
            return;
        }
        const checkoutRole = String(currentUser?.role ?? '').trim().toLowerCase();
        if (checkoutRole === 'admin') {
            setAuthMessage('Admin accounts cannot use checkout.');
            setTimeout(() => setAuthMessage(''), 5000);
            return;
        }
        localStorage.setItem('cartItems', JSON.stringify(cart));
        localStorage.setItem('cartStore', cartStore);
        navigate('/checkout');
    };

    const filteredProducts = products.filter(product => {
        const { daysToExpiry } = getDiscountedPrice(product);
        if (daysToExpiry <= 0) {
            return false;
        }

        if (userRole !== 'ngo' && product.type === 'donate') {
            return false;
        }

        // Search filter
        const matchesSearch = searchQuery === '' || product.name.toLowerCase().includes(searchQuery.toLowerCase());
        
        // Category filter - map filter button names to actual category values
        let matchesCategory = true;
        if (filterType !== "All") {
            const categoryMap = {
                'Fruit': 'Fruits',
                'Vegetable': 'Vegetables',
                'Dairy': 'Dairy',
                'Grain': 'Grains',
                'Non-Veg': ['Meat', 'Fish', 'Eggs']
            };
            
            const mappedCategory = categoryMap[filterType];
            if (Array.isArray(mappedCategory)) {
                matchesCategory = mappedCategory.includes(product.category);
            } else if (mappedCategory) {
                matchesCategory = product.category === mappedCategory;
            } else {
                // Fallback: try direct match or partial match
                matchesCategory = product.category?.toLowerCase().includes(filterType.toLowerCase());
            }
        }
        
        // Product type filter (sell/donate)
        const matchesProductType = displayProductType === 'All' || product.type === displayProductType;
        
        // Location filter (store name, city, state, or address)
        const matchesLocation = filterLocation === "" || (
            (product.store || '').toLowerCase().includes(filterLocation.toLowerCase()) ||
            (product.location?.city || '').toLowerCase().includes(filterLocation.toLowerCase()) ||
            (product.location?.state || '').toLowerCase().includes(filterLocation.toLowerCase()) ||
            (product.location?.address || '').toLowerCase().includes(filterLocation.toLowerCase()) ||
            (product.seller?.profile?.firstName || '').toLowerCase().includes(filterLocation.toLowerCase()) ||
            (product.seller?.username || '').toLowerCase().includes(filterLocation.toLowerCase())
        );
        
        return matchesSearch && matchesCategory && matchesProductType && matchesLocation;
    });

    return (
        <div className="homepage">
            <header className="homepage-header">
                <div className="logo">GreenShelf</div>
                <input
                    type="text"
                    placeholder="Search products..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="search-bar"
                />
                <nav>
                    {loggedIn && (currentUser?.role?.toLowerCase() === 'admin') && (
                        <button className="auth-button" onClick={() => navigate('/admin')}>
                            Admin Panel
                        </button>
                    )}
                    {!loggedIn && (
                        <button className="auth-button" onClick={onAdminLogin}>
                            Admin Login
                        </button>
                    )}
                    {/* Hide normal login/profile button when admin is logged in */}
                    {!(loggedIn && (currentUser?.role?.toLowerCase() === 'admin')) && (
                        <button className="auth-button" onClick={handleProfileNavigation}>
                            {loggedIn ? (displayName || 'Profile') : 'Login'}
                        </button>
                    )}
                </nav>
            </header>

            <div className="filter-navbar">
                {"All, Fruit, Vegetable, Dairy, Grain, Non-Veg".split(', ').map(type => (
                    <button
                        key={type}
                        className={`filter-button ${filterType === type ? "active" : ""}`}
                        onClick={() => setFilterType(type)}
                    >
                        {type}
                    </button>
                ))}
                <select
                    className="filter-select"
                    value={displayProductType}
                    onChange={(e) => setFilterProductType(e.target.value)}
                >
                    <option value="All">All Types</option>
                    <option value="sell">For Sale</option>
                    {userRole === 'ngo' && <option value="donate">Donations</option>}
                </select>
                <input
                    type="text"
                    placeholder="Filter by location..."
                    value={filterLocation}
                    onChange={(e) => setFilterLocation(e.target.value)}
                    className="filter-location"
                />
            </div>

            <main className="homepage-main">
                {authMessage && (
                    <div className="auth-message">
                        <p>{authMessage}</p>
                    </div>
                )}
                <h1>Available Food Products</h1>
                {loading ? (
                    <div className="empty-state">
                        <p>Loading products...</p>
                    </div>
                ) : filteredProducts.length === 0 ? (
                    <div className="empty-state">
                        <p>No products available yet.</p>
                    </div>
                ) : (
                <div className="product-list">
                    {filteredProducts.map(product => {
                        const { finalPrice, discount, daysToExpiry } = getDiscountedPrice(product);
                        return (
                            <div key={product._id || product.id} className="product-card">
                                <img src={product.image} alt={product.name} className="product-image" />
                                <h3>{product.name}</h3>
                                <p><strong>Category:</strong> {product.category}</p>
                                <p><strong>Qty:</strong> {product.quantity || 1} {product.quantityUnit || 'units'}</p>
                                <p><strong>Price:</strong> {product.type === 'donate' ? 'FREE (Donation)' : `$${finalPrice}`}</p>
                                {product.type !== 'donate' && discount > 0 && (
                                    <p><strong>Discount:</strong> {discount}% off</p>
                                )}
                                <p><strong>Expiry:</strong> {product.expiry}</p>
                                {daysToExpiry <= 5 && daysToExpiry > 0 && (
                                    <p className="expiry-warning">
                                        Expires in {daysToExpiry} day{daysToExpiry !== 1 ? 's' : ''}
                                    </p>
                                )}
                                {daysToExpiry <= 0 && (
                                    <p className="expiry-warning expiry-warning--expired">
                                        EXPIRED
                                    </p>
                                )}
                                {product.seller && (
                                    <p><strong>Seller:</strong> {product.seller.profile?.firstName || product.seller.username || 'Unknown'}</p>
                                )}
                                {product.seller?.profile?.shopRating?.count > 0 && (
                                    <p>
                                        <strong>Shop Rating:</strong> {Number(product.seller.profile.shopRating.average || 0).toFixed(1)} / 5
                                        {' '}({product.seller.profile.shopRating.count} ratings)
                                    </p>
                                )}
                                {product.location?.city && (
                                    <p><strong>Location:</strong> {product.location.city}{product.location.state ? `, ${product.location.state}` : ''}</p>
                                )}
                                {product.distance !== null && product.distance !== undefined && (
                                    <p><strong>Distance:</strong> {product.distance.toFixed(1)} km away</p>
                                )}
                                <button onClick={() => addToCart(product)}>Add to Cart</button>
                            </div>
                        );
                    })}
                </div>
                )}

                <div className="cart-section">
                    <h2>Cart {cartStore ? `(Store: ${cartStore})` : ""}</h2>
                    {cart.length === 0 ? (
                        <p>No items in cart</p>
                    ) : (
                        <>
                            <ul>
                                {cart.map((item, index) => {
                                    const { finalPrice } = getDiscountedPrice(item);
                                    return (
                                        <li key={index}>
                                            {item.name} - ${finalPrice}
                                            <button
                                                onClick={() => removeFromCart(index)}
                                                className="remove-button"
                                            >
                                                Remove
                                            </button>
                                        </li>
                                    );
                                })}
                            </ul>
                            <div className="cart-actions">
                                <button onClick={proceedToCheckout}>Proceed to Checkout</button>
                                <button onClick={clearCart}>Clear Cart</button>
                            </div>
                        </>
                    )}
                    {message && <p className="cart-message">{message}</p>}
                </div>
            </main>
        </div>
    );
};

export default GreenShelfHomepage;