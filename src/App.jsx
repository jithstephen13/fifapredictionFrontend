import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import Home from './pages/Home';
import Predict from './pages/Predict';
import Admin from './pages/Admin';

// Export API URL for use across pages
export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';

function Header() {
  const location = useLocation();
  const isAdmin = location.pathname.startsWith('/admin');

  return (
    <header className="header">
      <div className="header-content">
        <Link to="/" className="logo-link">
          ⚽ <span className="logo-text-gradient">FIFA Predictor</span>
        </Link>
        <nav className="nav-links">
          <Link 
            to="/" 
            className={`nav-link ${location.pathname === '/' ? 'active' : ''}`}
          >
            Matches
          </Link>
        </nav>
      </div>
    </header>
  );
}

function App() {
  return (
    <Router>
      <div className="app-container">
        <Header />
        <main className="main-content">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/predict/:matchId" element={<Predict />} />
            <Route path="/admin" element={<Admin />} />
          </Routes>
        </main>
        <footer className="footer">
          <p>© {new Date().getFullYear()} FIFA Match Predictor. Predict, Pay & Win!</p>
        </footer>
      </div>
    </Router>
  );
}

export default App;
