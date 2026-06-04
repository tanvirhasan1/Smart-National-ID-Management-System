const mongoose = require('mongoose');
const { randomUUID } = require('crypto');
const { validationResult } = require('express-validator');
const Application = require('../models/Application');
const CorrectionApplication = require('../models/CorrectionApplication');
const { createAuditLog } = require('../utils/auditLogger');
const uploadApplicationDocumentToCloudinary = require('../utils/uploadApplicationDocumentToCloudinary');
const { ISSUED_NID_STATUSES } = require('../utils/applicationLifecycle');

const ACTIVE_CORRECTION_STATUSES = ['submitted', 'under_review'];
const MIN_CORRECTION_SUPPORTING_DOCUMENTS = 1;
const MAX_CORRECTION_SUPPORTING_DOCUMENTS = 4;

const BIRTH_CERTIFICATE_LOCKED_CORRECTION_FIELDS = new Set([
  'fullNameEnglish',
  'fullNameBangla',
  'fatherName',
  'motherName',
  'dateOfBirth',
  'gender',
  'birthRegistrationNumber'
]);

const OFFICIAL_RECORD_LOCKED_CORRECTION_FIELDS = new Set([
  'existingNidNumber'
]);

const LOCKED_CORRECTION_FIELDS = new Set([
  ...BIRTH_CERTIFICATE_LOCKED_CORRECTION_FIELDS,
  ...OFFICIAL_RECORD_LOCKED_CORRECTION_FIELDS
]);

const CORRECTION_FIELDS = [
  { key: 'fullNameEnglish', label: 'Full Name English' },
  { key: 'fullNameBangla', label: 'Full Name Bangla' },
  { key: 'fatherName', label: 'Father Name' },
  { key: 'motherName', label: 'Mother Name' },
  { key: 'spouseName', label: 'Spouse Name' },
  { key: 'dateOfBirth', label: 'Date of Birth', type: 'date' },
  { key: 'gender', label: 'Gender' },
  { key: 'bloodGroup', label: 'Blood Group' },
  { key: 'maritalStatus', label: 'Marital Status' },
  { key: 'birthRegistrationNumber', label: 'Birth Registration Number' },
  { key: 'existingNidNumber', label: 'Existing NID Number' },
  { key: 'phone', label: 'Phone' },
  { key: 'email', label: 'Email' },
  { key: 'occupation', label: 'Occupation' },
  { key: 'presentAddress', label: 'Present Address', type: 'address' },
  { key: 'permanentAddress', label: 'Permanent Address', type: 'address' }
];

const generateCorrectionId = () => {
  const shortId = randomUUID().split('-')[0].toUpperCase();
  return `COR-${Date.now()}-${shortId}`;
};

const toDateOnly = (value) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toISOString().slice(0, 10);
};

const normalizeScalar = (value, type = '') => {
  if (type === 'date') return toDateOnly(value);
  return String(value ?? '').trim();
};

const cleanAddress = (address = {}) => ({
  division: String(address?.division || '').trim(),
  district: String(address?.district || '').trim(),
  upazila: String(address?.upazila || '').trim(),
  unionOrWard: String(address?.unionOrWard || '').trim(),
  villageOrArea: String(address?.villageOrArea || '').trim(),
  postOffice: String(address?.postOffice || '').trim(),
  postalCode: String(address?.postalCode || '').trim()
});

const formatAddress = (address = {}) =>
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

const formatDisplayValue = (value, type = '') => {
  if (type === 'address') return formatAddress(value);
  if (type === 'date') return toDateOnly(value) || 'N/A';
  return String(value ?? '').trim() || 'N/A';
};

const parseBooleanFlag = (value) =>
  value === true || value === 'true' || value === '1' || value === 1;

const getDeclaredSupportingDocumentCount = (body = {}) => {
  const rawValue =
    body.supportingDocumentCount ??
    body.correctionInfo?.supportingDocumentCount ??
    body.documentCount;
  const count = Number(rawValue);

  return Number.isInteger(count) ? count : 0;
};

const getPhotoChangeRequested = (body = {}) =>
  parseBooleanFlag(body.photoChangeRequested ?? body.correctionInfo?.photoChangeRequested);

