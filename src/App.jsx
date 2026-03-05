import React, { useState, useEffect } from "react";
import { BrowserRouter as Router, Routes, Route, useNavigate } from "react-router-dom";
import "./styles/App.css";
import IntroPage from "./IntroPage";
import GreenShelfHomepage from "./GreenShelfHomepage";
import LoginCard from "./LoginCard";
import CustomerProfile from "./CustomerProfile";
import NGOProfile from "./NGOProfile";
import SellerProfile from "./SellerProfile";
import Checkout from "./Checkout";
import AdminPage from "./AdminPage";
import ProtectedRoute from "./ProtectedRoute";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import LocationModal from "./components/LocationModal";

const AppContent = () => {
    const [showLogin, setShowLogin] = useState(false);
    const [showLocationModal, setShowLocationModal] = useState(false);
    const [isAdminLogin, setIsAdminLogin] = useState(false);
    const { isAuthenticated, login, user, checkAuthStatus } = useAuth();
    const navigate = useNavigate();

    // Check if location modal should be shown after login
    useEffect(() => {
        if (isAuthenticated && user) {
            // Check if user has location set
            const hasLocation = user.location?.latitude && user.location?.longitude;
            const hasSkippedLocation = localStorage.getItem('locationSkipped') === 'true';
            
            // Show location modal if user doesn't have location and hasn't skipped
            if (!hasLocation && !hasSkippedLocation) {
                // Small delay to let the page settle after login
                const timer = setTimeout(() => {
                    setShowLocationModal(true);
                }, 500);
                return () => clearTimeout(timer);
            }
        }
    }, [isAuthenticated, user]);

    const handleLoginSuccess = (userData, token) => {
        login(userData, token);
        setShowLogin(false);
        // Location modal will be shown by useEffect if needed
    };

    const handleLocationSet = async (locationData) => {
        // Refresh user data to get updated location
        await checkAuthStatus();
        localStorage.removeItem('locationSkipped'); // Clear skip flag if location is set
    };

    const handleLocationModalClose = () => {
        setShowLocationModal(false);
        // Mark as skipped if user closes without setting location
        if (!user?.location?.latitude || !user?.location?.longitude) {
            localStorage.setItem('locationSkipped', 'true');
        }
    };

    const handleNavigateToLogin = () => {
        if (isAuthenticated) {
            const role = (user?.role || 'customer').toLowerCase();
            if (role === 'admin') {
                navigate('/admin');
            } else {
                navigate(`/${role}`);
            }
        } else {
            setIsAdminLogin(false);
            setShowLogin(true);
        }
    };

    const handleAdminLogin = () => {
        if (isAuthenticated) {
            const role = (user?.role || 'customer').toLowerCase();
            if (role === 'admin') {
                navigate('/admin');
            }
            return;
        }

        setIsAdminLogin(true);
        setShowLogin(true);
    };

    return (
        <div className="app-container">
            <Routes>
                <Route path="/" element={<IntroPage />} />
                <Route
                    path="/home"
                    element={
                        <>
                            <GreenShelfHomepage
                                onNavigateToLogin={handleNavigateToLogin}
                                onAdminLogin={handleAdminLogin}
                                loggedIn={isAuthenticated}
                                currentUser={user}
                            />
                            {showLogin && (
                                <LoginCard
                                    onClose={() => setShowLogin(false)}
                                    isAdminLogin={isAdminLogin}
                                    onLoginSuccess={handleLoginSuccess}
                                />
                            )}
                            {showLocationModal && (
                                <LocationModal
                                    isOpen={showLocationModal}
                                    onClose={handleLocationModalClose}
                                    onLocationSet={handleLocationSet}
                                    currentUser={user}
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
                <Route path="/admin" element={<AdminPage />} />
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