import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import {
  FaArrowLeft,
  FaEnvelope,
  FaHistory,
  FaMapMarkerAlt,
  FaSpinner,
  FaTruck,
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
  getDeliveryAddress,
  getDeliveryInfo,
  getDeliveryPhone,
  getDeliveryQueueDate,
  getDeliveryStatusClass,
  getDeliveryStatusLabel,
  isActiveDeliveryRequest
} from './adminQueueUtils';
import '../styles/DeliveryTracking.css';

const isUsefulValue = (value) =>
  Boolean(value) && !['Not recorded', 'N/A'].includes(String(value));

const formatPaymentMethod = (value) =>
  String(value || '').toLowerCase() === 'sslcommerz'
    ? 'SSLCOMMERZ (Sandbox)'
    : formatStatus(value);

const CompactDetailList = ({ items, emptyMessage }) => {
  const visibleItems = items.filter((item) => isUsefulValue(item.value));

  if (!visibleItems.length) {
    return <div className="delivery-tracking-empty-inline">{emptyMessage}</div>;
  }

  return (
    <dl className="delivery-tracking-detail-list">
      {visibleItems.map((item) => (
        <div key={item.label}>
          <dt>{item.label}</dt>
          <dd>{item.value}</dd>
        </div>
      ))}
    </dl>
  );
};

const DeliveryDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [application, setApplication] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [form, setForm] = useState({
    deliveryNote: '',
    deliveryReference: ''
  });

  const fetchApplication = useCallback(async () => {
    try {
      setLoading(true);
      const response = await api.get(`/admin/delivery/${id}`);
      setApplication(response?.data?.application || response?.data?.data || null);
    } catch (error) {
      console.error('Error fetching delivery details:', error);
      toast.error(error?.response?.data?.message || 'Failed to load delivery details');
      setApplication(null);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchApplication();
  }, [fetchApplication]);

  const history = useMemo(() => {
    const applicationHistory = (application?.statusHistory || []).map((entry) => ({
      label: entry.fromStatus
        ? `${formatStatus(entry.fromStatus)} to ${formatStatus(entry.toStatus)}`
        : formatStatus(entry.toStatus),
      note: entry.reason || entry.note || '',
      occurredAt: entry.changedAt || entry.createdAt
    }));
    const deliveryHistory = (getDeliveryInfo(application).history || []).map((entry) => ({
      label: formatStatus(entry.action),
      note: entry.note || '',
      occurredAt: entry.occurredAt
    }));

    return [...applicationHistory, ...deliveryHistory]
      .sort((a, b) => new Date(b.occurredAt || 0) - new Date(a.occurredAt || 0))
      .slice(0, 10);
  }, [application]);

  const handleMarkDelivered = async () => {
    if (!application?._id || !isActiveDeliveryRequest(application)) return;

    try {
      setActionLoading(true);
      await api.patch(`/admin/delivery/${application._id}/mark-delivered`, {
        deliveryNote: form.deliveryNote.trim(),
        deliveryReference: form.deliveryReference.trim()
      });
      toast.success('Application marked as delivered');
      navigate('/admin/delivery');
    } catch (error) {
      console.error('Error marking application as delivered:', error);
      toast.error(error?.response?.data?.message || 'Failed to mark as delivered');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="delivery-tracking-loading-state">
          <Loader size="large" text="Loading delivery details..." />
        </div>
      </AdminLayout>
    );
  }

  if (!application) {
    return (
      <AdminLayout>
        <div className="delivery-tracking-details-page">
          <Link className="delivery-tracking-back-link" to="/admin/delivery">
            <FaArrowLeft />
            Back to Delivery
          </Link>
          <div className="delivery-tracking-empty-state">
            <FaTruck className="delivery-tracking-empty-icon" />
            <h3>Delivery request not found</h3>
            <p>The request may no longer be available to this admin account.</p>
          </div>
        </div>
      </AdminLayout>
    );
  }

  const deliveryInfo = getDeliveryInfo(application);
  const deliveryActive = isActiveDeliveryRequest(application);
  const deliveryStatusLabel = getDeliveryStatusLabel(application);
  const applicantItems = [
    { label: 'Name', value: getApplicantName(application) },
    { label: 'Applicant Phone', value: getApplicantPhone(application) },
    { label: 'Email', value: getApplicantEmail(application) },
    { label: 'Date of Birth', value: formatDate(application.dateOfBirth) },
    { label: 'Birth Registration Number', value: application.birthRegistrationNumber },
    { label: 'NID Number', value: application.nidNumber || application.existingNidNumber }
  ];
  const requestItems = [
    { label: 'Delivery Request ID', value: deliveryInfo.requestId },
    { label: 'Requested At', value: formatDateTime(deliveryInfo.requestedAt) },
    { label: 'Printed At', value: formatDateTime(application.printedAt) },
    { label: 'Dispatched At', value: formatDateTime(deliveryInfo.dispatchedAt || application.dispatchedAt) },
    { label: 'Delivered At', value: formatDateTime(deliveryInfo.deliveredAt || application.deliveredAt) },
    { label: 'Payment Status', value: formatStatus(deliveryInfo.paymentStatus) },
    { label: 'Payment Method', value: formatPaymentMethod(deliveryInfo.paymentMethod) },
    { label: 'Payment Completed At', value: formatDateTime(deliveryInfo.paymentCompletedAt) },
    { label: 'Transaction ID', value: deliveryInfo.transactionId },
    {
      label: 'Payment Amount',
      value: deliveryInfo.amount
        ? `${deliveryInfo.amount} ${deliveryInfo.currency || 'BDT'}`
        : ''
    }
  ];
  const contactItems = [
    { label: 'Delivery Address', value: getDeliveryAddress(application) },
    { label: 'Delivery Contact Phone', value: getDeliveryPhone(application) },
    { label: 'Delivery Note', value: deliveryInfo.note }
  ];

  return (
    <AdminLayout>
      <div className="delivery-tracking-details-page">
        <Link className="delivery-tracking-back-link" to="/admin/delivery">
          <FaArrowLeft />
          Back to Delivery
        </Link>

        <section className="delivery-tracking-details-card">
          <div className="delivery-tracking-details-header">
            <div>
              <h1>{application.applicationId || application._id}</h1>
              <p>{getApplicantName(application)}</p>
              {deliveryInfo.requestId ? (
                <small>Delivery request: {deliveryInfo.requestId}</small>
              ) : null}
            </div>
            <span className={`delivery-tracking-status-chip ${getDeliveryStatusClass(application)}`}>
              {deliveryStatusLabel}
            </span>
          </div>

          <div className="delivery-tracking-summary-strip">
            <div className="delivery-tracking-summary-item">
              <span>Application Type</span>
              <strong>{formatStatus(application.applicationType || 'new')}</strong>
            </div>
            <div className="delivery-tracking-summary-item">
              <span>Delivery Status</span>
              <strong>{deliveryStatusLabel}</strong>
            </div>
            <div className="delivery-tracking-summary-item">
              <span>Contact Phone</span>
              <strong>{getDeliveryPhone(application)}</strong>
            </div>
            <div className="delivery-tracking-summary-item">
              <span>Request / Payment Date</span>
              <strong>{formatDateTime(getDeliveryQueueDate(application)) || 'Not recorded'}</strong>
            </div>
          </div>

          <div className="delivery-tracking-section-card">
            <div className="delivery-tracking-section-title">
              <FaUser />
              <h3>Applicant Information</h3>
            </div>
            <CompactDetailList
              items={applicantItems}
              emptyMessage="No applicant information is available."
            />
          </div>

          <div className="delivery-tracking-section-card">
            <div className="delivery-tracking-section-title">
              <FaEnvelope />
              <h3>Delivery Request and Payment</h3>
            </div>
            <CompactDetailList
              items={requestItems}
              emptyMessage="No delivery request or payment information is available."
            />
          </div>

          <div className="delivery-tracking-section-card">
            <div className="delivery-tracking-section-title">
              <FaMapMarkerAlt />
              <h3>Delivery Address and Contact</h3>
            </div>
            <CompactDetailList
              items={contactItems}
              emptyMessage="No delivery address or contact information is available."
            />
          </div>

          <div className="delivery-tracking-section-card">
            <div className="delivery-tracking-section-title">
              <FaHistory />
              <h3>Status History</h3>
            </div>
            {history.length ? (
              <div className="delivery-tracking-history-list">
                {history.map((entry, index) => (
                  <div key={`${entry.occurredAt || index}-${index}`} className="delivery-tracking-history-item">
                    <div className="delivery-tracking-history-dot" />
                    <div className="delivery-tracking-history-content">
                      <div className="delivery-tracking-history-top">
                        <span>{entry.label || 'Updated'}</span>
                        <small>{formatDateTime(entry.occurredAt) || 'Not recorded'}</small>
                      </div>
                      {entry.note ? <p>{entry.note}</p> : null}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="delivery-tracking-empty-inline">No status history found yet.</div>
            )}
          </div>

          <div className="delivery-tracking-section-card">
            <div className="delivery-tracking-section-title">
              <FaTruck />
              <h3>Delivery Action</h3>
            </div>
            {deliveryActive ? (
              <>
                <div className="delivery-tracking-action-fields">
                  <div className="delivery-tracking-modal-field">
                    <label>Delivery Note</label>
                    <textarea
                      rows={3}
                      value={form.deliveryNote}
                      onChange={(event) =>
                        setForm((current) => ({ ...current, deliveryNote: event.target.value }))
                      }
                      placeholder="Optional delivery note"
                    />
                  </div>
                  <div className="delivery-tracking-modal-field">
                    <label>Delivery Reference</label>
                    <input
                      type="text"
                      value={form.deliveryReference}
                      onChange={(event) =>
                        setForm((current) => ({ ...current, deliveryReference: event.target.value }))
                      }
                      placeholder="Optional delivery reference"
                    />
                  </div>
                </div>
                <div className="delivery-tracking-action-row">
                  <button
                    type="button"
                    className="delivery-tracking-primary-button"
                    onClick={handleMarkDelivered}
                    disabled={actionLoading}
                  >
                    {actionLoading ? <FaSpinner className="spin" /> : <FaTruck />}
                    <span>Mark as Delivered</span>
                  </button>
                </div>
              </>
            ) : (
              <div className="delivery-tracking-readonly-status">
                This request is read-only. Current delivery status: {deliveryStatusLabel}.
              </div>
            )}
          </div>
        </section>
      </div>
    </AdminLayout>
  );
};

export default DeliveryDetails;
