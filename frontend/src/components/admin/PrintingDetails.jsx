import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import {
  FaArrowLeft,
  FaBirthdayCake,
  FaCheckCircle,
  FaClock,
  FaEnvelope,
  FaFileAlt,
  FaIdCard,
  FaImage,
  FaMapMarkerAlt,
  FaPhone,
  FaPrint,
  FaSignature,
  FaSpinner,
  FaTint,
  FaUser,
  FaUsers,
  FaVenusMars
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

const NOT_RECORDED = 'Not recorded';

const displayValue = (value, fallback = NOT_RECORDED) => {
  const text = String(value ?? '').trim();
  return text || fallback;
};

const buildAddress = (address = {}) => {
  if (typeof address === 'string') return displayValue(address);

  return (
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
      .join(', ') || NOT_RECORDED
  );
};

const getInitials = (name = '') => {
  const parts = String(name || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (!parts.length) return 'NA';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
};

const resolveAssetUrl = (asset) => {
  if (!asset) return '';

  if (typeof asset === 'object') {
    const nestedUrl =
      asset.secureUrl ||
      asset.secure_url ||
      asset.url ||
      asset.fileUrl ||
      asset.fileURL ||
      asset.path ||
      asset.location ||
      asset.previewUrl ||
      asset.downloadUrl ||
      asset.current?.secureUrl ||
      asset.current?.url ||
      asset.current?.path ||
      asset.cloudinary?.secureUrl ||
      asset.cloudinary?.secure_url ||
      asset.cloudinary?.url ||
      asset.cloudinary?.path ||
      asset.file?.secureUrl ||
      asset.file?.url ||
      asset.asset?.secureUrl ||
      asset.asset?.url ||
      '';

    return resolveAssetUrl(nestedUrl);
  }

  const cleanPath = String(asset || '').trim().replace(/\\/g, '/');
  if (!cleanPath || cleanPath === NOT_RECORDED) return '';

  if (/^(https?:)?\/\//i.test(cleanPath)) {
    return cleanPath.startsWith('//') ? `https:${cleanPath}` : cleanPath;
  }

  if (/^(data|blob):/i.test(cleanPath)) return cleanPath;

  const backendRoot = (api?.defaults?.baseURL || '')
    .replace(/\/api\/?$/i, '')
    .replace(/\/$/, '');

  if (!backendRoot) return cleanPath;

  if (cleanPath.startsWith('/api/')) {
    return `${backendRoot}${cleanPath}`;
  }

  if (cleanPath.startsWith('api/')) {
    return `${backendRoot}/${cleanPath}`;
  }

  return `${backendRoot}${cleanPath.startsWith('/') ? cleanPath : `/${cleanPath}`}`;
};

const inferAssetFormat = (asset = {}, resolvedUrl = '') => {
  const format = String(
    asset.format ||
      asset.extension ||
      asset.mimeType?.split('/')?.pop() ||
      asset.mimetype?.split('/')?.pop() ||
      asset.cloudinary?.format ||
      asset.current?.format ||
      asset.file?.format ||
      resolvedUrl.split('.').pop()?.split('?')[0]?.split('#')[0] ||
      ''
  ).toLowerCase();

  if (format === 'jpg' || format === 'jpeg') return 'jpg';
  if (format === 'png') return 'png';
  if (format === 'webp') return 'webp';
  if (format === 'gif') return 'gif';
  if (format === 'pdf') return 'pdf';
  return format;
};

const normalizeAsset = (asset = {}) => {
  if (!asset) return null;

  if (typeof asset === 'string') {
    return getLegacyAsset(asset);
  }

  const secureUrl = resolveAssetUrl(asset);
  if (!secureUrl) return null;

  return {
    secureUrl,
    format: inferAssetFormat(asset, secureUrl),
    resourceType:
      asset.resourceType ||
      asset.resource_type ||
      asset.cloudinary?.resourceType ||
      asset.cloudinary?.resource_type ||
      asset.current?.resourceType ||
      '',
    originalFilename:
      asset.originalFilename ||
      asset.filename ||
      asset.name ||
      asset.cloudinary?.originalFilename ||
      asset.cloudinary?.publicId ||
      asset.current?.originalFilename ||
      '',
    status: asset.status || asset.current?.status || 'uploaded',
    uploadedAt: asset.uploadedAt || asset.createdAt || asset.current?.uploadedAt || null
  };
};

const getLegacyAsset = (url = '') => {
  const safeUrl = resolveAssetUrl(url);
  if (!safeUrl) return null;

  return {
    secureUrl: safeUrl,
    format: inferAssetFormat({}, safeUrl),
    resourceType: '',
    originalFilename: '',
    status: 'uploaded',
    uploadedAt: null
  };
};

const getDocumentAsset = (application, key) => {
  if (!application) return null;

  if (Array.isArray(application?.reviewAssets)) {
    const found = application.reviewAssets.find((item) => item.key === key);
    const normalized = normalizeAsset(found);
    if (normalized) return normalized;
  }

  const assetSources = [
    application?.documentAssets?.[key],
    application?.documents?.[key],
    application?.assets?.[key],
    application?.uploadedDocuments?.[key],
    application?.nidApplication?.documentAssets?.[key],
    application?.nidApplication?.documents?.[key],
    application?.application?.documentAssets?.[key],
    application?.application?.documents?.[key]
  ];

  if (key === 'photograph') {
    assetSources.push(
      application?.documentAssets?.photo,
      application?.documentAssets?.applicantPhoto,
      application?.documents?.photo,
      application?.documents?.passport,
      application?.documents?.applicantPhoto,
      application?.photo,
      application?.photoUrl,
      application?.applicantPhoto,
      application?.applicant?.photo,
      application?.applicant?.photoUrl,
      application?.citizen?.photo,
      application?.citizen?.photoUrl,
      application?.profile?.photo,
      application?.profile?.photoUrl
    );
  }

  if (key === 'signature') {
    assetSources.push(
      application?.documentAssets?.applicantSignature,
      application?.documents?.signature,
      application?.documents?.applicantSignature,
      application?.signature,
      application?.signatureUrl,
      application?.applicantSignature,
      application?.applicant?.signature,
      application?.applicant?.signatureUrl,
      application?.profile?.signature,
      application?.profile?.signatureUrl
    );
  }

  if (key === 'birthCertificate') {
    assetSources.push(
      application?.documentAssets?.birthRegistration,
      application?.documents?.birthCertificate,
      application?.documents?.birthRegistration,
      application?.birthCertificate,
      application?.birthCertificateUrl,
      application?.birthRegistrationDocument
    );
  }

  if (key === 'correctionProof') {
    assetSources.push(application?.documents?.correctionProof, application?.correctionProof);
  }

  for (const source of assetSources) {
    const normalized = normalizeAsset(source);
    if (normalized) return normalized;
  }

  return null;
};

const isImageAsset = (asset = {}) => {
  const format = String(asset?.format || '').toLowerCase();
  const resourceType = String(asset?.resourceType || '').toLowerCase();
  const url = String(asset?.secureUrl || '').toLowerCase();

  if (resourceType === 'image') return true;
  if (['jpg', 'jpeg', 'png', 'webp', 'gif', 'bmp', 'svg'].includes(format)) return true;
  return /\.(jpg|jpeg|png|webp|gif|bmp|svg)(\?|#|$)/i.test(url);
};

const AssetImage = ({ src, alt, className = '', fallback }) => {
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [src]);

  if (!src || failed) {
    return fallback;
  }

  return (
    <img
      className={className}
      src={src}
      alt={alt}
      loading="lazy"
      onError={() => setFailed(true)}
    />
  );
};

const DetailBox = ({ label, value, className = '' }) => (
  <div className={`printing-queue-detail-box ${className}`.trim()}>
    <span>{label}</span>
    <strong>{displayValue(value)}</strong>
  </div>
);

const MediaTile = ({ icon, label, asset }) => {
  const assetUrl = resolveAssetUrl(asset?.secureUrl);
  const canPreviewImage = assetUrl && isImageAsset({ ...asset, secureUrl: assetUrl });

  if (!assetUrl) {
    return (
      <div className="printing-queue-media-tile empty">
        <div className="printing-queue-media-preview placeholder">{icon}</div>
        <div>
          <strong>{label}</strong>
          <span>Not uploaded</span>
        </div>
      </div>
    );
  }

  return (
    <a
      className="printing-queue-media-tile"
      href={assetUrl}
      target="_blank"
      rel="noreferrer"
      title={`Open ${label}`}
    >
      <div className="printing-queue-media-preview">
        {canPreviewImage ? (
          <AssetImage
            src={assetUrl}
            alt={label}
            fallback={<FaFileAlt />}
          />
        ) : (
          <FaFileAlt />
        )}
      </div>
      <div>
        <strong>{label}</strong>
        <span>{formatStatus(asset?.status) || 'Uploaded'}</span>
      </div>
    </a>
  );
};

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

  const mediaAssets = useMemo(() => {
    if (!application) return [];

    return [
      {
        key: 'photograph',
        label: 'Passport Photo',
        icon: <FaImage />,
        asset: getDocumentAsset(application, 'photograph')
      },
      {
        key: 'signature',
        label: 'Signature',
        icon: <FaSignature />,
        asset: getDocumentAsset(application, 'signature')
      },
      {
        key: 'birthCertificate',
        label: 'Birth Certificate',
        icon: <FaFileAlt />,
        asset: getDocumentAsset(application, 'birthCertificate')
      }
    ];
  }, [application]);

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
          <div className="printing-queue-empty-state detail">
            <FaPrint />
            <h3>Printing item not found</h3>
            <p>The application may no longer be available to this admin account.</p>
          </div>
        </div>
      </AdminLayout>
    );
  }

  const applicantName = getApplicantName(application);
  const photoAsset = getDocumentAsset(application, 'photograph');
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
          <div className="printing-queue-identity-summary">
            <div className="printing-queue-applicant-photo-card">
              {(() => {
                const photoUrl = resolveAssetUrl(photoAsset?.secureUrl);
                const photoFallback = (
                  <div className="printing-queue-photo-placeholder">
                    {getInitials(applicantName)}
                  </div>
                );

                return photoUrl && isImageAsset({ ...photoAsset, secureUrl: photoUrl }) ? (
                  <AssetImage
                    className="printing-queue-applicant-photo"
                    src={photoUrl}
                    alt={applicantName}
                    fallback={photoFallback}
                  />
                ) : (
                  photoFallback
                );
              })()}
              <span>Application photo</span>
            </div>

            <div className="printing-queue-identity-main">
              <div className="printing-queue-identity-title-row">
                <div>
                  <span className="printing-queue-identity-eyebrow">Printing Details</span>
                  <h1>{application.applicationId || application._id}</h1>
                  <p>{applicantName}</p>
                </div>
                <span className={`printing-queue-status-badge ${getPrintingStatusClass(application)}`}>
                  {getPrintingStatusLabel(application)}
                </span>
              </div>

              <div className="printing-queue-id-meta">
                <span>
                  NID: <strong>{application.nidNumber || 'Pending'}</strong>
                </span>
                <span>
                  Type: <strong>{formatStatus(application.applicationType) || 'New'}</strong>
                </span>
                <span>
                  Queue Age: <strong>{getQueueAge(getPrintingQueueDate(application))}</strong>
                </span>
              </div>
            </div>
          </div>

          <div className="printing-queue-details-grid compact">
            <DetailBox label="Application Type" value={formatStatus(application.applicationType) || 'New'} />
            <DetailBox label="Submitted" value={formatDate(application.submittedAt || application.createdAt)} />
            <DetailBox label="Approved" value={formatDateTime(application.approvedAt)} />
            <DetailBox label="Queue Age" value={getQueueAge(getPrintingQueueDate(application))} />
            <DetailBox
              label="Assigned NID Number"
              value={application.nidNumber || 'Pending until printed'}
              className="nid-number"
            />
          </div>

          <div className="printing-queue-info-panel">
            <div className="printing-queue-info-title">
              <FaUser />
              <h3>Applicant Identity Information</h3>
            </div>
            <div className="printing-queue-info-grid official">
              <div>
                <span>Full Name English</span>
                <strong>{displayValue(application.fullNameEnglish || applicantName)}</strong>
              </div>
              <div>
                <span>Full Name Bangla</span>
                <strong>{displayValue(application.fullNameBangla)}</strong>
              </div>
              <div>
                <span>Birth Registration Number</span>
                <strong>{displayValue(application.birthRegistrationNumber)}</strong>
              </div>
              <div>
                <span>Father's Name</span>
                <strong>{displayValue(application.fatherName)}</strong>
              </div>
              <div>
                <span>Mother's Name</span>
                <strong>{displayValue(application.motherName)}</strong>
              </div>
              <div>
                <span>Date of Birth</span>
                <strong>{formatDate(application.dateOfBirth) || NOT_RECORDED}</strong>
              </div>
              <div>
                <span><FaVenusMars /> Gender</span>
                <strong>{formatStatus(application.gender) || NOT_RECORDED}</strong>
              </div>
              <div>
                <span><FaTint /> Blood Group</span>
                <strong>{displayValue(application.bloodGroup)}</strong>
              </div>
              <div>
                <span><FaBirthdayCake /> Marital Status</span>
                <strong>{formatStatus(application.maritalStatus) || NOT_RECORDED}</strong>
              </div>
              <div>
                <span><FaUsers /> Occupation</span>
                <strong>{displayValue(application.occupation)}</strong>
              </div>
              <div>
                <span><FaPhone /> Phone</span>
                <strong>{getApplicantPhone(application)}</strong>
              </div>
              <div>
                <span><FaEnvelope /> Email</span>
                <strong>{getApplicantEmail(application)}</strong>
              </div>
            </div>
          </div>

          <div className="printing-queue-info-panel">
            <div className="printing-queue-info-title">
              <FaMapMarkerAlt />
              <h3>Address Information</h3>
            </div>
            <div className="printing-queue-address-grid">
              <div>
                <span>Present Address</span>
                <strong>{buildAddress(application.presentAddress)}</strong>
              </div>
              <div>
                <span>Permanent Address</span>
                <strong>{buildAddress(application.permanentAddress)}</strong>
              </div>
            </div>
          </div>

          <div className="printing-queue-info-panel">
            <div className="printing-queue-info-title">
              <FaImage />
              <h3>Submitted Media</h3>
            </div>
            <div className="printing-queue-media-grid">
              {mediaAssets.map((item) => (
                <MediaTile
                  key={item.key}
                  icon={item.icon}
                  label={item.label}
                  asset={item.asset}
                />
              ))}
            </div>
          </div>

          <div className="printing-queue-info-panel">
            <div className="printing-queue-info-title">
              <FaIdCard />
              <h3>Biometric and Verification Summary</h3>
            </div>
            <div className="printing-queue-info-grid official">
              <div>
                <span>Appointment Status</span>
                <strong>{formatStatus(application.biometricAppointment?.status) || NOT_RECORDED}</strong>
              </div>
              <div>
                <span>Biometrics Completed</span>
                <strong>{biometricCompletedAt ? formatDateTime(biometricCompletedAt) : 'Not completed'}</strong>
              </div>
              <div>
                <span>Appointment Center</span>
                <strong>{displayValue(application.biometricAppointment?.centerName)}</strong>
              </div>
              <div>
                <span>Appointment Time Slot</span>
                <strong>{displayValue(application.biometricAppointment?.timeSlot)}</strong>
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
                    <strong>{formatDateTime(entry.changedAt || entry.createdAt) || NOT_RECORDED}</strong>
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
