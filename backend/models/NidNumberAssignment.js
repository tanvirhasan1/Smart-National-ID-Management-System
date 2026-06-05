const mongoose = require('mongoose');

const nidNumberAssignmentSchema = new mongoose.Schema(
  {
    application: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Application',
      required: true,
      unique: true
    },
    citizen: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    nidNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      match: [/^[1-9]\d{9}$/, 'NID number must be a 10-digit numeric string']
    },
    provider: {
      type: String,
      trim: true,
      default: 'mock'
    },
    status: {
      type: String,
      enum: ['assigned', 'reserved', 'cancelled'],
      default: 'assigned'
    },
    assignedAt: {
      type: Date,
      default: Date.now
    },
    externalReference: {
      type: String,
      trim: true,
      default: null
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: () => ({})
    }
  },
  {
    timestamps: true,
    collection: 'nid_number_assignments'
  }
);

nidNumberAssignmentSchema.index({ citizen: 1, assignedAt: -1 });
nidNumberAssignmentSchema.index({ provider: 1, status: 1, assignedAt: -1 });

module.exports =
  mongoose.models.NidNumberAssignment ||
  mongoose.model('NidNumberAssignment', nidNumberAssignmentSchema);
