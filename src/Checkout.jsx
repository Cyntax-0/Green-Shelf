import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import './styles/Profile.css';

const Checkout = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [selectedAddress, setSelectedAddress] = useState('');
    const [paymentMethod, setPaymentMethod] = useState('cash');
    const [orderNotes, setOrderNotes] = useState('');
    const [showSuccess, setShowSuccess] = useState(false);
    
    const cartItems = JSON.parse(localStorage.getItem('cartItems') || '[]');
    const cartStore = localStorage.getItem('cartStore') || '';
    
    const calculateTotal = () => {
        return cartItems.reduce((sum, item) => {
            const daysToExpiry = Math.ceil((new Date(item.expiry) - new Date()) / (1000 * 60 * 60 * 24));
            let discount = 0;
            if (daysToExpiry <= 0) discount = 0;
            else if (daysToExpiry === 1) discount = 0.5;
            else if (daysToExpiry <= 2) discount = 0.3;
            else if (daysToExpiry <= 5) discount = 0.2;
            else if (daysToExpiry <= 7) discount = 0.1;
            const finalPrice = item.price * (1 - discount);
            return sum + (finalPrice * item.quantity);
        }, 0);
    };

    const handlePlaceOrder = () => {
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

    const addresses = user?.profile?.address || ['123 Main St, City, State 12345'];

    return (
        <div className="profile-page">
            <header className="profile-header">
                <div className="logo" onClick={() => navigate('/')}>GreenShelf</div>
                <nav className="profile-tabs">
                    <button onClick={() => navigate('/')}>Continue Shopping</button>
                </nav>
            </header>

            <main className="profile-main" style={{ padding: '20px' }}>
                <h2>Checkout</h2>
                {cartItems.length === 0 ? (
                    <div>
                        <p>Your cart is empty.</p>
                        <button className="primary" onClick={() => navigate('/')}>Continue Shopping</button>
                    </div>
                ) : (
                    <div className="checkout-content" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                        <div className="order-summary">
                            <h3>Order Summary</h3>
                            <p><strong>Store:</strong> {cartStore}</p>
                            
                            <div style={{ marginBottom: '16px' }}>
                                <label><strong>Delivery Address:</strong></label>
                                <select value={selectedAddress} onChange={(e) => setSelectedAddress(e.target.value)} style={{ width: '100%', padding: '8px', marginTop: '8px', borderRadius: '4px', border: '1px solid #ccc' }}>
                                    <option value="">Select an address</option>
                                    {addresses.map((addr, idx) => (
                                        <option key={idx} value={addr}>{addr}</option>
                                    ))}
                                </select>
                            </div>

                            <div style={{ marginBottom: '16px' }}>
                                <label><strong>Payment Method:</strong></label>
                                <div style={{ marginTop: '8px' }}>
                                    <label style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
                                        <input type="radio" name="payment" value="cash" checked={paymentMethod === 'cash'} onChange={(e) => setPaymentMethod(e.target.value)} style={{ marginRight: '8px' }} />
                                        Cash on Delivery
                                    </label>
                                    <label style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
                                        <input type="radio" name="payment" value="card" checked={paymentMethod === 'card'} onChange={(e) => setPaymentMethod(e.target.value)} style={{ marginRight: '8px' }} />
                                        Credit/Debit Card
                                    </label>
                                    <label style={{ display: 'flex', alignItems: 'center' }}>
                                        <input type="radio" name="payment" value="upi" checked={paymentMethod === 'upi'} onChange={(e) => setPaymentMethod(e.target.value)} style={{ marginRight: '8px' }} />
                                        UPI
                                    </label>
                                </div>
                            </div>

                            <div style={{ marginBottom: '16px' }}>
                                <label><strong>Order Notes (Optional):</strong></label>
                                <textarea value={orderNotes} onChange={(e) => setOrderNotes(e.target.value)} placeholder="Any special instructions?" style={{ width: '100%', padding: '8px', marginTop: '8px', borderRadius: '4px', border: '1px solid #ccc', minHeight: '80px' }} />
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
                                        <div key={index} className="border" style={{ padding: '12px', marginBottom: '12px', borderRadius: '8px' }}>
                                            <img src={item.image} alt={item.name} style={{ width: '100px', height: '80px', objectFit: 'cover', borderRadius: '4px' }} />
                                            <h4>{item.name}</h4>
                                            <p>Quantity: {item.quantity}</p>
                                            <p>Original Price: ${item.price}</p>
                                            <p>Discount: {Math.round(discount * 100)}%</p>
                                            <p><strong>Price: ${(finalPrice * item.quantity).toFixed(2)}</strong></p>
                                        </div>
                                    );
                                })}
                            </div>
                            <div className="total-section" style={{ marginTop: '20px', padding: '16px', background: '#f5f5f5', borderRadius: '8px' }}>
                                <h3>Subtotal: ${calculateTotal().toFixed(2)}</h3>
                                <p>Delivery Fee: $0.00</p>
                                <h3>Total: ${calculateTotal().toFixed(2)}</h3>
                            </div>

                            {showSuccess && (
                                <div style={{ background: '#4caf50', color: 'white', padding: '16px', borderRadius: '8px', marginTop: '16px' }}>
                                    <h3>✓ Order Placed Successfully!</h3>
                                    <p>Thank you for your order. Redirecting...</p>
                                </div>
                            )}

                            <div className="checkout-actions" style={{ marginTop: '20px' }}>
                                <button className="primary" onClick={handlePlaceOrder} disabled={showSuccess} style={{ padding: '12px 24px', fontSize: '16px' }}>
                                    Place Order
                                </button>
                                <button onClick={() => navigate('/')} disabled={showSuccess} style={{ marginLeft: '12px', padding: '12px 24px' }}>
                                    Cancel
                                </button>
                            </div>
                        </div>

                        <div className="order-summary">
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
                                    <div key={index} className="border" style={{ padding: '12px', marginBottom: '12px', borderRadius: '8px', display: 'flex', gap: '12px' }}>
                                        <img src={item.image} alt={item.name} style={{ width: '100px', height: '80px', objectFit: 'cover', borderRadius: '4px' }} />
                                        <div>
                                            <h4>{item.name}</h4>
                                            <p>Quantity: {item.quantity}</p>
                                            <p>Original Price: ${item.price}</p>
                                            <p>Discount: {Math.round(discount * 100)}%</p>
                                            <p><strong>Price: ${(finalPrice * item.quantity).toFixed(2)}</strong></p>
                                        </div>
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