const buildCorrectionDataFromApplication = (application = {}) => ({
  fullNameEnglish: application.fullNameEnglish || '',
  fullNameBangla: application.fullNameBangla || '',
  fatherName: application.fatherName || '',
  motherName: application.motherName || '',
  spouseName: application.spouseName || '',
  dateOfBirth: application.dateOfBirth || null,
  gender: application.gender || '',
  bloodGroup: application.bloodGroup || '',
  maritalStatus: application.maritalStatus || 'single',
  birthRegistrationNumber: application.birthRegistrationNumber || '',
  existingNidNumber: application.existingNidNumber || '',
  phone: application.phone || '',
  email: application.email || '',
  occupation: application.occupation || '',
  presentAddress: cleanAddress(application.presentAddress || {}),
  permanentAddress: cleanAddress(application.permanentAddress || {})
});

const buildCorrectionDataFromBody = (body = {}) => ({
  fullNameEnglish: String(body.fullNameEnglish || '').trim(),
  fullNameBangla: String(body.fullNameBangla || '').trim(),
  fatherName: String(body.fatherName || '').trim(),
  motherName: String(body.motherName || '').trim(),
  spouseName: String(body.spouseName || '').trim(),
  dateOfBirth: body.dateOfBirth || null,
  gender: String(body.gender || '').trim(),
  bloodGroup: String(body.bloodGroup || '').trim(),
  maritalStatus: String(body.maritalStatus || 'single').trim(),
  birthRegistrationNumber: String(body.birthRegistrationNumber || '').trim(),
  existingNidNumber: String(body.existingNidNumber || '').trim(),
  phone: String(body.phone || '').trim(),
  email: String(body.email || '').trim().toLowerCase(),
  occupation: String(body.occupation || '').trim(),
  presentAddress: cleanAddress(body.presentAddress || {}),
  permanentAddress: cleanAddress(body.permanentAddress || {})
});

const lockVerifiedCorrectionFields = (requestedData, previousData) => {
  const sanitizedData = { ...requestedData };

  LOCKED_CORRECTION_FIELDS.forEach((fieldName) => {
    sanitizedData[fieldName] = previousData[fieldName];
  });

  return sanitizedData;
};

const getEditableCorrectionFields = () =>
  CORRECTION_FIELDS.filter((field) => !LOCKED_CORRECTION_FIELDS.has(field.key));

const getComparableValue = (data, field) => {
  const value = data?.[field.key];

  if (field.type === 'address') {
    return JSON.stringify(cleanAddress(value || {}));
  }

  return normalizeScalar(value, field.type);
};

const buildChangedFields = (previousData, requestedData) =>
  getEditableCorrectionFields().reduce((changes, field) => {
    const oldComparable = getComparableValue(previousData, field);
    const newComparable = getComparableValue(requestedData, field);

    if (oldComparable !== newComparable) {
      changes.push({
        field: field.key,
        label: field.label,
        oldValue: previousData?.[field.key] ?? '',
        newValue: requestedData?.[field.key] ?? '',
        displayOldValue: formatDisplayValue(previousData?.[field.key], field.type),
        displayNewValue: formatDisplayValue(requestedData?.[field.key], field.type)
      });
    }

    return changes;
  }, []);

const findIssuedBaseApplication = (userId) =>
  Application.findOne({
    applicant: userId,
    applicationType: 'new',
    status: { $in: ISSUED_NID_STATUSES }
  }).sort({ printedAt: -1, updatedAt: -1, createdAt: -1 });

const mapCorrectionForResponse = (correction) => {
  const item = correction?.toObject ? correction.toObject() : correction;
  return item;
};

const appendCorrectionHistory = ({ correction, fromStatus, toStatus, req, reason = '', note = '' }) => {
  correction.latestStatusChangedAt = new Date();
  correction.statusHistory = Array.isArray(correction.statusHistory)
    ? correction.statusHistory
    : [];
  correction.statusHistory.push({
    fromStatus,
    toStatus,
    reason,
    note,
    changedAt: correction.latestStatusChangedAt,
    changedBy: req.user?._id || null,
    changedByRole: req.user?.role || 'system'
  });
};

