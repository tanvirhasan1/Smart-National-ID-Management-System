import React from 'react';
import { Link } from 'react-router-dom';
import {
  FaIdCard,
  FaEnvelope,
  FaPhoneAlt,
  FaMapMarkerAlt,
  FaFacebookF,
  FaLinkedinIn,
  FaYoutube
} from 'react-icons/fa';
import '../styles/Footer.css';

// Public footer component
const Footer = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="site-footer">
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
                <li><Link to="/">Home</Link></li>
                <li><Link to="/register">Register</Link></li>
                <li><Link to="/login">Login</Link></li>
                <li><Link to="/track-application">Track Application</Link></li>
              </ul>
            </div>

            <div className="footer-column">
              <h4 className="footer-title">Citizen Services</h4>
              <ul className="footer-links">
                <li><Link to="/apply">Apply for NID</Link></li>
                <li><Link to="/support">Support</Link></li>
                <li><Link to="/forgot-password">Forgot Password</Link></li>
                <li><Link to="/verify-otp">OTP Verification</Link></li>
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