import React from 'react';
import { Link } from 'react-router-dom';
import { FaExclamationTriangle, FaArrowLeft, FaHome } from 'react-icons/fa';
import '../styles/NotFound.css';

// Not found page
const NotFound = () => {
  return (
    <div className="not-found-page">
      <div className="not-found-container">
        <div className="not-found-card">
          <div className="not-found-icon">
            <FaExclamationTriangle />
          </div>

          <h1 className="not-found-code">404</h1>
          <h2 className="not-found-title">Page Not Found</h2>

          <p className="not-found-text">
            The page you are looking for does not exist or may have been moved.
          </p>

          <div className="not-found-actions">
            <Link to="/" className="btn btn-primary btn-lg">
              <FaHome /> Go Home
            </Link>

            <button
              type="button"
              className="btn btn-outline btn-lg"
              onClick={() => window.history.back()}
            >
              <FaArrowLeft /> Go Back
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NotFound;