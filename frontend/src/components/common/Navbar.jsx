import React, { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import {
  FaBars,
  FaTimes,
  FaUser,
  FaSignOutAlt,
  FaHome,
  FaThLarge,
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


const Navbar = () => {
  const { user, isAuthenticated, logout } = useAuth();
  const { language: selectedLanguage, setLanguage, languageOptions, t } = useLanguage();
  const navigate = useNavigate();
  const location = useLocation();
  const navbarRef = useRef(null);

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);
  const [isLanguageDropdownOpen, setIsLanguageDropdownOpen] = useState(false);

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
    // This changes the language for the whole app, not only the navbar.
    setLanguage(languageCode);
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

  const getUserDisplayName = () => {
    const name = user?.fullName || user?.name || user?.email?.split('@')?.[0];
    return name || t('nav.profile');
  };

  const getUserFirstName = () => {
    const name = getUserDisplayName();
    return name?.split(' ')?.[0] || name;
  };

  const getUserInitials = () => {
    const name = getUserDisplayName();
    const initials = name
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0])
      .join('')
      .toUpperCase();

    return initials || 'AD';
  };

  const getRoleLabel = () => {
    const normalizedRole = String(user?.role || '').toLowerCase();

    if (selectedLanguage === 'bn') {
      if (normalizedRole.includes('super')) return 'সুপার অ্যাডমিন';
      if (normalizedRole.includes('support')) return 'সাপোর্ট স্টাফ';
      if (normalizedRole.includes('supervisor')) return 'সিস্টেম সুপারভাইজার';
      if (normalizedRole.includes('admin')) return 'অ্যাডমিন';
      return 'ইন্টারনাল ইউজার';
    }

    if (normalizedRole.includes('super')) return 'Super Admin';
    if (normalizedRole.includes('support')) return 'Support Staff';
    if (normalizedRole.includes('supervisor')) return 'System Supervisor';
    if (normalizedRole.includes('admin')) return 'Admin';
    return 'Internal User';
  };

  const adminDashboardLabel =
    selectedLanguage === 'bn' ? 'ড্যাশবোর্ড' : 'Dashboard';

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
          <span className="site-navbar-language-title">{t('nav.language')}</span>
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
        <span>{t('nav.home')}</span>
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
        <span>{t('nav.login')}</span>
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
        <span>{t('nav.register')}</span>
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
        <span>{t('nav.dashboard')}</span>
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
        <span>{t('nav.applyNid')}</span>
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
        <span>{t('nav.trackStatus')}</span>
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
        <span>{t('nav.support')}</span>
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

          <span>{user?.fullName?.split(' ')[0] || t('nav.profile')}</span>

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
              <span>{t('nav.profile')}</span>
            </Link>

            <button
              type="button"
              className="site-navbar-dropdown-item is-logout"
              onClick={handleLogout}
            >
              <FaSignOutAlt />
              <span>{t('nav.logout')}</span>
            </button>
          </div>
        )}
      </div>
    </>
  );

  const renderAdminMenu = () => (
    <>
      <Link
        to="/admin/dashboard"
        className="site-navbar-admin-dashboard-link"
        onClick={handleNavClick}
      >
        <span className="site-navbar-link-icon">
          <FaThLarge />
        </span>
        <span>{adminDashboardLabel}</span>
      </Link>

      {renderLanguageSelector()}

      <div className="site-navbar-profile-dropdown site-navbar-admin-profile-dropdown">
        <button
          type="button"
          className={`site-navbar-admin-profile-button ${
            isProfileDropdownOpen ? 'is-open' : ''
          }`}
          onClick={toggleProfileDropdown}
          aria-haspopup="true"
          aria-expanded={isProfileDropdownOpen}
        >
          <span className="site-navbar-admin-profile-icon">
            <FaUser />
          </span>

          <span className="site-navbar-admin-profile-copy">
            <span className="site-navbar-admin-profile-name">
              {getUserDisplayName()}
            </span>
            <span className="site-navbar-admin-profile-role">
              {getRoleLabel()}
            </span>
          </span>

          <span className="site-navbar-desktop-chevron">
            <FaChevronDown />
          </span>

          <span className="site-navbar-mobile-accordion-icon">
            {isProfileDropdownOpen ? <FaMinus /> : <FaPlus />}
          </span>
        </button>

        {isProfileDropdownOpen && (
          <div className="site-navbar-dropdown-menu site-navbar-admin-dropdown-menu">
            <Link
              to="/admin/dashboard"
              className="site-navbar-dropdown-item"
              onClick={handleNavClick}
            >
              <FaThLarge />
              <span>{adminDashboardLabel}</span>
            </Link>

            <button
              type="button"
              className="site-navbar-dropdown-item is-logout"
              onClick={handleLogout}
            >
              <FaSignOutAlt />
              <span>{t('nav.logout')}</span>
            </button>
          </div>
        )}
      </div>
    </>
  );

  return (
    <nav className={`site-navbar site-navbar-${selectedLanguage}`} ref={navbarRef}>
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
          aria-label={t('nav.toggleNavigation')}
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
              : renderAdminMenu()}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;