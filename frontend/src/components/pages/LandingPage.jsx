// Landing Page Start
import React from 'react';
import { Link } from 'react-router-dom';
import {
  FaIdCard,
  FaUserPlus,
  FaSearch,
  FaMobileAlt,
  FaShieldAlt,
  FaClock,
  FaCheckCircle,
  FaArrowRight
} from 'react-icons/fa';
import '../styles/LandingPage.css';

const LandingPage = () => {
  // Landing page feature cards
  const features = [
    {
      icon: <FaUserPlus />,
      title: 'Easy Registration',
      description:
        'Register online with your Birth Certificate. Quick and simple verification process.'
    },
    {
      icon: <FaIdCard />,
      title: 'Online Application',
      description:
        'Complete your Smart NID application from anywhere, anytime.'
    },
    {
      icon: <FaSearch />,
      title: 'Track Application',
      description:
        'Monitor your application status in real-time from submission to delivery.'
    },
    {
      icon: <FaMobileAlt />,
      title: 'Digital NID',
      description:
        'Download your Digital NID with QR code verification support.'
    },
    {
      icon: <FaShieldAlt />,
      title: 'Secure & Safe',
      description:
        'Your data is protected with advanced encryption and security measures.'
    },
    {
      icon: <FaClock />,
      title: 'Fast Processing',
      description:
        'Fast verification and processing helps reduce waiting time.'
    }
  ];

  // Simple process steps
  const steps = [
    {
      number: '01',
      title: 'Register Account',
      description:
        'Create your account using Birth Registration Number and verify with OTP.'
    },
    {
      number: '02',
      title: 'Submit Application',
      description:
        'Fill in your details and upload required documents for NID application.'
    },
    {
      number: '03',
      title: 'Book Appointment',
      description:
        'Schedule a convenient time for biometric enrollment at your nearest center.'
    },
    {
      number: '04',
      title: 'Receive Your NID',
      description:
        'Get your Digital NID instantly and physical card delivered to your address.'
    }
  ];

  return (
    <div className="landing-page">
      {/* Hero Section */}
      <section className="hero-section">
        <div className="hero-container">
          <div className="hero-content">
            <h1 className="hero-title">
              Smart National ID
              <span className="text-gradient"> Management System</span>
            </h1>

            <p className="hero-subtitle">
              Apply for your Smart National ID Card online. Fast, secure, and
              convenient digital platform for Bangladesh citizens.
            </p>

            <div className="hero-buttons">
              <Link to="/register" className="btn btn-primary btn-lg">
                <FaUserPlus /> Register Now
              </Link>

              <Link to="/login" className="btn btn-outline btn-lg">
                Login to Dashboard
              </Link>
            </div>

            <div className="hero-stats">
              <div className="stat-item">
                <span className="stat-number">10M+</span>
                <span className="stat-label">Citizens Registered</span>
              </div>

              <div className="stat-item">
                <span className="stat-number">500+</span>
                <span className="stat-label">Enrollment Centers</span>
              </div>

              <div className="stat-item">
                <span className="stat-number">99%</span>
                <span className="stat-label">Success Rate</span>
              </div>
            </div>
          </div>

          <div className="hero-image">
            <img src="https://i.ibb.co.com/0W7yVCf/1776456590.png" alt="Smart NID Card" />
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="features-section">
        <div className="section-container">
          <div className="section-header">
            <h2 className="section-title">Why Choose Our Platform?</h2>
            <p className="section-subtitle">
              Experience the convenience of digital NID services with our secure
              and user-friendly platform.
            </p>
          </div>

          <div className="features-grid">
            {features.map((feature, index) => (
              <div key={index} className="feature-card">
                <div className="feature-icon">{feature.icon}</div>
                <h3 className="feature-title">{feature.title}</h3>
                <p className="feature-description">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Process Section */}
      <section className="process-section">
        <div className="section-container">
          <div className="section-header">
            <h2 className="section-title">How It Works</h2>
            <p className="section-subtitle">
              Simple four-step process to get your Smart National ID Card.
            </p>
          </div>

          <div className="process-steps">
            {steps.map((step, index) => (
              <div key={index} className="process-step">
                <div className="step-number">{step.number}</div>

                <div className="step-content">
                  <h3 className="step-title justify-center">{step.title}</h3>
                  <p className="step-description">{step.description}</p>
                </div>

                {index < steps.length - 1 && (
                  <div className="step-connector step-connector-extra">
                    <FaArrowRight />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="cta-section">
        <div className="section-container">
          <div className="cta-content">
            <h2>Ready to Get Your Smart NID?</h2>
            <p>
              Join millions of Bangladeshi citizens who have already registered
              on our platform.
            </p>

            <div className="cta-buttons">
              <Link to="/register" className="btn btn-primary btn-lg">
                Get Started <FaArrowRight />
              </Link>

              <Link to="/track-application" className="btn btn-outline btn-lg">
                Track Existing Application
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Requirements Section */}
      <section className="requirements-section">
        <div className="section-container">
          <div className="section-header">
            <h2 className="section-title">
              Requirements for NID Application
            </h2>
            <p className="section-subtitle">
              Make sure you have these documents ready before starting your
              application.
            </p>
          </div>

          <div className="requirements-grid">
            <div className="requirement-card">
              <FaCheckCircle className="requirement-icon" />
              <h4>Birth Certificate</h4>
              <p>Valid Birth Registration Number from BDRIS</p>
            </div>

            <div className="requirement-card">
              <FaCheckCircle className="requirement-icon" />
              <h4>Recent Photograph</h4>
              <p>Passport size photo with white background</p>
            </div>

            <div className="requirement-card">
              <FaCheckCircle className="requirement-icon" />
              <h4>Signature</h4>
              <p>Clear signature on white paper</p>
            </div>

            <div className="requirement-card">
              <FaCheckCircle className="requirement-icon" />
              <h4>Parent&apos;s NID</h4>
              <p>Father&apos;s or Mother&apos;s NID number (optional)</p>
            </div>

            <div className="requirement-card">
              <FaCheckCircle className="requirement-icon" />
              <h4>Mobile Number</h4>
              <p>Active Bangladeshi mobile number for OTP</p>
            </div>

            <div className="requirement-card">
              <FaCheckCircle className="requirement-icon" />
              <h4>Address Proof</h4>
              <p>Utility bill or similar document (optional)</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default LandingPage;
// Landing Page End