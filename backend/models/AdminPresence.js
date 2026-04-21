const mongoose = require('mongoose');

const adminPresenceSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true
    },
    role: {
      type: String,
      enum: ['admin', 'system_supervisor', 'support_staff'],
      required: true
    },
    isOnline: {
      type: Boolean,
      default: false
    },
    sessionStartedAt: {
      type: Date,
      default: null
    },
    lastSeenAt: {
      type: Date,
      default: null
    },
    currentRoute: {
      type: String,
      trim: true,
      default: ''
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
    lastActiveSource: {
      type: String,
      trim: true,
      default: 'request'
    }
  },
  {
    timestamps: true
  }
);

// Fast lookup by user.
adminPresenceSchema.index({ userId: 1 }, { unique: true });

// Fast live-user filtering.
adminPresenceSchema.index({ isOnline: 1, lastSeenAt: -1 });

// Fast recent activity checks.
adminPresenceSchema.index({ lastSeenAt: -1 });

module.exports =
  mongoose.models.AdminPresence ||
  mongoose.model('AdminPresence', adminPresenceSchema);