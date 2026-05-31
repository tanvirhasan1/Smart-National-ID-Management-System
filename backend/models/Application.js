const mongoose = require('mongoose');

const addressSchema = new mongoose.Schema(
  {
    division: {
      type: String,
      trim: true
    },
    district: {
      type: String,
      trim: true
    },
    upazila: {
      type: String,
      trim: true
    },
    unionOrWard: {
      type: String,
      trim: true
    },
    villageOrArea: {
      type: String,
      trim: true
    },
    postOffice: {
      type: String,
      trim: true
    },
    postalCode: {
      type: String,
      trim: true
    }
  },
  { _id: false }
);

const legacyDocumentSchema = new mongoose.Schema(
  {
    birthCertificate: {
      type: String,
      trim: true,
      default: ''
    },
    fatherNid: {
      type: String,
      trim: true,
      default: ''
    },
    motherNid: {
      type: String,
      trim: true,
      default: ''
    },
    utilityBill: {
      type: String,
      trim: true,
      default: ''
    },
    passport: {
      type: String,
      trim: true,
      default: ''
    },
    correctionProof: {
      type: String,
      trim: true,
      default: ''
    },
    photo: {
      type: String,
      trim: true,
      default: ''
    },
    signature: {
      type: String,
      trim: true,
      default: ''
    }
  },
  { _id: false }
);

const cloudinaryAssetSchema = new mongoose.Schema(
  {
    assetId: {
      type: String,
      trim: true,
      default: ''
    },
    publicId: {
      type: String,
      trim: true,
      default: ''
    },
    version: {
      type: Number,
      default: null
    },
    secureUrl: {
      type: String,
      trim: true,
      default: ''
    },
    resourceType: {
      type: String,
      trim: true,
      default: ''
    },
    format: {
      type: String,
      trim: true,
      default: ''
    },
    bytes: {
      type: Number,
      default: 0
    },
    width: {
      type: Number,
      default: null
    },
    height: {
      type: Number,
      default: null
    },
    originalFilename: {
      type: String,
      trim: true,
      default: ''
    },
    folder: {
      type: String,
      trim: true,
      default: ''
    },
    etag: {
      type: String,
      trim: true,
      default: ''
    },
    createdAt: {
      type: Date,
      default: null
    }
  },
  { _id: false }
);

const documentHistorySchema = new mongoose.Schema(
  {
    action: {
      type: String,
      enum: ['uploaded', 'replaced', 'verified', 'rejected'],
      required: true
    },
    actor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    actorRole: {
      type: String,
      enum: ['citizen', 'admin', 'system_supervisor', 'support_staff'],
      default: 'citizen'
    },
    note: {
      type: String,
      trim: true,
      default: ''
    },
    publicId: {
      type: String,
      trim: true,
      default: ''
    },
    secureUrl: {
      type: String,
      trim: true,
      default: ''
    },
    occurredAt: {
      type: Date,
      default: Date.now
    }
  },
  { _id: false }
);

const documentVerificationExtractedFieldsSchema = new mongoose.Schema(
  {
    birthRegistrationNumber: {
      type: String,
      trim: true,
      default: ''
    },
    fullNameEnglish: {
      type: String,
      trim: true,
      default: ''
    },
    fullNameBangla: {
      type: String,
      trim: true,
      default: ''
    },
    fatherName: {
      type: String,
      trim: true,
      default: ''
    },
    motherName: {
      type: String,
      trim: true,
      default: ''
    },
    dateOfBirth: {
      type: String,
      trim: true,
      default: ''
    },
    gender: {
      type: String,
      trim: true,
      default: ''
    }
  },
  { _id: false }
);

const documentVerificationFieldComparisonSchema = new mongoose.Schema(
  {
    field: {
      type: String,
      trim: true,
      default: ''
    },
    submittedValue: {
      type: String,
      trim: true,
      default: ''
    },
    extractedValue: {
      type: String,
      trim: true,
      default: ''
    },
    matched: {
      type: Boolean,
      default: false
    },
    confidence: {
      type: Number,
      default: null
    },
    note: {
      type: String,
      trim: true,
      default: ''
    }
  },
  { _id: false }
);

const documentVerificationSchema = new mongoose.Schema(
  {
    status: {
      type: String,
      enum: [
        'not_started',
        'pending',
        'passed',
        'mismatch',
        'not_found',
        'unreadable',
        'low_confidence',
        'failed'
      ],
      default: 'not_started'
    },
    provider: {
      type: String,
      trim: true,
      default: ''
    },
    confidence: {
      type: Number,
      default: null
    },
    message: {
      type: String,
      trim: true,
      default: ''
    },
    checkedAt: {
      type: Date,
      default: null
    },
    rawTextPreview: {
      type: String,
      trim: true,
      maxlength: 4000,
      default: ''
    },
    extractedFields: {
      type: documentVerificationExtractedFieldsSchema,
      default: () => ({})
    },
    fieldComparisons: {
      type: [documentVerificationFieldComparisonSchema],
      default: []
    },
    failureReason: {
      type: String,
      trim: true,
      default: ''
    },
    blocksSubmission: {
      type: Boolean,
      default: false
    }
  },
  { _id: false }
);

