import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./styles/Card.css";

const LoginCard = ({ onClose, onLoginSuccess }) => {
    const [isSignUp, setIsSignUp] = useState(false);
    const [isForgotPassword, setIsForgotPassword] = useState(false);
    const [signUpType, setSignUpType] = useState("Customer");
    const [formData, setFormData] = useState({
        email: "",
        password: "",
        confirmPassword: "",
        firstName: "",
        lastName: "",
        ngoName: "",
        shopName: ""
    });
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const toggleMode = () => {
        setIsSignUp(!isSignUp);
        setIsForgotPassword(false);
        setSignUpType("Customer");
        setFormData({
            email: "",
            password: "",
            confirmPassword: "",
            firstName: "",
            lastName: "",
            ngoName: "",
            shopName: ""
        });
        setError("");
    };

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
        setError("");
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError("");

        if (isForgotPassword) {
            alert(`Password reset link sent to ${formData.email}`);
            setIsForgotPassword(false);
            setFormData({ email: "", password: "", confirmPassword: "", firstName: "", lastName: "" });
            setLoading(false);
            return;
        }

        try {
            if (isSignUp) {
                if (formData.password !== formData.confirmPassword) {
                    setError("Passwords do not match!");
                    setLoading(false);
                    return;
                }

                let username = "";
                if (signUpType === "Customer") {
                    username = `${formData.firstName} ${formData.lastName}`;
                } else if (signUpType === "NGO") {
                    username = formData.ngoName;
                } else if (signUpType === "Seller") {
                    username = formData.shopName;
                }

                const res = await fetch("http://localhost:5001/api/auth/register", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        username: formData.email.split('@')[0],
                        email: formData.email,
                        password: formData.password,
                        role: signUpType.toLowerCase()
                    })
                });

                const data = await res.json();
                
                if (data.success) {
                    const user = data.data?.user;
                    const token = data.data?.token;
                    onLoginSuccess(user, token);
                    const role = user.role.toLowerCase();
                    navigate(`/${role}`);
                } else {
                    setError(data.message);
                }
            } else {
                const res = await fetch("http://localhost:5001/api/auth/login", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        email: formData.email,
                        password: formData.password
                    })
                });

                const data = await res.json();
                
                if (data.success) {
                    const user = data.data?.user;
                    const token = data.data?.token;
                    onLoginSuccess(user, token);
                    const role = user.role.toLowerCase();
                    navigate(`/${role}`);
                } else {
                    setError(data.message);
                }
            }
        } catch (error) {
            console.error("Network error:", error);
            setError("Error connecting to server. Please check if the server is running.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="login-overlay">
            <div className="close-button" onClick={onClose}>×</div>
            <div className="login-card">
                <h2>
                    {isForgotPassword
                        ? "Forgot Password"
                        : isSignUp
                            ? `${signUpType} Sign Up`
                            : "Login"}
                </h2>

                {isSignUp && !isForgotPassword && (
                    <div className="signup-type-tabs">
                        {["Customer", "NGO", "Seller"].map((type) => (
                            <button
                                key={type}
                                className={`signup-tab ${signUpType === type ? "active" : ""}`}
                                onClick={() => setSignUpType(type)}
                                type="button"
                            >
                                {type}
                            </button>
                        ))}
                    </div>
                )}

                <form onSubmit={handleSubmit}>
                    {isSignUp && !isForgotPassword && signUpType === "Customer" && (
                        <>
                            <input
                                type="text"
                                name="firstName"
                                placeholder="First Name"
                                required
                                value={formData.firstName}
                                onChange={handleChange}
                                disabled={loading}
                            />
                            <input
                                type="text"
                                name="lastName"
                                placeholder="Last Name"
                                required
                                value={formData.lastName}
                                onChange={handleChange}
                                disabled={loading}
                            />
                        </>
                    )}

                    {isSignUp && !isForgotPassword && signUpType === "NGO" && (
                        <input
                            type="text"
                            name="ngoName"
                            placeholder="NGO Name"
                            required
                            value={formData.ngoName}
                            onChange={handleChange}
                            disabled={loading}
                        />
                    )}

                    {isSignUp && !isForgotPassword && signUpType === "Seller" && (
                        <input
                            type="text"
                            name="shopName"
                            placeholder="Shop Name"
                            required
                            value={formData.shopName}
                            onChange={handleChange}
                            disabled={loading}
                        />
                    )}

                    <input
                        type="email"
                        name="email"
                        placeholder="Email"
                        required
                        value={formData.email}
                        onChange={handleChange}
                        disabled={loading}
                    />

                    {!isForgotPassword && (
                        <input
                            type="password"
                            name="password"
                            placeholder="Password"
                            required
                            value={formData.password}
                            onChange={handleChange}
                            disabled={loading}
                        />
                    )}

                    {isSignUp && !isForgotPassword && (
                        <input
                            type="password"
                            name="confirmPassword"
                            placeholder="Confirm Password"
                            required
                            value={formData.confirmPassword}
                            onChange={handleChange}
                            disabled={loading}
                        />
                    )}

                    {!isSignUp && !isForgotPassword && (
                        <p className="forgot-password" onClick={() => setIsForgotPassword(true)}>
                            Forgot Password?
                        </p>
                    )}

                    <button type="submit" disabled={loading}>
                        {loading ? "Processing..." : isForgotPassword ? "Send Reset Link" : isSignUp ? "Sign Up" : "Login"}
                    </button>
                </form>

                {error && <p className="error-message">{error}</p>}

                {!isForgotPassword && (
                    <p onClick={toggleMode} className="toggle-link">
                        {isSignUp ? "Already have an account? Login" : "Don't have an account? Sign Up"}
                    </p>
                )}

                {isForgotPassword && (
                    <p className="toggle-link" onClick={() => setIsForgotPassword(false)}>
                        ← Back to Login
                    </p>
                )}
            </div>
        </div>
    );
};

export default LoginCard;