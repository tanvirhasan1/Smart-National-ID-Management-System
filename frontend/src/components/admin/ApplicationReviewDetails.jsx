import React, { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import {
  FaArrowLeft,
  FaCheck,
  FaEye,
  FaFileAlt,
  FaIdCard,
  FaImage,
  FaMapMarkerAlt,
  FaSpinner,
  FaTimes,
  FaUndo,
  FaUser,
  FaUsers,
  FaCheckCircle,
  FaHistory,
  FaListUl
} from 'react-icons/fa';
import api from '../api/axios';
import AdminLayout from './AdminLayout';
import Loader from '../common/Loader';
import '../styles/ApplicationReviewDetails.css';

const DOCUMENTS = [
  { key: 'photograph', label: 'Photograph', icon: FaImage },
  { key: 'signature', label: 'Signature', icon: FaFileAlt },
  { key: 'birthCertificate', label: 'Birth Certificate', icon: FaIdCard }
];

const getReviewDocumentTypes = (application) => {
  const hasCorrectionProof =
    application?.applicationType === 'correction' ||
    application?.documentAssets?.correctionProof?.cloudinary?.secureUrl ||
    application?.documents?.correctionProof;

  if (!hasCorrectionProof) {
    return DOCUMENTS;
  }

  return [
    ...DOCUMENTS,
    { key: 'correctionProof', label: 'Correction Proof', icon: FaFileAlt }
  ];
};

const BASE_SECTIONS = [
  { key: 'applicant', label: 'Applicant Details', icon: FaUser },
  { key: 'family', label: 'Family Details', icon: FaUsers },
  { key: 'address', label: 'Address Details', icon: FaMapMarkerAlt },
  { key: 'verification', label: 'Document Verification', icon: FaCheckCircle },
  { key: 'references', label: 'Supporting Records', icon: FaListUl }
];

const LEGACY_REFERENCE_LABELS = {
  fatherNid: 'Father NID',
  motherNid: 'Mother NID',
  utilityBill: 'Utility Bill',
  passport: 'Passport'
};

const formatStatus = (value = '') =>
  String(value || '')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (m) => m.toUpperCase());

const formatDate = (value) => {
  if (!value) return 'N/A';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'N/A';
  return date.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });
};

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
  const value = String(status || '').toLowerCase();
  if (value === 'approved') return 'success';
  if (value === 'rejected') return 'danger';
  if (value === 'under_review') return 'warning';
  if (value === 'submitted') return 'info';
  return 'neutral';
};

const buildAddress = (address = {}) =>
  [
    address?.villageOrArea,
    address?.unionOrWard,
    address?.upazila,
    address?.district,
    address?.division,
    address?.postOffice,
    address?.postalCode
  ]
    .filter(Boolean)
    .join(', ') || 'N/A';

const getApplicantName = (application) =>
  application?.fullNameEnglish || application?.applicant?.fullName || 'N/A';

const getApplicantPhone = (application) =>
  application?.phone || application?.applicant?.phone || 'N/A';

const getApplicantEmail = (application) =>
  application?.email || application?.applicant?.email || 'N/A';

const getQueueAge = (submittedAt, createdAt) => {
  const raw = submittedAt || createdAt;
  if (!raw) return '0 days';
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return '0 days';
  const diff = Math.max(0, Math.floor((Date.now() - date.getTime()) / 86400000));
  return `${diff} day${diff === 1 ? '' : 's'}`;
};

const getCloudAsset = (record = {}) => {
  const cloudinary = record?.cloudinary || {};
  return {
    secureUrl: cloudinary?.secureUrl || '',
    publicId: cloudinary?.publicId || '',
    format: String(cloudinary?.format || '').toLowerCase(),
    bytes: cloudinary?.bytes || 0,
    originalFilename: cloudinary?.originalFilename || cloudinary?.publicId || '',
    uploadedAt: record?.uploadedAt || null,
    status: record?.status || 'not_uploaded',
    rejectionReason: record?.rejectionReason || ''
  };
};

