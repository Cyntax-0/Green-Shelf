import React, { useState } from "react";
import "../styles/CustomerProfile.css";

const CustomerProfile = ({ onNavigateHome, userData }) => {
    const [profile, setProfile] = useState({
        name: userData?.name || "",
        age: userData?.age || "",
        email: userData?.email || "",
        phone: userData?.phone || "",
        addresses: userData?.addresses || [""],
    });

    const [cart, setCart] = useState(userData?.cart || []);
    const [cartStore, setCartStore] = useState(cart.length > 0 ? cart[0].store : null);
    const [message, setMessage] = useState("");

    const handleChange = (e) => {
        setProfile({ ...profile, [e.target.name]: e.target.value });
    };

    const handleUpdate = (field) => {
        setMessage(`${field} updated to: ${profile[field]}`);
    };

    const handleAddressChange = (index, value) => {
        const newAddresses = [...profile.addresses];
        newAddresses[index] = value;
        setProfile({ ...profile, addresses: newAddresses });
    };

    const addAddress = () => {
        setProfile({ ...profile, addresses: [...profile.addresses, ""] });
    };

    const removeAddress = (index) => {
        const newAddresses = profile.addresses.filter((_, i) => i !== index);
        setProfile({ ...profile, addresses: newAddresses });
    };

    const updateAddress = (index) => {
        setMessage(`Address ${index + 1} updated: ${profile.addresses[index]}`);
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
        setMessage("Cart cleared.");
    };

    const proceedToCheckout = () => {
        setMessage("Proceeding to checkout...");
    };

    return (
        <div className="profile-page">
            <header className="homepage-header">
                <div className="logo" onClick={onNavigateHome}>GreenShelf</div>
                <input type="text" placeholder="Search products..." disabled className="search-bar" />
                <nav></nav>
            </header>

            <main className="profile-main">
                <h1>Customer Profile</h1>
                <form className="profile-form" onSubmit={(e) => e.preventDefault()}>
                    <div className="profile-field">
                        <input
                            type="text"
                            name="name"
                            placeholder="Full Name"
                            value={profile.name}
                            onChange={handleChange}
                        />
                        <button type="button" onClick={() => handleUpdate("name")}>Update</button>
                    </div>

                    <div className="profile-field">
                        <input
                            type="number"
                            name="age"
                            placeholder="Age"
                            value={profile.age}
                            onChange={handleChange}
                        />
                        <button type="button" onClick={() => handleUpdate("age")}>Update</button>
                    </div>

                    <div className="profile-field">
                        <input type="email" name="email" value={profile.email} readOnly />
                    </div>

                    <div className="profile-field">
                        <input
                            type="text"
                            name="phone"
                            placeholder="Phone Number"
                            value={profile.phone}
                            onChange={handleChange}
                        />
                        <button type="button" onClick={() => handleUpdate("phone")}>Update</button>
                    </div>

                    <h3>Addresses</h3>
                    {profile.addresses.map((address, index) => (
                        <div className="profile-field" key={index}>
                            <textarea
                                placeholder={`Address ${index + 1}`}
                                value={address}
                                onChange={(e) => handleAddressChange(index, e.target.value)}
                            />
                            <button type="button" onClick={() => updateAddress(index)}>Update</button>
                            {profile.addresses.length > 1 && (
                                <button type="button" onClick={() => removeAddress(index)}>Remove</button>
                            )}
                        </div>
                    ))}
                    <button type="button" onClick={addAddress}>Add New Address</button>

                    <p className="continue-shopping" onClick={onNavigateHome}>Continue Shopping</p>

                    <div className="cart-section">
                        <h2>Cart {cartStore ? `(Store: ${cartStore})` : ""}</h2>
                        {cart.length === 0 ? (
                            <p>No items in cart</p>
                        ) : (
                            <>
                                <ul>
                                    {cart.map((item, index) => (
                                        <li key={index}>
                                            {item.name} - ${item.price}
                                            <button onClick={() => removeFromCart(index)} className="remove-button">
                                                Remove
                                            </button>
                                        </li>
                                    ))}
                                </ul>
                                <div className="cart-actions">
                                    <button onClick={proceedToCheckout}>Proceed to Checkout</button>
                                    <button onClick={clearCart}>Clear Cart</button>
                                </div>
                            </>
                        )}
                    </div>

                    {message && <p className="cart-message">{message}</p>}
                </form>
            </main>
        </div>
    );
};

export default CustomerProfile;