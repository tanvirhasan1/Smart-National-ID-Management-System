const User = require('../models/User');
const mongoose = require('mongoose');
const { randomUUID } = require('crypto');
const { validationResult } = require('express-validator');
const Application = require('../models/Application');
const Appointment = require('../models/Appointment');
const CorrectionApplication = require('../models/CorrectionApplication');
const DocumentVerificationSession = require('../models/DocumentVerificationSession');
const BiometricVerificationSession = require('../models/BiometricVerificationSession');
const { createAuditLog } = require('../utils/auditLogger');
const uploadApplicationDocumentToCloudinary = require('../utils/uploadApplicationDocumentToCloudinary');
const DeliveryRequest = require('../models/DeliveryRequest');
const { verifyBirthCertificate } = require('../utils/documentOcrServiceClient');
const {
  normalizeClaimedBirthCertificateFields,
  buildClaimedFieldsFromApplicationPayload,
  hashFileBuffer,
  hashClaimedFields,
  generateVerificationToken,
  hashVerificationToken,
  getDocumentVerificationTtlMinutes
} = require('../utils/documentVerification');
const {
  ACTIVE_NEW_NID_STATUSES,
  NEW_NID_BLOCKING_STATUSES,
  canViewDigitalNid,
  isCorrectionEligibleApplication,
  canBookBiometricAppointment,
  isNewNidBlockingApplication
} = require('../utils/applicationLifecycle');

const generateApplicationId = () => {
  const shortId = randomUUID().split('-')[0].toUpperCase();
  return `APP-${Date.now()}-${shortId}`;
};

const citizenDocumentFieldMap = {
  photograph: 'photo',
  signature: 'signature',
  birthCertificate: 'birthCertificate'
};

const DEFAULT_DELIVERY_FEE = 80;

const mapDeliveryRequestToDeliveryInfo = (deliveryRequest) => {
  if (!deliveryRequest) {
    return {
      requested: false,
      requestedAt: null,
      deliveryFee: DEFAULT_DELIVERY_FEE,
      paymentStatus: 'pending',
      paymentMethod: 'bkash',
      transactionId: '',
      paymentCompletedAt: null,
      deliveryAddress: '',
      contactPhone: '',
      note: '',
      deliveryStatus: 'not_requested',
      history: []
    };
  }

  return {
    requested: Boolean(deliveryRequest.delivery?.requested),
    requestedAt: deliveryRequest.delivery?.requestedAt || null,
    deliveryFee: deliveryRequest.payment?.amount || DEFAULT_DELIVERY_FEE,
    paymentStatus: deliveryRequest.payment?.status || 'pending',
    paymentMethod: deliveryRequest.payment?.method || 'bkash',
    transactionId: deliveryRequest.payment?.transactionId || '',
    paymentCompletedAt: deliveryRequest.payment?.completedAt || null,
    deliveryAddress: deliveryRequest.delivery?.address || '',
    contactPhone: deliveryRequest.delivery?.contactPhone || '',
    note: deliveryRequest.delivery?.note || '',
    deliveryStatus: deliveryRequest.delivery?.status || 'not_requested',
    history: deliveryRequest.history || []
  };
};

const mapAppointmentToSummary = (appointment) => {
  if (!appointment) return null;

  return {
    appointmentId: appointment._id,
    status: appointment.status,
    appointmentStatus: appointment.status,
    appointmentDate: appointment.appointmentDate,
    appointmentDateKey: appointment.appointmentDateKey,
    timeSlot: appointment.timeSlot,
    timeSlotStart: appointment.timeSlotStart,
    timeSlotEnd: appointment.timeSlotEnd,
    slotSerial: appointment.slotSerial,
    centerName: appointment.centerName,
    centerDistrict: appointment.centerDistrict,
    bookedAt: appointment.bookedAt || appointment.createdAt || null,
    completedAt: appointment.completedAt || null,
    cancelledAt: appointment.cancelledAt || null,
    createdAt: appointment.createdAt || null,
    updatedAt: appointment.updatedAt || null
  };
};