const getLegacyAsset = (url = '') => {
  const safeUrl = String(url || '').trim();
  const extension = safeUrl.split('.').pop()?.split('?')[0]?.toLowerCase() || '';

  return {
    secureUrl: safeUrl,
    publicId: '',
    format: extension,
    bytes: 0,
    originalFilename: '',
    uploadedAt: null,
    status: safeUrl ? 'uploaded' : 'not_uploaded',
    rejectionReason: ''
  };
};

const getReviewAsset = (application, key) => {
  if (Array.isArray(application?.reviewAssets)) {
    const found = application.reviewAssets.find((item) => item.key === key);
    if (found?.secureUrl) {
      return {
        secureUrl: found.secureUrl || '',
        publicId: found.publicId || '',
        format: String(found.format || '').toLowerCase(),
        bytes: found.bytes || 0,
        originalFilename: found.originalFilename || '',
        uploadedAt: found.uploadedAt || null,
        status: found.status || 'uploaded',
        rejectionReason: found.rejectionReason || ''
      };
    }
  }

  if (application?.documentAssets?.[key]) {
    const managed = getCloudAsset(application.documentAssets[key]);
    if (managed.secureUrl) return managed;
  }

  if (key === 'photograph') return getLegacyAsset(application?.documents?.photo || '');
  if (key === 'signature') return getLegacyAsset(application?.documents?.signature || '');
  if (key === 'birthCertificate') return getLegacyAsset(application?.documents?.birthCertificate || '');
  if (key === 'correctionProof') return getLegacyAsset(application?.documents?.correctionProof || '');

  return getLegacyAsset('');
};

const getPreviewType = (asset = {}) => {
  const format = String(asset?.format || '').toLowerCase();
  return {
    isImage: ['jpg', 'jpeg', 'png', 'webp', 'gif'].includes(format),
    isPdf: format === 'pdf'
  };
};

const getDocumentCount = (application) =>
  getReviewDocumentTypes(application).filter((item) =>
    Boolean(getReviewAsset(application, item.key)?.secureUrl)
  ).length;

const getLegacyReferences = (application) =>
  Object.entries(LEGACY_REFERENCE_LABELS)
    .map(([key, label]) => ({
      key,
      label,
      value: application?.documents?.[key] || ''
    }))
    .filter((item) => item.value);

const getBirthCertificateVerification = (application) => {
  const summary = application?.documentVerification;

  if (summary?.status) {
    return summary;
  }

  const verification = application?.documentAssets?.birthCertificate?.verification;

  return {
    status: verification?.status || 'not_started',
    isVerified: verification?.status === 'passed',
    provider: verification?.provider || '',
    confidence: verification?.confidence ?? null,
    checkedAt: verification?.checkedAt || null,
    message: verification?.message || '',
    extractedFields: verification?.extractedFields || {},
    fieldComparisons: Array.isArray(verification?.fieldComparisons)
      ? verification.fieldComparisons
      : []
  };
};

const getVerificationTone = (status = '') => {
  if (status === 'passed') return 'success';
  if (['mismatch', 'not_found', 'unreadable', 'failed'].includes(status)) return 'danger';
  if (status === 'low_confidence') return 'warning';
  return 'neutral';
};

function DocumentPreview({
  asset,
  label,
  imageScale,
  imageOrigin,
  handleImageMove,
  handleImageEnter,
  handleImageLeave
}) {
  const preview = getPreviewType(asset);

  if (!asset?.secureUrl) {
    return (
      <div className="nid-review-empty-preview">
        <h4>No file uploaded</h4>
        <p>This record is not available yet.</p>
      </div>
    );
  }

  if (preview.isImage) {
    return (
      <div
        className="nid-review-image-wrap"
        onMouseEnter={handleImageEnter}
        onMouseMove={handleImageMove}
        onMouseLeave={handleImageLeave}
      >
        <img
          src={asset.secureUrl}
          alt={label}
          className="nid-review-image"
          style={{
            transform: `scale(${imageScale})`,
            transformOrigin: `${imageOrigin.x}% ${imageOrigin.y}%`
          }}
        />
      </div>
    );
  }

  if (preview.isPdf) {
    return (
      <iframe
        title={label}
        src={`${asset.secureUrl}#toolbar=0&navpanes=0&scrollbar=1`}
        className="nid-review-frame"
      />
    );
  }

  return (
    <div className="nid-review-empty-preview">
      <h4>Preview unavailable</h4>
      <p>Use JPG, PNG or PDF for inline review.</p>
    </div>
  );
}

