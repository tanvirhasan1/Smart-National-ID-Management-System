const mongoose = require('mongoose');

const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;
const DATE_KEY_RE = /^\d{4}-\d{2}-\d{2}$/;

const appointmentSlotSchema = new mongoose.Schema(
  {
    label: {
      type: String,
      trim: true,
      maxlength: [80, 'Slot label cannot exceed 80 characters']
    },
    startTime: {
      type: String,
      required: [true, 'Slot start time is required'],
      match: [TIME_RE, 'Start time must be HH:mm']
    },
    endTime: {
      type: String,
      required: [true, 'Slot end time is required'],
      match: [TIME_RE, 'End time must be HH:mm']
    },
    capacity: {
      type: Number,
      required: [true, 'Slot capacity is required'],
      min: [1, 'Slot capacity must be at least 1']
    },
    isActive: {
      type: Boolean,
      default: true
    }
  },
  { _id: true }
);

const weekdayTemplateSchema = new mongoose.Schema(
  {
    weekday: {
      type: Number,
      required: [true, 'Weekday is required'],
      min: [0, 'Weekday must be between 0 and 6'],
      max: [6, 'Weekday must be between 0 and 6']
      // 0 = Sunday, 1 = Monday, ... 5 = Friday, 6 = Saturday
    },
    isOpen: {
      type: Boolean,
      default: true
    },
    dailyLimit: {
      type: Number,
      min: [1, 'Daily limit must be at least 1']
      // Optional. Empty means total active slot capacity will be used.
    },
    slots: {
      type: [appointmentSlotSchema],
      default: []
    },
    note: {
      type: String,
      trim: true,
      maxlength: [160, 'Template note cannot exceed 160 characters']
    }
  },
  { _id: false }
);

const dateOverrideSchema = new mongoose.Schema(
  {
    dateKey: {
      type: String,
      required: [true, 'Date is required'],
      match: [DATE_KEY_RE, 'Date must be YYYY-MM-DD']
    },
    mode: {
      type: String,
      enum: ['closed', 'custom'],
      required: [true, 'Override mode is required']
      // No override means inherit weekday template.
    },
    reason: {
      type: String,
      trim: true,
      maxlength: [160, 'Reason cannot exceed 160 characters']
    },
    dailyLimit: {
      type: Number,
      min: [1, 'Daily limit must be at least 1']
    },
    slots: {
      type: [appointmentSlotSchema],
      default: []
    }
  },
  { _id: true }
);

const appointmentConfigSchema = new mongoose.Schema(
  {
    center: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Center',
      required: true,
      unique: true,
      index: true
    },
    minLeadDays: {
      type: Number,
      required: [true, 'Minimum lead days is required'],
      min: [0, 'Minimum lead days cannot be negative']
    },
    maxAdvanceDays: {
      type: Number,
      required: [true, 'Maximum advance days is required'],
      min: [1, 'Maximum advance days must be at least 1']
    },
    weeklyTemplates: {
      type: [weekdayTemplateSchema],
      default: []
    },
    dateOverrides: {
      type: [dateOverrideSchema],
      default: []
    },
    isActive: {
      type: Boolean,
      default: true
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  },
  { timestamps: true }
);

const getSlotKey = (slot) => `${slot.startTime}-${slot.endTime}`;

const getActiveCapacity = (slots = []) => {
  return slots
    .filter((slot) => slot.isActive !== false)
    .reduce((sum, slot) => sum + Number(slot.capacity || 0), 0);
};

const validateSlotList = (slots = [], label = 'Slot') => {
  const seenSlotKeys = new Set();

  for (const slot of slots || []) {
    if (!TIME_RE.test(slot.startTime) || !TIME_RE.test(slot.endTime)) {
      throw new Error(`${label} start and end time must be HH:mm`);
    }

    if (slot.startTime >= slot.endTime) {
      throw new Error(`${label} end time must be after start time`);
    }

    if (!slot.capacity || Number(slot.capacity) < 1) {
      throw new Error(`${label} capacity must be at least 1`);
    }

    const slotKey = getSlotKey(slot);

    if (seenSlotKeys.has(slotKey)) {
      throw new Error(`Duplicate slot found: ${slotKey}`);
    }

    seenSlotKeys.add(slotKey);
  }
};

appointmentConfigSchema.pre('validate', function validateAppointmentConfig(next) {
  try {
    const seenWeekdays = new Set();

    if (Number(this.maxAdvanceDays) < Number(this.minLeadDays)) {
      throw new Error(
        'Maximum advance days must be greater than or equal to minimum lead days'
      );
    }

    for (const template of this.weeklyTemplates || []) {
      if (seenWeekdays.has(template.weekday)) {
        throw new Error(`Duplicate weekday template found: ${template.weekday}`);
      }

      seenWeekdays.add(template.weekday);
      validateSlotList(template.slots, 'Weekday slot');

      const activeCapacity = getActiveCapacity(template.slots);

      if (template.isOpen && activeCapacity < 1) {
        throw new Error('Open weekday must have at least one active slot');
      }

      if (template.isOpen && template.dailyLimit && template.dailyLimit > activeCapacity) {
        throw new Error(
          `Daily limit for weekday ${template.weekday} cannot exceed active slot capacity`
        );
      }
    }

    const seenDates = new Set();

    for (const override of this.dateOverrides || []) {
      if (seenDates.has(override.dateKey)) {
        throw new Error(`Duplicate date override found: ${override.dateKey}`);
      }

      seenDates.add(override.dateKey);
      validateSlotList(override.slots, 'Date override slot');

      if (override.mode === 'custom') {
        const activeCapacity = getActiveCapacity(override.slots);

        if (activeCapacity < 1) {
          throw new Error('Custom date override must have at least one active slot');
        }

        if (override.dailyLimit && override.dailyLimit > activeCapacity) {
          throw new Error('Custom date daily limit cannot exceed active slot capacity');
        }
      }
    }

    next();
  } catch (error) {
    next(error);
  }
});

module.exports =
  mongoose.models.AppointmentConfig ||
  mongoose.model('AppointmentConfig', appointmentConfigSchema);