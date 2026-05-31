const mongoose = require('mongoose');

const documentVerificationSessionSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    tokenHash: {
      type: String,
      trim: true,
      default: undefined,
      index: true,
      select: false
    },
    documentHash: {
      type: String,
      trim: true,
      required: true,
      index: true,
      select: false
    },
    claimedFieldsHash: {
      type: String,
      trim: true,
      required: true,
      index: true
    },
    status: {
      type: String,
      enum: [
        'passed',
        'mismatch',
        'not_found',
        'unreadable',
        'low_confidence',
        'failed'
      ],
      required: true,
      index: true
    },
    provider: {
      type: String,
      trim: true,
      default: ''
    },
    verification: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    },
    expiresAt: {
      type: Date,
      required: true,
      index: true
    },
    usedAt: {
      type: Date,
      default: null,
      index: true
    }
  },
  {
    timestamps: true
  }
);

documentVerificationSessionSchema.index({
  user: 1,
  status: 1,
  expiresAt: 1,
  createdAt: -1
});
documentVerificationSessionSchema.index({ tokenHash: 1, user: 1 });
documentVerificationSessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports =
  mongoose.models.DocumentVerificationSession ||
  mongoose.model(
    'DocumentVerificationSession',
    documentVerificationSessionSchema
  );
