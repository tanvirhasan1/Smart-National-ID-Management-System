const mongoose = require('mongoose');
const Application = require('../models/Application');
const {
  applyAdminJurisdictionFilter,
  canAccessApplicationByJurisdiction
} = require('../utils/adminScope');

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 50;

const SORT_MAP = {
  '-createdAt': { field: 'createdAt', dir: -1 },
  createdAt: { field: 'createdAt', dir: 1 },
  '-updatedAt': { field: 'updatedAt', dir: -1 },
  updatedAt: { field: 'updatedAt', dir: 1 }
};

const escapeRegex = (value = '') =>
  String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const normalizeLimit = (value) =>
  Math.min(Math.max(parseInt(value || DEFAULT_LIMIT, 10) || DEFAULT_LIMIT, 1), MAX_LIMIT);

const encodeCursor = (payload) =>
  Buffer.from(JSON.stringify(payload), 'utf8').toString('base64');

const decodeCursor = (cursor) => {
  try {
    return JSON.parse(Buffer.from(String(cursor || ''), 'base64').toString('utf8'));
  } catch {
    return null;
  }
};

const buildFilter = ({ status, applicationType, search }) => {
  const filter = {};

  if (status) filter.status = status;
  if (applicationType) filter.applicationType = applicationType;

  if (search) {
    const regex = new RegExp(escapeRegex(search), 'i');
    filter.$or = [
      { applicationId: regex },
      { fullNameEnglish: regex },
      { fullNameBangla: regex },
      { phone: regex },
      { email: regex },
      { birthRegistrationNumber: regex },
      { existingNidNumber: regex }
    ];
  }

  return filter;
};

const buildCursorClause = (cursor, field, dir) => {
  if (!cursor || !cursor.id || !cursor.sortValue) return null;
  if (!mongoose.Types.ObjectId.isValid(cursor.id)) return null;

  const cursorDate = new Date(cursor.sortValue);
  if (Number.isNaN(cursorDate.getTime())) return null;

  const op = dir === -1 ? '$lt' : '$gt';

  return {
    $or: [
      { [field]: { [op]: cursorDate } },
      { [field]: cursorDate, _id: { [op]: new mongoose.Types.ObjectId(cursor.id) } }
    ]
  };
};

const toManagedAsset = (key, label, record = {}) => {
  const format = String(record?.cloudinary?.format || '').toLowerCase();

  return {
    key,
    label,
    status: record?.status || 'not_uploaded',
    secureUrl: record?.cloudinary?.secureUrl || '',
    publicId: record?.cloudinary?.publicId || '',
    format,
    bytes: record?.cloudinary?.bytes || 0,
    width: record?.cloudinary?.width || null,
    height: record?.cloudinary?.height || null,
    uploadedAt: record?.uploadedAt || null,
    verifiedAt: record?.verifiedAt || null,
    originalFilename:
      record?.cloudinary?.originalFilename || record?.cloudinary?.publicId || '',
    rejectionReason: record?.rejectionReason || '',
    verification: key === 'birthCertificate' ? record?.verification || null : null
  };
};

