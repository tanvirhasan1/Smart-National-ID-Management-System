import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  FaIdCard,
  FaEnvelope,
  FaPhoneAlt,
  FaMapMarkerAlt
} from 'react-icons/fa';
import { useLanguage } from '../context/LanguageContext';
import '../styles/Footer.css';

const Footer = () => {
  const { t } = useLanguage();
  const currentYear = new Date().getFullYear();
  const location = useLocation();

  const isLandingPage = location.pathname === '/';

  const authenticatedCitizenPaths = [
    '/dashboard',
    '/profile',
    '/apply',
    '/track-application',
    '/support'
  ];

  const isCitizenAppPage =
    authenticatedCitizenPaths.includes(location.pathname) ||
    location.pathname.startsWith('/book-appointment/') ||
    location.pathname.startsWith('/digital-nid/');

  const isAdminAppPage =
    location.pathname.startsWith('/admin/') && location.pathname !== '/admin/login';

  const isCompactFooter = isCitizenAppPage || isAdminAppPage;

  if (isCompactFooter) {
    return (
      <footer className="site-footer site-footer-compact">
        <div className="footer-container">
          <div className="footer-compact-row">
            <div className="footer-compact-brand">
              <div className="footer-compact-brand-icon">
                <FaIdCard />
              </div>

              <div className="footer-compact-brand-text">
                <h3>{t('footer.brandTitle')}</h3>
                <p>{t('footer.brandSubtitle')}</p>
              </div>
            </div>

            <div className="footer-compact-links">
              <Link to="/dashboard">{t('footer.dashboard')}</Link>
              <Link to="/track-application">{t('footer.trackStatus')}</Link>
              <Link to="/support">{t('footer.support')}</Link>
            </div>

            <div className="footer-compact-contact">
              <a href="mailto:support@smartnid.local">
                <FaEnvelope />
                <span>support@smartnid.local</span>
              </a>

              <a href="tel:+8801000000000">
                <FaPhoneAlt />
                <span>{t('footer.phoneNumber')}</span>
              </a>
            </div>
          </div>

          <div className="footer-compact-bottom">
            <p>{t('footer.copyright', { year: currentYear })}</p>

            <div className="footer-compact-bottom-links">
              <Link to="/privacy-policy">Privacy Policy</Link>
              <Link to="/terms-of-service">Terms of Service</Link>
            </div>
          </div>
        </div>
      </footer>
    );
  }

  return (
    <footer className={`site-footer ${isLandingPage ? 'site-footer-no-margin' : ''}`}>
      <div className="footer-top">
        <div className="footer-container">
          <div className="footer-grid">
            <div className="footer-column footer-brand-column">
              <Link to="/" className="footer-brand footer-brand-logo" aria-label="Smart NID home">
                <img
                  src="../../../logo/logo-white.webp"
                  alt="Smart NID Card Management System"
                  width="260"
                  height="72"
                  loading="lazy"
                  decoding="async"
                  className="footer-logo-image"
                />
              </Link>

              <p className="footer-description">
                {t('footer.description')}
              </p>

            </div>

            <div className="footer-column">
              <h4 className="footer-title">{t('footer.quickLinks')}</h4>

              <ul className="footer-links">
                <li>
                  <Link to="/">{t('footer.home')}</Link>
                </li>
                <li>
                  <Link to="/register">{t('footer.register')}</Link>
                </li>
                <li>
                  <Link to="/login">{t('footer.login')}</Link>
                </li>
                <li>
                  <Link to="/track-application">{t('footer.trackApplication')}</Link>
                </li>
              </ul>
            </div>

            <div className="footer-column">
              <h4 className="footer-title">{t('footer.citizenServices')}</h4>

              <ul className="footer-links">
                <li>
                  <Link to="/login">{t('footer.applyForNid')}</Link>
                </li>
                <li>
                  <Link to="/support">{t('footer.support')}</Link>
                </li>
                <li>
                  <Link to="/forgot-password">{t('footer.forgotPassword')}</Link>
                </li>
              </ul>
            </div>

            <div className="footer-column">
              <h4 className="footer-title">{t('footer.contact')}</h4>

              <div className="footer-contact-list">
                <div className="footer-contact-item">
                  <span className="footer-contact-icon">
                    <FaEnvelope />
                  </span>
                  <span>support@smartnid.local</span>
                </div>

                <div className="footer-contact-item">
                  <span className="footer-contact-icon">
                    <FaPhoneAlt />
                  </span>
                  <span>{t('footer.phoneNumber')}</span>
                </div>

                <div className="footer-contact-item footer-contact-address">
                  <span className="footer-contact-icon">
                    <FaMapMarkerAlt />
                  </span>
                  <span>{t('footer.demoAddress')}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="footer-bottom">
        <div className="footer-container footer-bottom-content">
          <p>© {currentYear} Smart NID Management System.</p>

          <div className="footer-bottom-links">
            <Link to="/privacy-policy">{t('footer.privacyPolicy')}</Link>
            <Link to="/terms-of-service">{t('footer.termsOfService')}</Link>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;