const managedDocumentFields = {
  status: {
    type: String,
    enum: ['not_uploaded', 'uploaded', 'verified', 'rejected'],
    default: 'not_uploaded'
  },
  cloudinary: {
    type: cloudinaryAssetSchema,
    default: () => ({})
  },
  uploadedAt: {
    type: Date,
    default: null
  },
  uploadedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  verifiedAt: {
    type: Date,
    default: null
  },
  verifiedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  rejectionReason: {
    type: String,
    trim: true,
    default: ''
  },
  history: {
    type: [documentHistorySchema],
    default: []
  }
};

const managedDocumentSchema = new mongoose.Schema(managedDocumentFields, {
  _id: false
});

const birthCertificateDocumentSchema = new mongoose.Schema(
  {
    ...managedDocumentFields,
    verification: {
      type: documentVerificationSchema,
      default: () => ({})
    }
  },
  { _id: false }
);

const documentAssetsSchema = new mongoose.Schema(
  {
    photograph: {
      type: managedDocumentSchema,
      default: () => ({})
    },
    signature: {
      type: managedDocumentSchema,
      default: () => ({})
    },
    birthCertificate: {
      type: birthCertificateDocumentSchema,
      default: () => ({})
    },
    correctionProof: {
      type: managedDocumentSchema,
      default: () => ({})
    }
  },
  { _id: false }
);

const correctionChangeSchema = new mongoose.Schema(
  {
    field: {
      type: String,
      trim: true,
      default: ''
    },
    oldValue: {
      type: mongoose.Schema.Types.Mixed,
      default: null
    },
    newValue: {
      type: mongoose.Schema.Types.Mixed,
      default: null
    }
  },
  { _id: false }
);

const correctionInfoSchema = new mongoose.Schema(
  {
    correctionOf: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Application',
      default: null
    },
    baseApplicationId: {
      type: String,
      trim: true,
      default: ''
    },
    requestedChanges: {
      type: [correctionChangeSchema],
      default: []
    },
    reason: {
      type: String,
      trim: true,
      default: ''
    },
    proofStatus: {
      type: String,
      enum: ['not_uploaded', 'uploaded', 'verified', 'rejected'],
      default: 'not_uploaded'
    }
  },
  { _id: false }
);

const biometricVerificationSchema = new mongoose.Schema(
  {
    status: {
      type: String,
      enum: ['pending', 'passed', 'failed', 'expired', 'used'],
      default: 'pending'
    },
    sessionId: {
      type: String,
      trim: true,
      default: ''
    },
    provider: {
      type: String,
      trim: true,
      default: ''
    },
    livenessScore: {
      type: Number,
      default: null
    },
    faceMatchScore: {
      type: Number,
      default: null
    },
    livenessThreshold: {
      type: Number,
      default: null
    },
    faceMatchThreshold: {
      type: Number,
      default: null
    },
    challengePassed: {
      type: Boolean,
      default: false
    },
    singleFaceDetected: {
      type: Boolean,
      default: false
    },
    failureReason: {
      type: String,
      trim: true,
      default: ''
    },
    verifiedAt: {
      type: Date,
      default: null
    },
    deviceType: {
      type: String,
      enum: ['mobile', 'desktop', ''],
      default: ''
    },
    qrFlow: {
      type: Boolean,
      default: false
    }
  },
  { _id: false }
);

const statusHistorySchema = new mongoose.Schema(
  {
    fromStatus: {
      type: String,
      trim: true,
      default: ''
    },
    toStatus: {
      type: String,
      trim: true,
      required: true
    },
    reason: {
      type: String,
      trim: true,
      default: ''
    },
    note: {
      type: String,
      trim: true,
      default: ''
    },
    changedAt: {
      type: Date,
      default: Date.now
    },
    changedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    changedByRole: {
      type: String,
      enum: ['citizen', 'admin', 'system_supervisor', 'support_staff', 'system'],
      default: 'system'
    },
    ipAddress: {
      type: String,
      trim: true,
      default: ''
    },
    userAgent: {
      type: String,
      trim: true,
      default: ''
    },
    requestId: {
      type: String,
      trim: true,
      default: ''
    }
  },
  { _id: false }
);

