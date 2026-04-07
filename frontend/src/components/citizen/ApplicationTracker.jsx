import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { 
  FaCheckCircle, 
  FaClock, 
  FaTimesCircle, 
  FaPrint, 
  FaTruck, 
  FaHome,
  FaSearch,
  FaFileAlt,
  FaFingerprint,
  FaIdCard
} from 'react-icons/fa';
import api from '../api/axios';
import Loader from '../common/Loader';
import { formatDate, formatDateTime, formatStatus, getStatusColor } from '../utils/helpers';
import '../styles/ApplicationTracker.css';

const ApplicationTracker = () => {
  const [searchParams] = useSearchParams();
  const applicationId = searchParams.get('id');
  
  const [applications, setApplications] = useState([]);
  const [selectedApp, setSelectedApp] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchApplications();
  }, []);

  useEffect(() => {
    if (applicationId && applications.length > 0) {
      const app = applications.find(a => a._id === applicationId);
      if (app) setSelectedApp(app);
    }
  }, [applicationId, applications]);

  const fetchApplications = async () => {
  try {
    setLoading(true);

    const response = await api.get('/applications/my');
    const applicationList = response?.data?.applications || [];

    setApplications(applicationList);

    if (applicationList.length > 0 && !applicationId) {
      setSelectedApp(applicationList[0]);
    }
  } catch (error) {
    console.error('Error fetching applications:', error);
  } finally {
    setLoading(false);
  }
};

  const getStatusSteps = () => {
  const steps = [
    { key: 'submitted', label: 'Submitted', icon: FaFileAlt, description: 'Application submitted successfully' },
    { key: 'under_review', label: 'Under Review', icon: FaSearch, description: 'Being reviewed by admin' },
    { key: 'approved', label: 'Approved', icon: FaCheckCircle, description: 'Application approved' },
    { key: 'printed', label: 'Printed', icon: FaPrint, description: 'Card has been printed' },
    { key: 'delivered', label: 'Delivered', icon: FaHome, description: 'Card delivered successfully' }
  ];

  return steps;
};

  const getCurrentStepIndex = (status) => {
  const statusMap = {
    draft: -1,
    submitted: 0,
    under_review: 1,
    approved: 2,
    rejected: -2,
    printed: 3,
    delivered: 4,
    cancelled: -2
  };

  return statusMap[status] ?? 0;
};

  const filteredApplications = applications.filter(app =>
   (app.applicationId || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div className="tracker-loading">
        <Loader size="large" text="Loading applications..." />
      </div>
    );
  }

  return (
    <div className="tracker-page">
      <div className="tracker-container">
        <div className="tracker-header">
          <h1>Track Your Application</h1>
          <p>Monitor the progress of your NID application</p>
        </div>

        <div className="tracker-content">
          {/* Applications List */}
          <div className="applications-sidebar">
            <div className="sidebar-header">
              <h3>My Applications</h3>
              <div className="search-box">
                <FaSearch />
                <input
                  type="text"
                  placeholder="Search by ID..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>

            {filteredApplications.length === 0 ? (
              <div className="no-applications">
                <FaIdCard className="empty-icon" />
                <p>No applications found</p>
                <Link to="/apply" className="btn btn-primary btn-sm">
                  Apply Now
                </Link>
              </div>
            ) : (
              <div className="applications-list">
                {filteredApplications.map(app => (
                  <div
                    key={app._id}
                    className={`application-item ${selectedApp?._id === app._id ? 'active' : ''}`}
                    onClick={() => setSelectedApp(app)}
                  >
                    <div className="app-item-header">
                      <span className="app-number">#{app.applicationId}</span>
                      <span className={`status-dot status-${getStatusColor(app.status)}`}></span>
                    </div>
                    <div className="app-item-info">
                      <span className="app-type">{app.applicationType.toUpperCase()}</span>
                      <span className="app-date">{formatDate(app.createdAt)}</span>
                    </div>
                    <span className={`badge badge-${getStatusColor(app.status)}`}>
                      {formatStatus(app.status)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Application Details */}
          {selectedApp ? (
            <div className="application-details">
              <div className="details-header">
                <div className="header-info">
                  <h2>Application #{selectedApp.applicationId}</h2>
                  <span className={`badge badge-lg badge-${getStatusColor(selectedApp.status)}`}>
                    {formatStatus(selectedApp.status)}
                  </span>
                </div>
                <p>Submitted on {formatDateTime(selectedApp.createdAt)}</p>
              </div>

              {/* Status Timeline */}
              {selectedApp.status !== 'rejected' ? (
                <div className="status-timeline">
                  <h3>Application Progress</h3>
                  <div className="timeline">
                    {getStatusSteps().map((step, index) => {
                      const currentIndex = getCurrentStepIndex(selectedApp.status);
                      const isCompleted = index <= currentIndex;
                      const isCurrent = index === currentIndex;
                      
                      return (
                        <div
                          key={step.key}
                          className={`timeline-step ${isCompleted ? 'completed' : ''} ${isCurrent ? 'current' : ''}`}
                        >
                          <div className="step-icon">
                            <step.icon />
                          </div>
                          <div className="step-content">
                            <h4>{step.label}</h4>
                            <p>{step.description}</p>
                          </div>
                          {index < getStatusSteps().length - 1 && (
                            <div className={`step-line ${isCompleted ? 'completed' : ''}`}></div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="rejection-notice">
                  <div className="rejection-icon">
                    <FaTimesCircle />
                  </div>
                  <h3>Application Rejected</h3>
                  <p><strong>Reason:</strong> {selectedApp.rejectionReason || 'Not specified'}</p>
                  <p>You can submit a new application or contact support for assistance.</p>
                  <div className="rejection-actions">
                    <Link to="/apply" className="btn btn-primary">Apply Again</Link>
                    <Link to="/support" className="btn btn-outline">Contact Support</Link>
                  </div>
                </div>
              )}

              {/* AI Verification Status */}
              {selectedApp.aiVerification && (
                <div className="verification-section">
                  <h3>AI Verification Status</h3>
                  <div className="verification-card">
                    <div className="verification-status">
                      <span className={`status-indicator ${selectedApp.aiVerification.status}`}>
                        {selectedApp.aiVerification.status === 'passed' ? (
                          <FaCheckCircle />
                        ) : selectedApp.aiVerification.status === 'flagged' ? (
                          <FaClock />
                        ) : (
                          <FaClock />
                        )}
                        {formatStatus(selectedApp.aiVerification.status)}
                      </span>
                      <span className="risk-score">
                        Risk Score: <strong>{selectedApp.aiVerification.riskScore}%</strong>
                      </span>
                    </div>
                    {selectedApp.aiVerification.flags?.length > 0 && (
                      <div className="verification-flags">
                        <p>Flags:</p>
                        <ul>
                          {selectedApp.aiVerification.flags.map((flag, idx) => (
                            <li key={idx}>{formatStatus(flag)}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Delivery Information */}
              {['delivered'].includes(selectedApp.status) && (
                <div className="delivery-section">
                  <h3>Delivery Information</h3>
                  <div className="delivery-card">
                    {selectedApp.trackingNumber && (
                      <div className="delivery-item">
                        <label>Tracking Number</label>
                        <p>{selectedApp.trackingNumber}</p>
                      </div>
                    )}
                    {selectedApp.dispatchedAt && (
                      <div className="delivery-item">
                        <label>Dispatched On</label>
                        <p>{formatDateTime(selectedApp.dispatchedAt)}</p>
                      </div>
                    )}
                    {selectedApp.deliveredAt && (
                      <div className="delivery-item">
                        <label>Delivered On</label>
                        <p>{formatDateTime(selectedApp.deliveredAt)}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="details-actions">
                {selectedApp.status === 'submitted' && (
                  <Link to={`/book-appointment/${selectedApp._id}`} className="btn btn-primary">
                    Book Biometric Appointment
                  </Link>
                )}
                {['approved', 'printed', 'delivered'].includes(selectedApp.status) && (
                  <Link to={`/digital-nid/${selectedApp._id}`} className="btn btn-primary">
                    <FaIdCard /> View Digital NID
                  </Link>
                )}
                <Link to="/support" className="btn btn-outline">
                  Need Help?
                </Link>
              </div>
            </div>
          ) : (
            <div className="no-selection">
              <FaFileAlt className="empty-icon" />
              <h3>Select an Application</h3>
              <p>Choose an application from the list to view details</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ApplicationTracker;