const getCorrectionPrefill = async (req, res) => {
  try {
    const baseApplication = await findIssuedBaseApplication(req.user._id).lean();

    if (!baseApplication) {
      return res.status(403).json({
        success: false,
        code: 'NID_NOT_ISSUED_YET',
        message: 'Correction is available only after your NID card has been printed.'
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        baseApplicationId: baseApplication.applicationId,
        baseApplicationObjectId: baseApplication._id,
        nidNumber: baseApplication.existingNidNumber || '',
        prefill: {
          ...buildCorrectionDataFromApplication(baseApplication),
          dateOfBirth: toDateOnly(baseApplication.dateOfBirth)
        }
      }
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to load correction prefill data'
    });
  }
};

const createCorrection = async (req, res) => {
  try {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const reason = String(req.body.reason || req.body.correctionReason || '').trim();
    const supportingDocumentCount = getDeclaredSupportingDocumentCount(req.body);
    const photoChangeRequested = getPhotoChangeRequested(req.body);

    if (!reason) {
      return res.status(400).json({
        success: false,
        message: 'Correction reason is required'
      });
    }

    if (
      supportingDocumentCount < MIN_CORRECTION_SUPPORTING_DOCUMENTS ||
      supportingDocumentCount > MAX_CORRECTION_SUPPORTING_DOCUMENTS
    ) {
      return res.status(400).json({
        success: false,
        message: 'Upload 1-4 supporting documents for your correction request.'
      });
    }

    const baseApplication = await findIssuedBaseApplication(req.user._id);

    if (!baseApplication) {
      return res.status(403).json({
        success: false,
        code: 'NID_NOT_ISSUED_YET',
        message: 'Correction is available only after your NID card has been printed.'
      });
    }

    const activeCorrection = await CorrectionApplication.findOne({
      applicant: req.user._id,
      baseApplication: baseApplication._id,
      status: { $in: ACTIVE_CORRECTION_STATUSES }
    }).lean();

    if (activeCorrection) {
      return res.status(409).json({
        success: false,
        message: `You already have an active correction request (${activeCorrection.correctionId})`
      });
    }

    const previousData = buildCorrectionDataFromApplication(baseApplication);
    const requestedData = lockVerifiedCorrectionFields(
      buildCorrectionDataFromBody(req.body),
      previousData
    );
    const changedFields = buildChangedFields(previousData, requestedData);

    if (changedFields.length === 0 && !photoChangeRequested) {
      return res.status(400).json({
        success: false,
        message: 'Please change at least one field or request a photo change before submitting correction'
      });
    }

    const submittedAt = new Date();

    const correction = await CorrectionApplication.create({
      applicant: req.user._id,
      correctionId: generateCorrectionId(),
      baseApplication: baseApplication._id,
      baseApplicationId: baseApplication.applicationId || '',
      nidNumber: requestedData.existingNidNumber || baseApplication.existingNidNumber || '',
      reason,
      previousData,
      requestedData,
      changedFields,
      photoChangeRequested,
      supportingDocumentCount,
      status: 'submitted',
      submittedAt,
      latestStatusChangedAt: submittedAt,
      statusHistory: [
        {
          fromStatus: '',
          toStatus: 'submitted',
          reason: 'Correction request submitted by citizen',
          note: reason,
          changedAt: submittedAt,
          changedBy: req.user._id,
          changedByRole: req.user.role
        }
      ]
    });

    await createAuditLog({
      actor: req.user._id,
      actorRole: req.user.role,
      action: 'CORRECTION_CREATED',
      entityType: 'CorrectionApplication',
      entityId: correction._id,
      message: `Citizen submitted correction request ${correction.correctionId}`,
      meta: {
        correctionId: correction.correctionId,
        baseApplicationId: correction.baseApplicationId,
        changedFields: changedFields.map((item) => item.field)
      }
    });

    return res.status(201).json({
      success: true,
      message: 'Correction request submitted successfully',
      data: correction,
      correction
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to submit correction request'
    });
  }
};