const attachDeliveryInfoToApplications = async (applications = []) => {
  const plainApplications = applications.map((application) =>
    application?.toObject ? application.toObject() : application
  );

  const applicationIds = plainApplications
    .map((application) => application?._id)
    .filter(Boolean);

  if (applicationIds.length === 0) {
    return plainApplications;
  }

  const [deliveryRequests, appointments] = await Promise.all([
    DeliveryRequest.find({
      application: { $in: applicationIds }
    }).lean(),
    Appointment.find({
      application: { $in: applicationIds },
      status: { $in: ['booked', 'completed'] }
    })
      .sort({ updatedAt: -1, createdAt: -1 })
      .lean()
  ]);

  const deliveryRequestMap = new Map(
    deliveryRequests.map((deliveryRequest) => [
      String(deliveryRequest.application),
      deliveryRequest
    ])
  );

  const appointmentMap = new Map();

  appointments.forEach((appointment) => {
    const applicationId = String(appointment.application);

    if (!appointmentMap.has(applicationId)) {
      appointmentMap.set(applicationId, appointment);
    }
  });

  return plainApplications.map((application) => {
    const appointment = mapAppointmentToSummary(
      appointmentMap.get(String(application._id))
    );
    const appointmentEligible = canBookBiometricAppointment(application) && !appointment;

    return {
      ...application,
      appointment,
      latestAppointment: appointment,
      deliveryInfo: mapDeliveryRequestToDeliveryInfo(
        deliveryRequestMap.get(String(application._id))
      ),
      lifecycle: {
        digitalNidAvailable: canViewDigitalNid(application),
        correctionEligible: isCorrectionEligibleApplication(application),
        appointmentEligible,
        appointment
      },
      digitalNidAvailable: canViewDigitalNid(application),
      correctionEligible: isCorrectionEligibleApplication(application),
      appointmentEligible
    };
  });
};

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

  currentHistory.push({
    fromStatus,
    toStatus,
    note,
    changedAt: new Date(),
    changedBy,
    changedByRole
  });

  application.statusHistory = currentHistory;
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

const isEnabled = (value) =>
  value === true || String(value || '').trim().toLowerCase() === 'true';

const isNewApplicationType = (applicationType) =>
  String(applicationType || 'new').toLowerCase() === 'new';

const parseJsonObjectField = (value, fieldName) => {
  if (value === undefined || value === null || value === '') {
    return {};
  }

  if (typeof value === 'object' && !Array.isArray(value)) {
    return value;
  }

  try {
    const parsed = JSON.parse(value);

    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      throw new Error(`${fieldName} must be a JSON object`);
    }

    return parsed;
  } catch (error) {
    const parseError = new Error(`${fieldName} must be a valid JSON object`);
    parseError.statusCode = 400;
    parseError.code = 'INVALID_CLAIMED_FIELDS';
    throw parseError;
  }
};

const getDocumentVerificationFailurePayload = (verification = {}) => {
  const status = verification.status || 'failed';
  const fallbackMessage =
    verification.message || 'Birth certificate verification failed';
  const statusMap = {
    mismatch: {
      code: 'DOCUMENT_VERIFICATION_MISMATCH',
      message: 'Birth certificate information does not match your provided information.'
    },
    not_found: {
      code: 'REGISTRY_RECORD_NOT_FOUND',
      message: 'Birth registration record could not be found.'
    },
    unreadable: {
      code: 'DOCUMENT_UNREADABLE',
      message: 'The document could not be read clearly. Please upload a clearer image.'
    },
    low_confidence: {
      code: 'DOCUMENT_LOW_CONFIDENCE',
      message:
        'The document text could not be verified confidently. Please upload a clearer image.'
    },
    failed: {
      code: 'DOCUMENT_VERIFICATION_FAILED',
      message: fallbackMessage
    }
  };

  return statusMap[status] || statusMap.failed;
};

const OCR_BACKEND_VERIFICATION_FIELDS = [
  'birthRegistrationNumber',
  'fullNameEnglish',
  'fullNameBangla',
  'dateOfBirth',
  'gender',
  'fatherName',
  'motherName'
];

const normalizeOcrComparableText = (value) =>
  String(value ?? '')
    .normalize('NFKC')
    .replace(/\u09af\u09bc/g, '\u09df')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();

const normalizeOcrBirthNumber = (value) =>
  String(value ?? '').replace(/\D/g, '').trim();