export default function ApplicationReviewDetails() {
  const { id } = useParams();

  const [application, setApplication] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  const [activeDocumentKey, setActiveDocumentKey] = useState('photograph');
  const [activeSectionKey, setActiveSectionKey] = useState('applicant');

  const [imageScale, setImageScale] = useState(1);
  const [imageOrigin, setImageOrigin] = useState({ x: 50, y: 50 });

  const [showModal, setShowModal] = useState(false);
  const [showPreviousRejection, setShowPreviousRejection] = useState(false);
  const [pendingAction, setPendingAction] = useState('');
  const [decisionNote, setDecisionNote] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');

  useEffect(() => {
    const fetchApplication = async () => {
      try {
        setLoading(true);
        const response = await api.get(`/admin/application-review/${id}`);
        const data = response?.data?.data || response?.data?.application || null;
        setApplication(data);
      } catch (error) {
        toast.error(error?.response?.data?.message || 'Failed to load application');
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchApplication();
    }
  }, [id]);

  useEffect(() => {
    if (!application) {
      setActiveDocumentKey('photograph');
      return;
    }

    const firstAvailable = getReviewDocumentTypes(application).find((item) => {
      const asset = getReviewAsset(application, item.key);
      return Boolean(asset?.secureUrl);
    });

    setActiveDocumentKey(firstAvailable?.key || 'photograph');
  }, [application]);

  useEffect(() => {
    setImageScale(1);
    setImageOrigin({ x: 50, y: 50 });
  }, [activeDocumentKey]);

  const documents = useMemo(
    () =>
      getReviewDocumentTypes(application).map((item) => ({
        ...item,
        asset: getReviewAsset(application, item.key)
      })),
    [application]
  );

  const activeDocument =
    documents.find((item) => item.key === activeDocumentKey) || documents[0];

  const supportingRefs = getLegacyReferences(application);
  const birthCertificateVerification =
    getBirthCertificateVerification(application);
  const correctionSummary =
    application?.correctionSummary ||
    (application?.applicationType === 'correction'
      ? application?.correctionInfo || {}
      : null);
  const resubmissionInfo = application?.resubmissionInfo || null;
  const isResubmissionApplication = Boolean(
    resubmissionInfo?.isResubmission || resubmissionInfo?.previousApplicationId
  );
  const previousRejectionHistory = {
    previousApplicationId: resubmissionInfo?.previousApplicationId || '',
    previousRejectedAt:
      resubmissionInfo?.previousRejectedAt || resubmissionInfo?.rejectedAt || null,
    previousRejectionReason:
      resubmissionInfo?.previousRejectionReason ||
      resubmissionInfo?.rejectionReason ||
      '',
    previousRejectionNotes: resubmissionInfo?.previousRejectionNotes || '',
    resubmissionCount: resubmissionInfo?.resubmissionCount || 0
  };
  const history = Array.isArray(application?.statusHistory)
    ? [...application.statusHistory].reverse()
    : [];

  const meaningfulHistory = history.filter((item) => {
    const toStatus = String(item?.toStatus || '').trim().toLowerCase();
    const fromStatus = String(item?.fromStatus || '').trim().toLowerCase();

    const isInitialSubmissionFlow =
      toStatus === 'submitted' &&
      (!fromStatus || fromStatus === 'draft');

    return !isInitialSubmissionFlow;
  });

  const showDecisionLogSection = meaningfulHistory.length > 0;

  const sideSections = showDecisionLogSection
    ? [...BASE_SECTIONS, { key: 'history', label: 'Decision Log', icon: FaHistory }]
    : BASE_SECTIONS;

  useEffect(() => {
    if (!showDecisionLogSection && activeSectionKey === 'history') {
      setActiveSectionKey('applicant');
    }
  }, [showDecisionLogSection, activeSectionKey]);

  const canApprove = application && ['submitted', 'under_review'].includes(application.status);
  const canReject = application && ['submitted', 'under_review'].includes(application.status);
  const canReopen = application && application.status === 'rejected';

  const summaryCards = [
    {
      label: 'Submitted',
      value: formatDate(application?.submittedAt || application?.createdAt),
      sub: formatDateTime(application?.submittedAt || application?.createdAt)
    },
    {
      label: 'Queue Age',
      value: getQueueAge(application?.submittedAt, application?.createdAt),
      sub: 'Since submission'
    },
    {
      label: 'Evidence Files',
      value: `${getDocumentCount(application)}/${getReviewDocumentTypes(application).length}`,
      sub: 'Available for review'
    },
    {
      label: 'Last Updated',
      value: formatDate(application?.updatedAt),
      sub: formatDateTime(application?.updatedAt)
    }
  ];

  const sectionMeta =
    sideSections.find((item) => item.key === activeSectionKey) || sideSections[0];
  const ActiveSectionIcon = sectionMeta.icon;

  const modalMeta = (() => {
    if (pendingAction === 'approved') {
      return {
        title: 'Approve application',
        text: 'This action will mark the application as approved and store the decision in audit history.',
        buttonText: 'Confirm approval',
        buttonClass: 'approve'
      };
    }

    if (pendingAction === 'under_review') {
      return {
        title: 'Reopen application',
        text: 'This action will move the application back to active review.',
        buttonText: 'Move to review',
        buttonClass: 'review'
      };
    }

    return {
      title: 'Reject application',
      text: 'This action requires a rejection reason and will be stored in audit history.',
      buttonText: 'Confirm rejection',
      buttonClass: 'reject'
    };
  })();

  const openModal = (action) => {
    setPendingAction(action);
    setDecisionNote('');
    setRejectionReason(application?.rejectionReason || '');
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
    if (!application?._id || !pendingAction) return;

    if (pendingAction === 'rejected' && !rejectionReason.trim()) {
      toast.error('Rejection reason is required');
      return;
    }

    try {
      setActionLoading(true);

      const payload = {
        status: pendingAction,
        decisionNote: decisionNote.trim(),
        rejectionReason: pendingAction === 'rejected' ? rejectionReason.trim() : ''
      };

      const response = await api.patch(
        `/admin/application-review/${application._id}/decision`,
        payload
      );

      const updated = response?.data?.data || response?.data?.application || null;
      setApplication(updated);

      toast.success(response?.data?.message || 'Application updated');
      closeModal();
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Failed to update application');
    } finally {
      setActionLoading(false);
    }
  };

  const handleImageEnter = () => {
    setImageScale(1.85);
  };

  const handleImageMove = (event) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * 100;
    const y = ((event.clientY - rect.top) / rect.height) * 100;

    setImageOrigin({
      x: Math.max(0, Math.min(100, x)),
      y: Math.max(0, Math.min(100, y))
    });
  };

  const handleImageLeave = () => {
    setImageScale(1);
    setImageOrigin({ x: 50, y: 50 });
  };

  const renderRightPanel = () => {
    if (activeSectionKey === 'applicant') {
      return (
        <div className="nid-review-info-grid">
          <div>
            <p>Bangla Name</p>
            <h4>{application?.fullNameBangla || 'N/A'}</h4>
          </div>
          <div>
            <p>Date of Birth</p>
            <h4>{formatDate(application?.dateOfBirth)}</h4>
          </div>
          <div>
            <p>Gender</p>
            <h4>{formatStatus(application?.gender || 'N/A')}</h4>
          </div>
          <div>
            <p>Blood Group</p>
            <h4>{application?.bloodGroup || 'N/A'}</h4>
          </div>
          <div>
            <p>Marital Status</p>
            <h4>{formatStatus(application?.maritalStatus || 'N/A')}</h4>
          </div>
          <div>
            <p>Occupation</p>
            <h4>{application?.occupation || 'N/A'}</h4>
          </div>
          <div>
            <p>Existing NID</p>
            <h4>{application?.existingNidNumber || 'N/A'}</h4>
          </div>
          <div>
            <p>Father Name</p>
            <h4>{application?.fatherName || 'N/A'}</h4>
          </div>
          <div>
            <p>Mother Name</p>
            <h4>{application?.motherName || 'N/A'}</h4>
          </div>
        </div>
      );
    }

    if (activeSectionKey === 'family') {
      return (
        <div className="nid-review-info-grid">
          <div>
            <p>Father Name</p>
            <h4>{application?.fatherName || 'N/A'}</h4>
          </div>
          <div>
            <p>Mother Name</p>
            <h4>{application?.motherName || 'N/A'}</h4>
          </div>
          <div>
            <p>Spouse Name</p>
            <h4>{application?.spouseName || 'N/A'}</h4>
          </div>
          <div>
            <p>Birth Registration No</p>
            <h4>{application?.birthRegistrationNumber || 'N/A'}</h4>
          </div>
        </div>
      );
    }

    if (activeSectionKey === 'address') {
      return (
        <div className="nid-review-info-grid nid-review-single-col">
          <div>
            <p>Present Address</p>
            <h4>{buildAddress(application?.presentAddress)}</h4>
          </div>
          <div>
            <p>Permanent Address</p>
            <h4>{buildAddress(application?.permanentAddress)}</h4>
          </div>
        </div>
      );
    }

    if (activeSectionKey === 'verification') {
      const comparisons = birthCertificateVerification.fieldComparisons || [];
      const extractedFields = birthCertificateVerification.extractedFields || {};

      if (!birthCertificateVerification.status || birthCertificateVerification.status === 'not_started') {
        return (
          <div className="nid-review-empty-side">
            Birth certificate OCR verification is not available for this application.
          </div>
        );
      }

      return (
        <div className="nid-review-info-grid nid-review-single-col">
          <div>
            <p>Status</p>
            <h4>
              <span className={`nid-review-status ${getVerificationTone(birthCertificateVerification.status)}`}>
                {birthCertificateVerification.isVerified ? 'Document information matched' : formatStatus(birthCertificateVerification.status)}
              </span>
            </h4>
          </div>
          <div>
            <p>Provider</p>
            <h4>{birthCertificateVerification.provider || 'N/A'}</h4>
          </div>
          <div>
            <p>Checked At</p>
            <h4>{formatDateTime(birthCertificateVerification.checkedAt)}</h4>
          </div>
          <div>
            <p>Confidence</p>
            <h4>
              {birthCertificateVerification.confidence === null ||
              birthCertificateVerification.confidence === undefined
                ? 'N/A'
                : `${Math.round(Number(birthCertificateVerification.confidence) * 100)}%`}
            </h4>
          </div>
          {Object.entries(extractedFields)
            .filter(([, value]) => value)
            .map(([field, value]) => (
              <div key={field}>
                <p>Extracted {formatStatus(field)}</p>
                <h4>{value}</h4>
              </div>
            ))}
          {comparisons.map((item) => (
            <div key={item.field}>
              <p>{formatStatus(item.field)} Match</p>
              <h4>{item.matched ? 'Matched' : item.note || 'Not matched'}</h4>
            </div>
          ))}
        </div>
      );
    }

    if (activeSectionKey === 'references') {
      if (supportingRefs.length === 0) {
        return <div className="nid-review-empty-side">No supporting records found.</div>;
      }

      return (
        <div className="nid-review-info-grid">
          {supportingRefs.map((item) => (
            <div key={item.key}>
              <p>{item.label}</p>
              <h4>{item.value}</h4>
            </div>
          ))}
        </div>
      );
    }

    if (activeSectionKey === 'history') {
      if (!showDecisionLogSection) {
        return <div className="nid-review-empty-side">No decision log found.</div>;
      }

      return (
        <div className="nid-review-history-list">
          {meaningfulHistory.map((item, index) => (
            <div key={`${item.changedAt || 'history'}-${index}`} className="nid-review-history-item">
              <div className="nid-review-history-dot" />
              <div className="nid-review-history-card">
                <div className="nid-review-history-top">
                  <span>
                    {item.fromStatus
                      ? `${formatStatus(item.fromStatus)} → ${formatStatus(item.toStatus)}`
                      : formatStatus(item.toStatus)}
                  </span>
                  <small>{item.changedAt ? formatDateTime(item.changedAt) : 'N/A'}</small>
                </div>

                <p>{item.reason || item.note || 'No note added'}</p>

                <div className="nid-review-history-meta">
                  <span>By: {formatStatus(item.changedByRole || 'system')}</span>
                  {item.requestId ? <span>Request: {item.requestId}</span> : null}
                </div>
              </div>
            </div>
          ))}
        </div>
      );
    }

    return null;
  };

  return (
    <AdminLayout>
      <div className="nid-review-page">
        <div className="nid-review-shell-head nid-review-shell-head--split">
          <div className="nid-review-shell-top">
            <Link to="/admin/applications" className="nid-review-back-link">
              <FaArrowLeft />
              <span>Back to Queue</span>
            </Link>
          </div>

          {!loading && application ? (
            <div className="nid-review-shell-mainrow">
              <div className="nid-review-shell-infoBox">
                <div className="nid-review-shell-infoInner">
                  <p className="nid-review-kicker">Application Review</p>

                  <div className="nid-review-shell-infoGrid">
                    <div className="nid-review-id-block">
                      <span className="nid-review-id-label">Application ID</span>
                      <code className="nid-review-app-id">
                        {application.applicationId || application._id?.slice(-6)}
                      </code>
                    </div>

                    <div className="nid-review-meta-inline nid-review-meta-inline--center">
                      <span className="nid-review-meta-label">Status</span>
                      <span className={`nid-review-status ${getStatusTone(application.status)}`}>
                        {formatStatus(application.status)}
                      </span>
                    </div>

                    <div className="nid-review-meta-inline nid-review-meta-inline--center">
                      <span className="nid-review-meta-label">Type</span>
                      <span className="nid-review-pill neutral">
                        {formatStatus(application.applicationType || 'new')}
                      </span>
                      {isResubmissionApplication ? (
                        <span className="nid-review-resubmission-chip">
                          Resubmission
                        </span>
                      ) : null}
                    </div>
                  </div>
                </div>
              </div>

              <div className="nid-review-shell-actionBox">
                <div className="nid-review-top-actions nid-review-top-actions--box">
                  {canReopen ? (
                    <button
                      type="button"
                      className="nid-review-btn secondary"
                      onClick={() => openModal('under_review')}
                    >
                      <FaUndo />
                      <span>Reopen</span>
                    </button>
                  ) : null}

                  {canApprove ? (
                    <button
                      type="button"
                      className="nid-review-btn approve"
                      onClick={() => openModal('approved')}
                    >
                      <FaCheck />
                      <span>Approve</span>
                    </button>
                  ) : null}

                  {canReject ? (
                    <button
                      type="button"
                      className="nid-review-btn reject"
                      onClick={() => openModal('rejected')}
                    >
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
            <Loader size="medium" text="Loading application review..." />
          </div>
        ) : application ? (
          <>
            <div className="nid-review-summary-row">
              {summaryCards.map((item) => (
                <div key={item.label} className="nid-review-summary-card">
                  <p>{item.label}</p>
                  <h3>{item.value}</h3>
                  <small>{item.sub}</small>
                </div>
              ))}
            </div>

            {application.rejectionReason ? (
              <div className="nid-review-alert">
                <strong>Current rejection reason:</strong> {application.rejectionReason}
              </div>
            ) : null}

            {isResubmissionApplication ? (
              <div className="nid-review-alert nid-review-resubmission-alert">
                <div>
                  <strong>Resubmission:</strong> This application follows a previous
                  New NID rejection.
                </div>
                <button
                  type="button"
                  className="nid-review-text-button"
                  onClick={() => setShowPreviousRejection((current) => !current)}
                >
                  {showPreviousRejection ? 'Hide previous rejection' : 'View previous rejection'}
                </button>
              </div>
            ) : null}

            {isResubmissionApplication && showPreviousRejection ? (
              <div className="nid-review-card nid-review-previous-rejection">
                <div className="nid-review-card-title">
                  <FaHistory />
                  <h3>Previous Rejection History</h3>
                </div>

                <div className="nid-review-info-grid">
                  <div>
                    <p>Previous Application ID</p>
                    <h4>{previousRejectionHistory.previousApplicationId || 'N/A'}</h4>
                  </div>
                  <div>
                    <p>Previous Rejected Date</p>
                    <h4>
                      {formatDateTime(previousRejectionHistory.previousRejectedAt)}
                    </h4>
                  </div>
                  <div>
                    <p>Previous Rejection Reason</p>
                    <h4>
                      {previousRejectionHistory.previousRejectionReason ||
                        'Not recorded'}
                    </h4>
                  </div>
                  <div>
                    <p>Previous Admin Notes</p>
                    <h4>
                      {previousRejectionHistory.previousRejectionNotes ||
                        'Not recorded'}
                    </h4>
                  </div>
                  <div>
                    <p>Resubmission Count</p>
                    <h4>{previousRejectionHistory.resubmissionCount || 1}</h4>
                  </div>
                </div>
              </div>
            ) : null}

            {correctionSummary ? (
              <div className="nid-review-alert">
                <strong>Correction request:</strong>{' '}
                {correctionSummary.baseApplicationId
                  ? `Against ${correctionSummary.baseApplicationId}. `
                  : ''}
                {correctionSummary.reason || 'No reason recorded.'}{' '}
                Proof status: {formatStatus(correctionSummary.proofStatus || 'not_uploaded')}.
                {Array.isArray(correctionSummary.requestedChanges) &&
                correctionSummary.requestedChanges.length > 0
                  ? ` Fields: ${correctionSummary.requestedChanges
                      .map((item) => formatStatus(item.field))
                      .join(', ')}.`
                  : ''}
              </div>
            ) : null}

            <div className="nid-review-main">
              <aside className="nid-review-left">
                <div className="nid-review-card">
                  <div className="nid-review-card-title">
                    <FaUser />
                    <h3>Application Overview</h3>
                  </div>

                  <div className="nid-review-summary-list">
                    <div>
                      <p>Applicant Name</p>
                      <h4>{getApplicantName(application)}</h4>
                    </div>
                    <div>
                      <p>Birth Registration No</p>
                      <h4>{application.birthRegistrationNumber || 'N/A'}</h4>
                    </div>
                    <div>
                      <p>Phone</p>
                      <h4>{getApplicantPhone(application)}</h4>
                    </div>
                    <div>
                      <p>Email</p>
                      <h4>{getApplicantEmail(application)}</h4>
                    </div>
                  </div>
                </div>

                <div className="nid-review-card">
                  <div className="nid-review-card-title">
                    <FaListUl />
                    <h3>Information Panels</h3>
                  </div>

                  <div className="nid-review-section-switcher">
                    {sideSections.map((section) => {
                      const Icon = section.icon;
                      return (
                        <button
                          key={section.key}
                          type="button"
                          className={
                            activeSectionKey === section.key
                              ? 'nid-review-section-btn active'
                              : 'nid-review-section-btn'
                          }
                          onClick={() => setActiveSectionKey(section.key)}
                        >
                          <Icon />
                          <span>{section.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </aside>

              <section className="nid-review-center">
                <div className="nid-review-card">
                  <div className="nid-review-panel-head">
                    <div>
                      <h3>Submitted Records</h3>
                    </div>

                    {activeDocument?.asset?.secureUrl ? (
                      <button
                        type="button"
                        className="nid-review-btn secondary inline"
                        onClick={() =>
                          window.open(activeDocument.asset.secureUrl, '_blank', 'noopener,noreferrer')
                        }
                      >
                        <FaEye />
                        <span>Open Original</span>
                      </button>
                    ) : null}
                  </div>

                  <div className="nid-review-doc-tabs">
                    {documents.map((item) => {
                      const Icon = item.icon;
                      return (
                        <button
                          key={item.key}
                          type="button"
                          className={
                            activeDocumentKey === item.key
                              ? 'nid-review-doc-btn active'
                              : 'nid-review-doc-btn'
                          }
                          onClick={() => setActiveDocumentKey(item.key)}
                        >
                          <div className="nid-review-doc-btn-title">
                            <Icon />
                            <span>{item.label}</span>
                          </div>
                          <small>{formatStatus(item.asset.status || 'not_uploaded')}</small>
                        </button>
                      );
                    })}
                  </div>

                  <div className="nid-review-viewer-head">
                    <div>
                      <h4>{activeDocument?.label}</h4>
                      <p>{activeDocument?.asset?.originalFilename || 'Inline record preview'}</p>
                    </div>

                    <div className="nid-review-viewer-meta">
                      <span>{formatFileSize(activeDocument?.asset?.bytes || 0)}</span>
                      <span>
                        {activeDocument?.asset?.uploadedAt
                          ? formatDateTime(activeDocument.asset.uploadedAt)
                          : 'N/A'}
                      </span>
                    </div>
                  </div>

                  <div className="nid-review-viewer">
                    <DocumentPreview
                      asset={activeDocument?.asset}
                      label={activeDocument?.label}
                      imageScale={imageScale}
                      imageOrigin={imageOrigin}
                      handleImageMove={handleImageMove}
                      handleImageEnter={handleImageEnter}
                      handleImageLeave={handleImageLeave}
                    />
                  </div>

                  {activeDocument?.asset?.rejectionReason ? (
                    <div className="nid-review-inline-alert">
                      {activeDocument.asset.rejectionReason}
                    </div>
                  ) : null}
                </div>
              </section>

              <aside className="nid-review-right">
                <div className="nid-review-card nid-review-detail-panel">
                  <div className="nid-review-card-title">
                    <ActiveSectionIcon />
                    <h3>{sectionMeta.label}</h3>
                  </div>

                  <div className="nid-review-right-content">{renderRightPanel()}</div>
                </div>
              </aside>
            </div>
          </>
        ) : (
          <div className="nid-review-loader">
            <Loader size="medium" text="Application not found" />
          </div>
        )}

        {showModal ? (
          <div className="nid-review-modal-backdrop" onClick={closeModal}>
            <div className="nid-review-modal-card" onClick={(e) => e.stopPropagation()}>
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
                    onChange={(e) => setDecisionNote(e.target.value)}
                    placeholder="Write a short administrative note..."
                  />
                </div>

                {pendingAction === 'rejected' ? (
                  <div className="nid-review-modal-field">
                    <label>Rejection Reason *</label>
                    <textarea
                      rows={5}
                      value={rejectionReason}
                      onChange={(e) => setRejectionReason(e.target.value)}
                      placeholder="Write the rejection reason..."
                    />
                  </div>
                ) : null}
              </div>

              <div className="nid-review-modal-footer">
                <button
                  type="button"
                  className="nid-review-btn secondary"
                  onClick={closeModal}
                  disabled={actionLoading}
                >
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