const uploadCorrectionDocument = async (req, res) => {
  try {
    const { id, documentType } = req.params;
    const isVerificationDocument = ['verificationDocument', 'correctionProof'].includes(documentType);
    const storedDocumentType = isVerificationDocument ? 'verificationDocument' : documentType;
    const cloudinaryDocumentType = isVerificationDocument ? 'correctionProof' : documentType;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid correction id' });
    }

    if (!['photograph', 'verificationDocument', 'correctionProof'].includes(documentType)) {
      return res.status(400).json({ success: false, message: 'Invalid correction document type' });
    }

    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Document file is required' });
    }

    const correction = await CorrectionApplication.findOne({
      _id: id,
      applicant: req.user._id
    });

    if (!correction) {
      return res.status(404).json({ success: false, message: 'Correction request not found' });
    }

    if (['approved', 'rejected', 'cancelled'].includes(correction.status)) {
      return res.status(400).json({
        success: false,
        message: `Documents cannot be uploaded when correction status is '${correction.status}'`
      });
    }

    if (storedDocumentType === 'photograph' && !correction.photoChangeRequested) {
      return res.status(400).json({
        success: false,
        message: 'Photo upload is allowed only when photo change is requested'
      });
    }

    if (
      isVerificationDocument &&
      correction.documents.verificationDocuments.length >= MAX_CORRECTION_SUPPORTING_DOCUMENTS
    ) {
      return res.status(400).json({
        success: false,
        message: 'Maximum 4 supporting documents can be uploaded'
      });
    }

    const uploadResult = await uploadApplicationDocumentToCloudinary({
      fileBuffer: req.file.buffer,
      applicationId: correction.correctionId,
      citizenId: req.user._id,
      documentType: cloudinaryDocumentType
    });

    const documentRecord = {
      documentType: storedDocumentType,
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
      rejectionReason: ''
    };

    if (storedDocumentType === 'photograph') {
      correction.documents.photograph = documentRecord;
    } else {
      correction.documents.verificationDocuments.push(documentRecord);
    }

    const updatedCorrection = await correction.save();

    await createAuditLog({
      actor: req.user._id,
      actorRole: req.user.role,
      action: 'CORRECTION_DOCUMENT_UPLOADED',
      entityType: 'CorrectionApplication',
      entityId: updatedCorrection._id,
      message: `${storedDocumentType} uploaded for ${updatedCorrection.correctionId}`,
      meta: {
        correctionId: updatedCorrection.correctionId,
        documentType: storedDocumentType,
        uploadDocumentType: cloudinaryDocumentType,
        publicId: uploadResult.publicId,
        secureUrl: uploadResult.secureUrl
      }
    });

    return res.status(200).json({
      success: true,
      message: 'Correction document uploaded successfully',
      data: {
        correctionId: updatedCorrection.correctionId,
        documentType: storedDocumentType,
        documents: updatedCorrection.documents
      }
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to upload correction document'
    });
  }
};