const normalizeOcrDate = (value) => {
  const rawValue = String(value ?? '').trim();

  if (!rawValue) {
    return '';
  }

  const dateOnlyMatch = rawValue.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/);
  if (dateOnlyMatch) {
    return `${dateOnlyMatch[1]}-${String(dateOnlyMatch[2]).padStart(2, '0')}-${String(dateOnlyMatch[3]).padStart(2, '0')}`;
  }

  const dayFirstMatch = rawValue.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})$/);
  if (dayFirstMatch) {
    return `${dayFirstMatch[3]}-${String(dayFirstMatch[2]).padStart(2, '0')}-${String(dayFirstMatch[1]).padStart(2, '0')}`;
  }

  const parsedDate = new Date(rawValue);
  if (Number.isNaN(parsedDate.getTime())) {
    return normalizeOcrComparableText(rawValue);
  }

  return parsedDate.toISOString().slice(0, 10);
};

const normalizeOcrGender = (value) => {
  const normalized = normalizeOcrComparableText(value);

  if (['m', 'male', 'পুরুষ'].includes(normalized)) {
    return 'male';
  }

  if (['f', 'female', 'নারী', 'মহিলা'].includes(normalized)) {
    return 'female';
  }

  return normalized;
};

const normalizeOcrFieldValue = (field, value) => {
  if (field === 'birthRegistrationNumber') {
    return normalizeOcrBirthNumber(value);
  }

  if (field === 'dateOfBirth') {
    return normalizeOcrDate(value);
  }

  if (field === 'gender') {
    return normalizeOcrGender(value);
  }

  return normalizeOcrComparableText(value);
};

const getExtractedBirthCertificateValue = (extractedFields = {}, field) => {
  if (field === 'birthRegistrationNumber') {
    return (
      extractedFields.birthRegistrationNumber ||
      extractedFields.birthCertificateNumber ||
      extractedFields.birth_registration_number ||
      extractedFields.birth_certificate_number ||
      ''
    );
  }

  return extractedFields[field] || '';
};

const buildBackendOcrComparison = ({ field, claimedFields, extractedFields }) => {
  const submittedRaw = claimedFields[field] ?? '';
  const extractedRaw = getExtractedBirthCertificateValue(extractedFields, field);
  const submitted = normalizeOcrFieldValue(field, submittedRaw);
  const extracted = normalizeOcrFieldValue(field, extractedRaw);

  if (!submitted) {
    return {
      field,
      submittedValue: String(submittedRaw ?? '').trim(),
      extractedValue: String(extractedRaw ?? '').trim(),
      matched: true,
      confidence: 1,
      note: 'optional_field_not_submitted'
    };
  }

  if (!extracted) {
    return {
      field,
      submittedValue: String(submittedRaw ?? '').trim(),
      extractedValue: '',
      matched: false,
      confidence: 0,
      note: 'not_extracted'
    };
  }

  const matched = submitted === extracted;

  return {
    field,
    submittedValue: String(submittedRaw ?? '').trim(),
    extractedValue: String(extractedRaw ?? '').trim(),
    matched,
    confidence: matched ? 1 : 0,
    note: matched ? '' : 'field_mismatch'
  };
};

const verifyOcrExtractedFieldsAgainstApplication = ({ claimedFields, verification = {} }) => {
  const extractedFields = verification.extractedFields || {};
  const fieldComparisons = OCR_BACKEND_VERIFICATION_FIELDS
    .map((field) =>
      buildBackendOcrComparison({
        field,
        claimedFields,
        extractedFields
      })
    )
    .filter((item) => item.submittedValue || item.extractedValue);

  const missingFields = fieldComparisons.filter(
    (item) => !item.matched && item.note === 'not_extracted'
  );
  const mismatchedFields = fieldComparisons.filter(
    (item) => !item.matched && item.note !== 'not_extracted'
  );

  if (missingFields.length > 0) {
    return {
      ...verification,
      status: 'low_confidence',
      message: 'Required certificate fields could not be extracted. Please upload a clearer image.',
      fieldComparisons,
      failureReason: 'CRITICAL_FIELD_MISSING',
      blocksSubmission: true
    };
  }

  if (mismatchedFields.length > 0) {
    return {
      ...verification,
      status: 'mismatch',
      message: 'Birth certificate information does not match your provided information.',
      fieldComparisons,
      failureReason: 'FIELD_MISMATCH',
      blocksSubmission: true
    };
  }

  return {
    ...verification,
    status: 'passed',
    message: 'Birth certificate OCR data matched submitted application information.',
    fieldComparisons,
    failureReason: '',
    blocksSubmission: false
  };
};

const buildApiError = ({ status = 400, code, message }) => ({
  isApiError: true,
  status,
  code,
  message
});

const findExistingNewNidApplication = (citizenId) =>
  Application.findOne({
    applicant: citizenId,
    applicationType: 'new',
    status: { $in: NEW_NID_BLOCKING_STATUSES }
  })
    .sort({ createdAt: -1 })
    .lean();

