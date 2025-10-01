import React, { useState, useEffect } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import GreenShelfHomepage from "./GreenShelfHomepage";
import LoginCard from "./LoginCard";
import CustomerProfile from "./CustomerProfile";
import NGOProfile from "./NGOProfile";
import SellerProfile from "./SellerProfile";
import ThemeToggle from "./ThemeToggle";
import ProtectedRoute from "./ProtectedRoute";
import { AuthProvider, useAuth } from "./contexts/AuthContext";

const AppContent = () => {
    const [showLogin, setShowLogin] = useState(false);
    const { isAuthenticated, login } = useAuth();

    const handleLoginSuccess = (user) => {
        login(user);
        setShowLogin(false);
    };

    return (
        <Router>
            <div className="app-container">
                <ThemeToggle />
                <Routes>
                    <Route
                        path="/"
                        element={
                            <>
                                <GreenShelfHomepage
                                    onNavigateToLogin={() => setShowLogin(true)}
                                    loggedIn={isAuthenticated}
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
                </Routes>
            </div>
        </Router>
    );
};

const App = () => {
    return (
        <AuthProvider>
            <AppContent />
        </AuthProvider>
    );
};

export default App;