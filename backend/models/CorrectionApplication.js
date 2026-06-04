const mongoose = require('mongoose');

const addressSchema = new mongoose.Schema(
  {
    division: { type: String, trim: true, default: '' },
    district: { type: String, trim: true, default: '' },
    upazila: { type: String, trim: true, default: '' },
    unionOrWard: { type: String, trim: true, default: '' },
    villageOrArea: { type: String, trim: true, default: '' },
    postOffice: { type: String, trim: true, default: '' },
    postalCode: { type: String, trim: true, default: '' }
  },
  { _id: false }
);

const correctionDataSchema = new mongoose.Schema(
  {
    fullNameEnglish: { type: String, trim: true, default: '' },
    fullNameBangla: { type: String, trim: true, default: '' },
    fatherName: { type: String, trim: true, default: '' },
    motherName: { type: String, trim: true, default: '' },
    spouseName: { type: String, trim: true, default: '' },
    dateOfBirth: { type: Date, default: null },
    gender: { type: String, trim: true, default: '' },
    bloodGroup: { type: String, trim: true, default: '' },
    maritalStatus: { type: String, trim: true, default: '' },
    birthRegistrationNumber: { type: String, trim: true, default: '' },
    existingNidNumber: { type: String, trim: true, default: '' },
    phone: { type: String, trim: true, default: '' },
    email: { type: String, trim: true, lowercase: true, default: '' },
    occupation: { type: String, trim: true, default: '' },
    presentAddress: { type: addressSchema, default: () => ({}) },
    permanentAddress: { type: addressSchema, default: () => ({}) }
  },
  { _id: false }
);

const changedFieldSchema = new mongoose.Schema(
  {
    field: { type: String, trim: true, required: true },
    label: { type: String, trim: true, required: true },
    oldValue: { type: mongoose.Schema.Types.Mixed, default: '' },
    newValue: { type: mongoose.Schema.Types.Mixed, default: '' },
    displayOldValue: { type: String, trim: true, default: '' },
    displayNewValue: { type: String, trim: true, default: '' }
  },
  { _id: false }
);

const cloudinaryAssetSchema = new mongoose.Schema(
  {
    assetId: { type: String, trim: true, default: '' },
    publicId: { type: String, trim: true, default: '' },
    version: { type: Number, default: null },
    secureUrl: { type: String, trim: true, default: '' },
    resourceType: { type: String, trim: true, default: '' },
    format: { type: String, trim: true, default: '' },
    bytes: { type: Number, default: 0 },
    width: { type: Number, default: null },
    height: { type: Number, default: null },
    originalFilename: { type: String, trim: true, default: '' },
    folder: { type: String, trim: true, default: '' },
    etag: { type: String, trim: true, default: '' },
    createdAt: { type: Date, default: null }
  },
  { _id: false }
);

const correctionDocumentSchema = new mongoose.Schema(
  {
    documentType: {
      type: String,
      enum: ['photograph', 'verificationDocument'],
      required: true
    },
    status: {
      type: String,
      enum: ['uploaded', 'verified', 'rejected'],
      default: 'uploaded'
    },
    cloudinary: { type: cloudinaryAssetSchema, default: () => ({}) },
    uploadedAt: { type: Date, default: Date.now },
    uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    rejectionReason: { type: String, trim: true, default: '' }
  },
  { _id: true }
);

const statusHistorySchema = new mongoose.Schema(
  {
    fromStatus: { type: String, trim: true, default: '' },
    toStatus: { type: String, trim: true, required: true },
    reason: { type: String, trim: true, default: '' },
    note: { type: String, trim: true, default: '' },
    changedAt: { type: Date, default: Date.now },
    changedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    changedByRole: {
      type: String,
      enum: ['citizen', 'admin', 'system_supervisor', 'support_staff', 'system'],
      default: 'system'
    }
  },
  { _id: false }
);

const correctionApplicationSchema = new mongoose.Schema(
  {
    applicant: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    correctionId: { type: String, unique: true, trim: true, required: true },
    baseApplication: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Application',
      required: true
    },
    baseApplicationId: { type: String, trim: true, default: '' },
    nidNumber: { type: String, trim: true, default: '' },
    reason: { type: String, trim: true, required: true },
    previousData: { type: correctionDataSchema, required: true },
    requestedData: { type: correctionDataSchema, required: true },
    changedFields: { type: [changedFieldSchema], default: [] },
    photoChangeRequested: { type: Boolean, default: false },
    supportingDocumentCount: { type: Number, min: 1, max: 4, default: 1 },
    documents: {
      photograph: { type: correctionDocumentSchema, default: null },
      verificationDocuments: { type: [correctionDocumentSchema], default: [] }
    },
    status: {
      type: String,
      enum: ['submitted', 'under_review', 'approved', 'rejected', 'cancelled'],
      default: 'submitted'
    },
    statusHistory: { type: [statusHistorySchema], default: [] },
    rejectionReason: { type: String, trim: true, default: '' },
    submittedAt: { type: Date, default: Date.now },
    reviewedAt: { type: Date, default: null },
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    approvedAt: { type: Date, default: null },
    rejectedAt: { type: Date, default: null },
    latestStatusChangedAt: { type: Date, default: Date.now }
  },
  { timestamps: true }
);

correctionApplicationSchema.index({ applicant: 1, createdAt: -1 });
correctionApplicationSchema.index({ status: 1, createdAt: -1, _id: -1 });
correctionApplicationSchema.index({ correctionId: 1 }, { unique: true });
correctionApplicationSchema.index({ baseApplication: 1, createdAt: -1 });
correctionApplicationSchema.index({ nidNumber: 1, createdAt: -1 });

module.exports =
  mongoose.models.CorrectionApplication ||
  mongoose.model('CorrectionApplication', correctionApplicationSchema);