const validateBirthCertificateVerificationToken = async ({ req, payload }) => {
  const documentOcrEnabled = isEnabled(process.env.DOCUMENT_OCR_ENABLED);
  const verificationToken = String(
    payload.birthCertificateVerificationToken || payload.verificationToken || ''
  ).trim();

  if (!documentOcrEnabled && !verificationToken) {
    return null;
  }

  if (!verificationToken) {
    throw buildApiError({
      code: 'BIRTH_CERTIFICATE_VERIFICATION_REQUIRED',
      message: 'Birth certificate verification is required before New NID submission.'
    });
  }

  const tokenHash = hashVerificationToken(verificationToken);
  const claimedFields = buildClaimedFieldsFromApplicationPayload(payload);
  const claimedFieldsHash = hashClaimedFields(claimedFields);
  const verificationSession = await DocumentVerificationSession.findOne({
    tokenHash,
    user: req.user._id
  });

  if (!verificationSession) {
    throw buildApiError({
      code: 'BIRTH_CERTIFICATE_VERIFICATION_REQUIRED',
      message: 'Birth certificate verification was not found. Please verify again.'
    });
  }

  if (verificationSession.usedAt) {
    throw buildApiError({
      code: 'BIRTH_CERTIFICATE_VERIFICATION_ALREADY_USED',
      message: 'Birth certificate verification was already used. Please verify again.'
    });
  }

  if (verificationSession.expiresAt.getTime() <= Date.now()) {
    throw buildApiError({
      code: 'BIRTH_CERTIFICATE_VERIFICATION_EXPIRED',
      message: 'Birth certificate verification expired. Please verify again.'
    });
  }

  if (verificationSession.status !== 'passed') {
    const failurePayload = getDocumentVerificationFailurePayload(
      verificationSession.verification
    );

    throw buildApiError({
      code: failurePayload.code,
      message: failurePayload.message
    });
  }

  if (verificationSession.claimedFieldsHash !== claimedFieldsHash) {
    throw buildApiError({
      code: 'BIRTH_CERTIFICATE_VERIFICATION_FIELD_CHANGED',
      message:
        'Application information changed after document verification. Please verify again.'
    });
  }

  return verificationSession;
};

const validateBiometricSession = async ({ req, payload }) => {
  const biometricSessionId = String(payload.biometricSessionId || '').trim();

  if (!biometricSessionId) {
    throw buildApiError({
      code: 'APPLICATION_BIOMETRIC_SESSION_REQUIRED',
      message: 'Face verification is required before application submission.'
    });
  }

  const biometricSession = await BiometricVerificationSession.findOne({
    sessionId: biometricSessionId
  });

  if (!biometricSession) {
    throw buildApiError({
      status: 404,
      code: 'APPLICATION_BIOMETRIC_SESSION_NOT_FOUND',
      message: 'Face verification session was not found. Please restart verification.'
    });
  }

  if (String(biometricSession.citizen) !== String(req.user._id)) {
    throw buildApiError({
      status: 403,
      code: 'APPLICATION_BIOMETRIC_OWNER_MISMATCH',
      message: 'Face verification session does not belong to this citizen.'
    });
  }

  if (biometricSession.usedAt || biometricSession.status === 'used') {
    throw buildApiError({
      code: 'APPLICATION_BIOMETRIC_SESSION_ALREADY_USED',
      message: 'Face verification session has already been used. Please restart verification.'
    });
  }

  if (
    biometricSession.status === 'expired' ||
    biometricSession.expiresAt.getTime() <= Date.now()
  ) {
    throw buildApiError({
      code: 'APPLICATION_BIOMETRIC_SESSION_EXPIRED',
      message: 'Face verification session expired. Please restart verification.'
    });
  }

  if (biometricSession.status !== 'passed') {
    throw buildApiError({
      code: 'APPLICATION_BIOMETRIC_SESSION_NOT_PASSED',
      message: 'Application can be submitted only after face verification passes.'
    });
  }

  return biometricSession;
};

