const mongoose = require('mongoose');

const adminScopeSchema = new mongoose.Schema(
  {
    scopeType: {
      type: String,
      enum: ['national', 'district'],
      default: 'national'
    },
    districts: {
      type: [String],
      default: []
    },
    primaryDistrict: {
      type: String,
      trim: true,
      default: ''
    },
    scopeUpdatedAt: {
      type: Date,
      default: null
    }
  },
  { _id: false }
);

const adminUserSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true
    },
    fullName: {
      type: String,
      trim: true,
      required: true
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
      required: true
    },
    phone: {
      type: String,
      trim: true,
      required: true
    },
    role: {
      type: String,
      enum: [
        'admin',
        'system_supervisor',
        'support_staff'
      ],
      required: true
    },
    permissions: {
      type: [String],
      default: []
    },
    adminScope: {
      type: adminScopeSchema,
      default: () => ({})
    },
    status: {
      type: String,
      enum: ['active', 'blocked', 'pending'],
      default: 'active'
    },
    isVerified: {
      type: Boolean,
      default: true
    }
  },
  {
    timestamps: true,
    collection: 'admin_users'
  }
);

adminUserSchema.index({ role: 1, 'adminScope.scopeType': 1, 'adminScope.districts': 1 });

module.exports =
  mongoose.models.AdminUser || mongoose.model('AdminUser', adminUserSchema);
