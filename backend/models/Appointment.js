const mongoose = require('mongoose');

const appointmentSchema = new mongoose.Schema(
  {
    application: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Application',
      required: true,
    },
    applicant: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    center: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Center',
      required: true,
      index: true
    },
    appointmentDate: {
      type: Date,
      required: [true, 'Appointment date is required']
    },
    appointmentDateKey: {
      type: String,
      required: true,
      match: [/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD'],
      index: true
    },
    timeSlot: {
      type: String,
      required: [true, 'Time slot is required'],
      trim: true
    },
    timeSlotKey: {
      type: String,
      required: true,
      trim: true,
      index: true
    },
    timeSlotStart: {
      type: String,
      required: true,
      match: [/^([01]\d|2[0-3]):[0-5]\d$/, 'Start time must be HH:mm']
    },
    timeSlotEnd: {
      type: String,
      required: true,
      match: [/^([01]\d|2[0-3]):[0-5]\d$/, 'End time must be HH:mm']
    },
    slotSerial: {
      type: Number,
      required: true,
      min: 1
    },
    centerName: {
      type: String,
      required: [true, 'Center name is required'],
      trim: true
    },
    centerDistrict: {
      type: String,
      trim: true
    },
    notes: {
      type: String,
      trim: true,
      maxlength: [500, 'Notes cannot exceed 500 characters']
    },
    status: {
      type: String,
      enum: ['booked', 'completed', 'cancelled'],
      default: 'booked',
      index: true
    },
    bookedAt: {
      type: Date,
      default: Date.now
    },
    completedAt: Date,
    completedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    cancelledAt: Date,
    cancelledBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    cancelReason: {
      type: String,
      trim: true,
      maxlength: [300, 'Cancel reason cannot exceed 300 characters']
    }
  },
  { timestamps: true }
);

// One active appointment per approved application.
appointmentSchema.index(
  { application: 1 },
  {
    unique: true,
    partialFilterExpression: { status: { $in: ['booked', 'completed'] } }
  }
);

// Slot serial makes the final booking conflict-safe even under concurrent requests.
appointmentSchema.index(
  { center: 1, appointmentDateKey: 1, timeSlotKey: 1, slotSerial: 1 },
  {
    unique: true,
    partialFilterExpression: { status: { $in: ['booked', 'completed'] } }
  }
);

appointmentSchema.index({ center: 1, appointmentDateKey: 1, status: 1 });

module.exports =
  mongoose.models.Appointment ||
  mongoose.model('Appointment', appointmentSchema);