const validateNewApplicationPrerequisites = async ({ req, payload }) => {
  const existingNewApplication = await findExistingNewNidApplication(req.user._id);

  if (existingNewApplication) {
    const hasIssuedNid = isCorrectionEligibleApplication(existingNewApplication);

    throw buildApiError({
      code: hasIssuedNid
        ? 'NEW_NID_ALREADY_APPROVED'
        : 'NEW_NID_ACTIVE_APPLICATION_EXISTS',
      message: hasIssuedNid
        ? 'You already have a New NID record. Please use Correction if you need changes.'
        : `You already have an active New NID application (#${
            existingNewApplication.applicationId || existingNewApplication._id
          }).`
    });
  }

  const [documentVerificationSession, biometricSession] = await Promise.all([
    validateBirthCertificateVerificationToken({ req, payload }),
    validateBiometricSession({ req, payload })
  ]);

  return {
    documentVerificationSession,
    biometricSession
  };
};

const consumeNewApplicationPrerequisites = async ({
  req,
  documentVerificationSession,
  biometricSession
}) => {
  const consumedAt = new Date();

  if (documentVerificationSession) {
    const consumedDocumentSession =
      await DocumentVerificationSession.findOneAndUpdate(
        {
          _id: documentVerificationSession._id,
          user: req.user._id,
          status: 'passed',
          usedAt: null,
          expiresAt: { $gt: consumedAt }
        },
        {
          $set: {
            usedAt: consumedAt
          }
        },
        { new: true }
      );

    if (!consumedDocumentSession) {
      throw buildApiError({
        status: 409,
        code: 'BIRTH_CERTIFICATE_VERIFICATION_ALREADY_USED',
        message: 'Birth certificate verification is no longer available. Please verify again.'
      });
    }
  }

  const consumedBiometricSession = await BiometricVerificationSession.findOneAndUpdate(
    {
      _id: biometricSession._id,
      citizen: req.user._id,
      status: 'passed',
      usedAt: null,
      expiresAt: { $gt: consumedAt }
    },
    {
      $set: {
        status: 'used',
        usedAt: consumedAt
      }
    },
    { new: true }
  );

  if (!consumedBiometricSession) {
    throw buildApiError({
      status: 409,
      code: 'APPLICATION_BIOMETRIC_SESSION_ALREADY_USED',
      message: 'Face verification session is no longer available. Please restart verification.'
    });
  }
};

const deleteApplicationQuietly = async (application) => {
  if (!application?._id) {
    return;
  }

  try {
    await Application.deleteOne({ _id: application._id });
  } catch (error) {
    // Leave the original response path intact; operational logs can surface cleanup failures.
  }
};

const verifyBirthCertificateDocument = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        code: 'BIRTH_CERTIFICATE_FILE_REQUIRED',
        message: 'Birth certificate file is required'
      });
    }

    const rawClaimedFields = parseJsonObjectField(
      req.body.claimedFields ?? req.body.claimed_fields,
      'claimedFields'
    );
    const claimedFields =
      normalizeClaimedBirthCertificateFields(rawClaimedFields);
    const ocrResult = await verifyBirthCertificate({
      birthCertificateFile: req.file,
      claimedFields
    });
    let verification = ocrResult.verification || {};

    if (!ocrResult.available) {
      return res.status(503).json({
        success: false,
        code: 'DOCUMENT_VERIFICATION_UNAVAILABLE',
        message:
          verification.message ||
          'Document verification service is temporarily unavailable. Please try again later.',
        failureReason: verification.failureReason || ocrResult.unavailableReason || '',
        verification
      });
    }

    // Correct flow: OCR service only extracts certificate data. The backend is
    // the authority that compares OCR-extracted values with the submitted form.
    // Do not reject here just because the OCR service marked a field as
    // low_confidence/mismatch; run the backend comparison first.
    if (verification.status === 'failed' && !verification.extractedFields) {
      const failurePayload = getDocumentVerificationFailurePayload(verification);

      return res.status(422).json({
        success: false,
        code: failurePayload.code,
        message: verification.message || failurePayload.message,
        verification
      });
    }

    verification = verifyOcrExtractedFieldsAgainstApplication({
      claimedFields,
      verification
    });

    if (verification.status !== 'passed' || verification.blocksSubmission) {
      const failurePayload = getDocumentVerificationFailurePayload(verification);

      return res.status(422).json({
        success: false,
        code: failurePayload.code,
        message: verification.message || failurePayload.message,
        verification
      });
    }

    const verificationToken = generateVerificationToken();
    const expiresAt = new Date(
      Date.now() + getDocumentVerificationTtlMinutes() * 60 * 1000
    );

    const verificationSession = await DocumentVerificationSession.create({
      user: req.user._id,
      tokenHash: hashVerificationToken(verificationToken),
      documentHash: hashFileBuffer(req.file.buffer),
      claimedFieldsHash: hashClaimedFields(claimedFields),
      status: 'passed',
      provider: verification.provider || '',
      verification,
      expiresAt
    });

    return res.status(200).json({
      success: true,
      message: 'Birth certificate verified successfully',
      verificationToken,
      birthCertificateVerificationToken: verificationToken,
      expiresAt: verificationSession.expiresAt,
      verification
    });
  } catch (error) {
    return res.status(error.statusCode || error.status || 500).json({
      success: false,
      code: error.code || 'BIRTH_CERTIFICATE_VERIFICATION_FAILED',
      message:
        error.message || 'Birth certificate verification could not be completed'
    });
  }
};

