const User = require('../models/User');
const mongoose = require('mongoose');
const { randomUUID } = require('crypto');
const { validationResult } = require('express-validator');
const Application = require('../models/Application');
const BiometricVerificationSession = require('../models/BiometricVerificationSession');
const DocumentVerificationSession = require('../models/DocumentVerificationSession');
const {
  createAuditLog,
  getRequestAuditContext
} = require('../utils/auditLogger');
const {
  verifyBirthCertificate
} = require('../utils/documentOcrServiceClient');
const {
  CLAIMED_FIELD_KEYS,
  normalizeClaimedBirthCertificateFields,
  buildClaimedFieldsFromApplicationPayload,
  hashFileBuffer,
  hashClaimedFields,
  generateVerificationToken,
  hashVerificationToken,
  sanitizeVerificationResult,
  getDocumentVerificationTtlMinutes
} = require('../utils/documentVerification');
const {
  applyAdminJurisdictionFilter,
  canAccessApplicationByJurisdiction
} = require('../utils/adminScope');
const uploadApplicationDocumentToCloudinary = require('../utils/uploadApplicationDocumentToCloudinary');

const BIOMETRIC_FAILURE_MESSAGE =
  'Face verification failed. Please upload a recent passport-size photo and try again.';
const APPLICATION_ERROR_CODES = {
  BIOMETRIC_SESSION_REQUIRED: 'APPLICATION_BIOMETRIC_SESSION_REQUIRED',
  BIOMETRIC_SESSION_NOT_FOUND: 'APPLICATION_BIOMETRIC_SESSION_NOT_FOUND',
  BIOMETRIC_SESSION_NOT_PASSED: 'APPLICATION_BIOMETRIC_SESSION_NOT_PASSED',
  BIOMETRIC_SESSION_EXPIRED: 'APPLICATION_BIOMETRIC_SESSION_EXPIRED',
  BIOMETRIC_SESSION_ALREADY_USED: 'APPLICATION_BIOMETRIC_SESSION_ALREADY_USED',
  BIOMETRIC_OWNER_MISMATCH: 'APPLICATION_BIOMETRIC_OWNER_MISMATCH',
  VALIDATION_FAILED: 'APPLICATION_VALIDATION_FAILED',
  BIRTH_CERTIFICATE_VERIFICATION_REQUIRED:
    'BIRTH_CERTIFICATE_VERIFICATION_REQUIRED',
  BIRTH_CERTIFICATE_VERIFICATION_EXPIRED:
    'BIRTH_CERTIFICATE_VERIFICATION_EXPIRED',
  BIRTH_CERTIFICATE_VERIFICATION_FIELD_CHANGED:
    'BIRTH_CERTIFICATE_VERIFICATION_FIELD_CHANGED',
  BIRTH_CERTIFICATE_VERIFICATION_ALREADY_USED:
    'BIRTH_CERTIFICATE_VERIFICATION_ALREADY_USED',
  NEW_NID_APPLICATION_EXISTS: 'NEW_NID_APPLICATION_EXISTS',
  ACTIVE_NEW_APPLICATION_EXISTS: 'NEW_NID_ACTIVE_APPLICATION_EXISTS',
  NEW_NID_ALREADY_APPROVED: 'NEW_NID_ALREADY_APPROVED',
  NEW_NID_RESUBMISSION_ALLOWED: 'NEW_NID_RESUBMISSION_ALLOWED',
  ISSUED_NEW_NID_REQUIRED: 'ISSUED_NEW_NID_REQUIRED'
};
const DOCUMENT_VERIFICATION_ERROR_CODES = {
  MISMATCH: 'DOCUMENT_VERIFICATION_MISMATCH',
  FIELD_MISMATCH: 'FIELD_MISMATCH',
  REGISTRY_MISMATCH: 'REGISTRY_MISMATCH',
  REGISTRY_RECORD_NOT_FOUND: 'REGISTRY_RECORD_NOT_FOUND',
  OCR_UNREADABLE: 'OCR_UNREADABLE',
  UNREADABLE: 'DOCUMENT_UNREADABLE',
  LOW_CONFIDENCE: 'DOCUMENT_LOW_CONFIDENCE',
  FAILED: 'DOCUMENT_VERIFICATION_FAILED',
  TIMEOUT: 'DOCUMENT_VERIFICATION_TIMEOUT',
  UNAVAILABLE: 'DOCUMENT_VERIFICATION_UNAVAILABLE',
  VALIDATION_FAILED: 'DOCUMENT_VERIFICATION_VALIDATION_FAILED'
};

const generateApplicationId = () => {
  const shortId = randomUUID().split('-')[0].toUpperCase();
  return `APP-${Date.now()}-${shortId}`;
};

const citizenDocumentFieldMap = {
  photograph: 'photo',
  signature: 'signature',
  birthCertificate: 'birthCertificate',
  correctionProof: 'correctionProof'
};

const ACTIVE_NEW_APPLICATION_STATUSES = ['draft', 'submitted', 'under_review'];

const ISSUED_NEW_APPLICATION_STATUSES = [
  'approved',
  'printed',
  'dispatched',
  'delivered'
];

const DOCUMENT_VERIFIED_LOCKED_FIELDS = [
  'applicationType',
  'fullNameEnglish',
  'fullNameBangla',
  'fatherName',
  'motherName',
  'dateOfBirth',
  'gender',
  'birthRegistrationNumber'
];

const pushApplicationStatusHistory = ({
  application,
  fromStatus,
  toStatus,
  note = '',
  changedBy = null,
  changedByRole = 'system'
}) => {
  const currentHistory = Array.isArray(application.statusHistory)
    ? [...application.statusHistory]
    : [];
  const changedAt = new Date();

  currentHistory.push({
    fromStatus,
    toStatus,
    note,
    changedAt,
    changedBy,
    changedByRole
  });

  application.statusHistory = currentHistory;
  application.latestStatusChangedAt = changedAt;
};

const buildChangedFields = (application, payload, allowedFields) => {
  const changedFields = [];

  allowedFields.forEach((field) => {
    if (payload[field] === undefined) {
      return;
    }

    const currentValue = JSON.stringify(application[field] ?? null);
    const incomingValue = JSON.stringify(payload[field] ?? null);

    if (currentValue !== incomingValue) {
      application[field] = payload[field];
      changedFields.push(field);
    }
  });

  return changedFields;
};

const buildHttpError = (message, statusCode = 500, code = '', details = {}) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  error.code = code;
  error.details = details;
  return error;
};

const normalizeOptionalString = (value) => {
  if (typeof value !== 'string') {
    return value;
  }

  const trimmedValue = value.trim();
  return trimmedValue ? trimmedValue : undefined;
};

const toSafeValidationErrors = (error) => {
  if (error?.name === 'ValidationError' && error.errors) {
    return Object.entries(error.errors).map(([field, fieldError]) => ({
      field,
      message: fieldError.message
    }));
  }

  return [];
};

const getLatestRejectedHistoryEntry = (application = {}) => {
  const history = Array.isArray(application.statusHistory)
    ? application.statusHistory
    : [];

  return [...history]
    .reverse()
    .find((item) => String(item?.toStatus || '').toLowerCase() === 'rejected');
};

const buildApplicationSummary = (application) => {
  if (!application) {
    return null;
  }

  return {
    _id: application._id,
    applicationId: application.applicationId || '',
    status: application.status || '',
    applicationType: application.applicationType || '',
    createdAt: application.createdAt || null,
    submittedAt: application.submittedAt || null,
    latestStatusChangedAt: application.latestStatusChangedAt || null
  };
};

const buildLatestRejectedApplicationSummary = (application) => {
  if (!application) {
    return null;
  }

  const rejectedHistory = getLatestRejectedHistoryEntry(application);
  const rejectionReason =
    application.rejectionReason ||
    rejectedHistory?.reason ||
    rejectedHistory?.note ||
    '';
  const rejectionNotes =
    rejectedHistory?.note && rejectedHistory.note !== rejectionReason
      ? rejectedHistory.note
      : '';
  const rejectedAt =
    application.latestStatusChangedAt ||
    rejectedHistory?.changedAt ||
    application.updatedAt ||
    null;

  return {
    _id: application._id || null,
    applicationId: application.applicationId || '',
    rejectedAt,
    rejectionReason,
    rejectionNotes,
    statusHistoryReason: rejectedHistory?.reason || rejectedHistory?.note || ''
  };
};

const buildNewNidBlockMessage = (blockedReasonCode) => {
  if (blockedReasonCode === APPLICATION_ERROR_CODES.NEW_NID_ALREADY_APPROVED) {
    return 'You already have a New NID record. Please use Correction or Reissue if you need changes.';
  }

  if (blockedReasonCode === APPLICATION_ERROR_CODES.ACTIVE_NEW_APPLICATION_EXISTS) {
    return 'You already have an active New NID application. You cannot submit another New NID application.';
  }

  return 'You already have an active or completed New NID application. You cannot submit another New NID application.';
};

