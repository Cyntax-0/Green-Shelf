import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./styles/ProfilePages.css";

const CustomerProfile = () => {
    const [activeTab, setActiveTab] = useState("profile");
    const [profile, setProfile] = useState({
        name: "John Doe",
        age: "28",
        email: "customer@example.com",
        phone: "+1234567890",
        addresses: ["123 Main St, City, State"],
        preferences: ["Organic", "Vegetarian"]
    });

    const [cart, setCart] = useState([
        { id: 1, name: "Organic Apples", price: 4.50, store: "Fresh Mart", quantity: 2, type: "buy" },
        { id: 2, name: "Fresh Carrots", price: 2.50, store: "Fresh Mart", quantity: 1, type: "donate" }
    ]);
    
    const [orders, setOrders] = useState([
        { id: 101, items: ["Organic Apples", "Fresh Carrots"], total: 12.50, status: "Delivered", date: "2024-01-15" },
        { id: 102, items: ["Dairy Milk"], total: 4.00, status: "Processing", date: "2024-01-16" }
    ]);

    const [donations, setDonations] = useState([
        { id: 201, item: "Fresh Carrots", quantity: 1, ngo: "Food for All", date: "2024-01-15" },
        { id: 202, item: "Bread Loaf", quantity: 2, ngo: "Helping Hands", date: "2024-01-14" }
    ]);

    const navigate = useNavigate();

    const handleNavigateHome = () => navigate("/");

    const handleProfileUpdate = (field) => {
        alert(`${field} updated successfully!`);
    };

    const handleDonateItem = () => {
        const itemName = prompt("Enter item name to donate:");
        const quantity = prompt("Enter quantity:");
        const ngo = prompt("Enter NGO name:");
        
        if (itemName && quantity && ngo) {
            setDonations([...donations, {
                id: Date.now(),
                item: itemName,
                quantity: parseInt(quantity),
                ngo: ngo,
                date: new Date().toISOString().split('T')[0]
            }]);
            alert("Donation recorded successfully!");
        }
    };

    const removeFromCart = (index) => {
        const newCart = cart.filter((_, i) => i !== index);
        setCart(newCart);
    };

    const proceedToCheckout = () => {
        alert("Please login to proceed to checkout!");
    };

    return (
        <div className="profile-page">
            <header className="profile-header">
                <div className="logo" onClick={handleNavigateHome}>GreenShelf</div>
                <nav className="profile-tabs">
                    <button className={activeTab === "profile" ? "active" : ""} onClick={() => setActiveTab("profile")}>Profile</button>
                    <button className={activeTab === "cart" ? "active" : ""} onClick={() => setActiveTab("cart")}>Cart ({cart.length})</button>
                    <button className={activeTab === "orders" ? "active" : ""} onClick={() => setActiveTab("orders")}>Orders</button>
                    <button className={activeTab === "donations" ? "active" : ""} onClick={() => setActiveTab("donations")}>My Donations</button>
                </nav>
                <div className="profile-actions">
                    <button className="login-prompt-btn" onClick={() => navigate("/")}>
                        Login to Save Changes
                    </button>
                </div>
            </header>

            <main className="profile-main">
                {activeTab === "profile" && (
                    <div className="profile-section">
                        <h1>Customer Profile</h1>
                        <div className="login-prompt-banner">
                            <p>🔒 Login to save your profile changes permanently</p>
                        </div>
                        <div className="profile-info">
                            <div className="info-field">
                                <label>Name:</label>
                                <input 
                                    value={profile.name} 
                                    onChange={(e) => setProfile({...profile, name: e.target.value})}
                                />
                                <button onClick={() => handleProfileUpdate("Name")}>Update</button>
                            </div>
                            <div className="info-field">
                                <label>Email:</label>
                                <input value={profile.email} readOnly />
                            </div>
                            <div className="info-field">
                                <label>Phone:</label>
                                <input 
                                    value={profile.phone} 
                                    onChange={(e) => setProfile({...profile, phone: e.target.value})}
                                />
                                <button onClick={() => handleProfileUpdate("Phone")}>Update</button>
                            </div>
                            <div className="info-field">
                                <label>Addresses:</label>
                                <div className="addresses-list">
                                    {profile.addresses.map((addr, idx) => (
                                        <div key={idx} className="address-item">
                                            <textarea value={addr} onChange={(e) => {
                                                const newAddresses = [...profile.addresses];
                                                newAddresses[idx] = e.target.value;
                                                setProfile({...profile, addresses: newAddresses});
                                            }} />
                                            <button onClick={() => handleProfileUpdate("Address")}>Update</button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === "cart" && (
                    <div className="cart-section">
                        <h2>Shopping Cart</h2>
                        <div className="login-prompt-banner">
                            <p>🔒 Login to complete your purchase</p>
                        </div>
                        <div className="cart-items">
                            {cart.map((item, index) => (
                                <div key={item.id} className="cart-item">
                                    <span>{item.name} (x{item.quantity})</span>
                                    <span>${item.price} - {item.type}</span>
                                    <span>Store: {item.store}</span>
                                    <button onClick={() => removeFromCart(index)}>Remove</button>
                                </div>
                            ))}
                        </div>
                        <div className="cart-actions">
                            <button className="checkout-btn" onClick={proceedToCheckout}>Proceed to Checkout</button>
                            <button className="donate-btn" onClick={handleDonateItem}>Donate Items</button>
                        </div>
                    </div>
                )}

                {activeTab === "orders" && (
                    <div className="orders-section">
                        <h2>Order History</h2>
                        <div className="login-prompt-banner">
                            <p>🔒 Login to view your actual order history</p>
                        </div>
                        {orders.map(order => (
                            <div key={order.id} className="order-card">
                                <h4>Order #{order.id}</h4>
                                <p>Items: {order.items.join(", ")}</p>
                                <p>Total: ${order.total}</p>
                                <p>Status: <span className={`status-${order.status.toLowerCase()}`}>{order.status}</span></p>
                                <p>Date: {order.date}</p>
                            </div>
                        ))}
                    </div>
                )}

                {activeTab === "donations" && (
                    <div className="donations-section">
                        <h2>My Donations</h2>
                        <div className="login-prompt-banner">
                            <p>🔒 Login to track your real donations</p>
                        </div>
                        <button className="new-donation-btn" onClick={handleDonateItem}>Make New Donation</button>
                        {donations.map(donation => (
                            <div key={donation.id} className="donation-card">
                                <h4>{donation.item} (x{donation.quantity})</h4>
                                <p>Donated to: {donation.ngo}</p>
                                <p>Date: {donation.date}</p>
                                <span className="donation-badge">Donated</span>
                            </div>
                        ))}
                    </div>
                )}
            </main>
        </div>
    );
};

export default CustomerProfile;