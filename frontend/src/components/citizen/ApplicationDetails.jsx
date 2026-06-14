import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  FaArrowLeft,
  FaExclamationTriangle,
  FaFileAlt,
  FaIdCard,
  FaInfoCircle,
  FaMapMarkerAlt,
  FaRegFileAlt,
  FaUser
} from 'react-icons/fa';
import api from '../api/axios';
import Loader from '../common/Loader';
import { useLanguage } from '../context/LanguageContext';
import { formatStatus } from '../utils/helpers';
import '../styles/ApplicationDetails.css';

const APPLICATION_DETAILS_COPY = {
  en: {
    loading: 'Loading application details...',
    backToDashboard: 'Back to dashboard',
    title: 'Application details',
    subtitle: 'Review the information submitted with this application.',
    overview: 'Overview',
    submittedInformation: 'Submitted information',
    addressFamily: 'Address & family',
    documents: 'Documents',
    currentStage: 'Current stage',
    notProvided: 'Not provided',
    applicationId: 'Application ID',
    correctionRequestId: 'Correction request ID',
    baseApplicationId: 'Base application ID',
    applicationType: 'Application Type',
    submittedOn: 'Submitted on',
    lastUpdated: 'Last updated',
    rejectionReason: 'Rejection reason',
    noReasonProvided: 'No reason provided.',
    fullNameEnglish: 'Full Name (English)',
    fullNameBangla: 'Full Name (Bangla)',
    dateOfBirth: 'Date of Birth',
    gender: 'Gender',
    birthRegistrationNumber: 'Birth Registration Number',
    bloodGroup: 'Blood Group',
    phone: 'Phone Number',
    email: 'Email',
    maritalStatus: 'Marital Status',
    occupation: 'Occupation',
    fatherName: "Father's Name",
    motherName: "Mother's Name",
    spouseName: 'Spouse Name',
    presentAddress: 'Present Address',
    permanentAddress: 'Permanent Address',
    photograph: 'Photograph',
    signature: 'Signature',
    birthCertificate: 'Birth certificate',
    supportingDocuments: 'Supporting documents',
    photoChangeRequested: 'Photo change requested',
    newPhoto: 'New photo',
    currentOfficialData: 'Current official data',
    requestedChanges: 'Requested changes',
    correctionReason: 'Correction reason',
    previousValue: 'Current value',
    requestedValue: 'Requested value',
    noRequestedChanges: 'No changed fields were recorded.',
    noDocuments: 'No document uploaded.',
    yes: 'Yes',
    no: 'No',
    preview: 'Preview',
    documentStatus: 'Status',
    applicationNotFound: 'Application details could not be found.',
    failedLoad: 'Failed to load application details',
    reviewLabels: {
      submitted: 'Submitted',
      under_review: 'Under review',
      approved: 'Approved',
      rejected: 'Rejected',
      cancelled: 'Cancelled'
    },
    stageLabels: {
      draft: 'Draft',
      submitted: 'Submitted',
      under_review: 'Under review',
      correction_required: 'Correction required',
      approved: 'Approved',
      printed: 'Card printed',
      dispatched: 'Delivery in progress',
      delivered: 'Delivered',
      rejected: 'Rejected',
      cancelled: 'Cancelled'
    },
    applicationTypeLabels: {
      new: 'New NID',
      correction: 'Correction',
      reissue: 'Reissue'
    }
  },
  bn: {
    loading: 'আবেদনের বিস্তারিত লোড হচ্ছে...',
    backToDashboard: 'ড্যাশবোর্ডে ফিরুন',
    title: 'আবেদনের বিস্তারিত',
    subtitle: 'এই আবেদনে জমা দেওয়া তথ্য দেখুন।',
    overview: 'সংক্ষিপ্ত তথ্য',
    submittedInformation: 'জমা দেওয়া তথ্য',
    addressFamily: 'ঠিকানা ও পারিবারিক তথ্য',
    documents: 'কাগজপত্র',
    currentStage: 'বর্তমান ধাপ',
    notProvided: 'দেওয়া হয়নি',
    applicationId: 'আবেদন আইডি',
    correctionRequestId: 'সংশোধন অনুরোধ আইডি',
    baseApplicationId: 'মূল আবেদন আইডি',
    applicationType: 'আবেদনের ধরন',
    submittedOn: 'জমা দেওয়ার তারিখ',
    lastUpdated: 'সর্বশেষ আপডেট',
    rejectionReason: 'বাতিলের কারণ',
    noReasonProvided: 'কারণ দেওয়া হয়নি।',
    fullNameEnglish: 'পূর্ণ নাম (ইংরেজি)',
    fullNameBangla: 'পূর্ণ নাম (বাংলা)',
    dateOfBirth: 'জন্ম তারিখ',
    gender: 'লিঙ্গ',
    birthRegistrationNumber: 'জন্ম নিবন্ধন নম্বর',
    bloodGroup: 'রক্তের গ্রুপ',
    phone: 'ফোন নম্বর',
    email: 'ইমেইল',
    maritalStatus: 'বৈবাহিক অবস্থা',
    occupation: 'পেশা',
    fatherName: 'পিতার নাম',
    motherName: 'মাতার নাম',
    spouseName: 'স্বামী/স্ত্রীর নাম',
    presentAddress: 'বর্তমান ঠিকানা',
    permanentAddress: 'স্থায়ী ঠিকানা',
    photograph: 'ছবি',
    signature: 'স্বাক্ষর',
    birthCertificate: 'জন্ম সনদ',
    supportingDocuments: 'সহায়ক কাগজপত্র',
    photoChangeRequested: 'ছবি পরিবর্তনের আবেদন',
    newPhoto: 'নতুন ছবি',
    currentOfficialData: 'বর্তমান অফিসিয়াল তথ্য',
    requestedChanges: 'অনুরোধকৃত পরিবর্তন',
    correctionReason: 'সংশোধনের কারণ',
    previousValue: 'বর্তমান তথ্য',
    requestedValue: 'অনুরোধকৃত তথ্য',
    noRequestedChanges: 'কোনো পরিবর্তিত তথ্য রেকর্ড করা হয়নি।',
    noDocuments: 'কোনো কাগজপত্র আপলোড করা হয়নি।',
    yes: 'হ্যাঁ',
    no: 'না',
    preview: 'প্রিভিউ',
    documentStatus: 'স্ট্যাটাস',
    applicationNotFound: 'আবেদনের বিস্তারিত পাওয়া যায়নি।',
    failedLoad: 'আবেদনের বিস্তারিত লোড করা যায়নি',
    reviewLabels: {
      submitted: 'জমা হয়েছে',
      under_review: 'পর্যালোচনাধীন',
      approved: 'অনুমোদিত',
      rejected: 'বাতিল হয়েছে',
      cancelled: 'বাতিল করা হয়েছে'
    },
    stageLabels: {
      draft: 'ড্রাফট',
      submitted: 'জমা হয়েছে',
      under_review: 'পর্যালোচনাধীন',
      correction_required: 'সংশোধন প্রয়োজন',
      approved: 'অনুমোদিত',
      printed: 'কার্ড প্রিন্ট সম্পন্ন',
      dispatched: 'ডেলিভারি চলমান',
      delivered: 'বিতরণ সম্পন্ন',
      rejected: 'বাতিল হয়েছে',
      cancelled: 'বাতিল করা হয়েছে'
    },
    applicationTypeLabels: {
      new: 'নতুন এনআইডি',
      correction: 'সংশোধন',
      reissue: 'রিইস্যু'
    }
  }
};