const getNewNidEligibilityContext = async (userId) => {
  const [
    activeNewApplication,
    issuedNewApplication,
    latestRejectedNewApplication,
    rejectedNewApplicationCount
  ] = await Promise.all([
    Application.findOne({
      applicant: userId,
      applicationType: 'new',
      status: { $in: ACTIVE_NEW_APPLICATION_STATUSES }
    })
      .sort({ createdAt: -1 })
      .lean(),
    Application.findOne({
      applicant: userId,
      applicationType: 'new',
      status: { $in: ISSUED_NEW_APPLICATION_STATUSES }
    })
      .sort({ createdAt: -1 })
      .lean(),
    Application.findOne({
      applicant: userId,
      applicationType: 'new',
      status: 'rejected'
    })
      .sort({ latestStatusChangedAt: -1, updatedAt: -1, createdAt: -1 })
      .lean(),
    Application.countDocuments({
      applicant: userId,
      applicationType: 'new',
      status: 'rejected'
    })
  ]);

  const blockingApplication = issuedNewApplication || activeNewApplication;
  const blockedReasonCode = issuedNewApplication
    ? APPLICATION_ERROR_CODES.NEW_NID_ALREADY_APPROVED
    : activeNewApplication
      ? APPLICATION_ERROR_CODES.ACTIVE_NEW_APPLICATION_EXISTS
      : null;
  const latestRejectedSummary = buildLatestRejectedApplicationSummary(
    latestRejectedNewApplication
  );

  return {
    canApplyNewNid: !blockingApplication,
    blockedReasonCode,
    blockedReasonMessage: blockedReasonCode
      ? buildNewNidBlockMessage(blockedReasonCode)
      : '',
    blockingApplication,
    activeNewApplication,
    issuedNewApplication,
    latestRejectedNewApplication,
    latestRejectedSummary,
    hasPreviousRejection: Boolean(latestRejectedNewApplication),
    resubmissionAllowed:
      !blockingApplication && Boolean(latestRejectedNewApplication),
    resubmissionCount: rejectedNewApplicationCount
  };
};

const buildNewNidDuplicateDetails = (eligibilityContext = {}) => ({
  blockedReasonCode:
    eligibilityContext.blockedReasonCode ||
    APPLICATION_ERROR_CODES.NEW_NID_APPLICATION_EXISTS,
  blockedReasonMessage:
    eligibilityContext.blockedReasonMessage ||
    buildNewNidBlockMessage(APPLICATION_ERROR_CODES.NEW_NID_APPLICATION_EXISTS),
  blockedApplication: buildApplicationSummary(
    eligibilityContext.blockingApplication
  )
});

const auditNewNidDuplicateBlocked = async ({ req, eligibilityContext }) => {
  const blockingApplication = eligibilityContext?.blockingApplication;

  if (!blockingApplication?._id) {
    return;
  }

  await createAuditLog({
    actor: req.user._id,
    actorRole: req.user.role,
    action: 'NEW_NID_DUPLICATE_BLOCKED',
    entityType: 'Application',
    entityId: blockingApplication._id,
    message: 'Duplicate New NID application attempt blocked',
    severity: 'warning',
    sourceModule: 'applications',
    requestContext: getRequestAuditContext(req),
    meta: {
      blockedReasonCode: eligibilityContext.blockedReasonCode,
      blockedApplicationId: blockingApplication.applicationId || '',
      blockedApplicationStatus: blockingApplication.status || ''
    }
  });
};

const assertNewNidSubmissionAllowed = async ({ req, eligibilityContext = null }) => {
  const context =
    eligibilityContext || (await getNewNidEligibilityContext(req.user._id));

  if (context.canApplyNewNid) {
    return context;
  }

  await auditNewNidDuplicateBlocked({ req, eligibilityContext: context });

  throw buildHttpError(
    context.blockedReasonMessage,
    409,
    context.blockedReasonCode ||
      APPLICATION_ERROR_CODES.NEW_NID_APPLICATION_EXISTS,
    buildNewNidDuplicateDetails(context)
  );
};

const buildJurisdiction = ({ permanentAddress = {}, presentAddress = {} }) => {
  const district =
    normalizeOptionalString(permanentAddress?.district) ||
    normalizeOptionalString(presentAddress?.district) ||
    '';
  const division =
    normalizeOptionalString(permanentAddress?.division) ||
    normalizeOptionalString(presentAddress?.division) ||
    '';

  return {
    district,
    division,
    source: permanentAddress?.district ? 'permanentAddress' : 'presentAddress'
  };
};

const normalizeForCorrectionComparison = (value) => {
  if (value instanceof Date) {
    return value.toISOString().split('T')[0];
  }

  if (typeof value === 'string') {
    const date = new Date(value);
    if (/^\d{4}-\d{2}-\d{2}/.test(value) && !Number.isNaN(date.getTime())) {
      return date.toISOString().split('T')[0];
    }

    return value.trim();
  }

  if (value && typeof value === 'object') {
    return JSON.parse(JSON.stringify(value));
  }

  return value ?? '';
};

const valuesMatchForCorrection = (firstValue, secondValue) =>
  JSON.stringify(normalizeForCorrectionComparison(firstValue)) ===
  JSON.stringify(normalizeForCorrectionComparison(secondValue));

const buildRequestedCorrectionChanges = ({
  issuedNewApplication,
  applicationPayload,
  requestedChanges
}) => {
  if (Array.isArray(requestedChanges) && requestedChanges.length > 0) {
    return requestedChanges
      .map((item) => ({
        field: String(item?.field || '').trim(),
        oldValue: item?.oldValue ?? null,
        newValue: item?.newValue ?? null
      }))
      .filter((item) => item.field);
  }

  const correctionFields = [
    'fullNameEnglish',
    'fullNameBangla',
    'fatherName',
    'motherName',
    'spouseName',
    'dateOfBirth',
    'gender',
    'bloodGroup',
    'maritalStatus',
    'phone',
    'email',
    'occupation',
    'presentAddress',
    'permanentAddress'
  ];

  return correctionFields
    .filter(
      (field) =>
        !valuesMatchForCorrection(
          issuedNewApplication?.[field],
          applicationPayload?.[field]
        )
    )
    .map((field) => ({
      field,
      oldValue: normalizeForCorrectionComparison(issuedNewApplication?.[field]),
      newValue: normalizeForCorrectionComparison(applicationPayload?.[field])
    }));
};

const buildCorrectionInfoPayload = ({
  req,
  issuedNewApplication,
  applicationPayload,
  documents = {}
}) => {
  const correctionInfo =
    req.body?.correctionInfo && typeof req.body.correctionInfo === 'object'
      ? req.body.correctionInfo
      : {};

  return {
    correctionOf: issuedNewApplication?._id || null,
    baseApplicationId: issuedNewApplication?.applicationId || '',
    requestedChanges: buildRequestedCorrectionChanges({
      issuedNewApplication,
      applicationPayload,
      requestedChanges: correctionInfo.requestedChanges
    }),
    reason:
      String(correctionInfo.reason || req.body?.correctionReason || '').trim(),
    proofStatus: documents?.correctionProof ? 'uploaded' : 'not_uploaded'
  };
};

const parseClaimedFieldsJson = (value) => {
  if (!value || typeof value !== 'string') {
    return null;
  }

  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
      ? parsed
      : null;
  } catch {
    return null;
  }
};

const getMissingRequiredClaimedFields = (claimedFields = {}) => {
  const requiredFields = [
    'birthRegistrationNumber',
    'fullNameEnglish',
    'fatherName',
    'motherName',
    'dateOfBirth',
    'gender'
  ];

  return requiredFields.filter((field) => !claimedFields[field]);
};

const buildDocumentVerificationMessage = (status, failureReason = '') => {
  if (status === 'passed') {
    return 'Birth certificate information matched your application.';
  }

  if (
    status === 'mismatch' ||
    ['FIELD_MISMATCH', 'REGISTRY_MISMATCH'].includes(failureReason)
  ) {
    return 'Birth certificate information does not match your provided information.';
  }

  if (status === 'not_found' || failureReason === 'REGISTRY_RECORD_NOT_FOUND') {
    return 'Birth registration record could not be found.';
  }

  if (
    status === 'unreadable' ||
    ['OCR_UNREADABLE', 'CRITICAL_FIELD_MISSING'].includes(failureReason)
  ) {
    return 'Birth registration number could not be read. Please upload a clearer image.';
  }

  if (status === 'low_confidence') {
    return 'The document text could not be verified confidently. Please upload a clearer image.';
  }

  return 'Birth certificate verification failed. Please upload a clearer document and try again.';
};

