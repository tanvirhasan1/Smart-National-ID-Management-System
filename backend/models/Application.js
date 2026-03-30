const mongoose = require('mongoose');

const addressSchema = new mongoose.Schema(
  {
    division: {
      type: String,
      trim: true
    },
    district: {
      type: String,
      trim: true
    },
    upazila: {
      type: String,
      trim: true
    },
    unionOrWard: {
      type: String,
      trim: true
    },
    villageOrArea: {
      type: String,
      trim: true
    },
    postOffice: {
      type: String,
      trim: true
    },
    postalCode: {
      type: String,
      trim: true
    }
  },
  { _id: false }
);

const documentSchema = new mongoose.Schema(
  {
    birthCertificate: {
      type: String,
      trim: true
    },
    fatherNid: {
      type: String,
      trim: true
    },
    motherNid: {
      type: String,
      trim: true
    },
    utilityBill: {
      type: String,
      trim: true
    },
    passport: {
      type: String,
      trim: true
    },
    photo: {
      type: String,
      trim: true
    }
  },
  { _id: false }
);

const applicationSchema = new mongoose.Schema(
  {
    applicant: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    applicationId: {
      type: String,
      unique: true,
      trim: true
    },
    applicationType: {
      type: String,
      enum: ['new', 'correction', 'reissue'],
      default: 'new'
    },

    fullNameEnglish: {
      type: String,
      required: [true, 'Full name in English is required'],
      trim: true
    },
    fullNameBangla: {
      type: String,
      trim: true
    },
    fatherName: {
      type: String,
      required: [true, 'Father name is required'],
      trim: true
    },
    motherName: {
      type: String,
      required: [true, 'Mother name is required'],
      trim: true
    },
    spouseName: {
      type: String,
      trim: true
    },
    dateOfBirth: {
      type: Date,
      required: [true, 'Date of birth is required']
    },
    gender: {
      type: String,
      enum: ['male', 'female', 'other'],
      required: [true, 'Gender is required']
    },
    bloodGroup: {
      type: String,
      enum: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']
    },
    maritalStatus: {
      type: String,
      enum: ['single', 'married', 'divorced', 'widowed'],
      default: 'single'
    },
    birthRegistrationNumber: {
      type: String,
      trim: true
    },
    existingNidNumber: {
      type: String,
      trim: true
    },
    phone: {
      type: String,
      required: [true, 'Phone number is required'],
      trim: true
    },
    email: {
      type: String,
      trim: true,
      lowercase: true
    },
    occupation: {
      type: String,
      trim: true
    },

    presentAddress: {
      type: addressSchema,
      required: true
    },
    permanentAddress: {
      type: addressSchema,
      required: true
    },

    documents: {
      type: documentSchema,
      default: {}
    },

    status: {
      type: String,
      enum: [
        'draft',
        'submitted',
        'under_review',
        'approved',
        'rejected',
        'printed',
        'delivered',
        'cancelled'
      ],
      default: 'draft'
    },
    rejectionReason: {
      type: String,
      trim: true
    },
    submittedAt: {
      type: Date
    },
    approvedAt: {
      type: Date
    },
    deliveredAt: {
      type: Date
    },
    cancelledAt: {
      type: Date
    }
  },
  {
    timestamps: true
  }
);

module.exports =
  mongoose.models.Application ||
  mongoose.model('Application', applicationSchema);