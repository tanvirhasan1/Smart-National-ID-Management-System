import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  FaBars,
  FaTimes,
  FaUser,
  FaSignOutAlt,
  FaHome,
  FaIdCard,
  FaSearch,
  FaHeadset
} from 'react-icons/fa';
import '../styles/Navbar.css';

const Navbar = () => {
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);

  const closeAllMenus = () => {
    setIsMobileMenuOpen(false);
    setIsProfileDropdownOpen(false);
  };

  const handleLogout = () => {
    closeAllMenus();
    logout();
    navigate('/');
  };

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen((prev) => !prev);
  };

  const toggleProfileDropdown = () => {
    setIsProfileDropdownOpen((prev) => !prev);
  };

  const handleNavClick = () => {
    closeAllMenus();
  };

  const isPathActive = (path) => location.pathname === path;

  // Keep navbar hidden on admin area
  if (location.pathname.startsWith('/admin')) {
    return null;
  }

  return (
    <nav className="navbar">
      <div className="navbar-container">
        {/* Logo */}
        <Link to="/" className="navbar-logo" onClick={handleNavClick}>
          <img src="https://i.ibb.co.com/99gnCXfN/logo.png" alt="Logo" className="logo-img" />
        </Link>

        {/* Mobile Menu Toggle */}
        <button className="mobile-menu-toggle" onClick={toggleMobileMenu}>
          {isMobileMenuOpen ? <FaTimes /> : <FaBars />}
        </button>

        {/* Navigation Links */}
        <div className={`navbar-menu ${isMobileMenuOpen ? 'active' : ''}`}>
          {!isAuthenticated ? (
            <>
              <Link
                to="/"
                className={`nav-link ${isPathActive('/') ? 'active' : ''}`}
                onClick={handleNavClick}
              >
                <FaHome /> Home
              </Link>

              <Link
                to="/login"
                className={`nav-link ${isPathActive('/login') ? 'active' : ''}`}
                onClick={handleNavClick}
              >
                Login
              </Link>

              <Link
                to="/register"
                className="btn btn-primary nav-btn"
                onClick={handleNavClick}
              >
                Register
              </Link>
            </>
          ) : user?.role === 'citizen' ? (
            <>
              <Link
                to="/dashboard"
                className={`nav-link ${isPathActive('/dashboard') ? 'active' : ''}`}
                onClick={handleNavClick}
              >
                <FaHome /> Dashboard
              </Link>

              <Link
                to="/apply"
                className={`nav-link ${isPathActive('/apply') ? 'active' : ''}`}
                onClick={handleNavClick}
              >
                <FaIdCard /> Apply NID
              </Link>

              <Link
                to="/track-application"
                className={`nav-link ${isPathActive('/track-application') ? 'active' : ''}`}
                onClick={handleNavClick}
              >
                <FaSearch /> Track Status
              </Link>

              <Link
                to="/support"
                className={`nav-link ${isPathActive('/support') ? 'active' : ''}`}
                onClick={handleNavClick}
              >
                <FaHeadset /> Support
              </Link>

              <div className="profile-dropdown">
                <button className="profile-btn" onClick={toggleProfileDropdown}>
                  <FaUser />
                  <span>{user?.fullName?.split(' ')[0]}</span>
                </button>

                {isProfileDropdownOpen && (
                  <div className="dropdown-menu">
                    <Link
                      to="/profile"
                      className="dropdown-item"
                      onClick={handleNavClick}
                    >
                      <FaUser /> Profile
                    </Link>

                    <button className="dropdown-item logout" onClick={handleLogout}>
                      <FaSignOutAlt /> Logout
                    </button>
                  </div>
                )}
              </div>
            </>
          ) : (
            <button className="btn btn-outline nav-btn" onClick={handleLogout}>
              <FaSignOutAlt /> Logout
            </button>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;