const buildDocumentVerificationUnavailableMessage = (ocrResult = {}) =>
  ocrResult.unavailableReason === 'timeout'
    ? 'Document verification is taking longer than expected. Please try again.'
    : 'Document verification service is temporarily unavailable. Please try again later.';

const getDocumentVerificationUnavailableCode = (ocrResult = {}) =>
  ocrResult.unavailableReason === 'timeout'
    ? DOCUMENT_VERIFICATION_ERROR_CODES.TIMEOUT
    : DOCUMENT_VERIFICATION_ERROR_CODES.UNAVAILABLE;

const getDocumentVerificationResponseCode = (status, failureReason = '') => {
  if (failureReason === 'REGISTRY_RECORD_NOT_FOUND' || status === 'not_found') {
    return DOCUMENT_VERIFICATION_ERROR_CODES.REGISTRY_RECORD_NOT_FOUND;
  }
  if (failureReason === 'REGISTRY_MISMATCH') {
    return DOCUMENT_VERIFICATION_ERROR_CODES.REGISTRY_MISMATCH;
  }
  if (failureReason === 'FIELD_MISMATCH') {
    return DOCUMENT_VERIFICATION_ERROR_CODES.FIELD_MISMATCH;
  }
  if (status === 'mismatch') return DOCUMENT_VERIFICATION_ERROR_CODES.MISMATCH;
  if (
    status === 'unreadable' ||
    ['OCR_UNREADABLE', 'CRITICAL_FIELD_MISSING'].includes(failureReason)
  ) {
    return DOCUMENT_VERIFICATION_ERROR_CODES.OCR_UNREADABLE;
  }
  if (status === 'low_confidence') {
    return DOCUMENT_VERIFICATION_ERROR_CODES.LOW_CONFIDENCE;
  }
  return DOCUMENT_VERIFICATION_ERROR_CODES.FAILED;
};

const getDocumentVerificationAuditAction = (status, available = true) => {
  if (!available) return 'DOCUMENT_OCR_SERVICE_UNAVAILABLE';
  if (status === 'passed') return 'DOCUMENT_OCR_PASSED';
  if (status === 'mismatch') return 'DOCUMENT_OCR_MISMATCH_BLOCKED';
  if (status === 'not_found') return 'DOCUMENT_REGISTRY_RECORD_NOT_FOUND_BLOCKED';
  if (status === 'unreadable') return 'DOCUMENT_OCR_UNREADABLE_BLOCKED';
  if (status === 'low_confidence') {
    return 'DOCUMENT_OCR_LOW_CONFIDENCE_BLOCKED';
  }
  return 'DOCUMENT_OCR_FAILED_BLOCKED';
};

const createDocumentVerificationSessionRecord = async ({
  req,
  verification,
  birthCertificateFile,
  claimedFields,
  verificationToken = ''
}) => {
  const ttlMinutes = getDocumentVerificationTtlMinutes();
  const expiresAt = new Date(Date.now() + ttlMinutes * 60 * 1000);

  return DocumentVerificationSession.create({
    user: req.user._id,
    tokenHash: verificationToken
      ? hashVerificationToken(verificationToken)
      : undefined,
    documentHash: hashFileBuffer(birthCertificateFile.buffer),
    claimedFieldsHash: hashClaimedFields(claimedFields),
    status: verification.status,
    provider: verification.provider,
    verification,
    expiresAt
  });
};

const auditDocumentVerification = async ({
  req,
  session,
  verification,
  available = true
}) => {
  await createAuditLog({
    actor: req.user._id,
    actorRole: req.user.role,
    action: getDocumentVerificationAuditAction(verification.status, available),
    entityType: 'DocumentVerificationSession',
    entityId: session._id,
    message:
      verification.status === 'passed'
        ? 'Birth certificate OCR passed before application submission'
        : buildDocumentVerificationMessage(
            verification.status,
            verification.failureReason
          ),
    severity: verification.status === 'passed' ? 'info' : 'warning',
    sourceModule: 'applications.document-verification',
    requestContext: getRequestAuditContext(req),
    meta: {
      status: verification.status,
      provider: verification.provider,
      confidence: verification.confidence,
      blocksSubmission: verification.blocksSubmission,
      available
    }
  });
};

const getVerificationSnapshot = (verification = {}) =>
  sanitizeVerificationResult({
    ...verification,
    status: verification.status || 'failed',
    checkedAt: verification.checkedAt || new Date()
  });

const getBirthCertificateVerificationFromSession = async ({
  token,
  userId,
  claimedFields,
  now
}) => {
  if (!token || typeof token !== 'string') {
    throw buildHttpError(
      'Passed birth certificate verification is required before New NID submission',
      422,
      APPLICATION_ERROR_CODES.BIRTH_CERTIFICATE_VERIFICATION_REQUIRED
    );
  }

  const tokenHash = hashVerificationToken(token);
  const claimedFieldsHash = hashClaimedFields(claimedFields);

  const verificationSession = await DocumentVerificationSession.findOne({
    user: userId,
    tokenHash
  })
    .select('+tokenHash +documentHash')
    .sort({ createdAt: -1 });

  if (!verificationSession || verificationSession.status !== 'passed') {
    throw buildHttpError(
      'Passed birth certificate verification is required before New NID submission',
      422,
      APPLICATION_ERROR_CODES.BIRTH_CERTIFICATE_VERIFICATION_REQUIRED
    );
  }

  if (verificationSession.usedAt) {
    throw buildHttpError(
      'Birth certificate verification token has already been used',
      409,
      APPLICATION_ERROR_CODES.BIRTH_CERTIFICATE_VERIFICATION_ALREADY_USED
    );
  }

  if (verificationSession.expiresAt <= now) {
    throw buildHttpError(
      'Birth certificate verification has expired. Please verify the document again.',
      409,
      APPLICATION_ERROR_CODES.BIRTH_CERTIFICATE_VERIFICATION_EXPIRED
    );
  }

  if (verificationSession.claimedFieldsHash !== claimedFieldsHash) {
    throw buildHttpError(
      'Application information changed after document verification. Please verify the birth certificate again.',
      409,
      APPLICATION_ERROR_CODES.BIRTH_CERTIFICATE_VERIFICATION_FIELD_CHANGED
    );
  }

  return verificationSession;
};

const buildDocumentVerificationTokenError = async ({
  sessionId,
  userId,
  now
}) => {
  const session = await DocumentVerificationSession.findOne({
    _id: sessionId,
    user: userId
  });

  if (session?.usedAt) {
    return buildHttpError(
      'Birth certificate verification token has already been used',
      409,
      APPLICATION_ERROR_CODES.BIRTH_CERTIFICATE_VERIFICATION_ALREADY_USED
    );
  }

  if (session?.expiresAt && session.expiresAt <= now) {
    return buildHttpError(
      'Birth certificate verification has expired. Please verify the document again.',
      409,
      APPLICATION_ERROR_CODES.BIRTH_CERTIFICATE_VERIFICATION_EXPIRED
    );
  }

  return buildHttpError(
    'Passed birth certificate verification is required before New NID submission',
    409,
    APPLICATION_ERROR_CODES.BIRTH_CERTIFICATE_VERIFICATION_REQUIRED
  );
};

const ensureApplicationTypeRules = async ({
  req,
  userId,
  applicationType,
  applicationPayload,
  submittedAt,
  newNidEligibilityContext = null
}) => {
  if (applicationType === 'new') {
    const context = await assertNewNidSubmissionAllowed({
      req,
      eligibilityContext: newNidEligibilityContext
    });
    const latestRejectedApplication = context.latestRejectedNewApplication;

    if (latestRejectedApplication) {
      const rejectedSummary =
        buildLatestRejectedApplicationSummary(latestRejectedApplication);

      applicationPayload.resubmissionInfo = {
        isResubmission: true,
        previousApplication: latestRejectedApplication._id,
        previousApplicationId: latestRejectedApplication.applicationId || '',
        previousStatus: latestRejectedApplication.status,
        previousRejectedAt: rejectedSummary?.rejectedAt || null,
        previousRejectionReason: rejectedSummary?.rejectionReason || '',
        previousRejectionNotes: rejectedSummary?.rejectionNotes || '',
        rejectionReason: rejectedSummary?.rejectionReason || '',
        rejectedAt: rejectedSummary?.rejectedAt || null,
        resubmittedAt: submittedAt,
        resubmissionCount: context.resubmissionCount || 0
      };
    }

    return {
      latestRejectedApplication,
      resubmissionCount: context.resubmissionCount || 0
    };
  }

  if (['correction', 'reissue'].includes(applicationType)) {
    const issuedNewApplication = await Application.findOne({
      applicant: userId,
      applicationType: 'new',
      status: { $in: ISSUED_NEW_APPLICATION_STATUSES }
    })
      .sort({ createdAt: -1 })
      .lean();

    if (!issuedNewApplication) {
      throw buildHttpError(
        'Correction or reissue applications require an issued New NID application',
        409,
        APPLICATION_ERROR_CODES.ISSUED_NEW_NID_REQUIRED
      );
    }

    return {
      issuedNewApplication
    };
  }

  return {};
};

