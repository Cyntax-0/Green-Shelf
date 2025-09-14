import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/LoginCard.css";

const LoginCard = ({ onClose }) => {
    const [isSignUp, setIsSignUp] = useState(false);
    const [isForgotPassword, setIsForgotPassword] = useState(false);
    const [signUpType, setSignUpType] = useState("Customer");
    const [formData, setFormData] = useState({
        email: "",
        password: "",
        confirmPassword: ""
    });
    const [error, setError] = useState(""); // for showing validation messages

    const navigate = useNavigate();

    const toggleMode = () => {
        setIsSignUp(!isSignUp);
        setIsForgotPassword(false);
        setSignUpType("Customer");
        setFormData({ email: "", password: "", confirmPassword: "" });
        setError("");
    };

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
        setError("");
    };

    const handleSubmit = (e) => {
        e.preventDefault();

        if (isForgotPassword) {
            setError(`Password reset link sent to ${formData.email}`);
            setIsForgotPassword(false);
            setFormData({ email: "", password: "", confirmPassword: "" });
            return;
        }

        if (isSignUp) {
            // ✅ Check if password and confirm password match
            if (formData.password !== formData.confirmPassword) {
                setError("Passwords do not match!");
                return;
            }

            if (signUpType === "Customer" || signUpType === "NGOs") {
                navigate("/customer");
            } else if (signUpType === "Seller") {
                setError("Seller signup successful! (Redirect to seller dashboard later)");
                // navigate("/seller"); // keep for future
            }
        } else {
            // ✅ Login successful
            navigate("/customer");
        }
    };

    return (
        <div className="login-overlay">
            <div className="close-button" onClick={onClose}>
                x
            </div>
            <div className="login-card">
                <h2>
                    {isForgotPassword
                        ? "Forgot Password"
                        : isSignUp
                            ? `${signUpType} Sign Up`
                            : "Login"}
                </h2>

                {isSignUp && !isForgotPassword && signUpType !== "Seller" && (
                    <div className="signup-type-tabs">
                        {["Customer", "NGOs"].map((type) => (
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
                    <input
                        type="email"
                        name="email"
                        placeholder="Email"
                        required
                        value={formData.email}
                        onChange={handleChange}
                    />

                    {!isForgotPassword && (
                        <input
                            type="password"
                            name="password"
                            placeholder="Password"
                            required
                            value={formData.password}
                            onChange={handleChange}
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
                        />
                    )}

                    {!isSignUp && !isForgotPassword && (
                        <p
                            className="forgot-password"
                            onClick={() => setIsForgotPassword(true)}
                        >
                            Forgot Password?
                        </p>
                    )}

                    <button type="submit">
                        {isForgotPassword
                            ? "Send Reset Link"
                            : isSignUp
                                ? "Sign Up"
                                : "Login"}
                    </button>
                </form>

                {/* ✅ Error / Success Message */}
                {error && <p className="error-message">{error}</p>}

                {/* Seller link */}
                {isSignUp && !isForgotPassword && signUpType !== "Seller" && (
                    <p
                        className="toggle-link"
                        onClick={() => setSignUpType("Seller")}
                    >
                        Are you a seller?
                    </p>
                )}

                {!isForgotPassword && (
                    <p onClick={toggleMode} className="toggle-link">
                        {isSignUp
                            ? "Already have an account? Login"
                            : "Don't have an account? Sign Up"}
                    </p>
                )}

                {isForgotPassword && (
                    <p
                        className="toggle-link"
                        onClick={() => setIsForgotPassword(false)}
                    >
                        ← Back to Login
                    </p>
                )}
            </div>
        </div>
    );
};

export default LoginCard;