const createApplication = async (req, res) => {
  try {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const {
      applicationType,
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
      documents
    } = req.body;
    const normalizedApplicationType = applicationType || 'new';
    let newApplicationPrerequisites = {
      documentVerificationSession: null,
      biometricSession: null
    };

    if (isNewApplicationType(normalizedApplicationType)) {
      try {
        newApplicationPrerequisites = await validateNewApplicationPrerequisites({
          req,
          payload: {
            ...req.body,
            applicationType: normalizedApplicationType
          }
        });
      } catch (validationError) {
        if (!validationError.isApiError) {
          throw validationError;
        }

        return res.status(validationError.status || 400).json({
          success: false,
          code: validationError.code || 'APPLICATION_VALIDATION_FAILED',
          message:
            validationError.message ||
            'Application validation failed. Please review the form and try again.'
        });
      }
    }

    const submittedAt = new Date();
    const birthCertificateVerification =
      newApplicationPrerequisites.documentVerificationSession?.verification || null;
    const documentAssets = birthCertificateVerification
      ? {
          birthCertificate: {
            status: 'verified',
            verifiedAt: birthCertificateVerification.checkedAt || submittedAt,
            verification: birthCertificateVerification,
            history: [
              {
                action: 'verified',
                actor: null,
                actorRole: 'system',
                note: 'Birth certificate OCR verification passed',
                occurredAt: birthCertificateVerification.checkedAt || submittedAt
              }
            ]
          }
        }
      : undefined;

    const application = await Application.create({
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
      bloodGroup,
      maritalStatus,
      birthRegistrationNumber,
      existingNidNumber,
      phone,
      email,
      occupation,
      presentAddress,
      permanentAddress,
      documents: {
        birthCertificate: documents?.birthCertificate || '',
        fatherNid: documents?.fatherNid || '',
        motherNid: documents?.motherNid || '',
        utilityBill: documents?.utilityBill || '',
        passport: documents?.passport || '',
        photo: documents?.photo || '',
        signature: documents?.signature || ''
      },
      ...(documentAssets ? { documentAssets } : {}),
      birthCertificateVerificationSession:
        newApplicationPrerequisites.documentVerificationSession?._id || null,
      biometricVerificationSession:
        newApplicationPrerequisites.biometricSession?._id || null,
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
    });

    if (isNewApplicationType(normalizedApplicationType)) {
      try {
        await consumeNewApplicationPrerequisites({
          req,
          documentVerificationSession:
            newApplicationPrerequisites.documentVerificationSession,
          biometricSession: newApplicationPrerequisites.biometricSession
        });
      } catch (consumeError) {
        await deleteApplicationQuietly(application);

        if (!consumeError.isApiError) {
          throw consumeError;
        }

        return res.status(consumeError.status || 409).json({
          success: false,
          code: consumeError.code || 'APPLICATION_VALIDATION_FAILED',
          message:
            consumeError.message ||
            'Verification sessions could not be consumed. Please try again.'
        });
      }
    }

    await createAuditLog({
      actor: req.user._id,
      actorRole: req.user.role,
      action: 'APPLICATION_CREATED',
      entityType: 'Application',
      entityId: application._id,
      message: `Citizen submitted application ${application.applicationId}`,
      meta: {
        applicationId: application.applicationId,
        applicationType: application.applicationType
      }
    });

    return res.status(201).json({
      success: true,
      message: 'Application submitted successfully',
      application
    });
  } catch (error) {
    return res.status(error.status || error.statusCode || 500).json({
      success: false,
      code: error.code || 'APPLICATION_CREATE_FAILED',
      message: error.message
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
        message: `Documents cannot be updated when status is '${application.status}'`
      });
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
    const existingVerification =
      documentType === 'birthCertificate' ? existingDocument.verification || null : null;
    const verifiedAt =
      existingVerification?.checkedAt || existingDocument.verifiedAt || null;

    const historyAction =
      existingDocument?.cloudinary?.publicId ? 'replaced' : 'uploaded';

    application.set(
      `documents.${citizenDocumentFieldMap[documentType]}`,
      req.file.originalname
    );

    application.set(`documentAssets.${documentType}`, {
      status: existingVerification?.status === 'passed' ? 'verified' : 'uploaded',
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
      verifiedAt,
      verifiedBy: existingDocument.verifiedBy || null,
      rejectionReason: '',
      verification: existingVerification,
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
    });

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
    const applications = await Application.find({ applicant: req.user._id })
      .sort({ createdAt: -1 })
      .lean();

    const applicationsWithDeliveryInfo = await attachDeliveryInfoToApplications(applications);

    return res.status(200).json({
      success: true,
      count: applicationsWithDeliveryInfo.length,
      applications: applicationsWithDeliveryInfo
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
    }).lean();

    if (!application) {
      return res.status(404).json({
        success: false,
        message: 'Application not found'
      });
    }

    const purpose = String(req.query.purpose || req.query.view || '').toLowerCase();

    if (
      ['digitalnid', 'digital_nid', 'digital-nid'].includes(purpose) &&
      !canViewDigitalNid(application)
    ) {
      return res.status(403).json({
        success: false,
        code: 'DIGITAL_NID_NOT_AVAILABLE_YET',
        message: 'Digital NID will be available after your card is printed.'
      });
    }

    const [applicationWithDeliveryInfo] = await attachDeliveryInfoToApplications([
      application
    ]);
    return res.status(200).json({
      success: true,
      application: applicationWithDeliveryInfo
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

    const changedFields = buildChangedFields(application, req.body, allowedFields);

    if (changedFields.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No valid application changes were provided'
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

    const applications = await Application.find(filter)
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
          : status === 'approved'
            ? 'Application approved. Biometric appointment is required.'
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
      Application.countDocuments(),
      Application.countDocuments({ status: 'submitted' }),
      Application.countDocuments({ status: 'under_review' }),
      Application.countDocuments({ status: 'approved' }),
      Application.countDocuments({ status: 'rejected' }),
      Application.countDocuments({ status: 'cancelled' }),
      Application.countDocuments({ status: 'printed' }),
      Application.countDocuments({ status: 'dispatched' }),
      Application.countDocuments({ status: 'delivered' }),
      Application.countDocuments({ applicationType: 'new' }),
      Application.countDocuments({ applicationType: 'correction' }),
      Application.countDocuments({ applicationType: 'reissue' }),
      Application.find()
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


const getNidEligibility = async (req, res) => {
  try {
    const applications = await Application.find({
      applicant: req.user._id,
      applicationType: 'new'
    })
      .sort({ createdAt: -1 })
      .lean();

    const activeStatuses = new Set([...ACTIVE_NEW_NID_STATUSES, 'correction_required']);
    const activeNewApplication = applications.find((item) => activeStatuses.has(item.status));
    const blockingNewApplication = applications.find(isNewNidBlockingApplication);
    const issuedNewApplication = applications.find(isCorrectionEligibleApplication);
    const approvedNewApplication = applications.find(canBookBiometricAppointment);
    const latestRejectedNewApplication = applications.find((item) => item.status === 'rejected');
    const [activeCorrectionRequest, latestCorrectionRequest, activeAppointment] = await Promise.all([
      CorrectionApplication.findOne({
        applicant: req.user._id,
        status: { $in: ['submitted', 'under_review'] }
      })
        .sort({ latestStatusChangedAt: -1, updatedAt: -1, createdAt: -1 })
        .lean(),
      CorrectionApplication.findOne({ applicant: req.user._id })
        .sort({ createdAt: -1 })
        .lean(),
      approvedNewApplication
        ? Appointment.findOne({
            applicant: req.user._id,
            application: approvedNewApplication._id,
            status: { $in: ['booked', 'completed'] }
          })
            .sort({ updatedAt: -1, createdAt: -1 })
            .lean()
        : Promise.resolve(null)
    ]);

    const latestNewApplicationStatus = applications[0]?.status || null;
    const correctionEligible = Boolean(issuedNewApplication);
    const digitalNidAvailable = Boolean(issuedNewApplication);
    const appointmentEligible = Boolean(approvedNewApplication && !activeAppointment);
    let newNidEligible = true;
    let blockedReasonCode = '';
    let blockedReasonMessage = '';
    let blockingReason = null;
    let nextAction = null;

    if (issuedNewApplication) {
      newNidEligible = false;
      blockedReasonCode = 'NEW_NID_ALREADY_APPROVED';
      blockedReasonMessage = 'You already have a New NID record. Please use Correction if you need changes.';
      blockingReason = blockedReasonMessage;
      nextAction = activeCorrectionRequest ? 'track_correction' : 'view_digital_nid_or_apply_correction';
    } else if (blockingNewApplication) {
      newNidEligible = false;
      blockedReasonCode = 'NEW_NID_ACTIVE_APPLICATION_EXISTS';
      blockedReasonMessage = `You already have an active New NID application (#${blockingNewApplication.applicationId || blockingNewApplication._id}).`;
      blockingReason = blockedReasonMessage;

      if (approvedNewApplication) {
        if (activeAppointment?.status === 'completed') {
          nextAction = 'wait_for_printing';
          blockingReason = 'Your biometric appointment is complete. Digital NID and Correction will be available after your card is printed.';
        } else if (activeAppointment?.status === 'booked') {
          nextAction = 'attend_biometric_appointment';
          blockingReason = 'Complete your booked biometric appointment. Digital NID and Correction will be available after printing.';
        } else {
          nextAction = 'book_biometric_appointment';
          blockingReason = 'Your application is approved. Book your biometric appointment as the next step.';
        }
      } else {
        nextAction = 'track_new_nid_application';
      }
    } else if (latestRejectedNewApplication) {
      nextAction = 'submit_new_nid_application';
    } else {
      nextAction = 'submit_new_nid_application';
    }

    return res.status(200).json({
      success: true,
      data: {
        newNidEligible,
        correctionEligible,
        correctionEligibleApplicationId: issuedNewApplication?._id
          ? String(issuedNewApplication._id)
          : null,
        digitalNidAvailable,
        digitalNidApplicationId: issuedNewApplication?._id
          ? String(issuedNewApplication._id)
          : null,
        appointmentEligible,
        appointmentApplicationId: approvedNewApplication?._id
          ? String(approvedNewApplication._id)
          : null,
        latestNewApplicationStatus,
        blockingReason,
        nextAction,
        canApplyNewNid: newNidEligible,
        canRequestCorrection: correctionEligible && !activeCorrectionRequest,
        hasIssuedNid: correctionEligible,
        issuedNewApplication: issuedNewApplication || null,
        activeNewApplication: activeNewApplication || null,
        activeAppointment: activeAppointment || null,
        hasActiveCorrectionRequest: Boolean(activeCorrectionRequest),
        activeCorrectionRequest: activeCorrectionRequest || null,
        latestCorrectionRequest: latestCorrectionRequest || null,
        correctionBlockedReasonCode: activeCorrectionRequest ? 'ACTIVE_CORRECTION_EXISTS' : '',
        correctionBlockedReasonMessage: activeCorrectionRequest
          ? `Your correction request (#${activeCorrectionRequest.correctionId || activeCorrectionRequest._id}) is already submitted.`
          : '',
        blockedReasonCode,
        blockedReasonMessage,
        hasPreviousRejection: Boolean(latestRejectedNewApplication),
        resubmissionAllowed: Boolean(latestRejectedNewApplication && newNidEligible),
        latestRejectedNewApplication,
        latestRejectedApplicationId: latestRejectedNewApplication?.applicationId || '',
        latestRejectedAt: latestRejectedNewApplication?.updatedAt || latestRejectedNewApplication?.createdAt || null,
        latestRejectionReason: latestRejectedNewApplication?.rejectionReason || '',
        rejectionNotice: latestRejectedNewApplication
          ? {
              applicationId: latestRejectedNewApplication.applicationId,
              rejectedAt: latestRejectedNewApplication.updatedAt || latestRejectedNewApplication.createdAt,
              rejectionReason: latestRejectedNewApplication.rejectionReason || ''
            }
          : null
      }
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to check NID eligibility'
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
  uploadApplicationDocument,
  getMyApplications,
  getSingleApplication,
  updateApplication,
  cancelApplication,
  getAllApplicationsForAdmin,
  getSingleApplicationForAdmin,
  reviewApplicationByAdmin,
  getAdminDashboardStats,
  getApplicationPrefill,
  getNidEligibility
};