const logApplicationCreateDebug = (details) => {
  if (process.env.NODE_ENV !== 'development') {
    return;
  }

  console.warn('Application create debug:', {
    userExists: Boolean(details.userExists),
    biometricSessionIdExists: Boolean(details.biometricSessionIdExists),
    biometricSessionStatus: details.biometricSessionStatus || '',
    biometricSessionCitizenMatches:
      details.biometricSessionCitizenMatches === undefined
        ? null
        : Boolean(details.biometricSessionCitizenMatches),
    applicationValidationErrorCode: details.applicationValidationErrorCode || ''
  });
};

const isTransactionUnsupportedError = (error) => {
  const message = String(error?.message || '').toLowerCase();

  return (
    error?.code === 20 ||
    error?.codeName === 'IllegalOperation' ||
    message.includes('transaction numbers are only allowed') ||
    message.includes('transactions are not supported') ||
    message.includes('transaction is not supported')
  );
};

const createApplicationWithoutTransaction = async ({
  biometricSession,
  documentVerificationSession = null,
  citizenId,
  applicationPayload,
  now
}) => {
  const reservedAt = new Date();

  const reservedBiometricSession =
    await BiometricVerificationSession.findOneAndUpdate(
      {
        _id: biometricSession._id,
        citizen: citizenId,
        status: 'passed',
        expiresAt: { $gt: now },
        usedAt: null
      },
      {
        $set: {
          usedAt: reservedAt
        }
      },
      {
        new: true
      }
    );

  if (!reservedBiometricSession) {
    throw buildHttpError(
      'Biometric verification session has already been used',
      409,
      APPLICATION_ERROR_CODES.BIOMETRIC_SESSION_ALREADY_USED
    );
  }

  let application = null;
  let reservedDocumentVerificationSession = null;

  try {
    if (documentVerificationSession) {
      reservedDocumentVerificationSession =
        await DocumentVerificationSession.findOneAndUpdate(
          {
            _id: documentVerificationSession._id,
            user: citizenId,
            status: 'passed',
            expiresAt: { $gt: now },
            usedAt: null
          },
          {
            $set: {
              usedAt: reservedAt
            }
          },
          {
            new: true
          }
        );

      if (!reservedDocumentVerificationSession) {
        await BiometricVerificationSession.updateOne(
          {
            _id: reservedBiometricSession._id,
            status: 'passed',
            usedAt: reservedAt
          },
          {
            $unset: {
              usedAt: ''
            }
          }
        );

        throw await buildDocumentVerificationTokenError({
          sessionId: documentVerificationSession._id,
          userId: citizenId,
          now
        });
      }
    }

    application = await Application.create(applicationPayload);
  } catch (error) {
    await BiometricVerificationSession.updateOne(
      {
        _id: reservedBiometricSession._id,
        status: 'passed',
        usedAt: reservedAt
      },
      {
        $unset: {
          usedAt: ''
        }
      }
    );

    if (reservedDocumentVerificationSession) {
      await DocumentVerificationSession.updateOne(
        {
          _id: reservedDocumentVerificationSession._id,
          usedAt: reservedAt
        },
        {
          $unset: {
            usedAt: ''
          }
        }
      );
    }

    throw error;
  }

  const usedBiometricSession = await BiometricVerificationSession.findOneAndUpdate(
    {
      _id: reservedBiometricSession._id,
      citizen: citizenId,
      usedAt: reservedAt
    },
    {
      $set: {
        status: 'used'
      },
      $unset: {
        passportPhoto: '',
        qrTokenHash: ''
      }
    },
    {
      new: true
    }
  );

  if (!usedBiometricSession) {
    throw buildHttpError(
      'Biometric verification session has already been used',
      409,
      APPLICATION_ERROR_CODES.BIOMETRIC_SESSION_ALREADY_USED
    );
  }

  return {
    application,
    usedBiometricSession
  };
};

const createApplicationWithBiometricSession = async ({
  biometricSession,
  documentVerificationSession = null,
  citizenId,
  applicationPayload,
  now
}) => {
  const dbSession = await mongoose.startSession();
  let application = null;
  let usedBiometricSession = null;

  try {
    await dbSession.withTransaction(async () => {
      usedBiometricSession = await BiometricVerificationSession.findOneAndUpdate(
        {
          _id: biometricSession._id,
          citizen: citizenId,
          status: 'passed',
          expiresAt: { $gt: now },
          usedAt: null
        },
        {
          $set: {
            status: 'used',
            usedAt: new Date()
          },
          $unset: {
            passportPhoto: '',
            qrTokenHash: ''
          }
        },
        {
          new: true,
          session: dbSession
        }
      );

      if (!usedBiometricSession) {
        throw buildHttpError(
          'Biometric verification session has already been used',
          409,
          APPLICATION_ERROR_CODES.BIOMETRIC_SESSION_ALREADY_USED
        );
      }

      if (documentVerificationSession) {
        const usedDocumentVerificationSession =
          await DocumentVerificationSession.findOneAndUpdate(
            {
              _id: documentVerificationSession._id,
              user: citizenId,
              status: 'passed',
              expiresAt: { $gt: now },
              usedAt: null
            },
            {
              $set: {
                usedAt: new Date()
              }
            },
            {
              new: true,
              session: dbSession
            }
          );

        if (!usedDocumentVerificationSession) {
          throw await buildDocumentVerificationTokenError({
            sessionId: documentVerificationSession._id,
            userId: citizenId,
            now
          });
        }
      }

      const createdApplications = await Application.create([applicationPayload], {
        session: dbSession
      });
      application = createdApplications[0];
    });

    return {
      application,
      usedBiometricSession
    };
  } catch (error) {
    if (isTransactionUnsupportedError(error)) {
      return createApplicationWithoutTransaction({
        biometricSession,
        documentVerificationSession,
        citizenId,
        applicationPayload,
        now
      });
    }

    throw error;
  } finally {
    await dbSession.endSession();
  }
};

const verifyBirthCertificateDocument = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        code: DOCUMENT_VERIFICATION_ERROR_CODES.VALIDATION_FAILED,
        message: 'Birth certificate file is required'
      });
    }

    const parsedClaimedFields = parseClaimedFieldsJson(req.body.claimedFields);

    if (!parsedClaimedFields) {
      return res.status(400).json({
        success: false,
        code: DOCUMENT_VERIFICATION_ERROR_CODES.VALIDATION_FAILED,
        message: 'claimedFields must be a valid JSON object'
      });
    }

    const claimedFields =
      normalizeClaimedBirthCertificateFields(parsedClaimedFields);
    const missingFields = getMissingRequiredClaimedFields(claimedFields);

    if (missingFields.length > 0) {
      return res.status(400).json({
        success: false,
        code: DOCUMENT_VERIFICATION_ERROR_CODES.VALIDATION_FAILED,
        message: 'Required claimed fields are missing',
        missingFields,
        expectedFields: CLAIMED_FIELD_KEYS
      });
    }

    const newNidEligibilityContext = await getNewNidEligibilityContext(
      req.user._id
    );

    if (!newNidEligibilityContext.canApplyNewNid) {
      await auditNewNidDuplicateBlocked({
        req,
        eligibilityContext: newNidEligibilityContext
      });

      return res.status(409).json({
        success: false,
        code: newNidEligibilityContext.blockedReasonCode,
        ...buildNewNidDuplicateDetails(newNidEligibilityContext),
        message: newNidEligibilityContext.blockedReasonMessage
      });
    }

    const ocrResult = await verifyBirthCertificate({
      birthCertificateFile: req.file,
      claimedFields
    });

    const verification = getVerificationSnapshot(ocrResult.verification);
    const verificationToken =
      ocrResult.available && verification.status === 'passed'
        ? generateVerificationToken()
        : '';

    const verificationSession = await createDocumentVerificationSessionRecord({
      req,
      verification,
      birthCertificateFile: req.file,
      claimedFields,
      verificationToken
    });

    await auditDocumentVerification({
      req,
      session: verificationSession,
      verification,
      available: ocrResult.available
    });

    if (!ocrResult.available) {
      return res.status(503).json({
        success: false,
        code: getDocumentVerificationUnavailableCode(ocrResult),
        status: 'unavailable',
        canSubmit: false,
        failureReason: ocrResult.unavailableReason || 'service_unavailable',
        verification,
        message: buildDocumentVerificationUnavailableMessage(ocrResult)
      });
    }

    if (verification.status === 'passed') {
      return res.status(200).json({
        success: true,
        status: 'passed',
        canSubmit: true,
        verificationToken,
        verification,
        message: buildDocumentVerificationMessage('passed')
      });
    }

    return res.status(422).json({
      success: false,
      code: getDocumentVerificationResponseCode(
        verification.status,
        verification.failureReason
      ),
      status: verification.status,
      canSubmit: false,
      verification,
      message: buildDocumentVerificationMessage(
        verification.status,
        verification.failureReason
      )
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      code: DOCUMENT_VERIFICATION_ERROR_CODES.FAILED,
      message: 'Failed to verify birth certificate document'
    });
  }
};

