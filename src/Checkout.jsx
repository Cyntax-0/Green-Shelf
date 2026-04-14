import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import api from './services/api';
import './styles/Profile.css';
import './styles/Checkout.css';

const Checkout = () => {
    const navigate = useNavigate();
    const { user, token, checkAuthStatus } = useAuth();
    const [selectedAddress, setSelectedAddress] = useState('');
    const [paymentMethod, setPaymentMethod] = useState('cash');
    const [orderNotes, setOrderNotes] = useState('');
    const [showSuccess, setShowSuccess] = useState(false);
    const [createdOrderId, setCreatedOrderId] = useState('');
    const [pendingRatings, setPendingRatings] = useState([]);
    const [isSubmittingOrder, setIsSubmittingOrder] = useState(false);
    const [cartItems, setCartItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [cartStore, setCartStore] = useState('');
    const [savedAddresses, setSavedAddresses] = useState([]);
    const [addressFormOpen, setAddressFormOpen] = useState(false);
    const [addressForm, setAddressForm] = useState({
        street: '',
        city: '',
        state: '',
        zipCode: '',
        country: ''
    });
    
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
                                    const prodResponse = await api.products.getById(productId, token);
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
                            type:
                                product?.type ||
                                (typeof item.product === 'object' && item.product?.type) ||
                                'sell',
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

    useEffect(() => {
        if (token) {
            checkAuthStatus();
        }
    }, [token]);

    useEffect(() => {
        const r = String(user?.role ?? '').trim().toLowerCase();
        if (user && r === 'admin') {
            navigate('/admin');
        }
    }, [user, navigate]);
    
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
    const isDonationOnlyOrder = cartItems.length > 0 && cartItems.every((item) => item.type === 'donate');

    const isProfileComplete = () => {
        const p = user?.profile || {};
        const role = String(user?.role ?? '').trim().toLowerCase();
        const hasName = role === 'ngo'
            ? Boolean((p.organizationName || user?.username || user?.email || '').trim())
            : Boolean((p.firstName || user?.username || user?.email || '').trim());
        const hasPhone = Boolean((p.phone || '').trim());
        const addr = p.address;
        const hasAddress = Array.isArray(addr)
            ? addr.some(a => (a || '').trim())
            : !!(addr && (addr.street || addr.city || addr.state || addr.zipCode || addr.country));
        return hasName && hasPhone && hasAddress;
    };

    const handlePlaceOrder = async () => {
        const role = String(user?.role ?? '').trim().toLowerCase();
        if (role === 'admin') {
            alert('Admin accounts cannot place orders.');
            navigate('/admin');
            return;
        }
        const hasDonationItems = cartItems.some((item) => item.type === 'donate');
        if ((role === 'customer' || role === 'seller') && hasDonationItems) {
            alert('Only NGO accounts can order donation items. Remove donation items from your cart.');
            navigate('/home');
            return;
        }
        if (role === 'ngo' && hasDonationItems && !user?.profile?.verified) {
            alert('Only verified NGO accounts can place orders for donation items.');
            navigate('/ngo');
            return;
        }
        if (!isProfileComplete()) {
            alert('Please complete your profile (name/organization, phone, address) before placing an order.');
            navigate(role === 'ngo' ? '/ngo' : '/customer');
            return;
        }
        if (!selectedAddress) {
            alert('Please select a delivery address');
            return;
        }

        try {
            setIsSubmittingOrder(true);
            const profileAddress = user?.profile?.address || {};
            const shippingAddress = {
                firstName: user?.profile?.firstName || user?.profile?.organizationName || user?.username || 'User',
                lastName: user?.profile?.lastName || '-',
                street: selectedAddress || profileAddress?.street || '',
                city: profileAddress?.city || '',
                state: profileAddress?.state || '',
                zipCode: profileAddress?.zipCode || '',
                country: profileAddress?.country || '',
                phone: user?.profile?.phone || ''
            };

            const response = await api.orders.create(token, {
                shippingAddress,
                billingAddress: shippingAddress,
                paymentMethod,
                shippingMethod: 'standard',
                selectedAddress,
                orderNotes
            });

            const createdOrder = response?.data?.order;
            if (!response?.success || !createdOrder?._id) {
                throw new Error('Failed to place order.');
            }

            setCreatedOrderId(createdOrder._id);
            const sellers = response?.data?.sellerSummaries || [];
            setPendingRatings(
                sellers.map((seller) => ({
                    sellerId: seller.sellerId,
                    sellerName: seller.sellerName,
                    rating: 5,
                    comment: ''
                }))
            );

            localStorage.removeItem('cartItems');
            localStorage.removeItem('cartStore');
            setCartItems([]);
            setShowSuccess(true);
        } catch (error) {
            alert(error?.message || 'Error placing order. Please try again.');
        } finally {
            setIsSubmittingOrder(false);
        }
    };

    const submitSellerRating = async (sellerRating) => {
        if (!createdOrderId || !token) return;
        await api.orders.rateShop(
            createdOrderId,
            sellerRating.sellerId,
            Number(sellerRating.rating),
            sellerRating.comment,
            token
        );
        setPendingRatings((prev) => prev.filter((item) => item.sellerId !== sellerRating.sellerId));
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

    useEffect(() => {
        const stored = localStorage.getItem(`checkoutAddresses:${user?._id || 'guest'}`);
        const parsed = stored ? JSON.parse(stored) : [];
        const merged = [...new Set([...addresses.filter(Boolean), ...parsed.filter(Boolean)])];
        setSavedAddresses(merged);
        if (!selectedAddress && merged.length > 0) {
            setSelectedAddress(merged[0]);
        }
    }, [user?._id, user?.profile?.address]);

    useEffect(() => {
        if (isDonationOnlyOrder) {
            setPaymentMethod('cash');
        }
    }, [isDonationOnlyOrder]);

    const addNewAddress = async () => {
        const { street, city, state, zipCode, country } = addressForm;
        if (!street || !city || !state || !zipCode || !country) {
            alert('Please fill all address fields.');
            return;
        }
        const formatted = formatAddress(addressForm);
        const next = [...new Set([formatted, ...savedAddresses])];
        setSavedAddresses(next);
        setSelectedAddress(formatted);
        localStorage.setItem(`checkoutAddresses:${user?._id || 'guest'}`, JSON.stringify(next));
        try {
            if (token) {
                await api.auth.updateProfile(token, {
                    profile: { address: { ...addressForm } }
                });
            }
        } catch (_e) {}
        setAddressForm({ street: '', city: '', state: '', zipCode: '', country: '' });
        setAddressFormOpen(false);
    };

    return (
        <div className="profile-page checkout-page">
            <header className="profile-header">
                <div className="logo" onClick={() => navigate('/home')}>GreenShelf</div>
                <nav className="profile-tabs">
                    <button className="secondary" onClick={() => navigate('/home')}>Continue Shopping</button>
                </nav>
            </header>

            <main className="profile-main checkout-main">
                <h2>Checkout</h2>
                {loading ? (
                    <div>
                        <p>Loading cart...</p>
                    </div>
                ) : cartItems.length === 0 ? (
                    <div>
                        <p>Your cart is empty.</p>
                        <button className="primary" onClick={() => navigate('/home')}>Continue Shopping</button>
                    </div>
                ) : (
                    <div className="checkout-content">
                        <div className="order-summary">
                            <h3>Order Summary</h3>
                            <p><strong>Store:</strong> {cartStore}</p>
                            
                            <div className="form-field">
                                <label>Delivery Address</label>
                                <select value={selectedAddress} onChange={(e) => setSelectedAddress(e.target.value)}>
                                    <option value="">Select an address</option>
                                    {savedAddresses.map((addr, idx) => (
                                        <option key={idx} value={addr}>{addr}</option>
                                    ))}
                                </select>
                                <button className="secondary" onClick={() => setAddressFormOpen((v) => !v)}>
                                    {addressFormOpen ? 'Cancel New Address' : '+ Add New Address'}
                                </button>
                            </div>

                            {addressFormOpen && (
                                <div className="form-field">
                                    <label>New Address</label>
                                    <input placeholder="Street" value={addressForm.street} onChange={(e) => setAddressForm({ ...addressForm, street: e.target.value })} />
                                    <input placeholder="City" value={addressForm.city} onChange={(e) => setAddressForm({ ...addressForm, city: e.target.value })} />
                                    <input placeholder="State" value={addressForm.state} onChange={(e) => setAddressForm({ ...addressForm, state: e.target.value })} />
                                    <input placeholder="ZIP Code" value={addressForm.zipCode} onChange={(e) => setAddressForm({ ...addressForm, zipCode: e.target.value })} />
                                    <input placeholder="Country" value={addressForm.country} onChange={(e) => setAddressForm({ ...addressForm, country: e.target.value })} />
                                    <button className="primary" onClick={addNewAddress}>Save Address</button>
                                </div>
                            )}

                            {!isDonationOnlyOrder ? (
                                <div className="form-field">
                                    <label>Payment Method</label>
                                    <div className="payment-options">
                                        <label>
                                            <input type="radio" name="payment" value="cash" checked={paymentMethod === 'cash'} onChange={(e) => setPaymentMethod(e.target.value)} />
                                            Cash on Delivery
                                        </label>
                                        <label>
                                            <input type="radio" name="payment" value="upi" checked={paymentMethod === 'upi'} onChange={(e) => setPaymentMethod(e.target.value)} />
                                            UPI on Delivery
                                        </label>
                                    </div>
                                </div>
                            ) : (
                                <div className="success-banner">
                                    Donation-only order: payment is not required.
                                </div>
                            )}

                            <div className="form-field">
                                <label>Order Notes (Optional)</label>
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
                            <div className="total-section">
                                <strong>Total: ${calculateTotal().toFixed(2)}</strong>
                            </div>

                            {showSuccess && (
                                <div className="banner success">
                                    Order placed successfully. Please rate the shop to help authenticity.
                                </div>
                            )}

                            {showSuccess && pendingRatings.length > 0 && (
                                <div className="card" style={{ marginTop: '1rem' }}>
                                    <h3>Rate Your Purchase</h3>
                                    {pendingRatings.map((sellerRating) => (
                                        <div key={sellerRating.sellerId} className="info-field" style={{ marginBottom: '0.75rem' }}>
                                            <label>{sellerRating.sellerName}</label>
                                            <select
                                                value={sellerRating.rating}
                                                onChange={(e) =>
                                                    setPendingRatings((prev) =>
                                                        prev.map((item) =>
                                                            item.sellerId === sellerRating.sellerId
                                                                ? { ...item, rating: Number(e.target.value) }
                                                                : item
                                                        )
                                                    )
                                                }
                                            >
                                                <option value={5}>5 - Excellent</option>
                                                <option value={4}>4 - Good</option>
                                                <option value={3}>3 - Average</option>
                                                <option value={2}>2 - Poor</option>
                                                <option value={1}>1 - Very Poor</option>
                                            </select>
                                            <textarea
                                                placeholder="Optional feedback"
                                                value={sellerRating.comment}
                                                onChange={(e) =>
                                                    setPendingRatings((prev) =>
                                                        prev.map((item) =>
                                                            item.sellerId === sellerRating.sellerId
                                                                ? { ...item, comment: e.target.value }
                                                                : item
                                                        )
                                                    )
                                                }
                                            />
                                            <button className="primary" onClick={() => submitSellerRating(sellerRating)}>
                                                Submit Rating
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {showSuccess && pendingRatings.length === 0 && (
                                <div className="inline-form" style={{ background: 'transparent', border: 'none', padding: 0 }}>
                                    <button className="primary" onClick={() => navigate('/home')}>
                                        Back to Home
                                    </button>
                                </div>
                            )}

                            <div className="checkout-actions">
                                <button className="primary" onClick={handlePlaceOrder} disabled={showSuccess || isSubmittingOrder}>
                                    Place Order
                                </button>
                                <button className="secondary" onClick={() => navigate('/home')} disabled={showSuccess || isSubmittingOrder}>
                                    Cancel
                                </button>
                            </div>
                        </div>

                        <div className="order-details">
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
                                            <p>Original Price: {item.type === 'donate' ? 'FREE' : `$${(item.originalPrice || item.price || 0).toFixed(2)}`}</p>
                                            <p>Discount: {item.type === 'donate' ? '100%' : `${Math.round(discount * 100)}%`}</p>
                                            <p><strong>Price: {item.type === 'donate' ? 'FREE' : `$${(finalPrice * (item.quantity || 1)).toFixed(2)}`}</strong></p>
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