const buildBirthCertificateVerificationData = (application) => {
  const verification =
    application?.documentAssets?.birthCertificate?.verification || null;
  const status = verification?.status || 'not_started';

  return {
    status,
    isVerified: status === 'passed',
    tag:
      status === 'passed'
        ? {
            label: 'Document information matched',
            tone: 'green'
          }
        : null,
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

const buildReviewAssets = (application) => {
  const assets = [
    toManagedAsset('photograph', 'Photograph', application?.documentAssets?.photograph),
    toManagedAsset('signature', 'Signature', application?.documentAssets?.signature),
    toManagedAsset(
      'birthCertificate',
      'Birth Certificate',
      application?.documentAssets?.birthCertificate
    )
  ];

  if (
    application?.applicationType === 'correction' ||
    application?.documentAssets?.correctionProof?.cloudinary?.secureUrl ||
    application?.documents?.correctionProof
  ) {
    assets.push(
      toManagedAsset(
        'correctionProof',
        'Correction Proof',
        application?.documentAssets?.correctionProof
      )
    );
  }

  return assets;
};

const buildSupportingReferences = (application) =>
  [
    {
      key: 'fatherNid',
      label: 'Father NID',
      value: application?.documents?.fatherNid || ''
    },
    {
      key: 'motherNid',
      label: 'Mother NID',
      value: application?.documents?.motherNid || ''
    },
    {
      key: 'utilityBill',
      label: 'Utility Bill',
      value: application?.documents?.utilityBill || ''
    },
    {
      key: 'passport',
      label: 'Passport',
      value: application?.documents?.passport || ''
    }
  ].filter((item) => item.value);

const buildDocumentSummary = (application) => ({
  photograph: Boolean(application?.documentAssets?.photograph?.cloudinary?.secureUrl),
  signature: Boolean(application?.documentAssets?.signature?.cloudinary?.secureUrl),
  birthCertificate: Boolean(application?.documentAssets?.birthCertificate?.cloudinary?.secureUrl),
  correctionProof: Boolean(application?.documentAssets?.correctionProof?.cloudinary?.secureUrl),
  birthCertificateVerification: buildBirthCertificateVerificationData(application)
});

const buildCorrectionSummary = (application) => {
  if (application?.applicationType !== 'correction') {
    return null;
  }

  const correctionInfo = application?.correctionInfo || {};

  return {
    correctionOf: correctionInfo.correctionOf || null,
    baseApplicationId: correctionInfo.baseApplicationId || '',
    reason: correctionInfo.reason || '',
    proofStatus: correctionInfo.proofStatus || 'not_uploaded',
    requestedChanges: Array.isArray(correctionInfo.requestedChanges)
      ? correctionInfo.requestedChanges
      : []
  };
};

const buildActorInfo = (req) => ({
  userId: req.user?._id || null,
  role: req.user?.role || 'system',
  ipAddress: req.ip || req.headers['x-forwarded-for'] || '',
  userAgent: req.headers['user-agent'] || '',
  requestId: req.headers['x-request-id'] || ''
});

const pushStatusHistory = (application, req, fromStatus, toStatus, reason = '', note = '') => {
  const actor = buildActorInfo(req);

  application.statusHistory = Array.isArray(application.statusHistory)
    ? application.statusHistory
    : [];

  application.statusHistory.push({
    fromStatus: fromStatus || '',
    toStatus,
    reason,
    note,
    changedAt: new Date(),
    changedBy: actor.userId,
    changedByRole: actor.role,
    ipAddress: actor.ipAddress,
    userAgent: actor.userAgent,
    requestId: actor.requestId
  });

  application.latestStatusChangedAt = new Date();
};

const getApplicationReviewQueue = async (req, res) => {
  try {
    const sortKey = req.query.sort || '-createdAt';
    const { field, dir } = SORT_MAP[sortKey] || SORT_MAP['-createdAt'];
    const limit = normalizeLimit(req.query.limit);

    const baseFilter = buildFilter({
      status: String(req.query.status || '').trim(),
      applicationType: String(req.query.applicationType || '').trim(),
      search: String(req.query.search || '').trim()
    });

    const scopedBaseFilter = applyAdminJurisdictionFilter(req, baseFilter);
    const cursor = decodeCursor(req.query.cursor);
    const cursorClause = buildCursorClause(cursor, field, dir);
    const finalFilter = cursorClause
      ? { $and: [scopedBaseFilter, cursorClause] }
      : scopedBaseFilter;

    const [rows, totalMatching] = await Promise.all([
      Application.find(finalFilter)
        .select(
          'applicationId applicationType status createdAt updatedAt submittedAt latestStatusChangedAt fullNameEnglish fullNameBangla fatherName motherName phone email birthRegistrationNumber existingNidNumber rejectionReason documentAssets resubmissionInfo'
        )
        .populate('applicant', 'fullName email phone role status')
        .sort({ [field]: dir, _id: dir })
        .limit(limit + 1)
        .lean(),
      Application.countDocuments(scopedBaseFilter)
    ]);

    const hasMore = rows.length > limit;
    const visibleRows = hasMore ? rows.slice(0, limit) : rows;

    const data = visibleRows.map((item) => ({
      ...item,
      documentSummary: buildDocumentSummary(item),
      documentVerification: buildBirthCertificateVerificationData(item)
    }));

    const last = data[data.length - 1];

    return res.status(200).json({
      success: true,
      data,
      meta: {
        totalMatching,
        hasMore,
        nextCursor:
          hasMore && last
            ? encodeCursor({
                id: last._id,
                sortValue: last[field]
              })
            : null,
        limit,
        sort: sortKey
      }
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to load review queue'
    });
  }
};

const getApplicationReviewDetails = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid application id'
      });
    }

    const application = await Application.findById(id)
      .populate('applicant', 'fullName email phone role status')
      .lean();

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
      data: {
        ...application,
        documentVerification: buildBirthCertificateVerificationData(application),
        correctionSummary: buildCorrectionSummary(application),
        reviewAssets: buildReviewAssets(application),
        supportingReferences: buildSupportingReferences(application)
      }
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to load application details'
    });
  }
};

const updateApplicationReviewDecision = async (req, res) => {
  try {
    const { id } = req.params;
    const status = String(req.body.status || '').trim();
    const decisionNote = String(req.body.decisionNote || '').trim();
    const rejectionReason = String(req.body.rejectionReason || '').trim();

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid application id'
      });
    }

    if (!['under_review', 'approved', 'rejected'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid review status'
      });
    }

    if (status === 'rejected' && !rejectionReason) {
      return res.status(400).json({
        success: false,
        message: 'Rejection reason is required'
      });
    }

    const application = await Application.findById(id);

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

    const currentStatus = application.status;

    const allowedTransitions = {
      submitted: ['under_review', 'approved', 'rejected'],
      under_review: ['approved', 'rejected'],
      rejected: ['under_review'],
      approved: [],
      printed: [],
      dispatched: [],
      delivered: [],
      cancelled: [],
      draft: []
    };

    if (currentStatus === status) {
      return res.status(400).json({
        success: false,
        message: `Application is already ${status}`
      });
    }

    if (!allowedTransitions[currentStatus]?.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Cannot move application from ${currentStatus} to ${status}`
      });
    }

    application.status = status;

    if (status === 'under_review') {
      application.rejectionReason = '';
    }

    if (status === 'approved') {
      application.approvedAt = new Date();
      application.rejectionReason = '';
      // TODO: Apply approved correction changes to a stable issued-NID profile model when that model exists.
    }

    if (status === 'rejected') {
      application.rejectionReason = rejectionReason;
    }

    pushStatusHistory(
      application,
      req,
      currentStatus,
      status,
      rejectionReason || `Application moved to ${status}`,
      decisionNote
    );

    await application.save();

    const refreshed = await Application.findById(application._id)
      .populate('applicant', 'fullName email phone role status')
      .lean();

    return res.status(200).json({
      success: true,
      message: `Application updated to ${status}`,
      data: {
        ...refreshed,
        documentVerification: buildBirthCertificateVerificationData(refreshed),
        correctionSummary: buildCorrectionSummary(refreshed),
        reviewAssets: buildReviewAssets(refreshed),
        supportingReferences: buildSupportingReferences(refreshed)
      }
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to update application'
    });
  }
};

module.exports = {
  getApplicationReviewQueue,
  getApplicationReviewDetails,
  updateApplicationReviewDecision
};
