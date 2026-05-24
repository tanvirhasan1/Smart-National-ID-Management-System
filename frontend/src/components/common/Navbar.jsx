import React, { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  FaBars,
  FaTimes,
  FaUser,
  FaSignOutAlt,
  FaHome,
  FaIdCard,
  FaSearch,
  FaHeadset,
  FaSignInAlt,
  FaUserPlus,
  FaGlobe,
  FaCheck,
  FaChevronDown,
  FaPlus,
  FaMinus
} from 'react-icons/fa';
import '../styles/Navbar.css';

const languageOptions = [
  { code: 'en', label: 'English', shortLabel: 'EN' },
  { code: 'bn', label: 'বাংলা', shortLabel: 'BN' }
];

const Navbar = () => {
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const navbarRef = useRef(null);

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);
  const [isLanguageDropdownOpen, setIsLanguageDropdownOpen] = useState(false);

  const [selectedLanguage, setSelectedLanguage] = useState(() => {
    return localStorage.getItem('smartNidLanguage') || 'en';
  });

  const selectedLanguageData =
    languageOptions.find((item) => item.code === selectedLanguage) ||
    languageOptions[0];

  const closeAllMenus = () => {
    setIsMobileMenuOpen(false);
    setIsProfileDropdownOpen(false);
    setIsLanguageDropdownOpen(false);
  };

  const closeDropdowns = () => {
    setIsProfileDropdownOpen(false);
    setIsLanguageDropdownOpen(false);
  };

  const handleLogout = () => {
    closeAllMenus();
    logout();
    navigate('/');
  };

  const handleNavClick = () => {
    closeAllMenus();
  };

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen((prev) => !prev);
    setIsProfileDropdownOpen(false);
    setIsLanguageDropdownOpen(false);
  };

  const toggleProfileDropdown = () => {
    setIsProfileDropdownOpen((prev) => !prev);
    setIsLanguageDropdownOpen(false);
  };

  const toggleLanguageDropdown = () => {
    setIsLanguageDropdownOpen((prev) => !prev);
    setIsProfileDropdownOpen(false);
  };

  const handleLanguageSelect = (languageCode) => {
    setSelectedLanguage(languageCode);
    setIsLanguageDropdownOpen(false);
  };

  const isPathActive = (path) => {
    if (path === '/') {
      return location.pathname === '/';
    }

    return location.pathname.startsWith(path);
  };

  useEffect(() => {
    closeAllMenus();
  }, [location.pathname]);

  useEffect(() => {
    localStorage.setItem('smartNidLanguage', selectedLanguage);
    document.documentElement.lang = selectedLanguage === 'bn' ? 'bn' : 'en';
  }, [selectedLanguage]);

  useEffect(() => {
    const handleOutsideClick = (event) => {
      if (!navbarRef.current?.contains(event.target)) {
        closeDropdowns();
      }
    };

    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  if (location.pathname.startsWith('/admin')) {
    return null;
  }

  const renderLanguageSelector = () => (
    <div className="site-navbar-language-dropdown">
      <button
        type="button"
        className={`site-navbar-language-button ${
          isLanguageDropdownOpen ? 'is-open' : ''
        }`}
        onClick={toggleLanguageDropdown}
        aria-haspopup="true"
        aria-expanded={isLanguageDropdownOpen}
      >
        <span className="site-navbar-link-icon">
          <FaGlobe />
        </span>

        <span className="site-navbar-language-text">
          <span className="site-navbar-language-title">Language</span>
          <span className="site-navbar-language-current">
            {selectedLanguageData.shortLabel}
          </span>
        </span>

        <span className="site-navbar-desktop-chevron">
          <FaChevronDown />
        </span>

        <span className="site-navbar-mobile-accordion-icon">
          {isLanguageDropdownOpen ? <FaMinus /> : <FaPlus />}
        </span>
      </button>

      {isLanguageDropdownOpen && (
        <div className="site-navbar-language-menu">
          {languageOptions.map((language) => (
            <button
              key={language.code}
              type="button"
              className={`site-navbar-language-item ${
                selectedLanguage === language.code ? 'is-selected' : ''
              }`}
              onClick={() => handleLanguageSelect(language.code)}
            >
              <span>{language.label}</span>

              {selectedLanguage === language.code && (
                <span className="site-navbar-language-check">
                  <FaCheck />
                </span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );

  const renderGuestMenu = () => (
    <>
      <Link
        to="/"
        className={`site-navbar-link ${isPathActive('/') ? 'is-active' : ''}`}
        onClick={handleNavClick}
      >
        <span className="site-navbar-link-icon">
          <FaHome />
        </span>
        <span>Home</span>
      </Link>

      <Link
        to="/login"
        className={`site-navbar-link ${
          isPathActive('/login') ? 'is-active' : ''
        }`}
        onClick={handleNavClick}
      >
        <span className="site-navbar-link-icon">
          <FaSignInAlt />
        </span>
        <span>Login</span>
      </Link>

      {renderLanguageSelector()}

      <Link
        to="/register"
        className={`site-navbar-register ${
          isPathActive('/register') ? 'is-active' : ''
        }`}
        onClick={handleNavClick}
      >
        <span className="site-navbar-link-icon">
          <FaUserPlus />
        </span>
        <span>Register</span>
      </Link>
    </>
  );

  const renderCitizenMenu = () => (
    <>
      <Link
        to="/dashboard"
        className={`site-navbar-link ${
          isPathActive('/dashboard') ? 'is-active' : ''
        }`}
        onClick={handleNavClick}
      >
        <span className="site-navbar-link-icon">
          <FaHome />
        </span>
        <span>Dashboard</span>
      </Link>

      <Link
        to="/apply"
        className={`site-navbar-link ${
          isPathActive('/apply') ? 'is-active' : ''
        }`}
        onClick={handleNavClick}
      >
        <span className="site-navbar-link-icon">
          <FaIdCard />
        </span>
        <span>Apply NID</span>
      </Link>

      <Link
        to="/track-application"
        className={`site-navbar-link ${
          isPathActive('/track-application') ? 'is-active' : ''
        }`}
        onClick={handleNavClick}
      >
        <span className="site-navbar-link-icon">
          <FaSearch />
        </span>
        <span>Track Status</span>
      </Link>

      <Link
        to="/support"
        className={`site-navbar-link ${
          isPathActive('/support') ? 'is-active' : ''
        }`}
        onClick={handleNavClick}
      >
        <span className="site-navbar-link-icon">
          <FaHeadset />
        </span>
        <span>Support</span>
      </Link>

      {renderLanguageSelector()}

      <div className="site-navbar-profile-dropdown">
        <button
          type="button"
          className={`site-navbar-profile-button ${
            isProfileDropdownOpen ? 'is-open' : ''
          }`}
          onClick={toggleProfileDropdown}
          aria-haspopup="true"
          aria-expanded={isProfileDropdownOpen}
        >
          <span className="site-navbar-link-icon">
            <FaUser />
          </span>

          <span>{user?.fullName?.split(' ')[0] || 'Profile'}</span>

          <span className="site-navbar-desktop-chevron">
            <FaChevronDown />
          </span>

          <span className="site-navbar-mobile-accordion-icon">
            {isProfileDropdownOpen ? <FaMinus /> : <FaPlus />}
          </span>
        </button>

        {isProfileDropdownOpen && (
          <div className="site-navbar-dropdown-menu">
            <Link
              to="/profile"
              className="site-navbar-dropdown-item"
              onClick={handleNavClick}
            >
              <FaUser />
              <span>Profile</span>
            </Link>

            <button
              type="button"
              className="site-navbar-dropdown-item is-logout"
              onClick={handleLogout}
            >
              <FaSignOutAlt />
              <span>Logout</span>
            </button>
          </div>
        )}
      </div>
    </>
  );

  const renderFallbackMenu = () => (
    <>
      {renderLanguageSelector()}

      <button
        type="button"
        className="site-navbar-logout-button"
        onClick={handleLogout}
      >
        <span className="site-navbar-link-icon">
          <FaSignOutAlt />
        </span>
        <span>Logout</span>
      </button>
    </>
  );

  return (
    <nav className="site-navbar" ref={navbarRef}>
      <div className="site-navbar-container">
        <Link to="/" className="site-navbar-logo" onClick={handleNavClick}>
          <img
            src="/logo/logo.png"
            alt="Smart NID Card Management System"
            className="site-navbar-logo-image"
          />
        </Link>

        <button
          type="button"
          className={`site-navbar-mobile-toggle ${
            isMobileMenuOpen ? 'is-active' : ''
          }`}
          onClick={toggleMobileMenu}
          aria-label="Toggle navigation menu"
          aria-expanded={isMobileMenuOpen}
        >
          {isMobileMenuOpen ? <FaTimes /> : <FaBars />}
        </button>

        <div
          className={`site-navbar-menu ${
            isMobileMenuOpen ? 'is-active' : ''
          }`}
        >
          {!isAuthenticated
            ? renderGuestMenu()
            : user?.role === 'citizen'
              ? renderCitizenMenu()
              : renderFallbackMenu()}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;