const getApplicationEligibility = async (req, res) => {
  try {
    const eligibilityContext = await getNewNidEligibilityContext(req.user._id);
    const rejectionNotice = eligibilityContext.latestRejectedSummary;

    const canApplyNew = eligibilityContext.canApplyNewNid;
    const canRequestCorrection = Boolean(
      eligibilityContext.issuedNewApplication
    );
    const canRequestReissue = Boolean(eligibilityContext.issuedNewApplication);
    const isSubmitIntent =
      String(req.query.intent || '').toLowerCase() === 'submit';

    let message = '';
    if (!canApplyNew) {
      message = eligibilityContext.blockedReasonMessage;
      if (isSubmitIntent) {
        await auditNewNidDuplicateBlocked({ req, eligibilityContext });
      }
    } else if (rejectionNotice) {
      message =
        'Your previous New NID application was rejected. You can apply again after correcting the issues.';
    } else if (!canRequestCorrection) {
      message = 'Correction and reissue unlock after your New NID is approved or issued.';
    }

    return res.status(200).json({
      success: true,
      data: {
        canApplyNewNid: canApplyNew,
        canApplyNew,
        blockedReasonCode: eligibilityContext.blockedReasonCode,
        blockedReasonMessage: eligibilityContext.blockedReasonMessage || '',
        hasPreviousRejection: eligibilityContext.hasPreviousRejection,
        resubmissionAllowed: eligibilityContext.resubmissionAllowed,
        latestRejectedApplicationId: rejectionNotice?.applicationId || '',
        latestRejectedAt: rejectionNotice?.rejectedAt || null,
        latestRejectionReason: rejectionNotice?.rejectionReason || '',
        latestRejectionNotes: rejectionNotice?.rejectionNotes || '',
        resubmissionCount: eligibilityContext.resubmissionCount || 0,
        canRequestCorrection,
        canRequestReissue,
        activeNewApplication: buildApplicationSummary(
          eligibilityContext.activeNewApplication
        ),
        issuedNewApplication: buildApplicationSummary(
          eligibilityContext.issuedNewApplication
        ),
        latestRejectedNewApplication: rejectionNotice,
        rejectionNotice,
        message
      }
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to load application eligibility'
    });
  }
};

