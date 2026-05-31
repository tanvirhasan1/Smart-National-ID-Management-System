const mongoose = require('mongoose');

const adminPresenceSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
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

// Keep one unique index only for each internal user presence row.
adminPresenceSchema.index({ userId: 1 }, { unique: true });

// Speed up live admin lookups.
adminPresenceSchema.index({ isOnline: 1, lastSeenAt: -1 });

// Speed up recent activity checks.
adminPresenceSchema.index({ lastSeenAt: -1 });

module.exports =
  mongoose.models.AdminPresence ||
  mongoose.model('AdminPresence', adminPresenceSchema);