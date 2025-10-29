import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "./contexts/AuthContext";
import api from "./services/api";
import "./styles/Profile.css";

const SellerProfile = () => {
    const [activeTab, setActiveTab] = useState("products");
    const { user, logout } = useAuth();
    const [profile, setProfile] = useState({
        name: "Fresh Mart Store",
        email: user?.email || "seller@freshmart.com",
        storeName: "Fresh Mart",
        outlets: [
            { address: "789 Market St, City, State", phone: "+1234567890" }
        ],
        businessType: "Grocery Store"
    });

    const [products, setProducts] = useState([]);

    const [sales, setSales] = useState([]);

    const navigate = useNavigate();

    const [banner, setBanner] = useState(null);
    const [newProductOpen, setNewProductOpen] = useState(false);

    const [newProduct, setNewProduct] = useState({
        name: "",
        imageUrl: "",
        imageFile: null,
        isDonate: false,
        foodType: "veg",
        category: "Fruits",
        quantityValue: 1,
        quantityUnit: "units",
        price: 0,
        discountType: "percent",
        discountValue: 0,
        expiry: ""
    });

    const [discountEditId, setDiscountEditId] = useState(null);
    const [discountValue, setDiscountValue] = useState(0);

    const handleNavigateHome = () => navigate("/");

    // Fetch products from database on component mount
    useEffect(() => {
        const fetchProducts = async () => {
            try {
                const token = localStorage.getItem('authToken');
                console.log('Fetching products for user:', user?._id);
                console.log('Token available:', !!token);
                
                if (token && user?._id) {
                    const response = await api.products.getBySeller(user._id);
                    console.log('Products API response:', response);
                    if (response.success) {
                        setProducts(response.data.products || []);
                        console.log('Products set:', response.data.products?.length || 0);
                    }
                } else {
                    console.log('No token or user ID available');
                }
            } catch (error) {
                console.error('Error fetching products:', error);
            }
        };
        fetchProducts();
    }, [user]);

    const addNewProduct = () => {
        setNewProductOpen(true);
    };

    const onSelectImage = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const url = URL.createObjectURL(file);
        setNewProduct({ ...newProduct, imageFile: file, imageUrl: url });
    };

    const saveNewProduct = async () => {
        if (!newProduct.name) { setBanner({ type: 'warning', text: 'Product name is required.' }); return; }
        if (!newProduct.isDonate && Number(newProduct.price) <= 0) { setBanner({ type: 'warning', text: 'Price must be greater than 0 for sell items.' }); return; }
        if (!newProduct.expiry) { setBanner({ type: 'warning', text: 'Expiry date is required.' }); return; }

        try {
            setBanner({ type: 'info', text: 'Saving product...' });
            
            const type = newProduct.isDonate ? 'donate' : 'sell';
            
            // Calculate dynamic price based on expiry
            let finalPrice = newProduct.isDonate ? 0 : Number(newProduct.price);
            if (!newProduct.isDonate) {
                const daysToExpiry = Math.ceil((new Date(newProduct.expiry) - new Date()) / (1000 * 60 * 60 * 24));
                let discountPercent = Number(newProduct.discountValue) || 0;
                
                // Apply automatic discount based on expiry (within 5 days)
                if (daysToExpiry <= 5) {
                    if (daysToExpiry <= 1) {
                        discountPercent = Math.max(discountPercent, 50);
                    } else if (daysToExpiry <= 3) {
                        discountPercent = Math.max(discountPercent, 30);
                    } else if (daysToExpiry <= 5) {
                        discountPercent = Math.max(discountPercent, 20);
                    }
                }
                
                if (newProduct.discountType === 'price') {
                    finalPrice = Math.max(0, Number(newProduct.price) - (Number(newProduct.discountValue) || 0));
                } else {
                    finalPrice = Number(newProduct.price) * (1 - (discountPercent / 100));
                }
            }
            
            const productData = {
                name: newProduct.name,
                image: newProduct.imageUrl || "https://via.placeholder.com/300x200?text=Product",
                type,
                foodType: newProduct.foodType,
                category: newProduct.category,
                quantity: Number(newProduct.quantityValue),
                quantityUnit: newProduct.quantityUnit,
                originalPrice: Number(newProduct.price),
                initialAmount: Number(newProduct.price),
                price: finalPrice,
                discountType: newProduct.discountType,
                currentDiscount: Number(newProduct.discountValue) || 0,
                expiry: newProduct.expiry,
                status: "active"
            };

            // Save to database
            const token = localStorage.getItem('authToken');
            if (!token) {
                setBanner({ type: 'error', text: 'Authentication token not found. Please log in again.' });
                return;
            }
            
            console.log('Saving product with token:', token.substring(0, 20) + '...');
            const response = await api.products.create(productData, token);
            
            if (response.success) {
                // Add to local state for immediate display
                const savedProduct = {
                    id: response.data._id,
                    ...productData
                };
                setProducts([...products, savedProduct]);
                
                setBanner({ type: 'success', text: newProduct.isDonate ? 'Donation item added successfully!' : 'Product added successfully!' });
                
                // Reset form
                setNewProduct({
                    name: "",
                    imageUrl: "",
                    imageFile: null,
                    isDonate: false,
                    category: "Fruits",
                    quantityValue: 1,
                    quantityUnit: "units",
                    price: 0,
                    discountType: "percent",
                    discountValue: 0,
                    expiry: ""
                });
                setNewProductOpen(false);
            } else {
                setBanner({ type: 'error', text: 'Failed to save product. Please try again.' });
            }
        } catch (error) {
            console.error('Error saving product:', error);
            setBanner({ type: 'error', text: 'Error saving product: ' + error.message });
        }
        
        setTimeout(() => setBanner(null), 3000);
    };

    const updateDiscount = (productId) => {
        setDiscountEditId(productId);
    };

    const saveDiscount = () => {
        setProducts(products.map(p => p.id === discountEditId ? { ...p, currentDiscount: Number(discountValue) } : p));
        setDiscountEditId(null);
        setDiscountValue(0);
        setBanner({ type: 'success', text: 'Discount updated.' });
        setTimeout(() => setBanner(null), 2000);
    };

    const updateAllPrices = async () => {
        try {
            setBanner({ type: 'info', text: 'Updating prices based on expiry dates...' });
            const response = await api.products.updatePrices();
            
            if (response.success) {
                setBanner({ 
                    type: 'success', 
                    text: `Updated prices for ${response.data.length} products based on expiry dates.` 
                });
                
                // Refresh products to show updated prices
                // In a real app, you'd fetch the updated products from the server
                setTimeout(() => setBanner(null), 3000);
            } else {
                setBanner({ type: 'error', text: 'Failed to update prices.' });
                setTimeout(() => setBanner(null), 3000);
            }
        } catch (error) {
            setBanner({ type: 'error', text: 'Error updating prices: ' + error.message });
            setTimeout(() => setBanner(null), 3000);
        }
    };

    const calculateDynamicPrice = (product) => {
        if (product.type === 'donate') return { finalPrice: 0, discount: 100, daysToExpiry: 5 };
        const daysToExpiry = Math.ceil((new Date(product.expiry) - new Date()) / (1000 * 60 * 60 * 24));
        let baseDiscountPercent = product.currentDiscount || 0;
        if (daysToExpiry <= 1) {
            baseDiscountPercent = Math.max(baseDiscountPercent, 50);
        } else if (daysToExpiry <= 3) {
            baseDiscountPercent = Math.max(baseDiscountPercent, 30);
        } else if (daysToExpiry <= 7) {
            baseDiscountPercent = Math.max(baseDiscountPercent, 20);
        }

        let finalPrice = product.originalPrice;
        if (product.discountType === 'price') {
            finalPrice = Math.max(0, product.originalPrice - (product.currentDiscount || 0));
        } else {
            finalPrice = (product.originalPrice * (1 - (baseDiscountPercent / 100)));
        }
        return { finalPrice: finalPrice.toFixed(2), discount: baseDiscountPercent, daysToExpiry };
    };

    const displayName = user?.profile?.firstName || user?.username || (user?.email ? user.email.split('@')[0] : 'Seller');

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
                    <span className="greeting">Hello, {displayName}</span>
                    <button className="logout-btn" onClick={logout}>Logout</button>
                </div>
            </header>

            <main className="profile-main">
                {banner && <div className={`banner ${banner.type}`}>{banner.text}</div>}
                {activeTab === "products" && (
                    <div className="products-section card">
                        <div className="section-header">
                            <h2>Manage Products</h2>
                            <div style={{ display: 'flex', gap: '10px' }}>
                                <button className="secondary" onClick={updateAllPrices}>
                                    🔄 Update Prices (Auto-discount)
                                </button>
                                <button className="primary" onClick={addNewProduct}>+ Add Product</button>
                            </div>
                        </div>
                        {newProductOpen && (
                            <div className="inline-form">
                                {/* 1. Name */}
                                <div className="row">
                                    <label style={{ alignSelf: "center", minWidth: "100px" }}>1. Name:</label>
                                    <input
                                        placeholder="Product Name"
                                        value={newProduct.name}
                                        onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })}
                                        style={{ flex: 1 }}
                                    />
                                </div>

                                {/* 2. Upload */}
                                <div className="row">
                                    <label style={{ alignSelf: "center", minWidth: "100px" }}>2. Upload:</label>
                                    <input type="file" accept="image/*" onChange={onSelectImage} />
                                </div>

                                {newProduct.imageUrl && (
                                    <img
                                        src={newProduct.imageUrl}
                                        alt="preview"
                                        style={{ width: 180, height: 120, objectFit: "cover", borderRadius: 6, margin: "10px 0" }}
                                    />
                                )}

                                {/* 3. Sell/Donate */}
                                <div className="row">
                                    <label style={{ alignSelf: "center", minWidth: "100px" }}>3. Type:</label>
                                    <label style={{ alignSelf: "center" }}>
                                        <input
                                            type="checkbox"
                                            checked={newProduct.isDonate}
                                            onChange={(e) => setNewProduct({ ...newProduct, isDonate: e.target.checked })}
                                        />{" "}
                                        Donate (free)
                                    </label>
                                </div>

                                {/* 4. Category (Veg/Non-Veg) */}
                                <div className="row">
                                    <label style={{ alignSelf: "center", minWidth: "100px" }}>4. Category:</label>
                                    <select
                                        value={newProduct.foodType || "veg"}
                                        onChange={(e) => setNewProduct({ ...newProduct, foodType: e.target.value })}
                                    >
                                        <option value="veg">Veg</option>
                                        <option value="nonveg">Non-Veg</option>
                                    </select>
                                    {newProduct.foodType === "veg" ? (
                                        <select
                                            value={newProduct.category}
                                            onChange={(e) => setNewProduct({ ...newProduct, category: e.target.value })}
                                        >
                                            <option>Fruits</option>
                                            <option>Vegetables</option>
                                            <option>Dairy</option>
                                            <option>Grains</option>
                                        </select>
                                    ) : (
                                        <select
                                            value={newProduct.category}
                                            onChange={(e) => setNewProduct({ ...newProduct, category: e.target.value })}
                                        >
                                            <option>Meat</option>
                                            <option>Fish</option>
                                            <option>Eggs</option>
                                        </select>
                                    )}
                                </div>

                                {/* 5. Qty */}
                                <div className="row">
                                    <label style={{ alignSelf: "center", minWidth: "100px" }}>5. Qty:</label>
                                    <input
                                        type="number"
                                        min="1"
                                        placeholder="Quantity"
                                        value={newProduct.quantityValue}
                                        onChange={(e) =>
                                            setNewProduct({ ...newProduct, quantityValue: e.target.value })
                                        }
                                        style={{ width: "100px" }}
                                    />
                                    <select
                                        value={newProduct.quantityUnit}
                                        onChange={(e) =>
                                            setNewProduct({ ...newProduct, quantityUnit: e.target.value })
                                        }
                                    >
                                        <option>units</option>
                                        <option>kg</option>
                                        <option>g</option>
                                        <option>dozens</option>
                                        <option>litre</option>
                                        <option>ml</option>
                                    </select>
                                </div>

                                {/* 6. Price */}
                                {!newProduct.isDonate && (
                                    <div className="row">
                                        <label style={{ alignSelf: "center", minWidth: "100px" }}>6. Price:</label>
                                        <input
                                            type="number"
                                            min="0"
                                            step="0.01"
                                            placeholder="Price"
                                            value={newProduct.price}
                                            onChange={(e) =>
                                                setNewProduct({ ...newProduct, price: e.target.value })
                                            }
                                            style={{ width: "120px" }}
                                        />
                                    </div>
                                )}

                                {/* 7. Discount upto (% or amt) */}
                                {!newProduct.isDonate && (
                                    <div className="row">
                                        <label style={{ alignSelf: "center", minWidth: "100px" }}>7. Discount:</label>
                                        <select
                                            value={newProduct.discountType}
                                            onChange={(e) =>
                                                setNewProduct({ ...newProduct, discountType: e.target.value })
                                            }
                                        >
                                            <option value="percent">Discount upto (%)</option>
                                            <option value="price">Discount upto (price)</option>
                                        </select>
                                        <input
                                            type="number"
                                            min="0"
                                            placeholder={
                                                newProduct.discountType === "percent"
                                                    ? "% value"
                                                    : "price value"
                                            }
                                            value={newProduct.discountValue}
                                            onChange={(e) =>
                                                setNewProduct({ ...newProduct, discountValue: e.target.value })
                                            }
                                            style={{ width: "120px" }}
                                        />
                                    </div>
                                )}

                                {/* 8. Expiry Date */}
                                <div className="row">
                                    <label style={{ alignSelf: "center", minWidth: "100px" }}>8. Expiry:</label>
                                    <input
                                        type="date"
                                        value={newProduct.expiry}
                                        onChange={(e) =>
                                            setNewProduct({ ...newProduct, expiry: e.target.value })
                                        }
                                        min={new Date().toISOString().split("T")[0]}
                                        required
                                        style={{
                                            cursor: "pointer",
                                            padding: "6px 10px",
                                            borderRadius: "6px",
                                            border: "1px solid #ccc",
                                            fontSize: "14px",
                                            width: "150px"
                                        }}
                                    />
                                </div>

                                <div style={{ marginTop: "20px" }}>
                                    <button className="primary" onClick={saveNewProduct}>
                                        Save Product
                                    </button>
                                    <button style={{ marginLeft: 8 }} onClick={() => setNewProductOpen(false)}>
                                        Cancel
                                    </button>
                                </div>
                            </div>
                        )}


                        {products.length === 0 ? (
                            <p>No products yet.</p>
                        ) : (
                            <div className="products-grid">
                                {products.map(product => {
                                    const { finalPrice, discount, daysToExpiry } = calculateDynamicPrice(product);
                                    const editing = discountEditId === product.id;
                                    return (
                                        <div key={product.id} className="product-card border">
                                            {product.image && (
                                                <img src={product.image} alt={product.name} style={{ width: '100%', height: 140, objectFit: 'cover', borderRadius: 6, marginBottom: 8 }} />
                                            )}
                                            <div className="product-header">
                                                <h4>{product.name}</h4>
                                                <span className={`type-badge ${product.type}`}>{product.type}</span>
                                            </div>
                                            <div className="product-details">
                                                <p>Qty: {product.quantity} {product.quantityUnit}</p>
                                                <p>Category: {product.category}</p>
                                                <p>Expiry: {product.expiry}</p>
                                                <p>Days left: {daysToExpiry}</p>
                                                {product.type === 'sell' && (
                                                    <>
                                                        <p>Price: ${product.originalPrice}</p>
                                                        <p>Discount: {product.discountType === 'price' ? `$${product.currentDiscount || 0}` : (
                                                            editing ? (
                                                                <>
                                                                    <input style={{ width: 80 }} type="number" min="0" max="90" value={discountValue} onChange={(e) => setDiscountValue(e.target.value)} />
                                                                    <button style={{ marginLeft: 6 }} onClick={saveDiscount}>Save</button>
                                                                    <button style={{ marginLeft: 6 }} onClick={() => setDiscountEditId(null)}>Cancel</button>
                                                                </>
                                                            ) : `${product.currentDiscount || 0}%`
                                                        )}</p>
                                                        <p className="final-price">Current Price: ${finalPrice}</p>
                                                        {daysToExpiry <= 5 && (
                                                            <p style={{ color: '#e74c3c', fontWeight: 'bold' }}>
                                                                ⚠️ Expires in {daysToExpiry} day{daysToExpiry !== 1 ? 's' : ''} - Auto-discounted!
                                                            </p>
                                                        )}
                                                    </>
                                                )}
                                            </div>
                                            <div className="product-actions">
                                                {product.type === 'sell' && <button onClick={() => updateDiscount(product.id)}>Update Discount</button>}
                                                <button>Edit</button>
                                                <button className="danger">Remove</button>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                )}

                {activeTab === "sales" && (
                    <div className="sales-section card">
                        <h2>Sales & Donation History</h2>
                        {sales.length === 0 ? (
                            <p>No sales or donations yet.</p>
                        ) : (
                            <div className="sales-list">
                                {sales.map(sale => (
                                    <div key={sale.id} className="sale-card border">
                                        <h4>{sale.product} (x{sale.quantity})</h4>
                                        <p>Type: <span className={`sale-type ${sale.type}`}>{sale.type}</span></p>
                                        <p>Amount: ${sale.amount}</p>
                                        <p>{sale.type === 'sale' ? `Customer: ${sale.customer}` : `NGO: ${sale.ngo}`}</p>
                                        <p>Date: {sale.date}</p>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {activeTab === "analytics" && (
                    <div className="analytics-section card">
                        <h2>Business Analytics</h2>
                        <div className="analytics-grid">
                            <div className="metric-card border">
                                <h3>Total Products</h3>
                                <p>{products.length}</p>
                            </div>
                            <div className="metric-card border">
                                <h3>Active Listings</h3>
                                <p>{products.filter(p => p.status === 'Active').length}</p>
                            </div>
                            <div className="metric-card border">
                                <h3>Total Sales</h3>
                                <p>${sales.filter(s => s.type === 'sale').reduce((sum, sale) => sum + sale.amount, 0)}</p>
                            </div>
                            <div className="metric-card border">
                                <h3>Total Donations</h3>
                                <p>{sales.filter(s => s.type === 'donation').length} items</p>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === "profile" && (
                    <div className="profile-section card">
                        <h2>Seller Profile</h2>
                        <div className="profile-info">
                            <div className="info-field">
                                <label>Store Name:</label>
                                <input value={profile.storeName} readOnly />
                            </div>
                            <div className="info-field">
                                <label>Business Type:</label>
                                <input value={profile.businessType} onChange={(e) => setProfile({ ...profile, businessType: e.target.value })} />
                            </div>
                            <div className="info-field">
                                <label>Outlets (Address & Mobile No.):</label>
                                {profile.outlets.map((outlet, idx) => (
                                    <div key={idx} className="row" style={{ alignItems: "flex-start", gap: 8, marginBottom: 8 }}>
                                        <textarea
                                            placeholder="Outlet address"
                                            value={outlet.address}
                                            onChange={(e) => {
                                                const updated = [...profile.outlets];
                                                updated[idx] = { ...updated[idx], address: e.target.value };
                                                setProfile({ ...profile, outlets: updated });
                                            }}
                                            style={{ flex: 2 }}
                                        />
                                        <input
                                            placeholder="Mobile number"
                                            value={outlet.phone}
                                            onChange={(e) => {
                                                const updated = [...profile.outlets];
                                                updated[idx] = { ...updated[idx], phone: e.target.value };
                                                setProfile({ ...profile, outlets: updated });
                                            }}
                                            style={{ flex: 1 }}
                                        />
                                        <button
                                            className="danger"
                                            onClick={() => {
                                                const updated = profile.outlets.filter((_, i) => i !== idx);
                                                setProfile({ ...profile, outlets: updated });
                                            }}
                                        >Remove</button>
                                    </div>
                                ))}
                                <button
                                    onClick={() => setProfile({ ...profile, outlets: [...(profile.outlets || []), { address: "", phone: "" }] })}
                                >+ Add Outlet</button>
                            </div>
                            <div className="info-field">
                                <label>Contact Email:</label>
                                <input value={profile.email} readOnly />
                            </div>
                            <button className="primary">Update Profile</button>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
};

export default SellerProfile;