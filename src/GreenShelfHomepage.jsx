import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import "./styles/Homepage.css";
import api from './services/api';

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
                console.log('Homepage: Fetching products from database...');
                // Fetch products from database
                const response = await api.products.getAll();
                console.log('Homepage: API response:', response);
                if (response.success) {
                    setProducts(response.data?.products || []);
                    console.log('Homepage: Products set:', response.data?.products?.length || 0);
                } else {
                    console.log('Homepage: No products found in database');
                    setProducts([]);
                }
            } catch (error) {
                console.error('Homepage: Error fetching products:', error);
                setProducts([]);
            } finally {
                setLoading(false);
            }
        };
        fetchProducts();
    }, []);

    // Refresh products when component becomes visible (for new products)
    useEffect(() => {
        const handleVisibilityChange = () => {
            if (!document.hidden) {
                const fetchProducts = async () => {
                    try {
                        const response = await api.products.getAll();
                        if (response.success) {
                            setProducts(response.data?.products || []);
                        }
                    } catch (error) {
                        console.error('Error refreshing products:', error);
                    }
                };
                fetchProducts();
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);
        return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
    }, []);

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

    const addToCart = (product) => {
        if (cartStore && cartStore !== product.store) {
            setMessage(`You can only buy from one store at a time. Current store: ${cartStore}`);
            return;
        }

        if (!cartStore) {
            setCartStore(product.store);
        }

        const existingItem = cart.find(item => item.id === product.id);
        if (existingItem) {
            setCart(cart.map(item => 
                item.id === product.id 
                    ? { ...item, quantity: item.quantity + 1 }
                    : item
            ));
        } else {
            setCart([...cart, { ...product, quantity: 1 }]);
        }
        setMessage(`${product.name} added to cart!`);
        setTimeout(() => setMessage(''), 3000);
    };

    const removeFromCart = (index) => {
        const newCart = cart.filter((_, i) => i !== index);
        setCart(newCart);
        if (newCart.length === 0) {
            setCartStore(null);
        }
    };

    const clearCart = () => {
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

    const refreshProducts = async () => {
        try {
            setLoading(true);
            const response = await api.products.getAll();
            if (response.success) {
                setProducts(response.data?.products || []);
                setMessage('Products refreshed successfully!');
            } else {
                setMessage('Failed to refresh products.');
            }
        } catch (error) {
            console.error('Error refreshing products:', error);
            setMessage('Error refreshing products.');
        } finally {
            setLoading(false);
            setTimeout(() => setMessage(''), 3000);
        }
    };

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
                    <button className="refresh-button" onClick={refreshProducts} disabled={loading}>
                        {loading ? 'Loading...' : '🔄 Refresh'}
                    </button>
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
                                {product.type !== 'donate' && (
                                    <button onClick={() => addToCart(product)}>Add to Cart</button>
                                )}
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