import React, { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import {
  FaArrowLeft,
  FaCheckCircle,
  FaClock,
  FaFileAlt,
  FaIdCard,
  FaPrint,
  FaSpinner,
  FaUser
} from 'react-icons/fa';
import api from '../api/axios';
import AdminLayout from './AdminLayout';
import Loader from '../common/Loader';
import { formatDate, formatDateTime, formatStatus } from '../utils/helpers';
import {
  getApplicantEmail,
  getApplicantName,
  getApplicantPhone,
  getBiometricCompletedAt,
  getDocumentSummary,
  getPrintingQueueDate,
  getPrintingStatusClass,
  getPrintingStatusLabel,
  getQueueAge,
  isApplicationPrintReady
} from './adminQueueUtils';
import '../styles/PrintingQueue.css';

const PrintingDetails = () => {
  const { id } = useParams();
  const [application, setApplication] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchApplication = useCallback(async () => {
    try {
      setLoading(true);
      const response = await api.get(`/admin/printing/${id}`);
      setApplication(response?.data?.application || response?.data?.data || null);
    } catch (error) {
      console.error('Error fetching printing details:', error);
      toast.error(error?.response?.data?.message || 'Failed to load printing details');
      setApplication(null);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchApplication();
  }, [fetchApplication]);

  const handleMarkPrinted = async () => {
    if (!application?._id || !isApplicationPrintReady(application)) return;

    try {
      setActionLoading(true);
      const response = await api.patch(`/admin/printing/${application._id}/mark-printed`, {
        printNote: 'Marked printed from Printing Details'
      });
      const nidNumber = response?.data?.nidNumber || response?.data?.application?.nidNumber;
      toast.success(
        nidNumber
          ? `Application marked as printed. NID: ${nidNumber}`
          : 'Application marked as printed'
      );
      await fetchApplication();
    } catch (error) {
      console.error('Error marking application as printed:', error);
      toast.error(error?.response?.data?.message || 'Failed to mark as printed');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="printing-queue-loading-state">
          <Loader size="large" text="Loading printing details..." />
        </div>
      </AdminLayout>
    );
  }

  if (!application) {
    return (
      <AdminLayout>
        <div className="printing-queue-details-page">
          <Link className="printing-queue-back-link" to="/admin/printing">
            <FaArrowLeft />
            Back to Printing Queue
          </Link>
          <div className="printing-queue-empty-state">
            <FaPrint />
            <h3>Printing item not found</h3>
            <p>The application may no longer be available to this admin account.</p>
          </div>
        </div>
      </AdminLayout>
    );
  }

  const biometricCompletedAt = getBiometricCompletedAt(application);
  const documentSummary = getDocumentSummary(application);
  const statusHistory = [...(application.statusHistory || [])].reverse().slice(0, 8);
  const printReady = isApplicationPrintReady(application);

  return (
    <AdminLayout>
      <div className="printing-queue-details-page">
        <Link className="printing-queue-back-link" to="/admin/printing">
          <FaArrowLeft />
          Back to Printing Queue
        </Link>

        <section className="printing-queue-details-card">
          <div className="printing-queue-details-header">
            <div>
              <h1>{application.applicationId || application._id}</h1>
              <p>{getApplicantName(application)}</p>
            </div>
            <span className={`printing-queue-status-badge ${getPrintingStatusClass(application)}`}>
              {getPrintingStatusLabel(application)}
            </span>
          </div>

          <div className="printing-queue-details-grid">
            <div className="printing-queue-detail-box">
              <span>Application Type</span>
              <strong>{formatStatus(application.applicationType) || 'New'}</strong>
            </div>
            <div className="printing-queue-detail-box">
              <span>Submitted</span>
              <strong>{formatDate(application.submittedAt || application.createdAt) || 'Not recorded'}</strong>
            </div>
            <div className="printing-queue-detail-box">
              <span>Approved</span>
              <strong>{formatDateTime(application.approvedAt) || 'Not recorded'}</strong>
            </div>
            <div className="printing-queue-detail-box">
              <span>Queue Age</span>
              <strong>{getQueueAge(getPrintingQueueDate(application))}</strong>
            </div>
            <div className="printing-queue-detail-box nid-number">
              <span>Assigned NID Number</span>
              <strong>{application.nidNumber || 'Pending until printed'}</strong>
            </div>
          </div>

          <div className="printing-queue-info-panel">
            <div className="printing-queue-info-title">
              <FaUser />
              <h3>Applicant Information</h3>
            </div>
            <div className="printing-queue-info-grid">
              <div>
                <span>Name</span>
                <strong>{getApplicantName(application)}</strong>
              </div>
              <div>
                <span>Phone</span>
                <strong>{getApplicantPhone(application)}</strong>
              </div>
              <div>
                <span>Email</span>
                <strong>{getApplicantEmail(application)}</strong>
              </div>
              <div>
                <span>Birth Registration Number</span>
                <strong>{application.birthRegistrationNumber || 'Not recorded'}</strong>
              </div>
              <div>
                <span>Previous / Existing NID</span>
                <strong>{application.existingNidNumber || 'Not recorded'}</strong>
              </div>
              <div>
                <span>Date of Birth</span>
                <strong>{formatDate(application.dateOfBirth) || 'Not recorded'}</strong>
              </div>
            </div>
          </div>

          <div className="printing-queue-info-panel">
            <div className="printing-queue-info-title">
              <FaIdCard />
              <h3>Biometric and Verification Summary</h3>
            </div>
            <div className="printing-queue-info-grid">
              <div>
                <span>Appointment Status</span>
                <strong>{formatStatus(application.biometricAppointment?.status) || 'Not recorded'}</strong>
              </div>
              <div>
                <span>Biometrics Completed</span>
                <strong>{biometricCompletedAt ? formatDateTime(biometricCompletedAt) : 'Not completed'}</strong>
              </div>
              <div>
                <span>Appointment Center</span>
                <strong>{application.biometricAppointment?.centerName || 'Not recorded'}</strong>
              </div>
              <div>
                <span>Appointment Time Slot</span>
                <strong>{application.biometricAppointment?.timeSlot || 'Not recorded'}</strong>
              </div>
              <div>
                <span>Documents Uploaded</span>
                <strong>{documentSummary.uploaded} of {documentSummary.total}</strong>
              </div>
              <div>
                <span>Documents Verified</span>
                <strong>{documentSummary.verified} of {documentSummary.total}</strong>
              </div>
            </div>
          </div>

          <div className="printing-queue-history-panel">
            <div className="printing-queue-info-title">
              <FaClock />
              <h3>Status History</h3>
            </div>
            {statusHistory.length ? (
              <div className="printing-queue-history-list">
                {statusHistory.map((entry, index) => (
                  <div key={`${entry.changedAt || index}-${index}`} className="printing-queue-history-item">
                    <span>{formatStatus(entry.toStatus || entry.status) || 'Updated'}</span>
                    <strong>{formatDateTime(entry.changedAt || entry.createdAt) || 'Not recorded'}</strong>
                    {entry.reason || entry.note ? <p>{entry.reason || entry.note}</p> : null}
                  </div>
                ))}
              </div>
            ) : (
              <div className="printing-queue-history-empty">No status history recorded yet.</div>
            )}
          </div>

          <div className="printing-queue-action-panel">
            <div>
              <h3>Print Action</h3>
              <p>
                {printReady
                  ? 'Accept this application for print completion and assign its NID number.'
                  : application.nidNumber
                    ? `Printing completed. Assigned NID number: ${application.nidNumber}`
                    : 'Print action is read-only for this application.'}
              </p>
            </div>
            {printReady ? (
              <button
                type="button"
                className="printing-queue-primary-button compact"
                onClick={handleMarkPrinted}
                disabled={actionLoading}
              >
                {actionLoading ? <FaSpinner className="printing-queue-spin" /> : <FaCheckCircle />}
                <span>Mark Printed</span>
              </button>
            ) : (
              <span className={`printing-queue-status-badge ${getPrintingStatusClass(application)}`}>
                <FaFileAlt />
                {getPrintingStatusLabel(application)}
              </span>
            )}
          </div>
        </section>
      </div>
    </AdminLayout>
  );
};

export default PrintingDetails;
