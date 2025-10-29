import React, { useState } from "react";
import { BrowserRouter as Router, Routes, Route, useNavigate } from "react-router-dom";
import GreenShelfHomepage from "./GreenShelfHomepage";
import LoginCard from "./LoginCard";
import CustomerProfile from "./CustomerProfile";
import NGOProfile from "./NGOProfile";
import SellerProfile from "./SellerProfile";
import Checkout from "./Checkout";
import ProtectedRoute from "./ProtectedRoute";
import { AuthProvider, useAuth } from "./contexts/AuthContext";

const AppContent = () => {
    const [showLogin, setShowLogin] = useState(false);
    const { isAuthenticated, login, user } = useAuth();
    const navigate = useNavigate();

    const handleLoginSuccess = (userData, token) => {
        login(userData, token);
        setShowLogin(false);
        const role = (userData?.role || 'customer').toLowerCase();
        navigate(`/${role}`);
    };

    const handleNavigateToLogin = () => {
        if (isAuthenticated) {
            const role = (user?.role || 'customer').toLowerCase();
            navigate(`/${role}`);
        } else {
            setShowLogin(true);
        }
    };

    return (
        <div className="app-container">
            <Routes>
                <Route
                    path="/"
                    element={
                        <>
                            <GreenShelfHomepage
                                onNavigateToLogin={handleNavigateToLogin}
                                loggedIn={isAuthenticated}
                                currentUser={user}
                            />
                            {showLogin && (
                                <LoginCard
                                    onClose={() => setShowLogin(false)}
                                    onLoginSuccess={handleLoginSuccess}
                                />
                            )}
                        </>
                    }
                />
                <Route
                    path="/customer"
                    element={
                        <ProtectedRoute>
                            <CustomerProfile />
                        </ProtectedRoute>
                    }
                />
                <Route
                    path="/ngo"
                    element={
                        <ProtectedRoute>
                            <NGOProfile />
                        </ProtectedRoute>
                    }
                />
                <Route
                    path="/seller"
                    element={
                        <ProtectedRoute>
                            <SellerProfile />
                        </ProtectedRoute>
                    }
                />
                <Route
                    path="/profile"
                    element={
                        <ProtectedRoute>
                            <CustomerProfile />
                        </ProtectedRoute>
                    }
                />
                <Route
                    path="/checkout"
                    element={
                        <ProtectedRoute>
                            <Checkout />
                        </ProtectedRoute>
                    }
                />
            </Routes>
        </div>
    );
};

const App = () => {
    return (
        <Router>
            <AuthProvider>
                <AppContent />
            </AuthProvider>
        </Router>
    );
};

export default App;