const applicationSchema = new mongoose.Schema(
  {
    applicant: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    applicationId: {
      type: String,
      unique: true,
      trim: true
    },
    applicationType: {
      type: String,
      enum: ['new', 'correction', 'reissue'],
      default: 'new'
    },
    fullNameEnglish: {
      type: String,
      required: [true, 'Full name in English is required'],
      trim: true
    },
    fullNameBangla: {
      type: String,
      trim: true
    },
    fatherName: {
      type: String,
      required: [true, 'Father name is required'],
      trim: true
    },
    motherName: {
      type: String,
      required: [true, 'Mother name is required'],
      trim: true
    },
    spouseName: {
      type: String,
      trim: true
    },
    dateOfBirth: {
      type: Date,
      required: [true, 'Date of birth is required']
    },
    gender: {
      type: String,
      enum: ['male', 'female', 'other'],
      required: [true, 'Gender is required']
    },
    bloodGroup: {
      type: String,
      enum: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']
    },
    maritalStatus: {
      type: String,
      enum: ['single', 'married', 'divorced', 'widowed'],
      default: 'single'
    },
    birthRegistrationNumber: {
      type: String,
      trim: true
    },
    existingNidNumber: {
      type: String,
      trim: true
    },
    jurisdiction: {
      type: mongoose.Schema.Types.Mixed,
      default: () => ({
        district: '',
        division: '',
        source: 'permanentAddress'
      })
    },
    phone: {
      type: String,
      required: [true, 'Phone number is required'],
      trim: true
    },
    email: {
      type: String,
      trim: true,
      lowercase: true
    },
    occupation: {
      type: String,
      trim: true
    },
    presentAddress: {
      type: addressSchema,
      required: true
    },
    permanentAddress: {
      type: addressSchema,
      required: true
    },
    documents: {
      type: legacyDocumentSchema,
      default: () => ({})
    },
    documentAssets: {
      type: documentAssetsSchema,
      default: () => ({})
    },
    biometricVerification: {
      type: biometricVerificationSchema,
      default: () => ({})
    },
    documentVerificationSession: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'DocumentVerificationSession',
      select: false,
      default: null
    },
    resubmissionInfo: {
      isResubmission: {
        type: Boolean,
        default: false
      },
      previousApplication: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Application',
        default: null
      },
      previousApplicationId: {
        type: String,
        trim: true,
        default: ''
      },
      previousStatus: {
        type: String,
        trim: true,
        default: ''
      },
      previousRejectedAt: {
        type: Date,
        default: null
      },
      previousRejectionReason: {
        type: String,
        trim: true,
        default: ''
      },
      previousRejectionNotes: {
        type: String,
        trim: true,
        default: ''
      },
      rejectionReason: {
        type: String,
        trim: true,
        default: ''
      },
      rejectedAt: {
        type: Date,
        default: null
      },
      resubmittedAt: {
        type: Date,
        default: null
      },
      resubmissionCount: {
        type: Number,
        default: 0
      }
    },
    correctionInfo: {
      type: correctionInfoSchema,
      default: () => ({})
    },
    status: {
      type: String,
      enum: [
        'draft',
        'submitted',
        'under_review',
        'approved',
        'rejected',
        'printed',
        'dispatched',
        'delivered',
        'cancelled'
      ],
      default: 'draft'
    },
    statusHistory: {
      type: [statusHistorySchema],
      default: []
    },
    rejectionReason: {
      type: String,
      trim: true,
      default: ''
    },
    submittedAt: {
      type: Date,
      default: null
    },
    approvedAt: {
      type: Date,
      default: null
    },
    printedAt: {
      type: Date,
      default: null
    },
    dispatchedAt: {
      type: Date,
      default: null
    },
    deliveredAt: {
      type: Date,
      default: null
    },
    cancelledAt: {
      type: Date,
      default: null
    },
    latestStatusChangedAt: {
      type: Date,
      default: null
    }
  },
  {
    timestamps: true
  }
);

applicationSchema.index({ applicant: 1, createdAt: -1 });
applicationSchema.index({ applicant: 1, status: 1, updatedAt: -1 });
applicationSchema.index({ status: 1, updatedAt: -1 });
applicationSchema.index({ latestStatusChangedAt: -1 });
applicationSchema.index({ status: 1, createdAt: -1, _id: -1 });
applicationSchema.index({ status: 1, updatedAt: -1, _id: -1 });
applicationSchema.index({ phone: 1, createdAt: -1 });
applicationSchema.index({ birthRegistrationNumber: 1, createdAt: -1 });
applicationSchema.index({ existingNidNumber: 1, createdAt: -1 });
applicationSchema.index({
  'documentAssets.birthCertificate.verification.status': 1,
  status: 1
});
applicationSchema.index({
  applicant: 1,
  applicationType: 1,
  status: 1,
  createdAt: -1
});
applicationSchema.index({ applicant: 1, applicationType: 1, createdAt: -1 });
applicationSchema.index({ 'resubmissionInfo.isResubmission': 1 });
applicationSchema.index({ 'jurisdiction.district': 1, status: 1, createdAt: -1 });

module.exports =
  mongoose.models.Application ||
  mongoose.model('Application', applicationSchema);
