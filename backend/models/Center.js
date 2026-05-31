const mongoose = require('mongoose');

const centerSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Center name is required'],
      trim: true
    },
    district: {
      type: String,
      required: [true, 'District is required'],
      trim: true
    },
    address: {
      type: String,
      required: [true, 'Address is required'],
      trim: true
    },
    contactNumber: {
      type: String,
      trim: true
    },
    officeHours: {
      type: String,
      trim: true
    },
    dailyCapacity: {
      type: Number,
      min: [1, 'Daily capacity must be at least 1']
      // Legacy field only. Appointment capacity now comes from AppointmentConfig.
    },
    isActive: {
      type: Boolean,
      default: true
    }
  },
  { timestamps: true }
);

module.exports =
  mongoose.models.Center ||
  mongoose.model('Center', centerSchema);