const createApplication = async (req, res) => {
  try {
    const normalizedApplicationType = ['correction', 'reissue'].includes(
      req.body?.applicationType
    )
      ? req.body.applicationType
      : 'new';
    let newNidEligibilityContext = null;

    if (normalizedApplicationType === 'new') {
      newNidEligibilityContext = await assertNewNidSubmissionAllowed({ req });
    }

    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      logApplicationCreateDebug({
        userExists: Boolean(req.user),
        biometricSessionIdExists: Boolean(req.body?.biometricSessionId),
        applicationValidationErrorCode: APPLICATION_ERROR_CODES.VALIDATION_FAILED
      });

      return res.status(400).json({
        success: false,
        code: APPLICATION_ERROR_CODES.VALIDATION_FAILED,
        message: 'Application validation failed',
        errors: errors.array()
      });
    }

    const {
      fullNameEnglish,
      fullNameBangla,
      fatherName,
      motherName,
      spouseName,
      dateOfBirth,
      gender,
      bloodGroup,
      maritalStatus,
      birthRegistrationNumber,
      existingNidNumber,
      phone,
      email,
      occupation,
      presentAddress,
      permanentAddress,
      documents,
      biometricSessionId,
      birthCertificateVerificationToken
    } = req.body;

    if (!biometricSessionId) {
      logApplicationCreateDebug({
        userExists: Boolean(req.user),
        biometricSessionIdExists: false,
        applicationValidationErrorCode:
          APPLICATION_ERROR_CODES.BIOMETRIC_SESSION_REQUIRED
      });

      return res.status(400).json({
        success: false,
        code: APPLICATION_ERROR_CODES.BIOMETRIC_SESSION_REQUIRED,
        message: 'Biometric verification is required before application submission'
      });
    }

    const now = new Date();

    const biometricSession = await BiometricVerificationSession.findOne({
      sessionId: biometricSessionId
    });

    if (!biometricSession) {
      logApplicationCreateDebug({
        userExists: Boolean(req.user),
        biometricSessionIdExists: true,
        applicationValidationErrorCode:
          APPLICATION_ERROR_CODES.BIOMETRIC_SESSION_NOT_FOUND
      });

      return res.status(400).json({
        success: false,
        code: APPLICATION_ERROR_CODES.BIOMETRIC_SESSION_NOT_FOUND,
        message: 'Valid biometric verification session was not found'
      });
    }

    const biometricSessionCitizenMatches =
      String(biometricSession.citizen) === String(req.user._id);

    if (!biometricSessionCitizenMatches) {
      logApplicationCreateDebug({
        userExists: Boolean(req.user),
        biometricSessionIdExists: true,
        biometricSessionStatus: biometricSession.status,
        biometricSessionCitizenMatches,
        applicationValidationErrorCode:
          APPLICATION_ERROR_CODES.BIOMETRIC_OWNER_MISMATCH
      });

      return res.status(403).json({
        success: false,
        code: APPLICATION_ERROR_CODES.BIOMETRIC_OWNER_MISMATCH,
        message: 'Biometric verification session does not belong to this citizen'
      });
    }

    if (biometricSession.expiresAt <= now) {
      biometricSession.status = 'expired';
      biometricSession.failureReason =
        biometricSession.failureReason || 'Biometric session expired';
      biometricSession.qrTokenHash = '';
      biometricSession.passportPhoto = undefined;
      await biometricSession.save();

      return res.status(400).json({
        success: false,
        code: APPLICATION_ERROR_CODES.BIOMETRIC_SESSION_EXPIRED,
        message: 'Biometric verification session expired. Please try again.'
      });
    }

    if (biometricSession.status === 'failed') {
      logApplicationCreateDebug({
        userExists: Boolean(req.user),
        biometricSessionIdExists: true,
        biometricSessionStatus: biometricSession.status,
        biometricSessionCitizenMatches,
        applicationValidationErrorCode:
          APPLICATION_ERROR_CODES.BIOMETRIC_SESSION_NOT_PASSED
      });

      return res.status(400).json({
        success: false,
        code: APPLICATION_ERROR_CODES.BIOMETRIC_SESSION_NOT_PASSED,
        message: BIOMETRIC_FAILURE_MESSAGE
      });
    }

    if (biometricSession.status === 'used') {
      logApplicationCreateDebug({
        userExists: Boolean(req.user),
        biometricSessionIdExists: true,
        biometricSessionStatus: biometricSession.status,
        biometricSessionCitizenMatches,
        applicationValidationErrorCode:
          APPLICATION_ERROR_CODES.BIOMETRIC_SESSION_ALREADY_USED
      });

      return res.status(400).json({
        success: false,
        code: APPLICATION_ERROR_CODES.BIOMETRIC_SESSION_ALREADY_USED,
        message: 'Biometric verification session has already been used'
      });
    }

    if (biometricSession.usedAt) {
      logApplicationCreateDebug({
        userExists: Boolean(req.user),
        biometricSessionIdExists: true,
        biometricSessionStatus: biometricSession.status,
        biometricSessionCitizenMatches,
        applicationValidationErrorCode:
          APPLICATION_ERROR_CODES.BIOMETRIC_SESSION_ALREADY_USED
      });

      return res.status(400).json({
        success: false,
        code: APPLICATION_ERROR_CODES.BIOMETRIC_SESSION_ALREADY_USED,
        message: 'Biometric verification session has already been used'
      });
    }

    if (biometricSession.status !== 'passed') {
      logApplicationCreateDebug({
        userExists: Boolean(req.user),
        biometricSessionIdExists: true,
        biometricSessionStatus: biometricSession.status,
        biometricSessionCitizenMatches,
        applicationValidationErrorCode:
          APPLICATION_ERROR_CODES.BIOMETRIC_SESSION_NOT_PASSED
      });

      return res.status(400).json({
        success: false,
        code: APPLICATION_ERROR_CODES.BIOMETRIC_SESSION_NOT_PASSED,
        message: 'Application can be submitted only after biometric verification passes'
      });
    }

    const documentClaimedFields = buildClaimedFieldsFromApplicationPayload({
      birthRegistrationNumber,
      fullNameEnglish,
      fullNameBangla,
      fatherName,
      motherName,
      dateOfBirth,
      gender
    });

    const documentVerificationSession =
      normalizedApplicationType === 'new'
        ? await getBirthCertificateVerificationFromSession({
            token: birthCertificateVerificationToken,
            userId: req.user._id,
            claimedFields: documentClaimedFields,
            now
          })
        : null;

    const birthCertificateVerificationSnapshot = documentVerificationSession
      ? getVerificationSnapshot(documentVerificationSession.verification)
      : null;

    const submittedAt = new Date();

    const applicationPayload = {
      applicant: req.user._id,
      applicationId: generateApplicationId(),
      applicationType: normalizedApplicationType,
      fullNameEnglish,
      fullNameBangla,
      fatherName,
      motherName,
      spouseName,
      dateOfBirth,
      gender,
      bloodGroup: normalizeOptionalString(bloodGroup),
      maritalStatus,
      birthRegistrationNumber,
      existingNidNumber,
      jurisdiction: buildJurisdiction({ permanentAddress, presentAddress }),
      phone,
      email: normalizeOptionalString(email),
      occupation,
      presentAddress,
      permanentAddress,
      documents: {
        birthCertificate: documents?.birthCertificate || '',
        fatherNid: documents?.fatherNid || '',
        motherNid: documents?.motherNid || '',
        utilityBill: documents?.utilityBill || '',
        passport: documents?.passport || '',
        correctionProof: documents?.correctionProof || '',
        photo: documents?.photo || '',
        signature: documents?.signature || ''
      },
      documentAssets: documentVerificationSession
        ? {
            birthCertificate: {
              verification: birthCertificateVerificationSnapshot
            }
          }
        : undefined,
      documentVerificationSession: documentVerificationSession?._id || null,
      biometricVerification: {
        status: 'passed',
        sessionId: biometricSession.sessionId,
        provider: biometricSession.provider,
        livenessScore: biometricSession.livenessScore,
        faceMatchScore: biometricSession.faceMatchScore,
        livenessThreshold: biometricSession.livenessThreshold,
        faceMatchThreshold: biometricSession.faceMatchThreshold,
        challengePassed: biometricSession.challengePassed,
        singleFaceDetected: biometricSession.singleFaceDetected,
        failureReason: biometricSession.failureReason || '',
        verifiedAt: biometricSession.verifiedAt,
        deviceType: biometricSession.deviceType,
        qrFlow: biometricSession.qrFlow
      },
      status: 'submitted',
      submittedAt,
      statusHistory: [
        {
          fromStatus: 'draft',
          toStatus: 'submitted',
          note: 'Application submitted by citizen',
          changedAt: submittedAt,
          changedBy: req.user._id,
          changedByRole: req.user.role
        }
      ]
    };

    const applicationTypeRuleContext = await ensureApplicationTypeRules({
      req,
      userId: req.user._id,
      applicationType: normalizedApplicationType,
      applicationPayload,
      submittedAt,
      newNidEligibilityContext
    });

    if (normalizedApplicationType === 'correction') {
      applicationPayload.correctionInfo = buildCorrectionInfoPayload({
        req,
        issuedNewApplication: applicationTypeRuleContext?.issuedNewApplication,
        applicationPayload,
        documents: applicationPayload.documents
      });
    }

    const { application } = await createApplicationWithBiometricSession({
      biometricSession,
      documentVerificationSession,
      citizenId: req.user._id,
      applicationPayload,
      now
    });

    await createAuditLog({
      actor: req.user._id,
      actorRole: req.user.role,
      action: 'APPLICATION_CREATED',
      entityType: 'Application',
      entityId: application._id,
      message: `Citizen submitted application ${application.applicationId}`,
      meta: {
        applicationId: application.applicationId,
        applicationType: application.applicationType,
        biometricVerification: {
          sessionId: biometricSession.sessionId,
          provider: biometricSession.provider,
          verifiedAt: biometricSession.verifiedAt,
          deviceType: biometricSession.deviceType,
          qrFlow: biometricSession.qrFlow
        }
      }
    });

    if (application.resubmissionInfo?.isResubmission) {
      await createAuditLog({
        actor: req.user._id,
        actorRole: req.user.role,
        action: 'NEW_NID_RESUBMISSION_CREATED',
        entityType: 'Application',
        entityId: application._id,
        message: `Citizen resubmitted New NID application ${application.applicationId}`,
        meta: {
          applicationId: application.applicationId,
          previousApplicationId:
            application.resubmissionInfo.previousApplicationId,
          previousRejectedAt:
            application.resubmissionInfo.previousRejectedAt ||
            application.resubmissionInfo.rejectedAt ||
            null,
          rejectionReason:
            application.resubmissionInfo.previousRejectionReason ||
            application.resubmissionInfo.rejectionReason ||
            '',
          resubmissionCount: application.resubmissionInfo.resubmissionCount || 0
        }
      });
    }

    if (application.applicationType === 'correction') {
      await createAuditLog({
        actor: req.user._id,
        actorRole: req.user.role,
        action: 'APPLICATION_CORRECTION_REQUEST_CREATED',
        entityType: 'Application',
        entityId: application._id,
        message: `Citizen submitted correction request ${application.applicationId}`,
        meta: {
          applicationId: application.applicationId,
          baseApplicationId:
            application.correctionInfo?.baseApplicationId || '',
          requestedChanges:
            application.correctionInfo?.requestedChanges?.length || 0,
          proofStatus: application.correctionInfo?.proofStatus || 'not_uploaded'
        }
      });
    }

    await createAuditLog({
      actor: req.user._id,
      actorRole: req.user.role,
      action: 'APPLICATION_BIOMETRIC_VERIFIED',
      entityType: 'Application',
      entityId: application._id,
      message: `Biometric verification accepted for application ${application.applicationId}`,
      meta: {
        applicationId: application.applicationId,
        biometricSessionId: biometricSession.sessionId,
        provider: biometricSession.provider,
        deviceType: biometricSession.deviceType,
        qrFlow: biometricSession.qrFlow
      }
    });

    const applicationResponse =
      typeof application.toObject === 'function'
        ? application.toObject()
        : { ...application };
    delete applicationResponse.documentVerificationSession;

    return res.status(201).json({
      success: true,
      message: 'Application submitted successfully',
      application: applicationResponse
    });
  } catch (error) {
    if (error?.name === 'ValidationError') {
      logApplicationCreateDebug({
        userExists: Boolean(req.user),
        biometricSessionIdExists: Boolean(req.body?.biometricSessionId),
        applicationValidationErrorCode: APPLICATION_ERROR_CODES.VALIDATION_FAILED
      });

      return res.status(400).json({
        success: false,
        code: APPLICATION_ERROR_CODES.VALIDATION_FAILED,
        message:
          process.env.NODE_ENV === 'development'
            ? error.message
            : 'Application validation failed',
        errors: toSafeValidationErrors(error)
      });
    }

    const safeErrorCode = typeof error.code === 'string' ? error.code : '';

    logApplicationCreateDebug({
      userExists: Boolean(req.user),
      biometricSessionIdExists: Boolean(req.body?.biometricSessionId),
      applicationValidationErrorCode: safeErrorCode
    });

    return res.status(error.statusCode || 500).json({
      success: false,
      code: safeErrorCode,
      ...(error.details && typeof error.details === 'object'
        ? error.details
        : {}),
      message:
        error.statusCode && error.statusCode < 500
          ? error.message
          : 'Failed to create application'
    });
  }
};

