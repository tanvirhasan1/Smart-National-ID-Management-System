import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  FaIdCard,
  FaFacebookF,
  FaLinkedinIn,
  FaYoutube,
  FaEnvelope,
  FaPhoneAlt,
  FaMapMarkerAlt
} from 'react-icons/fa';
import '../styles/Footer.css';

const Footer = () => {
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
                <h3>Smart NID</h3>
                <p>Trusted digital identity services</p>
              </div>
            </div>

            <div className="footer-compact-links">
              <Link to="/dashboard">Dashboard</Link>
              <Link to="/track-application">Track Status</Link>
              <Link to="/support">Support</Link>
            </div>

            <div className="footer-compact-contact">
              <a href="mailto:support@smartnid.gov.bd">
                <FaEnvelope />
                <span>support@smartnid.gov.bd</span>
              </a>

              <a href="tel:+8801234567890">
                <FaPhoneAlt />
                <span>+880 1234-567890</span>
              </a>
            </div>
          </div>

          <div className="footer-compact-bottom">
            <p>© {currentYear} Smart NID Management System. All rights reserved.</p>

            <div className="footer-compact-bottom-links">
              <a href="#">Privacy Policy</a>
              <a href="#">Terms of Service</a>
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
              <div className="footer-brand">
                <div className="footer-brand-icon">
                  <FaIdCard />
                </div>

                <div className="footer-brand-text">
                  <h3>Smart NID</h3>
                  <p>Management System</p>
                </div>
              </div>

              <p className="footer-description">
                Digital platform for Smart National ID registration, application
                tracking, appointments, and support services for Bangladesh
                citizens.
              </p>

              <div className="footer-socials">
                <a href="#" className="footer-social-link" aria-label="Facebook">
                  <FaFacebookF />
                </a>

                <a href="#" className="footer-social-link" aria-label="LinkedIn">
                  <FaLinkedinIn />
                </a>

                <a href="#" className="footer-social-link" aria-label="YouTube">
                  <FaYoutube />
                </a>
              </div>
            </div>

            <div className="footer-column">
              <h4 className="footer-title">Quick Links</h4>

              <ul className="footer-links">
                <li>
                  <Link to="/">Home</Link>
                </li>
                <li>
                  <Link to="/register">Register</Link>
                </li>
                <li>
                  <Link to="/login">Login</Link>
                </li>
                <li>
                  <Link to="/track-application">Track Application</Link>
                </li>
              </ul>
            </div>

            <div className="footer-column">
              <h4 className="footer-title">Citizen Services</h4>

              <ul className="footer-links">
                <li>
                  <Link to="/apply">Apply for NID</Link>
                </li>
                <li>
                  <Link to="/support">Support</Link>
                </li>
                <li>
                  <Link to="/forgot-password">Forgot Password</Link>
                </li>
                <li>
                  <Link to="/verify-otp">OTP Verification</Link>
                </li>
              </ul>
            </div>

            <div className="footer-column">
              <h4 className="footer-title">Contact</h4>

              <div className="footer-contact-list">
                <div className="footer-contact-item">
                  <span className="footer-contact-icon">
                    <FaEnvelope />
                  </span>
                  <span>support@smartnid.gov.bd</span>
                </div>

                <div className="footer-contact-item">
                  <span className="footer-contact-icon">
                    <FaPhoneAlt />
                  </span>
                  <span>+880 1234-567890</span>
                </div>

                <div className="footer-contact-item footer-contact-address">
                  <span className="footer-contact-icon">
                    <FaMapMarkerAlt />
                  </span>
                  <span>Election Commission Secretariat, Dhaka, Bangladesh</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="footer-bottom">
        <div className="footer-container footer-bottom-content">
          <p>© {currentYear} Smart NID Management System. All rights reserved.</p>

          <div className="footer-bottom-links">
            <a href="#">Privacy Policy</a>
            <a href="#">Terms of Service</a>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;

