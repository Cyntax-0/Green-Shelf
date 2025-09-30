import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './styles/GreenShelfHomepage.css';

const GreenShelfHomepage = ({ onNavigateToLogin, loggedIn }) => {
    const [cart, setCart] = useState([]);
    const [cartStore, setCartStore] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [filterType, setFilterType] = useState('All');
    const [filterLocation, setFilterLocation] = useState('');
    const [message, setMessage] = useState('');
    const navigate = useNavigate();

    const handleProfileNavigation = () => {
        if (loggedIn) {
            navigate('/customer');
        } else {
            onNavigateToLogin();
        }
    };

    const sampleProducts = [
        { id: 1, name: "Organic Apples", type: "Fruit", price: 5, expiry: "2025-09-20", store: "Store A", image: "https://via.placeholder.com/150?text=Apples" },
        { id: 2, name: "Fresh Carrots", type: "Vegetable", price: 3, expiry: "2025-09-18", store: "Store A", image: "https://via.placeholder.com/150?text=Carrots" },
        { id: 3, name: "Dairy Milk", type: "Dairy", price: 4, expiry: "2025-09-15", store: "Store B", image: "https://via.placeholder.com/150?text=Milk" },
        { id: 4, name: "Rice Bag", type: "Grain", price: 10, expiry: "2026-01-01", store: "Store C", image: "https://via.placeholder.com/150?text=Rice" },
        { id: 5, name: "Bananas", type: "Fruit", price: 2, expiry: "2025-09-17", store: "Store A", image: "https://via.placeholder.com/150?text=Bananas" },
        { id: 6, name: "Tomatoes", type: "Vegetable", price: 3, expiry: "2025-09-19", store: "Store B", image: "https://via.placeholder.com/150?text=Tomatoes" }
    ];

    const getDiscountedPrice = (product) => {
        const daysToExpiry = Math.ceil(
            (new Date(product.expiry) - new Date()) / (1000 * 60 * 60 * 24)
        );

        let discount = 0;
        if (daysToExpiry <= 0) discount = 0; 
        else if (daysToExpiry === 1) discount = 0.5; 
        else if (daysToExpiry <= 2) discount = 0.3; 
        else if (daysToExpiry <= 5) discount = 0.2; 
        else discount = 0.1;

        const finalPrice = (product.price * (1 - discount)).toFixed(2);
        return { finalPrice, discount: discount * 100, daysToExpiry };
    };

    const addToCart = (product) => {
        if (cartStore && cartStore !== product.store) {
            setMessage(`You can only buy from one store at a time. Clear your cart to buy from ${product.store}.`);
            return;
        }
        if (!cartStore) setCartStore(product.store);
        setCart([...cart, product]);
        setMessage(`${product.name} added to cart.`);
    };

    const removeFromCart = (index) => {
        const removedItem = cart[index];
        const newCart = [...cart];
        newCart.splice(index, 1);
        setCart(newCart);
        setMessage(`${removedItem.name} removed from cart.`);
        if (newCart.length === 0) setCartStore(null);
    };

    const clearCart = () => {
        setCart([]);
        setCartStore(null);
        setMessage('Cart cleared.');
    };

    const proceedToCheckout = () => {
        setMessage('Proceeding to checkout...');
    };

    const filteredProducts = sampleProducts.filter(product => {
        const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesType = filterType === "All" || product.type === filterType;
        const matchesLocation = filterLocation === "" || product.store.toLowerCase().includes(filterLocation.toLowerCase());
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
                    <button className="auth-button" onClick={onNavigateToLogin}>Login</button>
                </nav>
            </header>

            <div className="filter-navbar">
                {["All", "Fruit", "Vegetable", "Dairy", "Grain"].map(type => (
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
                    placeholder="Filter by location/store..."
                    value={filterLocation}
                    onChange={(e) => setFilterLocation(e.target.value)}
                    className="filter-location"
                />
            </div>

            <main className="homepage-main">
                <h1>Available Food Products</h1>
                <div className="product-list">
                    {filteredProducts.map(product => {
                        const { finalPrice, discount, daysToExpiry } = getDiscountedPrice(product);
                        return (
                            <div key={product.id} className="product-card">
                                <img src={product.image} alt={product.name} className="product-image" />
                                <h3>{product.name}</h3>
                                <p>Type: {product.type}</p>
                                <p>Original Price: ${product.price}</p>
                                <p>Discount: {discount}%</p>
                                <p>Final Price: ${finalPrice}</p>
                                <p>Expiry: {product.expiry}</p>
                                <p>Store: {product.store}</p>
                                {daysToExpiry <= 2 && <p className="expiry-warning">⚠ Expires Soon!</p>}
                                <button onClick={() => addToCart(product)}>Add to Cart</button>
                            </div>
                        );
                    })}
                </div>

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
