const mongoose = require('mongoose');

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
        // 'super_admin',
        'system_supervisor',
        'support_staff'
      ],
      required: true
    },
    permissions: {
      type: [String],
      default: []
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

module.exports =
  mongoose.models.AdminUser || mongoose.model('AdminUser', adminUserSchema);