const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { getDefaultPermissions } = require('../utils/roles');

const addressSchema = new mongoose.Schema(
  {
    division: {
      type: String,
      trim: true,
      default: ''
    },
    district: {
      type: String,
      trim: true,
      default: ''
    },
    upazila: {
      type: String,
      trim: true,
      default: ''
    },
    union: {
      type: String,
      trim: true,
      default: ''
    },
    village: {
      type: String,
      trim: true,
      default: ''
    },
    postCode: {
      type: String,
      trim: true,
      default: ''
    }
  },
  { _id: false }
);

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

const userSchema = new mongoose.Schema(
  {
    fullName: {
      type: String,
      required: [true, 'Full name is required'],
      trim: true
    },
    fullNameBangla: {
      type: String,
      trim: true,
      default: ''
    },
    birthRegNumber: {
      type: String,
      trim: true,
      default: ''
    },
    dateOfBirth: {
      type: Date,
      default: null
    },
    gender: {
      type: String,
      enum: ['male', 'female', 'other', ''],
      default: ''
    },
    placeOfBirth: {
      type: String,
      trim: true,
      default: ''
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      lowercase: true,
      trim: true
    },
    phone: {
      type: String,
      required: [true, 'Phone number is required'],
      trim: true
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: 8
    },
    role: {
      type: String,
      enum: [
        'citizen',
        'admin',
        'system_supervisor',
        'support_staff'
      ],
      default: 'citizen'
    },
    permissions: {
      type: [String],
      default: []
    },
    adminScope: {
      type: adminScopeSchema,
      default: () => ({})
    },
    isVerified: {
      type: Boolean,
      default: false
    },
    status: {
      type: String,
      enum: ['active', 'blocked', 'pending'],
      default: 'active'
    },
    presentAddress: {
      type: addressSchema,
      default: () => ({})
    },
    permanentAddress: {
      type: addressSchema,
      default: () => ({})
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    passwordChangedAt: {
      type: Date,
      default: null
    },

    // Soft remove instead of hard delete so everything stays traceable.
    isArchived: {
      type: Boolean,
      default: false
    },
    archivedAt: {
      type: Date,
      default: null
    },
    archivedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    archiveReason: {
      type: String,
      trim: true,
      default: ''
    }
  },
  {
    timestamps: true
  }
);

userSchema.index(
  { email: 1 },
  {
    unique: true,
    partialFilterExpression: {
      email: { $type: 'string', $ne: '' }
    }
  }
);

userSchema.index(
  { phone: 1 },
  {
    unique: true,
    partialFilterExpression: {
      phone: { $type: 'string', $ne: '' }
    }
  }
);

// Speed up internal admin directory lookups.
userSchema.index({ role: 1, status: 1, isArchived: 1, createdAt: -1 });
userSchema.index({ role: 1, 'adminScope.scopeType': 1, 'adminScope.districts': 1 });

userSchema.pre('validate', function syncPermissions() {
  if (!Array.isArray(this.permissions) || this.permissions.length === 0) {
    this.permissions = getDefaultPermissions(this.role);
  }
});

// Hash password before save.
userSchema.pre('save', async function hashPassword() {
  if (!this.isModified('password')) {
    return;
  }

  // Skip re-hashing when the password is already a bcrypt hash.
  if (/^\$2[aby]\$\d{2}\$/.test(this.password)) {
    this.passwordChangedAt = new Date();
    return;
  }

  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  this.passwordChangedAt = new Date();
});

// Compare password.
userSchema.methods.matchPassword = async function matchPassword(enteredPassword) {
  return bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.models.User || mongoose.model('User', userSchema);
