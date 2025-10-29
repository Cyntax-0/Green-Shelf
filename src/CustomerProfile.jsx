// --------------------- CUSTOMER PROFILE ---------------------
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "./contexts/AuthContext";
import "./styles/Profile.css";

const CustomerProfile = () => {
    const [activeTab, setActiveTab] = useState("profile");
    const { user, logout } = useAuth();

    const displayName = user?.profile?.firstName || user?.username || (user?.email ? user.email.split('@')[0] : "John Doe");
    const displayEmail = user?.email || "john@example.com";

    const [profile, setProfile] = useState({
        name: displayName,
        email: displayEmail,
        phone: "+1234567890",
        addresses: ["123 Main St, City, State 12345"]
    });

    const [cart, setCart] = useState([]);

    const [orders, setOrders] = useState([]);

    const [donations, setDonations] = useState([]);

    // ------------------ NEW STATES ------------------
    const [wishlist, setWishlist] = useState([]);

    const [notifications, setNotifications] = useState([]);

    const [historySummary, setHistorySummary] = useState({
        totalOrders: orders.length,
        totalDonations: donations.length,
        mostPurchasedCategory: "Fruits"
    });
    // ------------------ END NEW STATES ------------------

    const [donationLocationFilter, setDonationLocationFilter] = useState('');
    const [banner, setBanner] = useState(null);
    const [donationFormOpen, setDonationFormOpen] = useState(false);
    const [donationForm, setDonationForm] = useState({
        name: "",
        imageUrl: "",
        imageFile: null,
        foodType: "veg",
        category: "Fruits",
        quantityValue: 1,
        quantityUnit: "units",
        expiry: ""
    });

    const navigate = useNavigate();

    const handleNavigateHome = () => navigate("/");

    const handleProfileUpdate = (field) => {
        setBanner({ type: 'success', text: `${field} updated successfully!` });
        setTimeout(() => setBanner(null), 2500);
    };

    const handleDonateItem = () => {
        setDonationFormOpen(true);
    };

    const onSelectDonationImage = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const url = URL.createObjectURL(file);
        setDonationForm({ ...donationForm, imageFile: file, imageUrl: url });
    };

    const submitDonation = () => {
        if (!donationForm.name || !donationForm.quantityValue) {
            setBanner({ type: 'warning', text: 'Please fill all donation fields.' });
            return;
        }
        const newDonation = {
            id: Date.now(),
            name: donationForm.name,
            image: donationForm.imageUrl,
            foodType: donationForm.foodType,
            category: donationForm.category,
            quantity: parseInt(donationForm.quantityValue),
            quantityUnit: donationForm.quantityUnit,
            expiry: donationForm.expiry,
            date: new Date().toISOString().split('T')[0]
        };
        setDonations([...donations, newDonation]);
        try {
            const existing = JSON.parse(localStorage.getItem('publicDonations') || '[]');
            localStorage.setItem('publicDonations', JSON.stringify([newDonation, ...existing]));
        } catch (e) {
            // ignore localStorage errors
        }
        setDonationForm({
            name: "",
            imageUrl: "",
            imageFile: null,
            foodType: "veg",
            category: "Fruits",
            quantityValue: 1,
            quantityUnit: "units",
            expiry: ""
        });
        setBanner({ type: 'success', text: 'Donation recorded successfully!' });
        setTimeout(() => setBanner(null), 2500);
    };

    const removeFromCart = (index) => {
        const newCart = cart.filter((_, i) => i !== index);
        setCart(newCart);
    };

    const proceedToCheckout = () => {
        // At this point user is authenticated (ProtectedRoute). Implement checkout navigation here.
        setBanner({ type: 'info', text: 'Proceeding to checkout (placeholder).' });
        setTimeout(() => setBanner(null), 2500);
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

                    {/* ----------- NEW TABS ------------ */}
                    <button className={activeTab === "wishlist" ? "active" : ""} onClick={() => setActiveTab("wishlist")}>Wishlist ({wishlist.length})</button>
                    <button className={activeTab === "notifications" ? "active" : ""} onClick={() => setActiveTab("notifications")}>Notifications ({notifications.filter(n => !n.read).length})</button>
                    <button className={activeTab === "history" ? "active" : ""} onClick={() => setActiveTab("history")}>History Summary</button>
                </nav>
                <div className="profile-actions">
                    <span className="greeting">Hello, {displayName}</span>
                    <button className="logout-btn" onClick={logout}>Logout</button>
                </div>
            </header>

            <main className="profile-main">
                {banner && <div className={`banner ${banner.type}`}>{banner.text}</div>}
                {/* -------- PROFILE -------- */}
                {activeTab === "profile" && (
                    <div className="profile-section">
                        <h1>Customer Profile</h1>
                        <div className="profile-info">
                            <div className="info-field">
                                <label>Name:</label>
                                <input 
                                    value={profile.name} 
                                    readOnly
                                />
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
                                        <div style={{ display: "flex", gap: 8 }}>
                                            <button onClick={() => handleProfileUpdate("Address")}>Update</button>
                                            <button
                                                className="danger"
                                                onClick={() => {
                                                    const newAddresses = profile.addresses.filter((_, i) => i !== idx);
                                                    setProfile({ ...profile, addresses: newAddresses });
                                                }}
                                            >Remove</button>
                                        </div>
                                        </div>
                                    ))}
                                    <button
                                        onClick={() => setProfile({ ...profile, addresses: [...(profile.addresses || []), ""] })}
                                    >+ Add Address</button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* -------- CART -------- */}
                {activeTab === "cart" && (
                    <div className="cart-section">
                        <h2>Shopping Cart</h2>
                        <div className="cart-items">
                            {cart.length === 0 ? (
                                <p>Your cart is empty.</p>
                            ) : (
                                <>
                                    {cart.map((item, index) => (
                                        <div key={item.id} className="cart-item">
                                            <span>{item.name} (x{item.quantity})</span>
                                            <span>${item.price}</span>
                                            <button
                                                onClick={() => removeFromCart(index)}
                                                className="remove-button"
                                            >
                                                Remove
                                            </button>
                                        </div>
                                    ))}
                                    <div className="cart-total">
                                        <strong>Total: ${cart.reduce((sum, item) => sum + (item.price * item.quantity), 0).toFixed(2)}</strong>
                                    </div>
                                    <button className="checkout-button" onClick={proceedToCheckout}>
                                        Proceed to Checkout
                                    </button>
                                </>
                            )}
                        </div>
                    </div>
                )}

                {/* -------- ORDERS -------- */}
                {activeTab === "orders" && (
                    <div className="orders-section">
                        <h2>Order History</h2>
                        {orders.length === 0 ? (
                            <p>No orders yet.</p>
                        ) : (
                        <div className="orders-list">
                            {orders.map(order => (
                                <div key={order.id} className="order-item">
                                    <h3>Order #{order.id}</h3>
                                    <p><strong>Items:</strong> {order.items.join(", ")}</p>
                                    <p><strong>Total:</strong> ${order.total}</p>
                                    <p><strong>Status:</strong> {order.status}</p>
                                    <p><strong>Date:</strong> {order.date}</p>
                                </div>
                            ))}
                        </div>
                        )}
                    </div>
                )}

                {/* -------- DONATIONS -------- */}
                {activeTab === "donations" && (
                    <div className="donations-section">
                        <h2>My Donations</h2>
                        <div style={{ marginBottom: 16 }}>
                            <input
                                type="text"
                                placeholder="Filter by address"
                                value={donationLocationFilter}
                                onChange={(e) => setDonationLocationFilter(e.target.value)}
                                style={{ padding: '8px', width: '300px', borderRadius: '4px', border: '1px solid #ccc' }}
                            />
                        </div>
                        {!donationFormOpen ? (
                            <button className="primary" onClick={handleDonateItem}>
                                Make New Donation
                            </button>
                        ) : (
                            <div className="inline-form">
                                <div className="row">
                                    <input
                                        placeholder="Item name"
                                        value={donationForm.name}
                                        onChange={(e) => setDonationForm({ ...donationForm, name: e.target.value })}
                                    />
                                    <div>
                                        <input type="file" accept="image/*" onChange={onSelectDonationImage} />
                                    </div>
                                </div>

                                {donationForm.imageUrl && (
                                    <img
                                        src={donationForm.imageUrl}
                                        alt="preview"
                                        style={{ width: 180, height: 120, objectFit: "cover", borderRadius: 6 }}
                                    />
                                )}

                                <div className="row">
                                    <label style={{ alignSelf: "center" }}>Food Type:</label>
                                    <select
                                        value={donationForm.foodType || "veg"}
                                        onChange={(e) => setDonationForm({ ...donationForm, foodType: e.target.value })}
                                    >
                                        <option value="veg">Veg</option>
                                        <option value="nonveg">Non-Veg</option>
                                    </select>
                                </div>

                                <div className="row">
                                    {donationForm.foodType === "veg" ? (
                                        <select
                                            value={donationForm.category}
                                            onChange={(e) => setDonationForm({ ...donationForm, category: e.target.value })}
                                        >
                                            <option>Fruits</option>
                                            <option>Vegetables</option>
                                            <option>Dairy</option>
                                            <option>Grains</option>
                                        </select>
                                    ) : (
                                        <select
                                            value={donationForm.category}
                                            onChange={(e) => setDonationForm({ ...donationForm, category: e.target.value })}
                                        >
                                            <option>Meat</option>
                                            <option>Fish</option>
                                            <option>Eggs</option>
                                        </select>
                                    )}

                                    <input
                                        type="number"
                                        min="1"
                                        placeholder="Quantity"
                                        value={donationForm.quantityValue}
                                        onChange={(e) => setDonationForm({ ...donationForm, quantityValue: e.target.value })}
                                    />
                                    <select
                                        value={donationForm.quantityUnit}
                                        onChange={(e) => setDonationForm({ ...donationForm, quantityUnit: e.target.value })}
                                    >
                                        <option>units</option>
                                        <option>kg</option>
                                        <option>g</option>
                                        <option>dozens</option>
                                        <option>litre</option>
                                        <option>ml</option>
                                    </select>
                                </div>

                                <div className="row">
                                    <label style={{ alignSelf: "center" }}>Expiry Date:</label>
                                    <input
                                        type="date"
                                        value={donationForm.expiry}
                                        onChange={(e) => setDonationForm({ ...donationForm, expiry: e.target.value })}
                                        min={new Date().toISOString().split("T")[0]}
                                        style={{
                                            cursor: "pointer",
                                            padding: "6px 10px",
                                            borderRadius: "6px",
                                            border: "1px solid #ccc",
                                            fontSize: "14px",
                                        }}
                                    />
                                </div>

                                

                                <div>
                                    <button className="primary" onClick={submitDonation}>Save Donation</button>
                                    <button style={{ marginLeft: 8 }} onClick={() => setDonationFormOpen(false)}>Cancel</button>
                                </div>
                            </div>
                        )}
                        {donations.filter(d => 
                            !donationLocationFilter || 
                            (profile.addresses && profile.addresses.some(addr => 
                                addr.toLowerCase().includes(donationLocationFilter.toLowerCase())
                            ))
                        ).length === 0 ? (
                            <p>No donations yet.</p>
                        ) : (
                        <div className="donations-list">
                            {donations.filter(d => 
                                !donationLocationFilter || 
                                (profile.addresses && profile.addresses.some(addr => 
                                    addr.toLowerCase().includes(donationLocationFilter.toLowerCase())
                                ))
                            ).map(donation => (
                                <div key={donation.id} className="donation-item">
                                    <h3>Donation #{donation.id}</h3>
                                    {donation.image && (
                                        <img src={donation.image} alt={donation.name} style={{ width: 180, height: 120, objectFit: "cover", borderRadius: 6 }} />
                                    )}
                                    <p><strong>Item:</strong> {donation.name}</p>
                                    <p><strong>Food Type:</strong> {donation.foodType}</p>
                                    <p><strong>Category:</strong> {donation.category}</p>
                                    <p><strong>Quantity:</strong> {donation.quantity}</p>
                                    {donation.quantityUnit && (
                                        <p><strong>Unit:</strong> {donation.quantityUnit}</p>
                                    )}
                                    {donation.expiry && (
                                        <p><strong>Expiry:</strong> {donation.expiry}</p>
                                    )}
                                    <p><strong>Date:</strong> {donation.date}</p>
                                    <button
                                        className="danger"
                                        onClick={() => setDonations(donations.filter(d => d.id !== donation.id))}
                                    >Remove</button>
                                </div>
                            ))}
                        </div>
                        )}
                    </div>
                )}

                {/* -------- WISHLIST (NEW) -------- */}
                {activeTab === "wishlist" && (
                    <div className="wishlist-section">
                        <h2>My Wishlist</h2>
                        {wishlist.length === 0 ? (
                            <p>No items in wishlist.</p>
                        ) : (
                        wishlist.map(item => (
                            <div key={item.id} className="wishlist-item">
                                <span>{item.name}</span>
                                <span>${item.price}</span>
                            </div>
                        ))
                        )}
                    </div>
                )}

                {/* -------- NOTIFICATIONS (NEW) -------- */}
                {activeTab === "notifications" && (
                    <div className="notifications-section">
                        <h2>Notifications</h2>
                        {notifications.length === 0 ? (
                            <p>No notifications yet.</p>
                        ) : (
                        notifications.map(note => (
                            <div key={note.id} className={`notification-item ${note.read ? "read" : "unread"}`}>
                                {note.message}
                                <button onClick={() => {
                                    setNotifications(notifications.map(n => n.id === note.id ? {...n, read: true} : n));
                                }}>Mark as Read</button>
                            </div>
                        ))
                        )}
                    </div>
                )}

                {/* -------- HISTORY SUMMARY (NEW) -------- */}
                {activeTab === "history" && (
                    <div className="history-section">
                        <h2>History Summary</h2>
                        <p>Total Orders: {historySummary.totalOrders}</p>
                        <p>Total Donations: {historySummary.totalDonations}</p>
                        <p>Most Purchased Category: {historySummary.mostPurchasedCategory}</p>
                    </div>
                )}
            </main>
        </div>
    );
};

export default CustomerProfile;