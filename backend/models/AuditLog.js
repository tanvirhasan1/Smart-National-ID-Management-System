const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema(
  {
    actor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    actorRole: {
      type: String,
      enum: ['citizen', 'admin', 'system_supervisor', 'support_staff'],
      required: true
    },
    action: {
      type: String,
      required: true,
      trim: true
    },
    entityType: {
      type: String,
      required: true,
      trim: true
    },
    entityId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true
    },
    message: {
      type: String,
      trim: true,
      default: ''
    },
    reason: {
      type: String,
      trim: true,
      default: ''
    },
    severity: {
      type: String,
      enum: ['info', 'warning', 'critical'],
      default: 'info'
    },
    sourceModule: {
      type: String,
      trim: true,
      default: 'api'
    },
    requestId: {
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
    beforeState: {
      type: mongoose.Schema.Types.Mixed,
      default: null
    },
    afterState: {
      type: mongoose.Schema.Types.Mixed,
      default: null
    },
    changedFields: {
      type: [String],
      default: []
    },
    meta: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    }
  },
  {
    timestamps: true
  }
);

auditLogSchema.index({ createdAt: -1 });
auditLogSchema.index({ actor: 1, createdAt: -1 });
auditLogSchema.index({ entityType: 1, entityId: 1, createdAt: -1 });
auditLogSchema.index({ action: 1, createdAt: -1 });
auditLogSchema.index({ severity: 1, createdAt: -1 });
auditLogSchema.index({ sourceModule: 1, createdAt: -1 });
auditLogSchema.index({ requestId: 1 }, { sparse: true });

module.exports =
  mongoose.models.AuditLog ||
  mongoose.model('AuditLog', auditLogSchema);