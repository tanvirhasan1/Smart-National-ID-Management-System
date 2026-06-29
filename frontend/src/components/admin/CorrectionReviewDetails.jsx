import React, { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import {
  FaArrowLeft,
  FaCheck,
  FaExchangeAlt,
  FaEye,
  FaFileAlt,
  FaHistory,
  FaImage,
  FaSpinner,
  FaTimes,
  FaUndo,
  FaUser
} from 'react-icons/fa';
import api from '../api/axios';
import AdminLayout from './AdminLayout';
import Loader from '../common/Loader';
import '../styles/ApplicationReviewDetails.css';

const formatStatus = (value = '') =>
  String(value || '')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (match) => match.toUpperCase());

const formatDateTime = (value) => {
  if (!value) return 'N/A';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'N/A';
  return date.toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

const formatFileSize = (bytes = 0) => {
  const value = Number(bytes || 0);
  if (!value) return '0 KB';
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(2)} KB`;
  return `${(value / (1024 * 1024)).toFixed(2)} MB`;
};

const getStatusTone = (status = '') => {
  if (status === 'approved') return 'success';
  if (status === 'rejected') return 'danger';
  if (status === 'under_review') return 'warning';
  if (status === 'submitted') return 'info';
  return 'neutral';
};

const getApplicantName = (item) =>
  item?.requestedData?.fullNameEnglish || item?.applicant?.fullName || 'N/A';

const getDocumentAsset = (document = {}) => {
  const cloudinary = document?.cloudinary || {};
  return {
    secureUrl: cloudinary.secureUrl || '',
    format: String(cloudinary.format || '').toLowerCase(),
    originalFilename: cloudinary.originalFilename || cloudinary.publicId || 'Uploaded image',
    bytes: cloudinary.bytes || 0,
    uploadedAt: document.uploadedAt || null
  };
};

function DocumentTile({ document, label }) {
  const asset = getDocumentAsset(document);

  if (!asset.secureUrl) {
    return (
      <div className="correction-doc-tile empty">
        <FaFileAlt />
        <strong>{label}</strong>
        <span>No file uploaded</span>
      </div>
    );
  }

  return (
    <div className="correction-doc-tile">
      <div className="correction-doc-preview">
        <img src={asset.secureUrl} alt={label} />
      </div>
      <div className="correction-doc-meta">
        <strong>{label}</strong>
        <span>{asset.originalFilename}</span>
        <small>{formatFileSize(asset.bytes)} • {formatDateTime(asset.uploadedAt)}</small>
      </div>
      <button
        type="button"
        className="nid-review-btn secondary inline"
        onClick={() => window.open(asset.secureUrl, '_blank', 'noopener,noreferrer')}
      >
        <FaEye />
        <span>Open</span>
      </button>
    </div>
  );
}

export default function CorrectionReviewDetails() {
  const { id } = useParams();
  const [correction, setCorrection] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [pendingAction, setPendingAction] = useState('');
  const [decisionNote, setDecisionNote] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');

  useEffect(() => {
    const fetchCorrection = async () => {
      try {
        setLoading(true);
        const response = await api.get(`/admin/corrections/${id}`);
        setCorrection(response?.data?.data || null);
      } catch (error) {
        toast.error(error?.response?.data?.message || 'Failed to load correction request');
      } finally {
        setLoading(false);
      }
    };

    if (id) fetchCorrection();
  }, [id]);

  const verificationDocuments = useMemo(
    () => correction?.documents?.verificationDocuments || [],
    [correction]
  );

  const history = Array.isArray(correction?.statusHistory)
    ? [...correction.statusHistory].reverse()
    : [];

  const canApprove = correction && ['submitted', 'under_review'].includes(correction.status);
  const canReject = correction && ['submitted', 'under_review'].includes(correction.status);
  const canReopen = correction && correction.status === 'rejected';

  const modalMeta = (() => {
    if (pendingAction === 'approved') {
      return {
        title: 'Approve correction',
        text: 'This will apply the requested changes to the approved New NID application data.',
        buttonText: 'Confirm approval',
        buttonClass: 'approve'
      };
    }

    if (pendingAction === 'under_review') {
      return {
        title: 'Reopen correction',
        text: 'This will move the correction request back to active review.',
        buttonText: 'Move to review',
        buttonClass: 'review'
      };
    }

    return {
      title: 'Reject correction',
      text: 'This action requires a rejection reason and will be stored in history.',
      buttonText: 'Confirm rejection',
      buttonClass: 'reject'
    };
  })();

  const openModal = (action) => {
    setPendingAction(action);
    setDecisionNote('');
    setRejectionReason(correction?.rejectionReason || '');
    setShowModal(true);
  };

  const closeModal = () => {
    if (actionLoading) return;
    setShowModal(false);
    setPendingAction('');
    setDecisionNote('');
    setRejectionReason('');
  };

  const handleDecision = async () => {
    if (!correction?._id || !pendingAction) return;

    if (pendingAction === 'rejected' && !rejectionReason.trim()) {
      toast.error('Rejection reason is required');
      return;
    }

    try {
      setActionLoading(true);
      const response = await api.patch(`/admin/corrections/${correction._id}/decision`, {
        status: pendingAction,
        decisionNote: decisionNote.trim(),
        rejectionReason: pendingAction === 'rejected' ? rejectionReason.trim() : ''
      });
      setCorrection(response?.data?.data || null);
      toast.success(response?.data?.message || 'Correction updated');
      closeModal();
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Failed to update correction');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <AdminLayout>
      <div className="nid-review-page correction-review-page">
        <div className="nid-review-shell-head nid-review-shell-head--split">
          <div className="nid-review-shell-top">
            <Link to="/admin/corrections" className="nid-review-back-link">
              <FaArrowLeft />
              <span>Back to Corrections</span>
            </Link>
          </div>

          {!loading && correction ? (
            <div className="nid-review-shell-mainrow">
              <div className="nid-review-shell-infoBox">
                <div className="nid-review-shell-infoInner">
                  <p className="nid-review-kicker">Correction Review</p>
                  <div className="nid-review-shell-infoGrid">
                    <div className="nid-review-id-block">
                      <span className="nid-review-id-label">Correction ID</span>
                      <code className="nid-review-app-id">{correction.correctionId}</code>
                    </div>
                    <div className="nid-review-meta-inline nid-review-meta-inline--center">
                      <span className="nid-review-meta-label">Status</span>
                      <span className={`nid-review-status ${getStatusTone(correction.status)}`}>
                        {formatStatus(correction.status)}
                      </span>
                    </div>
                    <div className="nid-review-meta-inline nid-review-meta-inline--center">
                      <span className="nid-review-meta-label">Base Application</span>
                      <span className="nid-review-pill neutral">
                        {correction.baseApplicationId || correction.baseApplication?.applicationId || 'N/A'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="nid-review-shell-actionBox">
                <div className="nid-review-top-actions nid-review-top-actions--box">
                  {canReopen ? (
                    <button type="button" className="nid-review-btn secondary" onClick={() => openModal('under_review')}>
                      <FaUndo />
                      <span>Reopen</span>
                    </button>
                  ) : null}
                  {canApprove ? (
                    <button type="button" className="nid-review-btn approve" onClick={() => openModal('approved')}>
                      <FaCheck />
                      <span>Approve</span>
                    </button>
                  ) : null}
                  {canReject ? (
                    <button type="button" className="nid-review-btn reject" onClick={() => openModal('rejected')}>
                      <FaTimes />
                      <span>Reject</span>
                    </button>
                  ) : null}
                </div>
              </div>
            </div>
          ) : null}
        </div>

        {loading ? (
          <div className="nid-review-loader">
            <Loader size="medium" text="Loading correction review..." />
          </div>
        ) : correction ? (
          <>
            <div className="nid-review-summary-row">
              <div className="nid-review-summary-card">
                <p>Applicant</p>
                <h3>{getApplicantName(correction)}</h3>
                <small>{correction.requestedData?.phone || correction.applicant?.phone || 'N/A'}</small>
              </div>
              <div className="nid-review-summary-card">
                <p>Changed Fields</p>
                <h3>{correction.changedFields?.length || 0}</h3>
                <small>Old vs new comparison</small>
              </div>
              <div className="nid-review-summary-card">
                <p>Supporting Documents</p>
                <h3>{verificationDocuments.length}/4</h3>
                <small>Legal/supporting documents</small>
              </div>
              <div className="nid-review-summary-card">
                <p>Submitted</p>
                <h3>{formatDateTime(correction.submittedAt || correction.createdAt)}</h3>
                <small>Citizen request time</small>
              </div>
            </div>

            {correction.rejectionReason ? (
              <div className="nid-review-alert">
                <strong>Current rejection reason:</strong> {correction.rejectionReason}
              </div>
            ) : null}

            <div className="nid-review-main correction-review-main">
              <aside className="nid-review-left">
                <div className="nid-review-card">
                  <div className="nid-review-card-title">
                    <FaUser />
                    <h3>Citizen Request</h3>
                  </div>
                  <div className="nid-review-summary-list">
                    <div>
                      <p>Reason</p>
                      <h4>{correction.reason || 'N/A'}</h4>
                    </div>
                    <div>
                      <p>NID Number</p>
                      <h4>{correction.nidNumber || correction.requestedData?.existingNidNumber || 'N/A'}</h4>
                    </div>
                    <div>
                      <p>Birth Registration</p>
                      <h4>{correction.requestedData?.birthRegistrationNumber || 'N/A'}</h4>
                    </div>
                    <div>
                      <p>Photo Change Requested</p>
                      <h4>{correction.photoChangeRequested ? 'Yes' : 'No'}</h4>
                    </div>
                  </div>
                </div>

                <div className="nid-review-card">
                  <div className="nid-review-card-title">
                    <FaHistory />
                    <h3>Decision Log</h3>
                  </div>
                  <div className="nid-review-history-list compact">
                    {history.map((item, index) => (
                      <div key={`${item.changedAt || index}`} className="nid-review-history-item">
                        <div className="nid-review-history-dot" />
                        <div className="nid-review-history-card">
                          <div className="nid-review-history-top">
                            <span>
                              {item.fromStatus
                                ? `${formatStatus(item.fromStatus)} → ${formatStatus(item.toStatus)}`
                                : formatStatus(item.toStatus)}
                            </span>
                            <small>{formatDateTime(item.changedAt)}</small>
                          </div>
                          <p>{item.reason || item.note || 'No note added'}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </aside>

              <section className="nid-review-center correction-review-center">
                <div className="nid-review-card">
                  <div className="nid-review-card-title">
                    <FaExchangeAlt />
                    <h3>Old vs New Information</h3>
                  </div>

                  <div className="correction-change-table-wrap">
                    <table className="correction-change-table">
                      <thead>
                        <tr>
                          <th>Field</th>
                          <th>Previous Approved Data</th>
                          <th>Requested New Data</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(correction.changedFields || []).map((item) => (
                          <tr key={item.field}>
                            <td><strong>{item.label}</strong></td>
                            <td className="old-value">{item.displayOldValue || 'N/A'}</td>
                            <td className="new-value">{item.displayNewValue || 'N/A'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="nid-review-card">
                  <div className="nid-review-card-title">
                    <FaImage />
                    <h3>Supporting Documents & Photo</h3>
                  </div>

                  <div className="correction-doc-grid">
                    {correction.documents?.photograph ? (
                      <DocumentTile document={correction.documents.photograph} label="New Passport Photo" />
                    ) : (
                      <div className="correction-doc-tile empty">
                        <FaImage />
                        <strong>
                          {correction.photoChangeRequested ? 'New Passport Photo' : 'Passport Photo'}
                        </strong>
                        <span>
                          {correction.photoChangeRequested
                            ? 'Requested, not uploaded'
                            : 'Not requested by citizen'}
                        </span>
                      </div>
                    )}

                    {verificationDocuments.map((document, index) => (
                      <DocumentTile
                        key={document._id || index}
                        document={document}
                        label={`Supporting Document ${index + 1}`}
                      />
                    ))}
                  </div>
                </div>
              </section>
            </div>
          </>
        ) : (
          <div className="nid-review-loader">
            <Loader size="medium" text="Correction request not found" />
          </div>
        )}

        {showModal ? (
          <div className="nid-review-modal-backdrop" onClick={closeModal}>
            <div className="nid-review-modal-card" onClick={(event) => event.stopPropagation()}>
              <div className="nid-review-modal-head">
                <h3>{modalMeta.title}</h3>
                <p>{modalMeta.text}</p>
              </div>

              <div className="nid-review-modal-body">
                <div className="nid-review-modal-field">
                  <label>Decision Note</label>
                  <textarea
                    rows={4}
                    value={decisionNote}
                    onChange={(event) => setDecisionNote(event.target.value)}
                    placeholder="Write a short administrative note..."
                  />
                </div>

                {pendingAction === 'rejected' ? (
                  <div className="nid-review-modal-field">
                    <label>Rejection Reason *</label>
                    <textarea
                      rows={5}
                      value={rejectionReason}
                      onChange={(event) => setRejectionReason(event.target.value)}
                      placeholder="Write the rejection reason..."
                    />
                  </div>
                ) : null}
              </div>

              <div className="nid-review-modal-footer">
                <button type="button" className="nid-review-btn secondary" onClick={closeModal} disabled={actionLoading}>
                  Cancel
                </button>
                <button
                  type="button"
                  className={`nid-review-btn ${modalMeta.buttonClass}`}
                  onClick={handleDecision}
                  disabled={actionLoading || (pendingAction === 'rejected' && !rejectionReason.trim())}
                >
                  {actionLoading ? <FaSpinner className="spin" /> : null}
                  <span>{modalMeta.buttonText}</span>
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </AdminLayout>
  );
}
