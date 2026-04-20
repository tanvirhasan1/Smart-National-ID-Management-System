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

  if (location.pathname.startsWith('/admin')) {
    return null;
  }

  return (
    <nav className="site-navbar">
      <div className="site-navbar-container">
        <Link to="/" className="site-navbar-logo" onClick={handleNavClick}>
          <img
            src="https://i.ibb.co.com/99gnCXfN/logo.png"
            alt="Logo"
            className="site-navbar-logo-image"
          />
        </Link>

        <button
          type="button"
          className="site-navbar-mobile-toggle"
          onClick={toggleMobileMenu}
          aria-label="Toggle navigation menu"
        >
          {isMobileMenuOpen ? <FaTimes /> : <FaBars />}
        </button>

        <div className={`site-navbar-menu ${isMobileMenuOpen ? 'is-active' : ''}`}>
          {!isAuthenticated ? (
            <>
              <Link
                to="/"
                className={`site-navbar-link ${isPathActive('/') ? 'is-active' : ''}`}
                onClick={handleNavClick}
              >
                <FaHome /> Home
              </Link>

              <Link
                to="/login"
                className={`site-navbar-link ${isPathActive('/login') ? 'is-active' : ''}`}
                onClick={handleNavClick}
              >
                Login
              </Link>

              <Link
                to="/register"
                className="btn btn-primary site-navbar-button"
                onClick={handleNavClick}
              >
                Register
              </Link>
            </>
          ) : user?.role === 'citizen' ? (
            <>
              <Link
                to="/dashboard"
                className={`site-navbar-link ${isPathActive('/dashboard') ? 'is-active' : ''}`}
                onClick={handleNavClick}
              >
                <FaHome /> Dashboard
              </Link>

              <Link
                to="/apply"
                className={`site-navbar-link ${isPathActive('/apply') ? 'is-active' : ''}`}
                onClick={handleNavClick}
              >
                <FaIdCard /> Apply NID
              </Link>

              <Link
                to="/track-application"
                className={`site-navbar-link ${isPathActive('/track-application') ? 'is-active' : ''}`}
                onClick={handleNavClick}
              >
                <FaSearch /> Track Status
              </Link>

              <Link
                to="/support"
                className={`site-navbar-link ${isPathActive('/support') ? 'is-active' : ''}`}
                onClick={handleNavClick}
              >
                <FaHeadset /> Support
              </Link>

              <div className="site-navbar-profile-dropdown">
                <button
                  type="button"
                  className="site-navbar-profile-button"
                  onClick={toggleProfileDropdown}
                >
                  <FaUser />
                  <span>{user?.fullName?.split(' ')[0]}</span>
                </button>

                {isProfileDropdownOpen && (
                  <div className="site-navbar-dropdown-menu">
                    <Link
                      to="/profile"
                      className="site-navbar-dropdown-item"
                      onClick={handleNavClick}
                    >
                      <FaUser /> Profile
                    </Link>

                    <button
                      type="button"
                      className="site-navbar-dropdown-item is-logout"
                      onClick={handleLogout}
                    >
                      <FaSignOutAlt /> Logout
                    </button>
                  </div>
                )}
              </div>
            </>
          ) : (
            <button
              type="button"
              className="btn btn-outline site-navbar-button"
              onClick={handleLogout}
            >
              <FaSignOutAlt /> Logout
            </button>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;