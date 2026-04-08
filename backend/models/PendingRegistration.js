const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const addressSchema = new mongoose.Schema(
  {
    division: { type: String, trim: true, default: '' },
    district: { type: String, trim: true, default: '' },
    upazila: { type: String, trim: true, default: '' },
    union: { type: String, trim: true, default: '' },
    village: { type: String, trim: true, default: '' },
    postCode: { type: String, trim: true, default: '' }
  },
  { _id: false }
);

const pendingRegistrationSchema = new mongoose.Schema(
  {
    fullName: {
      type: String,
      required: true,
      trim: true
    },
    fullNameBangla: {
      type: String,
      trim: true,
      default: ''
    },
    birthRegNumber: {
      type: String,
      required: true,
      trim: true
    },
    dateOfBirth: {
      type: Date,
      required: true
    },
    gender: {
      type: String,
      enum: ['male', 'female', 'other'],
      required: true
    },
    placeOfBirth: {
      type: String,
      trim: true,
      default: ''
    },
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true
    },
    phone: {
      type: String,
      required: true,
      trim: true
    },
    password: {
      type: String,
      required: true,
      minlength: 8
    },
    presentAddress: {
      type: addressSchema,
      default: () => ({})
    },
    permanentAddress: {
      type: addressSchema,
      default: () => ({})
    },
    otpCode: {
      type: String,
      required: true,
      trim: true
    },
    otpExpires: {
      type: Date,
      required: true
    },
    verificationToken: {
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
    collection: 'pending_registrations'
  }
);

pendingRegistrationSchema.index(
  { email: 1 },
  {
    unique: true,
    partialFilterExpression: {
      email: { $type: 'string', $ne: '' }
    }
  }
);

pendingRegistrationSchema.index(
  { phone: 1 },
  {
    unique: true,
    partialFilterExpression: {
      phone: { $type: 'string', $ne: '' }
    }
  }
);

// Hash password before storing temporary registration data.
pendingRegistrationSchema.pre('save', async function hashPassword() {
  if (!this.isModified('password')) {
    return;
  }

  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

module.exports =
  mongoose.models.PendingRegistration ||
  mongoose.model('PendingRegistration', pendingRegistrationSchema);