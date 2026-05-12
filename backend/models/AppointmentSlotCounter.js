const mongoose = require('mongoose');

const appointmentSlotCounterSchema = new mongoose.Schema(
  {
    center: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Center',
      required: true,
      index: true
    },
    dateKey: {
      type: String,
      required: true,
      match: [/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD'],
      index: true
    },
    slotKey: {
      type: String,
      required: true,
      trim: true,
      index: true
    },
    capacity: {
      type: Number,
      required: true,
      min: 1
    },
    bookedCount: {
      type: Number,
      default: 0,
      min: 0
    }
  },
  { timestamps: true }
);

appointmentSlotCounterSchema.index(
  { center: 1, dateKey: 1, slotKey: 1 },
  { unique: true }
);

module.exports =
  mongoose.models.AppointmentSlotCounter ||
  mongoose.model('AppointmentSlotCounter', appointmentSlotCounterSchema);