const REVIEW_APPROVED_STATUSES = new Set([
  'approved',
  'printed',
  'dispatched',
  'delivered'
]);

const normalizeStatus = (value) => String(value || '').toLowerCase();

const formatDetailsDateTime = (value, language = 'en', fallback = '') => {
  if (!value) return fallback;

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return fallback;

  return new Intl.DateTimeFormat(language === 'bn' ? 'bn-BD' : 'en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(date);
};

const formatDetailsDate = (value, language = 'en', fallback = '') => {
  if (!value) return fallback;

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return fallback;

  return new Intl.DateTimeFormat(language === 'bn' ? 'bn-BD' : 'en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  }).format(date);
};

const formatAddress = (address = {}) =>
  [
    address.villageOrArea,
    address.unionOrWard,
    address.upazila,
    address.district,
    address.division,
    address.postOffice,
    address.postalCode
  ]
    .filter(Boolean)
    .map((part) => String(part).trim())
    .filter(Boolean)
    .join(', ');

const displayValue = (value, fallback) => {
  if (value === null || value === undefined) return fallback;
  if (typeof value === 'string') return value.trim() || fallback;
  return String(value);
};

const getReviewStatusKey = (status, source) => {
  const normalizedStatus = normalizeStatus(status);

  if (source === 'correction' && ['submitted', 'under_review'].includes(normalizedStatus)) {
    return 'under_review';
  }

  if (normalizedStatus === 'submitted') return 'submitted';
  if (normalizedStatus === 'under_review') return 'under_review';
  if (REVIEW_APPROVED_STATUSES.has(normalizedStatus)) return 'approved';
  if (normalizedStatus === 'rejected') return 'rejected';
  if (['cancelled', 'canceled'].includes(normalizedStatus)) return 'cancelled';

  return normalizedStatus || 'submitted';
};

const getDocumentAsset = (record, legacyName = '') => {
  const cloudinary = record?.cloudinary || record?.current || record || {};
  const secureUrl = cloudinary.secureUrl || cloudinary.url || '';
  const originalFilename =
    cloudinary.originalFilename ||
    cloudinary.publicId ||
    legacyName ||
    '';
  const format = String(cloudinary.format || '').toLowerCase();

  return {
    secureUrl,
    originalFilename,
    format,
    bytes: cloudinary.bytes || 0,
    uploadedAt: record?.uploadedAt || cloudinary.createdAt || null,
    status: record?.status || (secureUrl || legacyName ? 'uploaded' : 'not_uploaded'),
    rejectionReason: record?.rejectionReason || ''
  };
};

const isImageAsset = (asset = {}) =>
  Boolean(asset.secureUrl) &&
  ['jpg', 'jpeg', 'png', 'webp', 'gif'].includes(String(asset.format || '').toLowerCase());

const DetailSection = ({ icon, title, children, className = '' }) => (
  <section className={`application-details-card${className ? ` ${className}` : ''}`}>
    <div className="application-details-card-heading">
      <div className="application-details-card-icon">{icon}</div>
      <h2>{title}</h2>
    </div>
    {children}
  </section>
);

const DetailRows = ({ rows, emptyText }) => {
  const visibleRows = rows.filter((row) => !row.hidden);

  if (!visibleRows.length) {
    return <p className="application-details-empty">{emptyText}</p>;
  }

  return (
    <dl className="application-details-row-list">
      {visibleRows.map((row) => (
        <div key={row.label} className="application-details-row">
          <dt>{row.label}</dt>
          <dd>{row.value}</dd>
        </div>
      ))}
    </dl>
  );
};

const DocumentItem = ({ document, label, copy }) => {
  const hasDocument =
    document.status !== 'not_uploaded' || document.secureUrl || document.originalFilename;

  return (
    <div className="application-details-document-item">
      <div className="application-details-document-preview">
        {isImageAsset(document) ? (
          <img src={document.secureUrl} alt={label} />
        ) : (
          <FaFileAlt />
        )}
      </div>

      <div className="application-details-document-meta">
        <h3>{label}</h3>
        <p>
          <span>{copy.documentStatus}</span>
          <strong>{formatStatus(document.status || 'not_uploaded')}</strong>
        </p>
        {!hasDocument && (
          <p className="application-details-document-missing">
            {copy.noDocuments}
          </p>
        )}
        {document.rejectionReason && (
          <small>{document.rejectionReason}</small>
        )}
      </div>

      {document.secureUrl && (
        <a
          href={document.secureUrl}
          target="_blank"
          rel="noreferrer"
          className="application-details-document-link"
        >
          {copy.preview}
        </a>
      )}
    </div>
  );
};

const ApplicationDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { language } = useLanguage();
  const languageKey = language === 'bn' ? 'bn' : 'en';
  const copy = APPLICATION_DETAILS_COPY[languageKey];

  const [loading, setLoading] = useState(true);
  const [record, setRecord] = useState(null);
  const [recordSource, setRecordSource] = useState('application');
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchDetails = async () => {
      try {
        setLoading(true);
        setError('');

        try {
          const response = await api.get(`/applications/${id}`);
          setRecord(response?.data?.application || null);
          setRecordSource('application');
          return;
        } catch (applicationError) {
          if (applicationError?.response?.status !== 404) {
            throw applicationError;
          }
        }

        const correctionResponse = await api.get(`/corrections/${id}`);
        setRecord(
          correctionResponse?.data?.correction ||
            correctionResponse?.data?.data ||
            null
        );
        setRecordSource('correction');
      } catch (loadError) {
        console.error('Failed to load application details:', loadError);
        setError(loadError?.response?.data?.message || copy.failedLoad);
      } finally {
        setLoading(false);
      }
    };

    fetchDetails();
  }, [copy.failedLoad, id]);

  const details = useMemo(() => {
    if (!record) return null;

    const source = recordSource;
    const status = normalizeStatus(record.status);
    const reviewStatusKey = getReviewStatusKey(status, source);
    const reviewStatus =
      copy.reviewLabels[reviewStatusKey] || formatStatus(reviewStatusKey);
    const currentStage =
      source === 'correction'
        ? reviewStatus
        : copy.stageLabels[status] || formatStatus(status);

    return {
      source,
      status,
      reviewStatus,
      currentStage,
      applicationType:
        source === 'correction'
          ? copy.applicationTypeLabels.correction
          : copy.applicationTypeLabels[record.applicationType] ||
            formatStatus(record.applicationType || 'new')
    };
  }, [copy, record, recordSource]);

  const applicationDocumentItems = useMemo(() => {
    if (!record || recordSource !== 'application') return [];

    const assets = record.documentAssets || {};
    const legacyDocuments = record.documents || {};

    return [
      {
        label: copy.photograph,
        document: getDocumentAsset(assets.photograph, legacyDocuments.photo)
      },
      {
        label: copy.signature,
        document: getDocumentAsset(assets.signature, legacyDocuments.signature)
      },
      {
        label: copy.birthCertificate,
        document: getDocumentAsset(
          assets.birthCertificate,
          legacyDocuments.birthCertificate
        )
      }
    ];
  }, [copy, record, recordSource]);

  if (loading) {
    return (
      <div className="application-details-loading">
        <Loader size="large" text={copy.loading} />
      </div>
    );
  }

  if (error || !record || !details) {
    return (
      <div className="application-details-page">
        <div className="application-details-shell">
          <Link to="/dashboard" className="application-details-back-link">
            <FaArrowLeft />
            <span>{copy.backToDashboard}</span>
          </Link>
          <div className="application-details-error">
            <FaExclamationTriangle />
            <p>{error || copy.applicationNotFound}</p>
            <button type="button" onClick={() => navigate('/dashboard')}>
              {copy.backToDashboard}
            </button>
          </div>
        </div>
      </div>
    );
  }

  const isCorrection = details.source === 'correction';
  const submittedAt = record.submittedAt || record.createdAt;
  const updatedAt = record.updatedAt || record.latestStatusChangedAt;
  const isRejected = details.status === 'rejected';
  const rejectionReasonText = displayValue(
    record.rejectionReason,
    copy.noReasonProvided
  );

  const overviewRows = isCorrection
    ? [
        {
          label: copy.correctionRequestId,
          value: `#${displayValue(record.correctionId || record._id, copy.notProvided)}`
        },
        {
          label: copy.baseApplicationId,
          value: `#${displayValue(record.baseApplicationId, copy.notProvided)}`
        },
        {
          label: copy.submittedOn,
          value: formatDetailsDateTime(submittedAt, languageKey, copy.notProvided)
        },
        {
          label: copy.lastUpdated,
          value: formatDetailsDateTime(updatedAt, languageKey, copy.notProvided)
        }
      ]
    : [
        {
          label: copy.applicationId,
          value: `#${displayValue(record.applicationId || record._id, copy.notProvided)}`
        },
        { label: copy.applicationType, value: details.applicationType },
        { label: copy.currentStage, value: details.currentStage },
        {
          label: copy.submittedOn,
          value: formatDetailsDateTime(submittedAt, languageKey, copy.notProvided)
        },
        {
          label: copy.lastUpdated,
          value: formatDetailsDateTime(updatedAt, languageKey, copy.notProvided)
        }
      ];

  const personalSource = isCorrection ? record.requestedData || {} : record;
  const currentOfficialSource = record.previousData || {};

  const personalRows = [
    { label: copy.fullNameEnglish, value: displayValue(personalSource.fullNameEnglish, copy.notProvided) },
    { label: copy.fullNameBangla, value: displayValue(personalSource.fullNameBangla, copy.notProvided) },
    {
      label: copy.dateOfBirth,
      value: formatDetailsDate(personalSource.dateOfBirth, languageKey, copy.notProvided)
    },
    { label: copy.gender, value: formatStatus(displayValue(personalSource.gender, copy.notProvided)) },
    { label: copy.birthRegistrationNumber, value: displayValue(personalSource.birthRegistrationNumber, copy.notProvided) },
    { label: copy.bloodGroup, value: displayValue(personalSource.bloodGroup, copy.notProvided) },
    { label: copy.phone, value: displayValue(personalSource.phone, copy.notProvided) },
    { label: copy.email, value: displayValue(personalSource.email, copy.notProvided) },
    { label: copy.maritalStatus, value: formatStatus(displayValue(personalSource.maritalStatus, copy.notProvided)) },
    { label: copy.occupation, value: displayValue(personalSource.occupation, copy.notProvided) }
  ];

  const addressRows = [
    { label: copy.fatherName, value: displayValue(personalSource.fatherName, copy.notProvided) },
    { label: copy.motherName, value: displayValue(personalSource.motherName, copy.notProvided) },
    {
      label: copy.spouseName,
      value: displayValue(personalSource.spouseName, copy.notProvided),
      hidden: !personalSource.spouseName
    },
    {
      label: copy.presentAddress,
      value: formatAddress(personalSource.presentAddress) || copy.notProvided
    },
    {
      label: copy.permanentAddress,
      value: formatAddress(personalSource.permanentAddress) || copy.notProvided
    }
  ];

  const currentOfficialRows = [
    { label: copy.fullNameEnglish, value: displayValue(currentOfficialSource.fullNameEnglish, copy.notProvided) },
    { label: copy.fullNameBangla, value: displayValue(currentOfficialSource.fullNameBangla, copy.notProvided) },
    { label: copy.fatherName, value: displayValue(currentOfficialSource.fatherName, copy.notProvided) },
    { label: copy.motherName, value: displayValue(currentOfficialSource.motherName, copy.notProvided) },
    {
      label: copy.presentAddress,
      value: formatAddress(currentOfficialSource.presentAddress) || copy.notProvided
    },
    {
      label: copy.permanentAddress,
      value: formatAddress(currentOfficialSource.permanentAddress) || copy.notProvided
    }
  ];

  const correctionDocuments = record.documents || {};
  const supportingDocuments = correctionDocuments.verificationDocuments || [];

  return (
    <div className="application-details-page">
      <div className="application-details-shell">
        <header className="application-details-header">
          <Link to="/dashboard" className="application-details-back-link">
            <FaArrowLeft />
            <span>{copy.backToDashboard}</span>
          </Link>

          <div className="application-details-title-card">
            <div>
              <span>{isCorrection ? copy.correctionRequestId : copy.applicationId}</span>
              <h1>{copy.title}</h1>
              <p>{copy.subtitle}</p>
            </div>
            <div className="application-details-header-status">
              <div className={`application-details-status-pill status-${details.status}`}>
                {details.reviewStatus}
              </div>
              {isRejected && (
                <div className="application-details-header-rejection">
                  <strong>{copy.rejectionReason}</strong>
                  <p>{rejectionReasonText}</p>
                </div>
              )}
            </div>
          </div>
        </header>

        <div className="application-details-grid">
          <DetailSection
            icon={<FaInfoCircle />}
            title={copy.overview}
            className="application-details-card-wide"
          >
            <DetailRows rows={overviewRows} emptyText={copy.notProvided} />
          </DetailSection>

          {isCorrection ? (
            <>
              <DetailSection icon={<FaIdCard />} title={copy.currentOfficialData}>
                <DetailRows rows={currentOfficialRows} emptyText={copy.notProvided} />
              </DetailSection>

              <DetailSection icon={<FaUser />} title={copy.submittedInformation}>
                <DetailRows rows={personalRows} emptyText={copy.notProvided} />
              </DetailSection>

              <DetailSection
                icon={<FaRegFileAlt />}
                title={copy.requestedChanges}
                className="application-details-card-wide"
              >
                {record.reason && (
                  <div className="application-details-note">
                    <strong>{copy.correctionReason}</strong>
                    <p>{record.reason}</p>
                  </div>
                )}

                {record.changedFields?.length ? (
                  <div className="application-details-change-list">
                    {record.changedFields.map((field) => (
                      <div key={field.field} className="application-details-change-item">
                        <h3>{field.label || formatStatus(field.field)}</h3>
                        <div>
                          <span>{copy.previousValue}</span>
                          <strong>
                            {displayValue(field.displayOldValue || field.oldValue, copy.notProvided)}
                          </strong>
                        </div>
                        <div>
                          <span>{copy.requestedValue}</span>
                          <strong>
                            {displayValue(field.displayNewValue || field.newValue, copy.notProvided)}
                          </strong>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="application-details-empty">{copy.noRequestedChanges}</p>
                )}
              </DetailSection>

              <DetailSection
                icon={<FaFileAlt />}
                title={copy.documents}
                className="application-details-card-wide"
              >
                <div className="application-details-photo-request">
                  <span>{copy.photoChangeRequested}</span>
                  <strong>{record.photoChangeRequested ? copy.yes : copy.no}</strong>
                </div>

                <div className="application-details-document-list">
                  {record.photoChangeRequested && correctionDocuments.photograph && (
                    <DocumentItem
                      label={copy.newPhoto}
                      document={getDocumentAsset(correctionDocuments.photograph)}
                      copy={copy}
                    />
                  )}

                  {supportingDocuments.map((document, index) => (
                    <DocumentItem
                      key={document._id || index}
                      label={`${copy.supportingDocuments} ${index + 1}`}
                      document={getDocumentAsset(document)}
                      copy={copy}
                    />
                  ))}

                  {!correctionDocuments.photograph && supportingDocuments.length === 0 && (
                    <p className="application-details-empty">{copy.noDocuments}</p>
                  )}
                </div>
              </DetailSection>
            </>
          ) : (
            <>
              <DetailSection icon={<FaUser />} title={copy.submittedInformation}>
                <DetailRows rows={personalRows} emptyText={copy.notProvided} />
              </DetailSection>

              <DetailSection icon={<FaMapMarkerAlt />} title={copy.addressFamily}>
                <DetailRows rows={addressRows} emptyText={copy.notProvided} />
              </DetailSection>

              <DetailSection
                icon={<FaFileAlt />}
                title={copy.documents}
                className="application-details-card-wide"
              >
                <div className="application-details-document-list">
                  {applicationDocumentItems.map((item) => (
                    <DocumentItem
                      key={item.label}
                      label={item.label}
                      document={item.document}
                      copy={copy}
                    />
                  ))}
                </div>
              </DetailSection>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default ApplicationDetails;