const getMyCorrections = async (req, res) => {
  try {
    const corrections = await CorrectionApplication.find({ applicant: req.user._id })
      .populate('baseApplication', 'applicationId status existingNidNumber')
      .sort({ createdAt: -1 })
      .lean();

    return res.status(200).json({
      success: true,
      count: corrections.length,
      data: corrections,
      corrections
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

const getSingleCorrection = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ success: false, message: 'Invalid correction id' });
    }

    const correction = await CorrectionApplication.findOne({
      _id: req.params.id,
      applicant: req.user._id
    })
      .populate('baseApplication')
      .lean();

    if (!correction) {
      return res.status(404).json({ success: false, message: 'Correction request not found' });
    }

    return res.status(200).json({ success: true, data: correction, correction });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

const getAdminCorrectionStats = async (req, res) => {
  try {
    const [totalCorrections, submittedCorrections, underReviewCorrections, approvedCorrections, rejectedCorrections] = await Promise.all([
      CorrectionApplication.countDocuments({}),
      CorrectionApplication.countDocuments({ status: 'submitted' }),
      CorrectionApplication.countDocuments({ status: 'under_review' }),
      CorrectionApplication.countDocuments({ status: 'approved' }),
      CorrectionApplication.countDocuments({ status: 'rejected' })
    ]);

    return res.status(200).json({
      success: true,
      data: {
        totalCorrections,
        submittedCorrections,
        underReviewCorrections,
        approvedCorrections,
        rejectedCorrections
      }
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

const escapeRegex = (value = '') => String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const getAdminCorrectionQueue = async (req, res) => {
  try {
    const filter = {};
    const status = String(req.query.status || '').trim();
    const search = String(req.query.search || '').trim();
    const limit = Math.min(Math.max(Number(req.query.limit) || 25, 1), 100);

    if (status) filter.status = status;

    if (search) {
      const regex = new RegExp(escapeRegex(search), 'i');
      filter.$or = [
        { correctionId: regex },
        { baseApplicationId: regex },
        { nidNumber: regex },
        { 'requestedData.fullNameEnglish': regex },
        { 'requestedData.phone': regex },
        { 'requestedData.birthRegistrationNumber': regex }
      ];
    }

    const corrections = await CorrectionApplication.find(filter)
      .populate('applicant', 'fullName email phone role status')
      .populate('baseApplication', 'applicationId status existingNidNumber')
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    const totalMatching = await CorrectionApplication.countDocuments(filter);

    return res.status(200).json({
      success: true,
      data: corrections,
      meta: {
        totalMatching,
        hasMore: corrections.length < totalMatching,
        nextCursor: null,
        limit
      }
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to load correction queue'
    });
  }
};

const getAdminCorrectionDetails = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ success: false, message: 'Invalid correction id' });
    }

    const correction = await CorrectionApplication.findById(req.params.id)
      .populate('applicant', 'fullName email phone role status')
      .populate('baseApplication')
      .lean();

    if (!correction) {
      return res.status(404).json({ success: false, message: 'Correction request not found' });
    }

    return res.status(200).json({ success: true, data: mapCorrectionForResponse(correction) });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to load correction details'
    });
  }
};

const getCorrectionDocumentReadinessMessage = (correction) => {
  const supportingDocuments = correction.documents?.verificationDocuments || [];
  const uploadedCount = supportingDocuments.length;
  const expectedCount = Math.min(
    Math.max(
      Number(correction.supportingDocumentCount) || MIN_CORRECTION_SUPPORTING_DOCUMENTS,
      MIN_CORRECTION_SUPPORTING_DOCUMENTS
    ),
    MAX_CORRECTION_SUPPORTING_DOCUMENTS
  );

  if (uploadedCount < MIN_CORRECTION_SUPPORTING_DOCUMENTS) {
    return 'At least one supporting document is required before review.';
  }

  if (uploadedCount > MAX_CORRECTION_SUPPORTING_DOCUMENTS) {
    return 'Maximum 4 supporting documents are allowed.';
  }

  if (uploadedCount < expectedCount) {
    return `Supporting document upload is incomplete (${uploadedCount}/${expectedCount}).`;
  }

  if (
    correction.photoChangeRequested &&
    !correction.documents?.photograph?.cloudinary?.secureUrl
  ) {
    return 'A new passport-size photo is required because photo change was requested.';
  }

  return '';
};

