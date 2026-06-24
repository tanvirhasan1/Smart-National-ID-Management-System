const mongoose = require('mongoose');

const passportPhotoSchema = new mongoose.Schema(
  {
    data: {
      type: Buffer,
      select: false
    },
    contentType: {
      type: String,
      trim: true,
      default: ''
    },
    originalName: {
      type: String,
      trim: true,
      default: ''
    },
    size: {
      type: Number,
      default: 0
    }
  },
  { _id: false }
);

const biometricVerificationSessionSchema = new mongoose.Schema(
  {
    citizen: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    sessionId: {
      type: String,
      unique: true,
      required: true,
      trim: true,
      index: true
    },
    status: {
      type: String,
      enum: ['pending', 'passed', 'failed', 'expired', 'used'],
      default: 'pending',
      index: true
    },
    passportPhotoHash: {
      type: String,
      trim: true,
      default: ''
    },
    passportPhoto: {
      type: passportPhotoSchema,
      default: null
    },
    qrTokenHash: {
      type: String,
      trim: true,
      default: '',
      select: false
    },
    deviceType: {
      type: String,
      enum: ['mobile', 'desktop'],
      required: true
    },
    qrFlow: {
      type: Boolean,
      default: false
    },
    challengeSequence: {
      type: [String],
      enum: ['blink', 'turn_left', 'turn_right', 'smile'],
      default: []
    },
    provider: {
      type: String,
      trim: true,
      default: 'opencv-yunet-sface-minifasnet'
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
    singleFaceDetected: {
      type: Boolean,
      default: false
    },
    challengePassed: {
      type: Boolean,
      default: false
    },
    failureReason: {
      type: String,
      trim: true,
      default: ''
    },
    expiresAt: {
      type: Date,
      required: true
    },
    verifiedAt: {
      type: Date,
      default: null
    },
    usedAt: {
      type: Date,
      default: null
    },
    attemptCount: {
      type: Number,
      default: 0
    },
    qrOpenCount: {
      type: Number,
      default: 0
    },
    verificationStartedAt: {
      type: Date,
      default: null
    },
    inProgressUntil: {
      type: Date,
      default: null
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
    }
  },
  {
    timestamps: true
  }
);

biometricVerificationSessionSchema.index({ citizen: 1, status: 1, createdAt: -1 });
biometricVerificationSessionSchema.index({ citizen: 1, sessionId: 1 });
biometricVerificationSessionSchema.index(
  { expiresAt: 1 },
  { expireAfterSeconds: 60 * 60 * 24 }
);

module.exports =
  mongoose.models.BiometricVerificationSession ||
  mongoose.model(
    'BiometricVerificationSession',
    biometricVerificationSessionSchema
  );
