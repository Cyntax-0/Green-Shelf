import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import api from './services/api';
import './styles/Profile.css';

const Checkout = () => {
    const navigate = useNavigate();
    const { user, token } = useAuth();
    const [selectedAddress, setSelectedAddress] = useState('');
    const [paymentMethod, setPaymentMethod] = useState('cash');
    const [orderNotes, setOrderNotes] = useState('');
    const [showSuccess, setShowSuccess] = useState(false);
    const [cartItems, setCartItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [cartStore, setCartStore] = useState('');
    
    useEffect(() => {
        const fetchCart = async () => {
            try {
                setLoading(true);
                const response = await api.request('/cart', {
                    method: 'GET',
                    headers: { Authorization: `Bearer ${token}` }
                });
                if (response.success && response.data) {
                    const items = response.data.items || [];
                    if (items.length === 0) {
                        setCartItems([]);
                        return;
                    }
                    // Set store info if available (fallback to localStorage)
                    const detectedStore = response.data.store || localStorage.getItem('cartStore') || '';
                    setCartStore(detectedStore);
                    const formattedItems = await Promise.all(items.map(async (item) => {
                        let product = item.product;
                        // If product is just an ID or not fully populated, fetch it
                        if (!product || typeof product === 'string' || !product.name) {
                            const productId = typeof product === 'string' ? product : (product?._id || product?.id || item.product);
                            if (productId) {
                                try {
                                    const prodResponse = await api.products.getById(productId);
                                    if (prodResponse.success && prodResponse.data) {
                                        product = prodResponse.data;
                                    }
                                } catch (err) {
                                    console.error('Error fetching product:', err);
                                }
                            }
                        }
                        return {
                            id: product?._id || product?.id,
                            name: product?.name || 'Unknown Product',
                            image: product?.image || product?.images?.[0] || 'https://via.placeholder.com/300x200?text=Product',
                            price: product?.price || product?.originalPrice || 0,
                            originalPrice: product?.originalPrice || product?.price || 0,
                            expiry: product?.expiry || '',
                            category: product?.category || '',
                            quantityUnit: product?.quantityUnit || 'units',
                            type: product?.type || 'sell',
                            discountType: product?.discountType || 'percent',
                            currentDiscount: product?.currentDiscount || 0,
                            quantity: item.quantity || 1
                        };
                    }));
                    setCartItems(formattedItems.filter(item => item.id)); // Filter out invalid items
                } else {
                    setCartItems([]);
                }
            } catch (error) {
                console.error('Error fetching cart:', error);
                setCartItems([]);
            } finally {
                setLoading(false);
            }
        };
        if (token) {
            fetchCart();
        }
    }, [token]);
    
    const calculateTotal = () => {
        return cartItems.reduce((sum, item) => {
            const price = item.price || item.originalPrice || 0;
            const expiry = item.expiry ? new Date(item.expiry) : null;
            let discount = 0;
            if (expiry) {
                const daysToExpiry = Math.ceil((expiry - new Date()) / (1000 * 60 * 60 * 24));
                if (daysToExpiry <= 0) discount = 0;
                else if (daysToExpiry === 1) discount = 0.5;
                else if (daysToExpiry <= 2) discount = 0.3;
                else if (daysToExpiry <= 5) discount = 0.2;
                else if (daysToExpiry <= 7) discount = 0.1;
            }
            const finalPrice = price * (1 - discount);
            return sum + (finalPrice * (item.quantity || 1));
        }, 0);
    };

    const isProfileComplete = () => {
        const p = user?.profile || {};
        const hasName = Boolean((p.firstName || '').trim()) && Boolean((p.lastName || '').trim());
        const hasPhone = Boolean((p.phone || '').trim());
        const addr = p.address;
        const hasAddress = Array.isArray(addr)
            ? addr.some(a => (a || '').trim())
            : !!(addr && (addr.street || addr.city || addr.state || addr.zipCode || addr.country));
        return hasName && hasPhone && hasAddress;
    };

    const handlePlaceOrder = () => {
        if (!isProfileComplete()) {
            alert('Please complete your profile (name, phone, address) before placing an order.');
            navigate('/customer');
            return;
        }
        if (!selectedAddress) {
            alert('Please select a delivery address');
            return;
        }
        
        const orderData = {
            items: cartItems,
            store: cartStore,
            total: calculateTotal(),
            address: selectedAddress,
            paymentMethod,
            orderNotes,
            date: new Date().toISOString()
        };
        
        try {
            const existingOrders = JSON.parse(localStorage.getItem('orders') || '[]');
            localStorage.setItem('orders', JSON.stringify([{ id: Date.now(), ...orderData }, ...existingOrders]));
            localStorage.removeItem('cartItems');
            localStorage.removeItem('cartStore');
            setShowSuccess(true);
            setTimeout(() => {
                navigate('/');
            }, 2000);
        } catch (error) {
            alert('Error placing order. Please try again.');
        }
    };

    const formatAddress = (addr) => {
        if (!addr) return '';
        if (typeof addr === 'string') return addr;
        const parts = [
            addr.street,
            addr.city,
            addr.state,
            addr.zipCode,
            addr.country
        ].filter(Boolean);
        return parts.join(', ') || '';
    };

    const addresses = user?.profile?.address 
        ? (Array.isArray(user.profile.address) 
            ? user.profile.address 
            : [formatAddress(user.profile.address)])
        : [];

    return (
        <div className="profile-page">
            <header className="profile-header">
                <div className="logo" onClick={() => navigate('/')}>GreenShelf</div>
                <nav className="profile-tabs">
                    <button onClick={() => navigate('/')}>Continue Shopping</button>
                </nav>
            </header>

            <main className="profile-main">
                <h2>Checkout</h2>
                {loading ? (
                    <div>
                        <p>Loading cart...</p>
                    </div>
                ) : cartItems.length === 0 ? (
                    <div>
                        <p>Your cart is empty.</p>
                        <button className="primary" onClick={() => navigate('/')}>Continue Shopping</button>
                    </div>
                ) : (
                    <div className="orders-list" style={{ gridTemplateColumns: '1fr 1fr' }}>
                        <div className="card">
                            <h3>Order Summary</h3>
                            <p><strong>Store:</strong> {cartStore}</p>
                            
                            <div className="info-field">
                                <label><strong>Delivery Address:</strong></label>
                                <select value={selectedAddress} onChange={(e) => setSelectedAddress(e.target.value)}>
                                    <option value="">Select an address</option>
                                    {addresses.map((addr, idx) => (
                                        <option key={idx} value={addr}>{addr}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="info-field">
                                <label><strong>Payment Method:</strong></label>
                                <div>
                                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                                        <input type="radio" name="payment" value="cash" checked={paymentMethod === 'cash'} onChange={(e) => setPaymentMethod(e.target.value)} />
                                        Cash on Delivery
                                    </label>
                                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                                        <input type="radio" name="payment" value="card" checked={paymentMethod === 'card'} onChange={(e) => setPaymentMethod(e.target.value)} />
                                        Credit/Debit Card
                                    </label>
                                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <input type="radio" name="payment" value="upi" checked={paymentMethod === 'upi'} onChange={(e) => setPaymentMethod(e.target.value)} />
                                        UPI
                                    </label>
                                </div>
                            </div>

                            <div className="info-field">
                                <label><strong>Order Notes (Optional):</strong></label>
                                <textarea value={orderNotes} onChange={(e) => setOrderNotes(e.target.value)} placeholder="Any special instructions?" />
                            </div>

                            <div className="cart-items">
                                {cartItems.map((item, index) => {
                                    const daysToExpiry = Math.ceil((new Date(item.expiry) - new Date()) / (1000 * 60 * 60 * 24));
                                    let discount = 0;
                                    if (daysToExpiry <= 0) discount = 0;
                                    else if (daysToExpiry === 1) discount = 0.5;
                                    else if (daysToExpiry <= 2) discount = 0.3;
                                    else if (daysToExpiry <= 5) discount = 0.2;
                                    else if (daysToExpiry <= 7) discount = 0.1;
                                    const finalPrice = item.price * (1 - discount);
                                    
                                    return (
                                        <div key={index} className="cart-item">
                                            <span>{item.name || 'Unknown Product'}</span>
                                            <span>${(finalPrice * (item.quantity || 1)).toFixed(2)}</span>
                                        </div>
                                    );
                                })}
                            </div>
                            <div className="cart-total">
                                <strong>Total: ${calculateTotal().toFixed(2)}</strong>
                            </div>

                            {showSuccess && (
                                <div className="banner success">✓ Order Placed Successfully! Redirecting...</div>
                            )}

                            <div className="inline-form" style={{ display: 'flex', gap: '12px', background: 'transparent', border: 'none', padding: 0, marginTop: '1rem' }}>
                                <button className="primary" onClick={handlePlaceOrder} disabled={showSuccess}>
                                    Place Order
                                </button>
                                <button onClick={() => navigate('/')} disabled={showSuccess}>
                                    Cancel
                                </button>
                            </div>
                        </div>

                        <div className="card">
                            <h3>Order Details</h3>
                            {cartItems.map((item, index) => {
                                const daysToExpiry = Math.ceil((new Date(item.expiry) - new Date()) / (1000 * 60 * 60 * 24));
                                let discount = 0;
                                if (daysToExpiry <= 0) discount = 0;
                                else if (daysToExpiry === 1) discount = 0.5;
                                else if (daysToExpiry <= 2) discount = 0.3;
                                else if (daysToExpiry <= 5) discount = 0.2;
                                else if (daysToExpiry <= 7) discount = 0.1;
                                const finalPrice = item.price * (1 - discount);
                                
                                    return (
                                        <div key={index} className="info-field">
                                            <label style={{ marginBottom: '8px' }}>{item.name || 'Unknown Product'}</label>
                                            <p>Quantity: {item.quantity || 1}</p>
                                            <p>Original Price: ${(item.originalPrice || item.price || 0).toFixed(2)}</p>
                                            <p>Discount: {Math.round(discount * 100)}%</p>
                                            <p><strong>Price: ${(finalPrice * (item.quantity || 1)).toFixed(2)}</strong></p>
                                        </div>
                                    );
                            })}
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
};

export default Checkout;

