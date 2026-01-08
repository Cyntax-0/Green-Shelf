import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import "./styles/Homepage.css";
import api from './services/api';
import { sampleProducts } from './sampleData';

const GreenShelfHomepage = ({ onNavigateToLogin, loggedIn, currentUser }) => {
    const [cart, setCart] = useState([]);
    const [cartStore, setCartStore] = useState(null);
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [filterType, setFilterType] = useState('All');
    const [filterLocation, setFilterLocation] = useState('');
    const [message, setMessage] = useState('');
    const [authMessage, setAuthMessage] = useState('');
    const [publicDonations, setPublicDonations] = useState([]);
    const navigate = useNavigate();
    const location = useLocation();

    useEffect(() => {
        const fetchProducts = async () => {
            try {
                setLoading(true);
                const response = await api.products.getAll();
                if (response.success) {
                    setProducts(response.data?.products || []);
                } else {
                    setProducts(sampleProducts);
                }
            } catch (error) {
                setProducts(sampleProducts);
            } finally {
                setLoading(false);
            }
        };
        fetchProducts();
    }, []);

    // Load persisted cart from server when authenticated
    useEffect(() => {
        const loadServerCart = async () => {
            try {
                const token = localStorage.getItem('authToken');
                if (!loggedIn || !token) return;
                const response = await api.cart.get(token);
                if (response.success && response.data) {
                    const serverItems = (response.data.items || []).map(ci => {
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
                            quantity: ci.quantity || 1
                        };
                    });
                    setCart(serverItems);
                }
            } catch (_) {}
        };
        loadServerCart();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [loggedIn]);

    // removed auto-refresh on visibility change

    // Check if user was redirected from a protected route
    useEffect(() => {
        if (location.state?.from) {
            setAuthMessage('Please log in to access that page.');
            // Clear the message after 5 seconds
            setTimeout(() => setAuthMessage(''), 5000);
        }
    }, [location.state]);

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
            const role = (currentUser?.role || 'customer').toLowerCase();
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

    const result = getDiscountedPrice;

    const addToCart = async (product) => {
        if ((currentUser?.role || '').toLowerCase() === 'ngo' && !currentUser?.profile?.verified) {
            setMessage('NGO account not verified yet. Please wait for admin approval.');
            setTimeout(() => setMessage(''), 3000);
            return;
        }
        if (cartStore && cartStore !== product.store) {
            setMessage(`You can only buy from one store at a time. Current store: ${cartStore}`);
            return;
        }

        if (!cartStore) {
            setCartStore(product.store);
        }

        const token = localStorage.getItem('authToken');
        const productId = product._id || product.id;
        try {
            if (loggedIn && token && productId) {
                const resp = await api.cart.add(token, productId, 1);
                if (resp.success && resp.data) {
                    const serverItems = (resp.data.items || []).map(ci => {
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
                            quantity: ci.quantity || 1
                        };
                    });
                    setCart(serverItems);
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
                    setCart([...cart, { ...product, id: productId, quantity: 1 }]);
                }
            }
            setMessage(`${product.name} added to cart!`);
            setTimeout(() => setMessage(''), 3000);
        } catch (e) {
            setMessage('Failed to add to cart.');
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
                    const serverItems = (resp.data.items || []).map(ci => {
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
                            quantity: ci.quantity || 1
                        };
                    });
                    setCart(serverItems);
                }
            } else {
                const newCart = cart.filter((_, i) => i !== index);
                setCart(newCart);
            }
        } catch (_) {
            // ignore
        } finally {
            const newCart = (productId && (loggedIn && token)) ? cart.filter((_, i) => i !== index) : cart;
            if (newCart.length === 0) {
                setCartStore(null);
            }
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
        localStorage.setItem('cartItems', JSON.stringify(cart));
        localStorage.setItem('cartStore', cartStore);
        navigate('/checkout');
    };

    // removed manual refresh function

    const filteredProducts = products.filter(product => {
        const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesType = filterType === "All" || product.type === filterType;
        const matchesLocation = filterLocation === "" || (product.store || '').toLowerCase().includes(filterLocation.toLowerCase());
        return matchesSearch && matchesType && matchesLocation;
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
                    <button className="auth-button" onClick={() => navigate('/admin')}>Admin</button>
                    <button className="auth-button" onClick={handleProfileNavigation}>{loggedIn ? (displayName || 'Profile') : 'Login'}</button>
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
                <input
                    type="text"
                    placeholder="Filter by store name or address..."
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
                                    <p className="expiry-warning" style={{color: '#d32f2f', fontWeight: 'bold'}}>
                                        ⚠ Expires in {daysToExpiry} day{daysToExpiry !== 1 ? 's' : ''}!
                                    </p>
                                )}
                                {daysToExpiry <= 0 && (
                                    <p className="expiry-warning" style={{color: '#d32f2f', fontWeight: 'bold'}}>
                                        ⚠ EXPIRED!
                                    </p>
                                )}
                                {product.seller && (
                                    <p><strong>Seller:</strong> {product.seller.profile?.firstName || product.seller.username || 'Unknown'}</p>
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