const uploadApplicationDocument = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid application id'
      });
    }

    const { documentType } = req.params;

    if (!citizenDocumentFieldMap[documentType]) {
      return res.status(400).json({
        success: false,
        message: 'Invalid document type'
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Document file is required'
      });
    }

    const application = await Application.findOne({
      _id: req.params.id,
      applicant: req.user._id
    }).select('+documentVerificationSession');

    if (!application) {
      return res.status(404).json({
        success: false,
        message: 'Application not found'
      });
    }

    if (
      ['approved', 'printed', 'dispatched', 'delivered', 'cancelled'].includes(
        application.status
      )
    ) {
      return res.status(400).json({
        success: false,
        message: `Documents cannot be updated when status is '${application.status}'`
      });
    }

    let birthCertificateVerification =
      application.documentAssets?.birthCertificate?.verification || null;

    if (
      documentType === 'birthCertificate' &&
      application.applicationType === 'new'
    ) {
      const hasPassedVerification =
        birthCertificateVerification?.status === 'passed';

      if (hasPassedVerification && application.documentVerificationSession) {
        const verificationSession = await DocumentVerificationSession.findById(
          application.documentVerificationSession
        ).select('+documentHash');

        const uploadedDocumentHash = hashFileBuffer(req.file.buffer);

        if (
          verificationSession?.documentHash &&
          verificationSession.documentHash !== uploadedDocumentHash
        ) {
          return res.status(422).json({
            success: false,
            code: DOCUMENT_VERIFICATION_ERROR_CODES.MISMATCH,
            status: 'mismatch',
            canSubmit: false,
            message:
              'Uploaded birth certificate does not match the verified document. Please upload the same verified document.'
          });
        }
      }

      if (!hasPassedVerification) {
        const claimedFields = buildClaimedFieldsFromApplicationPayload(
          application
        );
        const ocrResult = await verifyBirthCertificate({
          birthCertificateFile: req.file,
          claimedFields
        });
        const verification = getVerificationSnapshot(ocrResult.verification);

        const verificationSession =
          await createDocumentVerificationSessionRecord({
            req,
            verification,
            birthCertificateFile: req.file,
            claimedFields
          });

        await auditDocumentVerification({
          req,
          session: verificationSession,
          verification,
          available: ocrResult.available
        });

        if (!ocrResult.available) {
          return res.status(503).json({
            success: false,
            code: getDocumentVerificationUnavailableCode(ocrResult),
            status: 'unavailable',
            canSubmit: false,
            failureReason: ocrResult.unavailableReason || 'service_unavailable',
            verification,
            message: buildDocumentVerificationUnavailableMessage(ocrResult)
          });
        }

        if (verification.status !== 'passed') {
          return res.status(422).json({
            success: false,
            code: getDocumentVerificationResponseCode(
              verification.status,
              verification.failureReason
            ),
            status: verification.status,
            canSubmit: false,
            verification,
            message: buildDocumentVerificationMessage(
              verification.status,
              verification.failureReason
            )
          });
        }

        birthCertificateVerification = verification;
        application.documentVerificationSession = verificationSession._id;
      }
    }

    const uploadResult = await uploadApplicationDocumentToCloudinary({
      fileBuffer: req.file.buffer,
      applicationId: application.applicationId,
      citizenId: req.user._id,
      documentType
    });

    const existingDocument = application.documentAssets?.[documentType] || {};
    const existingHistory = Array.isArray(existingDocument.history)
      ? [...existingDocument.history]
      : [];

    const historyAction =
      existingDocument?.cloudinary?.publicId ? 'replaced' : 'uploaded';

    application.set(
      `documents.${citizenDocumentFieldMap[documentType]}`,
      req.file.originalname
    );

    const nextDocumentAsset = {
      status: 'uploaded',
      cloudinary: {
        assetId: uploadResult.assetId,
        publicId: uploadResult.publicId,
        version: uploadResult.version,
        secureUrl: uploadResult.secureUrl,
        resourceType: uploadResult.resourceType,
        format: uploadResult.format,
        bytes: uploadResult.bytes,
        width: uploadResult.width,
        height: uploadResult.height,
        originalFilename: uploadResult.originalFilename || req.file.originalname,
        folder: uploadResult.folder,
        etag: uploadResult.etag,
        createdAt: uploadResult.createdAt
      },
      uploadedAt: new Date(),
      uploadedBy: req.user._id,
      verifiedAt: null,
      verifiedBy: null,
      rejectionReason: '',
      history: [
        ...existingHistory,
        {
          action: historyAction,
          actor: req.user._id,
          actorRole: req.user.role,
          note:
            historyAction === 'uploaded'
              ? `${documentType} uploaded by citizen`
              : `${documentType} replaced by citizen`,
          publicId: uploadResult.publicId,
          secureUrl: uploadResult.secureUrl,
          occurredAt: new Date()
        }
      ]
    };

    if (documentType === 'birthCertificate') {
      nextDocumentAsset.verification =
        birthCertificateVerification?.status === 'passed'
          ? birthCertificateVerification
          : application.documentAssets?.birthCertificate?.verification || {};
    }

    application.set(`documentAssets.${documentType}`, nextDocumentAsset);

    if (
      documentType === 'correctionProof' &&
      application.applicationType === 'correction'
    ) {
      application.set('correctionInfo.proofStatus', 'uploaded');
    }

    const updatedApplication = await application.save();

    await createAuditLog({
      actor: req.user._id,
      actorRole: req.user.role,
      action:
        historyAction === 'uploaded'
          ? 'APPLICATION_DOCUMENT_UPLOADED'
          : 'APPLICATION_DOCUMENT_REPLACED',
      entityType: 'Application',
      entityId: updatedApplication._id,
      message: `${documentType} ${historyAction} for ${updatedApplication.applicationId}`,
      meta: {
        applicationId: updatedApplication.applicationId,
        documentType,
        publicId: uploadResult.publicId,
        secureUrl: uploadResult.secureUrl,
        bytes: uploadResult.bytes,
        format: uploadResult.format
      }
    });

    return res.status(200).json({
      success: true,
      message:
        historyAction === 'uploaded'
          ? 'Document uploaded successfully'
          : 'Document replaced successfully',
      data: {
        applicationId: updatedApplication.applicationId,
        documentType,
        document: updatedApplication.documentAssets[documentType]
      }
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

const getMyApplications = async (req, res) => {
  try {
    const applications = await Application.find({ applicant: req.user._id }).sort({
      createdAt: -1
    });

    return res.status(200).json({
      success: true,
      count: applications.length,
      applications
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

const getSingleApplication = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid application id'
      });
    }

    const application = await Application.findOne({
      _id: req.params.id,
      applicant: req.user._id
    });

    if (!application) {
      return res.status(404).json({
        success: false,
        message: 'Application not found'
      });
    }

    return res.status(200).json({
      success: true,
      application
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

const updateApplication = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid application id'
      });
    }

    const application = await Application.findOne({
      _id: req.params.id,
      applicant: req.user._id
    });

    if (!application) {
      return res.status(404).json({
        success: false,
        message: 'Application not found'
      });
    }

    if (
      ['approved', 'rejected', 'printed', 'dispatched', 'delivered', 'cancelled'].includes(
        application.status
      )
    ) {
      return res.status(400).json({
        success: false,
        message: `Application cannot be updated when status is '${application.status}'`
      });
    }

    const allowedFields = [
      'applicationType',
      'fullNameEnglish',
      'fullNameBangla',
      'fatherName',
      'motherName',
      'spouseName',
      'dateOfBirth',
      'gender',
      'bloodGroup',
      'maritalStatus',
      'birthRegistrationNumber',
      'existingNidNumber',
      'phone',
      'email',
      'occupation',
      'presentAddress',
      'permanentAddress',
      'documents'
    ];

    const originalApplicationType = application.applicationType;
    const originalBirthCertificateVerificationStatus =
      application.documentAssets?.birthCertificate?.verification?.status || '';

    const changedFields = buildChangedFields(application, req.body, allowedFields);

    if (changedFields.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No valid application changes were provided'
      });
    }

    const changesDocumentVerifiedFields =
      originalApplicationType === 'new' &&
      originalBirthCertificateVerificationStatus === 'passed' &&
      changedFields.some((field) =>
        DOCUMENT_VERIFIED_LOCKED_FIELDS.includes(field)
      );

    if (changesDocumentVerifiedFields) {
      return res.status(409).json({
        success: false,
        code: APPLICATION_ERROR_CODES.BIRTH_CERTIFICATE_VERIFICATION_REQUIRED,
        message:
          'Document-verified application fields cannot be changed after birth certificate verification.'
      });
    }

    const updatedApplication = await application.save();

    await createAuditLog({
      actor: req.user._id,
      actorRole: req.user.role,
      action: 'APPLICATION_UPDATED',
      entityType: 'Application',
      entityId: updatedApplication._id,
      message: `Citizen updated application ${updatedApplication.applicationId}`,
      meta: {
        applicationId: updatedApplication.applicationId,
        changedFields
      }
    });

    return res.status(200).json({
      success: true,
      message: 'Application updated successfully',
      application: updatedApplication,
      changedFields
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

const cancelApplication = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid application id'
      });
    }

    const application = await Application.findOne({
      _id: req.params.id,
      applicant: req.user._id
    });

    if (!application) {
      return res.status(404).json({
        success: false,
        message: 'Application not found'
      });
    }

    if (
      ['approved', 'printed', 'dispatched', 'delivered', 'cancelled'].includes(
        application.status
      )
    ) {
      return res.status(400).json({
        success: false,
        message: `Application cannot be cancelled when status is '${application.status}'`
      });
    }

    const previousStatus = application.status;

    application.status = 'cancelled';
    application.cancelledAt = new Date();

    pushApplicationStatusHistory({
      application,
      fromStatus: previousStatus,
      toStatus: 'cancelled',
      note: 'Application cancelled by citizen',
      changedBy: req.user._id,
      changedByRole: req.user.role
    });

    const cancelledApplication = await application.save();

    await createAuditLog({
      actor: req.user._id,
      actorRole: req.user.role,
      action: 'APPLICATION_CANCELLED',
      entityType: 'Application',
      entityId: cancelledApplication._id,
      message: `Citizen cancelled application ${cancelledApplication.applicationId}`,
      meta: {
        applicationId: cancelledApplication.applicationId,
        fromStatus: previousStatus,
        toStatus: 'cancelled'
      }
    });

    return res.status(200).json({
      success: true,
      message: 'Application cancelled successfully',
      application: cancelledApplication
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

const getAllApplicationsForAdmin = async (req, res) => {
  try {
    const filter = {};

    if (req.query.status) {
      filter.status = req.query.status;
    }

    if (req.query.applicationType) {
      filter.applicationType = req.query.applicationType;
    }

    const scopedFilter = applyAdminJurisdictionFilter(req, filter);

    const applications = await Application.find(scopedFilter)
      .populate('applicant', 'fullName email phone role')
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: applications.length,
      applications
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

const getSingleApplicationForAdmin = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid application id'
      });
    }

    const application = await Application.findById(req.params.id).populate(
      'applicant',
      'fullName email phone role isVerified status createdAt'
    );

    if (!application) {
      return res.status(404).json({
        success: false,
        message: 'Application not found'
      });
    }

    if (!canAccessApplicationByJurisdiction(req, application)) {
      return res.status(403).json({
        success: false,
        message: 'You do not have access to this application jurisdiction'
      });
    }

    return res.status(200).json({
      success: true,
      application
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

const reviewApplicationByAdmin = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid application id'
      });
    }

    const { status, rejectionReason } = req.body;
    const allowedStatuses = ['under_review', 'approved', 'rejected'];

    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid review status'
      });
    }

    const application = await Application.findById(req.params.id);

    if (!application) {
      return res.status(404).json({
        success: false,
        message: 'Application not found'
      });
    }

    if (!canAccessApplicationByJurisdiction(req, application)) {
      return res.status(403).json({
        success: false,
        message: 'You do not have access to this application jurisdiction'
      });
    }

    if (['cancelled', 'printed', 'dispatched', 'delivered'].includes(application.status)) {
      return res.status(400).json({
        success: false,
        message: `Application cannot be reviewed when status is '${application.status}'`
      });
    }

    const previousStatus = application.status;
    application.status = status;

    if (status === 'approved') {
      application.approvedAt = new Date();
      application.rejectionReason = '';
    }

    if (status === 'rejected') {
      if (!rejectionReason || !rejectionReason.trim()) {
        return res.status(400).json({
          success: false,
          message: 'Rejection reason is required when rejecting an application'
        });
      }

      application.rejectionReason = rejectionReason.trim();
      application.approvedAt = null;
    }

    if (status === 'under_review') {
      application.rejectionReason = '';
      application.approvedAt = null;
    }

    pushApplicationStatusHistory({
      application,
      fromStatus: previousStatus,
      toStatus: status,
      note:
        status === 'rejected'
          ? `Application rejected: ${application.rejectionReason}`
          : `Application moved to ${status} by admin`,
      changedBy: req.user._id,
      changedByRole: req.user.role
    });

    const reviewedApplication = await application.save();

    await createAuditLog({
      actor: req.user._id,
      actorRole: req.user.role,
      action: 'APPLICATION_REVIEW_UPDATED',
      entityType: 'Application',
      entityId: reviewedApplication._id,
      message: `Application ${reviewedApplication.applicationId} moved to ${status}`,
      meta: {
        applicationId: reviewedApplication.applicationId,
        fromStatus: previousStatus,
        toStatus: status,
        rejectionReason: status === 'rejected' ? application.rejectionReason : ''
      }
    });

    return res.status(200).json({
      success: true,
      message: `Application ${status} successfully`,
      application: reviewedApplication
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

const getAdminDashboardStats = async (req, res) => {
  try {
    const scopeFilter = (extra = {}) =>
      applyAdminJurisdictionFilter(req, extra);

    const [
      totalApplications,
      submittedCount,
      underReviewCount,
      approvedCount,
      rejectedCount,
      cancelledCount,
      printedCount,
      dispatchedCount,
      deliveredCount,
      newCount,
      correctionCount,
      reissueCount,
      recentApplications
    ] = await Promise.all([
      Application.countDocuments(scopeFilter()),
      Application.countDocuments(scopeFilter({ status: 'submitted' })),
      Application.countDocuments(scopeFilter({ status: 'under_review' })),
      Application.countDocuments(scopeFilter({ status: 'approved' })),
      Application.countDocuments(scopeFilter({ status: 'rejected' })),
      Application.countDocuments(scopeFilter({ status: 'cancelled' })),
      Application.countDocuments(scopeFilter({ status: 'printed' })),
      Application.countDocuments(scopeFilter({ status: 'dispatched' })),
      Application.countDocuments(scopeFilter({ status: 'delivered' })),
      Application.countDocuments(scopeFilter({ applicationType: 'new' })),
      Application.countDocuments(scopeFilter({ applicationType: 'correction' })),
      Application.countDocuments(scopeFilter({ applicationType: 'reissue' })),
      Application.find(scopeFilter())
        .populate('applicant', 'fullName email phone role')
        .sort({ createdAt: -1 })
        .limit(5)
    ]);

    return res.status(200).json({
      success: true,
      stats: {
        totalApplications,
        byStatus: {
          submitted: submittedCount,
          under_review: underReviewCount,
          approved: approvedCount,
          rejected: rejectedCount,
          cancelled: cancelledCount,
          printed: printedCount,
          dispatched: dispatchedCount,
          delivered: deliveredCount
        },
        byType: {
          new: newCount,
          correction: correctionCount,
          reissue: reissueCount
        }
      },
      recentApplications
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

const getApplicationPrefill = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).lean();

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    let birthCertificate = null;

    if (user.birthRegNumber) {
      const db = mongoose.connection.db;
      const collection = db.collection('birthcertificates');

      birthCertificate = await collection.findOne({
        $or: [
          { birthRegNumber: user.birthRegNumber },
          { birthRegistrationNumber: user.birthRegNumber }
        ]
      });
    }

    const prefill = {
      fullNameEnglish: birthCertificate?.fullName || user.fullName || '',
      fullNameBangla: birthCertificate?.fullNameBangla || user.fullNameBangla || '',
      fatherName: birthCertificate?.fatherName || '',
      motherName: birthCertificate?.motherName || '',
      placeOfBirth: birthCertificate?.placeOfBirth || user.placeOfBirth || '',
      dateOfBirth: birthCertificate?.dateOfBirth
        ? new Date(birthCertificate.dateOfBirth).toISOString().split('T')[0]
        : user.dateOfBirth
          ? new Date(user.dateOfBirth).toISOString().split('T')[0]
          : '',
      gender: birthCertificate?.gender || user.gender || '',
      birthRegistrationNumber:
        birthCertificate?.birthRegNumber ||
        birthCertificate?.birthRegistrationNumber ||
        user.birthRegNumber ||
        '',
      phone: user.phone || '',
      email: user.email || '',
      presentAddress: {
        division: user.presentAddress?.division || '',
        district: user.presentAddress?.district || '',
        upazila: user.presentAddress?.upazila || '',
        unionOrWard: user.presentAddress?.union || '',
        villageOrArea: user.presentAddress?.village || '',
        postOffice: '',
        postalCode: user.presentAddress?.postCode || ''
      },
      permanentAddress: {
        division: user.permanentAddress?.division || '',
        district: user.permanentAddress?.district || '',
        upazila: user.permanentAddress?.upazila || '',
        unionOrWard: user.permanentAddress?.union || '',
        villageOrArea: user.permanentAddress?.village || '',
        postOffice: '',
        postalCode: user.permanentAddress?.postCode || ''
      }
    };

    return res.status(200).json({
      success: true,
      prefill
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

module.exports = {
  createApplication,
  verifyBirthCertificateDocument,
  getApplicationEligibility,
  uploadApplicationDocument,
  getMyApplications,
  getSingleApplication,
  updateApplication,
  cancelApplication,
  getAllApplicationsForAdmin,
  getSingleApplicationForAdmin,
  reviewApplicationByAdmin,
  getAdminDashboardStats,
  getApplicationPrefill
};
