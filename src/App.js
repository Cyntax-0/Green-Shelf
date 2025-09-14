import React, { useState } from "react";
import { BrowserRouter as Router, Routes, Route, useNavigate } from "react-router-dom";
import GreenShelfHomepage from "./components/GreenShelfHomepage";
import LoginCard from "./components/LoginCard";
import CustomerProfile from "./components/CustomerProfile";

const App = () => {
  const [showLogin, setShowLogin] = useState(false);

  return (
    <Router>
      <Routes>
        {/* Homepage */}
        <Route
          path="/"
          element={
            <>
              <GreenShelfHomepage onNavigateToLogin={() => setShowLogin(true)} />
              {showLogin && (
                <LoginCard
                  onClose={() => setShowLogin(false)}
                />
              )}
            </>
          }
        />

        {/* Customer Profile */}
        <Route path="/customer" element={<CustomerProfile />} />
      </Routes>
    </Router>
  );
};

export default App;