const applyApprovedCorrectionToBaseApplication = async (correction) => {
  const baseApplication = await Application.findById(correction.baseApplication);

  if (!baseApplication) {
    throw new Error('Base New NID application was not found');
  }

  const correctionFieldMap = new Map(
    CORRECTION_FIELDS.map((field) => [field.key, field])
  );

  (correction.changedFields || []).forEach((change) => {
    const field = correctionFieldMap.get(change.field);

    if (!field || LOCKED_CORRECTION_FIELDS.has(field.key)) {
      return;
    }

    baseApplication.set(field.key, correction.requestedData[field.key]);
  });

  if (correction.photoChangeRequested && correction.documents?.photograph?.cloudinary?.secureUrl) {
    const photograph = correction.documents.photograph;
    const approvedAt = new Date();
    const existingHistory = Array.isArray(baseApplication.documentAssets?.photograph?.history)
      ? baseApplication.documentAssets.photograph.history
      : [];

    baseApplication.set('documents.photo', photograph.cloudinary.originalFilename || photograph.cloudinary.secureUrl);
    baseApplication.set('documentAssets.photograph', {
      status: 'verified',
      cloudinary: photograph.cloudinary,
      uploadedAt: photograph.uploadedAt || approvedAt,
      uploadedBy: photograph.uploadedBy || correction.applicant,
      verifiedAt: approvedAt,
      verifiedBy: correction.reviewedBy || null,
      rejectionReason: '',
      verification: null,
      history: [
        ...existingHistory,
        {
          action: 'replaced',
          actor: correction.reviewedBy || null,
          actorRole: 'admin',
          note: `Approved correction ${correction.correctionId} photo change`,
          publicId: photograph.cloudinary.publicId || '',
          secureUrl: photograph.cloudinary.secureUrl || '',
          occurredAt: approvedAt
        }
      ]
    });
  }

  baseApplication.latestStatusChangedAt = new Date();
  await baseApplication.save();

  return baseApplication;
};

const updateAdminCorrectionDecision = async (req, res) => {
  try {
    const { status, rejectionReason = '', decisionNote = '' } = req.body;

    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ success: false, message: 'Invalid correction id' });
    }

    if (!['under_review', 'approved', 'rejected'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid correction decision' });
    }

    const correction = await CorrectionApplication.findById(req.params.id);

    if (!correction) {
      return res.status(404).json({ success: false, message: 'Correction request not found' });
    }

    const currentStatus = correction.status;
    const allowedTransitions = {
      submitted: ['under_review', 'approved', 'rejected'],
      under_review: ['approved', 'rejected'],
      rejected: ['under_review'],
      approved: []
    };

    if (!allowedTransitions[currentStatus]?.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Cannot move correction from ${currentStatus} to ${status}`
      });
    }

    if (status === 'rejected' && !String(rejectionReason).trim()) {
      return res.status(400).json({
        success: false,
        message: 'Rejection reason is required'
      });
    }

    if (['under_review', 'approved'].includes(status)) {
      const readinessMessage = getCorrectionDocumentReadinessMessage(correction);

      if (readinessMessage) {
        return res.status(400).json({
          success: false,
          message: readinessMessage
        });
      }
    }

    correction.status = status;
    correction.reviewedAt = new Date();
    correction.reviewedBy = req.user._id;

    if (status === 'approved') {
      correction.approvedAt = new Date();
      correction.rejectionReason = '';
      await applyApprovedCorrectionToBaseApplication(correction);
    }

    if (status === 'rejected') {
      correction.rejectedAt = new Date();
      correction.rejectionReason = String(rejectionReason).trim();
    }

    if (status === 'under_review') {
      correction.rejectionReason = '';
    }

    appendCorrectionHistory({
      correction,
      fromStatus: currentStatus,
      toStatus: status,
      req,
      reason: status === 'rejected' ? String(rejectionReason).trim() : `Correction moved to ${status}`,
      note: String(decisionNote || '').trim()
    });

    await correction.save();

    await createAuditLog({
      actor: req.user._id,
      actorRole: req.user.role,
      action: 'CORRECTION_DECISION_UPDATED',
      entityType: 'CorrectionApplication',
      entityId: correction._id,
      message: `Correction ${correction.correctionId} moved to ${status}`,
      meta: {
        correctionId: correction.correctionId,
        fromStatus: currentStatus,
        toStatus: status
      }
    });

    const refreshed = await CorrectionApplication.findById(correction._id)
      .populate('applicant', 'fullName email phone role status')
      .populate('baseApplication')
      .lean();

    return res.status(200).json({
      success: true,
      message: `Correction updated to ${status}`,
      data: refreshed
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to update correction decision'
    });
  }
};

module.exports = {
  getCorrectionPrefill,
  createCorrection,
  uploadCorrectionDocument,
  getMyCorrections,
  getSingleCorrection,
  getAdminCorrectionStats,
  getAdminCorrectionQueue,
  getAdminCorrectionDetails,
  updateAdminCorrectionDecision
};
