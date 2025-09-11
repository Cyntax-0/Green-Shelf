import React, { useState } from 'react';
import './App.css';
import GreenShelfHomepage from './components/GreenShelfHomepage';
import LoginPage from './components/LoginPage';

function App() {
  const [currentPage, setCurrentPage] = useState('home');

  const navigateToLogin = () => {
    setCurrentPage('login');
  };

  const navigateToHome = () => {
    setCurrentPage('home');
  };

  return (
    <div className="App">
      {currentPage === 'home' && (
        <GreenShelfHomepage onNavigateToLogin={navigateToLogin} />
      )}
      {currentPage === 'login' && (
        <LoginPage onNavigateToHome={navigateToHome} />
      )}
    </div>
  );
}

export default App;