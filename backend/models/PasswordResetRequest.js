const mongoose = require('mongoose');

const passwordResetRequestSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true
    },
    resetCode: {
      type: String,
      required: true,
      trim: true
    },
    resetCodeExpires: {
      type: Date,
      required: true
    },
    resetToken: {
      type: String,
      required: true,
      unique: true,
      trim: true
    },
    expiresAt: {
      type: Date,
      required: true,
      index: { expires: 0 }
    }
  },
  {
    timestamps: true,
    collection: 'password_reset_requests'
  }
);

passwordResetRequestSchema.index({ user: 1 }, { unique: true });

module.exports =
  mongoose.models.PasswordResetRequest ||
  mongoose.model('PasswordResetRequest', passwordResetRequestSchema);