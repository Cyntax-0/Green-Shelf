import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./styles/ProfilePages.css";

const SellerProfile = () => {
    const [activeTab, setActiveTab] = useState("products");
    const [profile, setProfile] = useState({
        name: "Fresh Mart Store",
        email: "seller@freshmart.com",
        phone: "+1234567890",
        storeName: "Fresh Mart",
        address: "789 Market St, City, State",
        businessType: "Grocery Store"
    });

    const [products, setProducts] = useState([
        { 
            id: 1, 
            name: "Organic Apples", 
            type: "sell", 
            quantity: 50, 
            price: 5.00, 
            originalPrice: 5.00,
            expiry: "2024-01-25", 
            discountLimit: 30,
            currentDiscount: 10,
            category: "Fruits",
            status: "Active"
        },
        { 
            id: 2, 
            name: "Fresh Carrots", 
            type: "donate", 
            quantity: 30, 
            price: 0.00,
            originalPrice: 3.00,
            expiry: "2024-01-18", 
            discountLimit: 0,
            currentDiscount: 100,
            category: "Vegetables",
            status: "Active"
        }
    ]);

    const [sales, setSales] = useState([
        { id: 1, product: "Organic Apples", quantity: 10, amount: 45.00, customer: "John Doe", date: "2024-01-15", type: "sale" },
        { id: 2, product: "Fresh Carrots", quantity: 5, amount: 0.00, ngo: "Food for All", date: "2024-01-14", type: "donation" }
    ]);

    const navigate = useNavigate();

    const handleNavigateHome = () => navigate("/");

    const addNewProduct = () => {
        alert("Please login to add new products!");
    };

    const updateDiscount = (productId) => {
        alert("Please login to update discounts!");
    };

    const calculateDynamicPrice = (product) => {
        if (product.type === 'donate') return { finalPrice: 0, discount: 100, daysToExpiry: 5 };
        
        const daysToExpiry = Math.ceil((new Date(product.expiry) - new Date()) / (1000 * 60 * 60 * 24));
        let discount = product.currentDiscount;
        
        if (daysToExpiry <= 1) {
            discount = Math.max(discount, 50);
        } else if (daysToExpiry <= 3) {
            discount = Math.max(discount, 30);
        } else if (daysToExpiry <= 7) {
            discount = Math.max(discount, 20);
        }
        
        const finalPrice = (product.originalPrice * (1 - discount / 100)).toFixed(2);
        return { finalPrice, discount, daysToExpiry };
    };

    return (
        <div className="profile-page">
            <header className="profile-header">
                <div className="logo" onClick={handleNavigateHome}>GreenShelf</div>
                <nav className="profile-tabs">
                    <button className={activeTab === "products" ? "active" : ""} onClick={() => setActiveTab("products")}>Products</button>
                    <button className={activeTab === "sales" ? "active" : ""} onClick={() => setActiveTab("sales")}>Sales & Donations</button>
                    <button className={activeTab === "analytics" ? "active" : ""} onClick={() => setActiveTab("analytics")}>Analytics</button>
                    <button className={activeTab === "profile" ? "active" : ""} onClick={() => setActiveTab("profile")}>Profile</button>
                </nav>
                <div className="profile-actions">
                    <button className="login-prompt-btn" onClick={() => navigate("/")}>
                        Login as Seller
                    </button>
                </div>
            </header>

            <main className="profile-main">
                {activeTab === "products" && (
                    <div className="products-section">
                        <div className="section-header">
                            <h2>Manage Products</h2>
                            <button className="add-product-btn" onClick={addNewProduct}>+ Add Product</button>
                        </div>
                        <div className="login-prompt-banner">
                            <p>🔒 Login to manage your actual products</p>
                        </div>
                        <div className="products-grid">
                            {products.map(product => {
                                const { finalPrice, discount, daysToExpiry } = calculateDynamicPrice(product);
                                return (
                                    <div key={product.id} className="product-card">
                                        <div className="product-header">
                                            <h4>{product.name}</h4>
                                            <span className={`type-badge ${product.type}`}>{product.type}</span>
                                        </div>
                                        <div className="product-details">
                                            <p>Quantity: {product.quantity}</p>
                                            <p>Category: {product.category}</p>
                                            <p>Expiry: {product.expiry}</p>
                                            <p>Days left: {daysToExpiry}</p>
                                            {product.type === 'sell' && (
                                                <>
                                                    <p>Original: ${product.originalPrice}</p>
                                                    <p>Discount: {discount}%</p>
                                                    <p className="final-price">Final: ${finalPrice}</p>
                                                    <p>Max Discount: {product.discountLimit}%</p>
                                                </>
                                            )}
                                        </div>
                                        <div className="product-actions">
                                            <button onClick={() => updateDiscount(product.id)}>Update Discount</button>
                                            <button>Edit</button>
                                            <button className="delete-btn">Remove</button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {activeTab === "sales" && (
                    <div className="sales-section">
                        <h2>Sales & Donation History</h2>
                        <div className="login-prompt-banner">
                            <p>🔒 Login to view actual sales data</p>
                        </div>
                        <div className="sales-list">
                            {sales.map(sale => (
                                <div key={sale.id} className="sale-card">
                                    <h4>{sale.product} (x{sale.quantity})</h4>
                                    <p>Type: <span className={`sale-type ${sale.type}`}>{sale.type}</span></p>
                                    <p>Amount: ${sale.amount}</p>
                                    <p>{sale.type === 'sale' ? `Customer: ${sale.customer}` : `NGO: ${sale.ngo}`}</p>
                                    <p>Date: {sale.date}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {activeTab === "analytics" && (
                    <div className="analytics-section">
                        <h2>Business Analytics</h2>
                        <div className="login-prompt-banner">
                            <p>🔒 Login to view real-time analytics</p>
                        </div>
                        <div className="analytics-grid">
                            <div className="metric-card">
                                <h3>Total Products</h3>
                                <p>{products.length}</p>
                            </div>
                            <div className="metric-card">
                                <h3>Active Listings</h3>
                                <p>{products.filter(p => p.status === 'Active').length}</p>
                            </div>
                            <div className="metric-card">
                                <h3>Total Sales</h3>
                                <p>${sales.filter(s => s.type === 'sale').reduce((sum, sale) => sum + sale.amount, 0)}</p>
                            </div>
                            <div className="metric-card">
                                <h3>Total Donations</h3>
                                <p>{sales.filter(s => s.type === 'donation').length} items</p>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === "profile" && (
                    <div className="profile-section">
                        <h2>Seller Profile</h2>
                        <div className="login-prompt-banner">
                            <p>🔒 Login to save your seller profile</p>
                        </div>
                        <div className="profile-info">
                            <div className="info-field">
                                <label>Store Name:</label>
                                <input value={profile.storeName} onChange={(e) => setProfile({...profile, storeName: e.target.value})} />
                            </div>
                            <div className="info-field">
                                <label>Business Type:</label>
                                <input value={profile.businessType} onChange={(e) => setProfile({...profile, businessType: e.target.value})} />
                            </div>
                            <div className="info-field">
                                <label>Address:</label>
                                <textarea value={profile.address} onChange={(e) => setProfile({...profile, address: e.target.value})} />
                            </div>
                            <button className="update-btn">Update Profile</button>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
};

export default SellerProfile;