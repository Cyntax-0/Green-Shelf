import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./styles/ProfilePages.css";

const NGOProfile = () => {
    const [activeTab, setActiveTab] = useState("dashboard");
    const [profile, setProfile] = useState({
        name: "Food for All NGO",
        email: "ngo@foodforall.org",
        phone: "+1234567890",
        registration: "NGO-12345",
        address: "456 Charity Ave, City, State",
        mission: "Reducing food waste and fighting hunger"
    });

    const [receivedDonations, setReceivedDonations] = useState([
        { id: 1, item: "Fresh Carrots", quantity: 50, donor: "John Doe", date: "2024-01-15", status: "Received" },
        { id: 2, item: "Bread Loaf", quantity: 25, donor: "Jane Smith", date: "2024-01-14", status: "Received" }
    ]);

    const [purchases, setPurchases] = useState([
        { id: 1, item: "Rice Bags", quantity: 10, seller: "Fresh Mart", amount: 45.00, date: "2024-01-13" },
        { id: 2, item: "Canned Goods", quantity: 5, seller: "Local Store", amount: 30.00, date: "2024-01-12" }
    ]);

    const [inventory, setInventory] = useState([
        { id: 1, item: "Fresh Carrots", quantity: 40, expiry: "2024-01-20", category: "Vegetables" },
        { id: 2, item: "Bread Loaf", quantity: 20, expiry: "2024-01-18", category: "Bakery" }
    ]);

    const navigate = useNavigate();

    const handleNavigateHome = () => navigate("/");

    const requestDonation = () => {
        alert("Please login to request donations!");
    };

    const distributeItem = (index) => {
        alert("Please login to distribute items!");
    };

    return (
        <div className="profile-page">
            <header className="profile-header">
                <div className="logo" onClick={handleNavigateHome}>GreenShelf</div>
                <nav className="profile-tabs">
                    <button className={activeTab === "dashboard" ? "active" : ""} onClick={() => setActiveTab("dashboard")}>Dashboard</button>
                    <button className={activeTab === "inventory" ? "active" : ""} onClick={() => setActiveTab("inventory")}>Inventory</button>
                    <button className={activeTab === "donations" ? "active" : ""} onClick={() => setActiveTab("donations")}>Donations</button>
                    <button className={activeTab === "purchases" ? "active" : ""} onClick={() => setActiveTab("purchases")}>Purchases</button>
                    <button className={activeTab === "profile" ? "active" : ""} onClick={() => setActiveTab("profile")}>Profile</button>
                </nav>
                <div className="profile-actions">
                    <button className="login-prompt-btn" onClick={() => navigate("/")}>
                        Login as NGO
                    </button>
                </div>
            </header>

            <main className="profile-main">
                {activeTab === "dashboard" && (
                    <div className="dashboard-section">
                        <h1>NGO Dashboard - {profile.name}</h1>
                        <div className="login-prompt-banner">
                            <p>🔒 Login to access real NGO dashboard features</p>
                        </div>
                        <div className="stats-grid">
                            <div className="stat-card">
                                <h3>Total Donations</h3>
                                <p>{receivedDonations.length}</p>
                            </div>
                            <div className="stat-card">
                                <h3>Current Inventory</h3>
                                <p>{inventory.reduce((sum, item) => sum + item.quantity, 0)} items</p>
                            </div>
                            <div className="stat-card">
                                <h3>Active Requests</h3>
                                <p>3</p>
                            </div>
                        </div>
                        <div className="dashboard-actions">
                            <button className="primary-btn" onClick={requestDonation}>Request Donations</button>
                            <button className="secondary-btn">View Beneficiaries</button>
                        </div>
                    </div>
                )}

                {activeTab === "inventory" && (
                    <div className="inventory-section">
                        <h2>Current Inventory</h2>
                        <div className="login-prompt-banner">
                            <p>🔒 Login to manage your actual inventory</p>
                        </div>
                        <div className="inventory-list">
                            {inventory.map((item, index) => (
                                <div key={item.id} className="inventory-item">
                                    <div className="item-info">
                                        <h4>{item.item}</h4>
                                        <p>Quantity: {item.quantity}</p>
                                        <p>Expiry: {item.expiry}</p>
                                        <p>Category: {item.category}</p>
                                    </div>
                                    <div className="item-actions">
                                        <button onClick={() => distributeItem(index)}>Distribute</button>
                                        <button>Update</button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {activeTab === "donations" && (
                    <div className="donations-section">
                        <h2>Received Donations</h2>
                        <div className="login-prompt-banner">
                            <p>🔒 Login to view actual donation records</p>
                        </div>
                        {receivedDonations.map(donation => (
                            <div key={donation.id} className="donation-card">
                                <h4>{donation.item} (x{donation.quantity})</h4>
                                <p>From: {donation.donor}</p>
                                <p>Date: {donation.date}</p>
                                <span className={`status-${donation.status.toLowerCase()}`}>{donation.status}</span>
                            </div>
                        ))}
                    </div>
                )}

                {activeTab === "purchases" && (
                    <div className="purchases-section">
                        <h2>Purchase History</h2>
                        <div className="login-prompt-banner">
                            <p>🔒 Login to view actual purchase history</p>
                        </div>
                        {purchases.map(purchase => (
                            <div key={purchase.id} className="purchase-card">
                                <h4>{purchase.item} (x{purchase.quantity})</h4>
                                <p>Seller: {purchase.seller}</p>
                                <p>Amount: ${purchase.amount}</p>
                                <p>Date: {purchase.date}</p>
                            </div>
                        ))}
                    </div>
                )}

                {activeTab === "profile" && (
                    <div className="profile-section">
                        <h2>NGO Profile</h2>
                        <div className="login-prompt-banner">
                            <p>🔒 Login to save your NGO profile</p>
                        </div>
                        <div className="profile-info">
                            <div className="info-field">
                                <label>Organization Name:</label>
                                <input value={profile.name} onChange={(e) => setProfile({...profile, name: e.target.value})} />
                            </div>
                            <div className="info-field">
                                <label>Registration ID:</label>
                                <input value={profile.registration} readOnly />
                            </div>
                            <div className="info-field">
                                <label>Mission Statement:</label>
                                <textarea value={profile.mission} onChange={(e) => setProfile({...profile, mission: e.target.value})} />
                            </div>
                            <button className="update-btn">Update Profile</button>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
};

export default NGOProfile;