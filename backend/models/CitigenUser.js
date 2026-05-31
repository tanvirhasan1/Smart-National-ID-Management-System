const mongoose = require('mongoose');

const citigenUserSchema = new mongoose.Schema(
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
    fullNameBangla: {
      type: String,
      trim: true,
      default: ''
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
    birthRegNumber: {
      type: String,
      trim: true,
      default: ''
    },
    status: {
      type: String,
      enum: ['active', 'blocked', 'pending'],
      default: 'active'
    },
    isVerified: {
      type: Boolean,
      default: false
    }
  },
  {
    timestamps: true,
    collection: 'citigen_users'
  }
);

module.exports =
  mongoose.models.CitigenUser || mongoose.model('CitigenUser', citigenUserSchema);