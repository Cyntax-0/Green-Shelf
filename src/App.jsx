import React, { useState, useEffect } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import GreenShelfHomepage from "./GreenShelfHomepage";
import LoginCard from "./LoginCard";
import CustomerProfile from "./CustomerProfile";
import NGOProfile from "./NGOProfile";
import SellerProfile from "./SellerProfile";

const App = () => {
    const [showLogin, setShowLogin] = useState(false);
    const [loggedIn, setLoggedIn] = useState(false);
    const [userData, setUserData] = useState(null);

    useEffect(() => {
        fetch("http://localhost:5000/api/check-session", {
            credentials: "include"
        })
            .then(res => {
                if (!res.ok) throw new Error("Network response was not ok");
                return res.json();
            })
            .then(data => {
                setLoggedIn(data.loggedIn);
                setUserData(data.user || null);
            })
            .catch((err) => {
                console.error("Session check error:", err);
                setLoggedIn(false);
            });
    }, []);

    const handleLoginSuccess = (user) => {
        setLoggedIn(true);
        setUserData(user);
        setShowLogin(false);
    };

    return (
        <Router>
            <Routes>
                <Route
                    path="/"
                    element={
                        <>
                            <GreenShelfHomepage
                                onNavigateToLogin={() => setShowLogin(true)}
                                loggedIn={loggedIn}
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
                    element={<CustomerProfile />}
                />
                <Route
                    path="/ngo"
                    element={<NGOProfile />}
                />
                <Route
                    path="/seller"
                    element={<SellerProfile />}
                />
                <Route
                    path="/profile"
                    element={<CustomerProfile />}
                />
            </Routes>
        </Router>
    );
};

export default App;