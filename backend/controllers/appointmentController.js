const mongoose = require('mongoose');
const Appointment = require('../models/Appointment');
const AppointmentConfig = require('../models/AppointmentConfig');
const AppointmentDayCounter = require('../models/AppointmentDayCounter');
const AppointmentSlotCounter = require('../models/AppointmentSlotCounter');
const Application = require('../models/Application');
const Center = require('../models/Center');
const {
  createAuditLog,
  getRequestAuditContext
} = require('../utils/auditLogger');

const BUSINESS_TIME_ZONE = process.env.APPOINTMENT_TIME_ZONE || 'Asia/Dhaka';
const DATE_KEY_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;
const MAX_AVAILABILITY_DAYS = 90;
const MAX_PAGE_SIZE = 100;

const WEEKDAY_NAMES = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday'
];

const parsePositiveInteger = (value, fallback) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : fallback;
};

const parseNonNegativeInteger = (value, fallback) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0
    ? Math.floor(parsed)
    : fallback;
};

const getPaginationOptions = (query = {}) => {
  const page = parsePositiveInteger(query.page, 1);
  const limit = Math.min(parsePositiveInteger(query.limit, 20), MAX_PAGE_SIZE);
  const skip = (page - 1) * limit;

  return { page, limit, skip };
};

const buildPaginationMeta = ({ page, limit, total }) => {
  const pages = Math.max(1, Math.ceil(total / limit));

  return {
    page,
    limit,
    total,
    pages,
    hasPrevPage: page > 1,
    hasNextPage: page < pages
  };
};

const getAdminAppointmentSort = (hasStatusFilter = false) => {
  const fifoSort = {
    appointmentDateKey: 1,
    timeSlotStart: 1,
    slotSerial: 1,
    bookedAt: 1,
    createdAt: 1,
    _id: 1
  };

  return hasStatusFilter ? fifoSort : { status: 1, ...fifoSort };
};

const getBusinessDateKey = (date = new Date()) => {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: BUSINESS_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });

  const parts = formatter.formatToParts(date).reduce((acc, part) => {
    if (part.type !== 'literal') {
      acc[part.type] = part.value;
    }
    return acc;
  }, {});

  return `${parts.year}-${parts.month}-${parts.day}`;
};

const normalizeDateKey = (value) => {
  if (!value) return '';

  if (value instanceof Date) {
    return value.toISOString().slice(0, 10);
  }

  const raw = String(value).trim();
  const dateKey = raw.includes('T') ? raw.slice(0, 10) : raw;

  return DATE_KEY_RE.test(dateKey) ? dateKey : '';
};

const dateKeyToDate = (dateKey) => new Date(`${dateKey}T00:00:00.000Z`);

const addDaysToDateKey = (dateKey, days) => {
  const [year, month, day] = dateKey.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day + days));
  return date.toISOString().slice(0, 10);
};

const compareDateKeys = (left, right) => left.localeCompare(right);
const getWeekdayIndex = (dateKey) => dateKeyToDate(dateKey).getUTCDay();
const getSlotKey = (slot) => `${slot.startTime}-${slot.endTime}`;
const getSlotLabel = (slot) => slot.label?.trim() || `${slot.startTime} - ${slot.endTime}`;

const getActiveSlots = (slots = []) => {
  return (slots || [])
    .filter((slot) => slot.isActive !== false)
    .sort((a, b) => a.startTime.localeCompare(b.startTime));
};

const getTotalActiveSlotCapacity = (slots = []) => {
  return getActiveSlots(slots).reduce(
    (sum, slot) => sum + Number(slot.capacity || 0),
    0
  );
};

const buildCenterSnapshot = (center) => ({
  _id: center?._id,
  name: center?.name,
  district: center?.district,
  address: center?.address,
  contactNumber: center?.contactNumber,
  officeHours: center?.officeHours,
  isActive: center?.isActive
});

const buildAppointmentAuditState = (appointment) => ({
  status: appointment.status,
  application: appointment.application?.toString?.() || appointment.application,
  applicant: appointment.applicant?.toString?.() || appointment.applicant,
  center: appointment.center?.toString?.() || appointment.center,
  appointmentDateKey: appointment.appointmentDateKey,
  timeSlotKey: appointment.timeSlotKey,
  timeSlot: appointment.timeSlot,
  centerName: appointment.centerName,
  cancelReason: appointment.cancelReason || '',
  completedAt: appointment.completedAt || null,
  cancelledAt: appointment.cancelledAt || null
});

const findWeekdayTemplate = (config, weekday) => {
  return (config.weeklyTemplates || []).find(
    (template) => Number(template.weekday) === Number(weekday)
  );
};

const findDateOverride = (config, dateKey) => {
  return (config.dateOverrides || []).find(
    (override) => override.dateKey === dateKey
  );
};

const resolveScheduleForDate = ({ config, dateKey }) => {
  const dayIndex = getWeekdayIndex(dateKey);
  const dayName = WEEKDAY_NAMES[dayIndex];
  const override = findDateOverride(config, dateKey);

  if (override?.mode === 'closed') {
    return {
      dateKey,
      dayIndex,
      dayName,
      source: 'date_override',
      isOpen: false,
      reason: override.reason || 'This date is closed by admin',
      note: override.reason || '',
      slots: [],
      dailyLimit: 0,
      isSpecialDate: true
    };
  }

  if (override?.mode === 'custom') {
    const slots = getActiveSlots(override.slots);
    const totalCapacity = getTotalActiveSlotCapacity(slots);

    return {
      dateKey,
      dayIndex,
      dayName,
      source: 'date_override',
      isOpen: totalCapacity > 0,
      reason: totalCapacity > 0 ? '' : 'No active slot is configured for this date',
      note: override.reason || 'Special schedule',
      slots,
      dailyLimit: override.dailyLimit || totalCapacity,
      isSpecialDate: true
    };
  }

  const template = findWeekdayTemplate(config, dayIndex);

  if (!template) {
    return {
      dateKey,
      dayIndex,
      dayName,
      source: 'weekly_template',
      isOpen: false,
      reason: 'No appointment schedule is configured for this weekday',
      note: '',
      slots: [],
      dailyLimit: 0,
      isSpecialDate: false
    };
  }

  const slots = getActiveSlots(template.slots);
  const totalCapacity = getTotalActiveSlotCapacity(slots);

  if (template.isOpen === false) {
    return {
      dateKey,
      dayIndex,
      dayName,
      source: 'weekly_template',
      isOpen: false,
      reason: template.note || `${dayName} is an off day`,
      note: template.note || '',
      slots: [],
      dailyLimit: 0,
      isSpecialDate: false
    };
  }

  return {
    dateKey,
    dayIndex,
    dayName,
    source: 'weekly_template',
    isOpen: totalCapacity > 0,
    reason: totalCapacity > 0 ? '' : 'No active slot is configured for this weekday',
    note: template.note || '',
    slots,
    dailyLimit: template.dailyLimit || totalCapacity,
    isSpecialDate: false
  };
};

const resolveDayAvailability = ({
  config,
  dateKey,
  dayCounterMap = new Map(),
  todayKey = getBusinessDateKey()
}) => {
  const dayIndex = getWeekdayIndex(dateKey);
  const dayName = WEEKDAY_NAMES[dayIndex];

  if (!config || !config.isActive) {
    return {
      dateKey,
      dayIndex,
      dayName,
      isBookable: false,
      status: 'not_configured',
      reason: 'Appointment settings are not configured for this center',
      source: 'none',
      isSpecialDate: false,
      dailyCapacity: 0,
      bookedCount: 0,
      remaining: 0
    };
  }

  const schedule = resolveScheduleForDate({ config, dateKey });
  const minDateKey = addDaysToDateKey(todayKey, config.minLeadDays || 0);
  const maxDateKey = addDaysToDateKey(todayKey, config.maxAdvanceDays || 1);

  const counter = dayCounterMap.get(dateKey);
  const dailyCapacity = schedule.dailyLimit || 0;
  const bookedCount = counter?.bookedCount || 0;
  const remaining = Math.max(0, dailyCapacity - bookedCount);

  let status = 'available';
  let reason = schedule.reason || '';

  if (compareDateKeys(dateKey, minDateKey) < 0) {
    status = 'too_early';
    reason = `Earliest booking date is ${minDateKey}`;
  } else if (compareDateKeys(dateKey, maxDateKey) > 0) {
    status = 'outside_window';
    reason = `Booking is allowed up to ${maxDateKey}`;
  } else if (!schedule.isOpen) {
    status = schedule.source === 'date_override' ? 'closed' : 'weekly_off';
    reason = reason || 'This date is closed';
  } else if (remaining <= 0) {
    status = 'full';
    reason = 'Daily appointment capacity is full';
  }

  return {
    dateKey,
    dayIndex,
    dayName,
    isBookable: status === 'available',
    status,
    reason,
    source: schedule.source,
    note: schedule.note,
    isSpecialDate: schedule.isSpecialDate,
    dailyCapacity,
    bookedCount,
    remaining
  };
};

const sanitizeSlotList = (slots = []) => {
  if (!Array.isArray(slots)) return [];

  const seenKeys = new Set();

  return slots
    .map((slot) => ({
      label: String(slot.label || '').trim(),
      startTime: String(slot.startTime || '').trim(),
      endTime: String(slot.endTime || '').trim(),
      capacity: parsePositiveInteger(slot.capacity, 0),
      isActive: slot.isActive !== false
    }))
    .filter((slot) => slot.startTime || slot.endTime || slot.label || slot.capacity)
    .map((slot) => {
      if (!TIME_RE.test(slot.startTime) || !TIME_RE.test(slot.endTime)) {
        throw new Error('Time slot start and end time must be HH:mm');
      }

      if (slot.startTime >= slot.endTime) {
        throw new Error('Time slot end time must be after start time');
      }

      if (!slot.capacity || slot.capacity < 1) {
        throw new Error('Every time slot must have a capacity of at least 1');
      }

      const key = getSlotKey(slot);

      if (seenKeys.has(key)) {
        throw new Error(`Duplicate time slot found: ${key}`);
      }

      seenKeys.add(key);

      return {
        ...slot,
        label: slot.label || `${slot.startTime} - ${slot.endTime}`
      };
    })
    .sort((a, b) => a.startTime.localeCompare(b.startTime));
};

const sanitizeWeeklyTemplates = (weeklyTemplates = []) => {
  if (!Array.isArray(weeklyTemplates)) return [];

  const seenWeekdays = new Set();

  return weeklyTemplates
    .map((template) => ({
      weekday: Number(template.weekday),
      isOpen: template.isOpen !== false,
      dailyLimit:
        template.dailyLimit === '' ||
        template.dailyLimit === undefined ||
        template.dailyLimit === null
          ? undefined
          : parsePositiveInteger(template.dailyLimit, 0),
      note: String(template.note || '').trim(),
      slots: sanitizeSlotList(template.slots || [])
    }))
    .filter((template) => Number.isInteger(template.weekday))
    .map((template) => {
      if (template.weekday < 0 || template.weekday > 6) {
        throw new Error('Weekday must be between 0 and 6');
      }

      if (seenWeekdays.has(template.weekday)) {
        throw new Error(`Duplicate weekday template found: ${template.weekday}`);
      }

      seenWeekdays.add(template.weekday);

      const activeCapacity = getTotalActiveSlotCapacity(template.slots);

      if (template.isOpen && activeCapacity < 1) {
        throw new Error(`${WEEKDAY_NAMES[template.weekday]} is open but has no active slot`);
      }

      if (template.isOpen && template.dailyLimit && template.dailyLimit > activeCapacity) {
        throw new Error(
          `${WEEKDAY_NAMES[template.weekday]} daily limit cannot exceed active slot capacity`
        );
      }

      return template;
    })
    .sort((a, b) => a.weekday - b.weekday);
};

const sanitizeDateOverrides = (dateOverrides = []) => {
  if (!Array.isArray(dateOverrides)) return [];

  const seenDates = new Set();

  return dateOverrides
    .map((override) => ({
      dateKey: normalizeDateKey(override.dateKey || override.date),
      mode: override.mode === 'custom' ? 'custom' : 'closed',
      reason: String(override.reason || '').trim(),
      dailyLimit:
        override.dailyLimit === '' ||
        override.dailyLimit === undefined ||
        override.dailyLimit === null
          ? undefined
          : parsePositiveInteger(override.dailyLimit, 0),
      slots: sanitizeSlotList(override.slots || [])
    }))
    .filter((override) => override.dateKey)
    .map((override) => {
      if (seenDates.has(override.dateKey)) {
        throw new Error(`Duplicate date override found: ${override.dateKey}`);
      }

      seenDates.add(override.dateKey);

      if (override.mode === 'custom') {
        const activeCapacity = getTotalActiveSlotCapacity(override.slots);

        if (activeCapacity < 1) {
          throw new Error('Custom date override must have at least one active slot');
        }

        if (override.dailyLimit && override.dailyLimit > activeCapacity) {
          throw new Error('Custom date daily limit cannot exceed active slot capacity');
        }
      }

      return override;
    })
    .sort((a, b) => a.dateKey.localeCompare(b.dateKey));
};

const ensureDayCounter = async ({ centerId, dateKey, capacity }) => {
  try {
    await AppointmentDayCounter.create({
      center: centerId,
      dateKey,
      capacity,
      bookedCount: 0
    });
  } catch (error) {
    if (error.code !== 11000) throw error;
  }
};

const ensureSlotCounter = async ({ centerId, dateKey, slotKey, capacity }) => {
  try {
    await AppointmentSlotCounter.create({
      center: centerId,
      dateKey,
      slotKey,
      capacity,
      bookedCount: 0
    });
  } catch (error) {
    if (error.code !== 11000) throw error;
  }
};

const decrementCountersForBookedAppointment = async (appointment) => {
  if (!appointment || appointment.status !== 'booked') return;

  await Promise.all([
    AppointmentDayCounter.updateOne(
      {
        center: appointment.center,
        dateKey: appointment.appointmentDateKey,
        bookedCount: { $gt: 0 }
      },
      { $inc: { bookedCount: -1 } }
    ),
    AppointmentSlotCounter.updateOne(
      {
        center: appointment.center,
        dateKey: appointment.appointmentDateKey,
        slotKey: appointment.timeSlotKey,
        bookedCount: { $gt: 0 }
      },
      { $inc: { bookedCount: -1 } }
    )
  ]);
};

const getConfiguredCenterIds = async () => {
  const configs = await AppointmentConfig.find({ isActive: true }).select('center');
  return configs.map((config) => config.center);
};

const getAvailableCenters = async (req, res) => {
  try {
    const configuredCenterIds = await getConfiguredCenterIds();

    if (configuredCenterIds.length === 0) {
      return res.status(200).json({
        success: true,
        count: 0,
        centers: []
      });
    }

    const filter = {
      _id: { $in: configuredCenterIds },
      isActive: true
    };

    if (req.query.district) {
      filter.district = req.query.district;
    }

    const [centers, configs] = await Promise.all([
      Center.find(filter)
        .select('name district address contactNumber officeHours isActive')
        .sort({ name: 1 }),
      AppointmentConfig.find({
        center: { $in: configuredCenterIds },
        isActive: true
      }).select('center minLeadDays maxAdvanceDays weeklyTemplates dateOverrides')
    ]);

    const configByCenter = new Map(
      configs.map((config) => [config.center.toString(), config])
    );

    const centersWithSchedule = centers.map((center) => {
      const config = configByCenter.get(center._id.toString());
      const openTemplates = (config?.weeklyTemplates || []).filter(
        (template) => template.isOpen !== false && getTotalActiveSlotCapacity(template.slots) > 0
      );

      return {
        ...center.toObject(),
        appointmentConfig: config
          ? {
              minLeadDays: config.minLeadDays,
              maxAdvanceDays: config.maxAdvanceDays,
              openWeekdays: openTemplates.map((template) => template.weekday),
              slotCount: openTemplates.reduce(
                (sum, template) => sum + getActiveSlots(template.slots).length,
                0
              )
            }
          : null
      };
    });

    res.status(200).json({
      success: true,
      count: centersWithSchedule.length,
      centers: centersWithSchedule
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const getAppointmentAvailability = async (req, res) => {
  try {
    const centerId = req.query.centerId;
    const selectedDateKey = normalizeDateKey(req.query.date);
    const requestedDays = Math.min(
      parsePositiveInteger(req.query.days, 30),
      MAX_AVAILABILITY_DAYS
    );

    if (!mongoose.Types.ObjectId.isValid(centerId)) {
      return res.status(400).json({
        success: false,
        message: 'Valid center id is required'
      });
    }

    const [center, config] = await Promise.all([
      Center.findOne({ _id: centerId, isActive: true }),
      AppointmentConfig.findOne({ center: centerId, isActive: true })
    ]);

    if (!center) {
      return res.status(404).json({
        success: false,
        message: 'Center not found or inactive'
      });
    }

    if (!config) {
      return res.status(200).json({
        success: true,
        center: buildCenterSnapshot(center),
        config: null,
        calendarDays: [],
        selectedDay: null,
        slots: [],
        message: 'Appointment settings are not configured for this center'
      });
    }

    const todayKey = getBusinessDateKey();
    const daysToReturn = Math.min(
      requestedDays,
      Math.max(config.maxAdvanceDays + 1, 1)
    );

    const dateKeys = Array.from({ length: daysToReturn }, (_, index) =>
      addDaysToDateKey(todayKey, index)
    );

    const [dayCounters, slotCounters] = await Promise.all([
      AppointmentDayCounter.find({ center: centerId, dateKey: { $in: dateKeys } }),
      AppointmentSlotCounter.find({ center: centerId, dateKey: { $in: dateKeys } })
    ]);

    const dayCounterMap = new Map(
      dayCounters.map((counter) => [counter.dateKey, counter])
    );

    const slotCounterMap = new Map(
      slotCounters.map((counter) => [
        `${counter.dateKey}::${counter.slotKey}`,
        counter
      ])
    );

    const calendarDays = dateKeys.map((dateKey) =>
      resolveDayAvailability({ config, dateKey, dayCounterMap, todayKey })
    );

    const dateForSlots =
      selectedDateKey ||
      calendarDays.find((day) => day.isBookable)?.dateKey ||
      '';

    const selectedDay = dateForSlots
      ? resolveDayAvailability({
          config,
          dateKey: dateForSlots,
          dayCounterMap,
          todayKey
        })
      : null;

    const schedule = selectedDay
      ? resolveScheduleForDate({ config, dateKey: selectedDay.dateKey })
      : null;

    const slots = selectedDay && schedule
      ? getActiveSlots(schedule.slots).map((slot) => {
          const slotKey = getSlotKey(slot);
          const counter = slotCounterMap.get(`${selectedDay.dateKey}::${slotKey}`);
          const bookedCount = counter?.bookedCount || 0;
          const remaining = Math.max(0, Number(slot.capacity || 0) - bookedCount);

          return {
            slotKey,
            label: getSlotLabel(slot),
            startTime: slot.startTime,
            endTime: slot.endTime,
            capacity: Number(slot.capacity || 0),
            bookedCount,
            remaining,
            isAvailable: Boolean(selectedDay.isBookable && remaining > 0),
            reason: selectedDay.isBookable
              ? remaining > 0
                ? ''
                : 'This time slot is already full'
              : selectedDay.reason
          };
        })
      : [];

    res.status(200).json({
      success: true,
      center: buildCenterSnapshot(center),
      config: {
        minLeadDays: config.minLeadDays,
        maxAdvanceDays: config.maxAdvanceDays
      },
      calendarDays,
      selectedDay,
      slots
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const bookAppointment = async (req, res) => {
  let dayIncremented = false;
  let slotIncremented = false;
  let appointmentPayload = null;

  try {
    const {
      applicationId,
      centerId,
      appointmentDateKey,
      appointmentDate,
      slotKey,
      timeSlot,
      notes
    } = req.body;

    const dateKey = normalizeDateKey(appointmentDateKey || appointmentDate);
    const requestedSlotKey = String(slotKey || timeSlot || '').trim();

    if (!applicationId || !centerId || !dateKey || !requestedSlotKey) {
      return res.status(400).json({
        success: false,
        message: 'Application, center, appointment date and time slot are required'
      });
    }

    if (
      !mongoose.Types.ObjectId.isValid(applicationId) ||
      !mongoose.Types.ObjectId.isValid(centerId)
    ) {
      return res.status(400).json({
        success: false,
        message: 'Invalid application or center id'
      });
    }

    const [application, center, config] = await Promise.all([
      Application.findOne({ _id: applicationId, applicant: req.user._id }),
      Center.findOne({ _id: centerId, isActive: true }),
      AppointmentConfig.findOne({ center: centerId, isActive: true })
    ]);

    if (!application) {
      return res.status(404).json({ success: false, message: 'Application not found' });
    }

    if (application.status !== 'approved') {
      return res.status(400).json({
        success: false,
        message: 'Appointment can only be booked for approved applications'
      });
    }

    if (!center) {
      return res.status(404).json({
        success: false,
        message: 'Center not found or inactive'
      });
    }

    if (!config) {
      return res.status(400).json({
        success: false,
        message: 'Appointment settings are not configured for this center'
      });
    }

    const existingAppointment = await Appointment.findOne({
      application: applicationId,
      status: { $in: ['booked', 'completed'] }
    });

    if (existingAppointment) {
      return res.status(400).json({
        success: false,
        message: 'An appointment already exists for this application'
      });
    }

    const todayKey = getBusinessDateKey();
    const dayAvailability = resolveDayAvailability({
      config,
      dateKey,
      dayCounterMap: new Map(),
      todayKey
    });

    if (!dayAvailability.isBookable) {
      return res.status(400).json({
        success: false,
        message: dayAvailability.reason || 'Selected appointment date is not available'
      });
    }

    const schedule = resolveScheduleForDate({ config, dateKey });
    const slot = getActiveSlots(schedule.slots).find((item) => {
      return getSlotKey(item) === requestedSlotKey || item._id?.toString() === requestedSlotKey;
    });

    if (!slot) {
      return res.status(400).json({
        success: false,
        message: 'Selected time slot is not available'
      });
    }

    const finalSlotKey = getSlotKey(slot);
    const finalSlotLabel = getSlotLabel(slot);

    await ensureDayCounter({
      centerId,
      dateKey,
      capacity: dayAvailability.dailyCapacity
    });

    const dayCounter = await AppointmentDayCounter.findOneAndUpdate(
      {
        center: centerId,
        dateKey,
        bookedCount: { $lt: dayAvailability.dailyCapacity }
      },
      {
        $inc: { bookedCount: 1 },
        $set: { capacity: dayAvailability.dailyCapacity }
      },
      { new: true }
    );

    if (!dayCounter) {
      return res.status(409).json({
        success: false,
        code: 'APPOINTMENT_DAY_FULL',
        message: 'This appointment date just became full. Please choose another date.'
      });
    }

    dayIncremented = true;

    await ensureSlotCounter({
      centerId,
      dateKey,
      slotKey: finalSlotKey,
      capacity: slot.capacity
    });

    const slotCounter = await AppointmentSlotCounter.findOneAndUpdate(
      {
        center: centerId,
        dateKey,
        slotKey: finalSlotKey,
        bookedCount: { $lt: slot.capacity }
      },
      {
        $inc: { bookedCount: 1 },
        $set: { capacity: slot.capacity }
      },
      { new: true }
    );

    if (!slotCounter) {
      await AppointmentDayCounter.updateOne(
        { center: centerId, dateKey, bookedCount: { $gt: 0 } },
        { $inc: { bookedCount: -1 } }
      );

      dayIncremented = false;

      return res.status(409).json({
        success: false,
        code: 'APPOINTMENT_SLOT_TAKEN',
        message: 'This time slot was just booked by another citizen. Please choose another slot.'
      });
    }

    slotIncremented = true;

    appointmentPayload = {
      application: application._id,
      applicant: req.user._id,
      center: center._id,
      appointmentDate: dateKeyToDate(dateKey),
      appointmentDateKey: dateKey,
      timeSlot: finalSlotLabel,
      timeSlotKey: finalSlotKey,
      timeSlotStart: slot.startTime,
      timeSlotEnd: slot.endTime,
      slotSerial: slotCounter.bookedCount,
      centerName: center.name,
      centerDistrict: center.district,
      notes: notes ? String(notes).trim() : ''
    };

    const appointment = await Appointment.create(appointmentPayload);

    await createAuditLog({
      actor: req.user._id,
      actorRole: req.user.role,
      action: 'BOOK_APPOINTMENT',
      entityType: 'Appointment',
      entityId: appointment._id,
      message: `Appointment booked for ${dateKey} at ${finalSlotLabel}`,
      sourceModule: 'appointments',
      requestContext: getRequestAuditContext(req),
      afterState: buildAppointmentAuditState(appointment),
      meta: {
        applicationId: application.applicationId,
        centerName: center.name,
        slotSerial: appointment.slotSerial
      }
    });

    res.status(201).json({
      success: true,
      message: 'Appointment booked successfully',
      appointment
    });
  } catch (error) {
    if (appointmentPayload && (dayIncremented || slotIncremented)) {
      await Promise.all([
        dayIncremented
          ? AppointmentDayCounter.updateOne(
              {
                center: appointmentPayload.center,
                dateKey: appointmentPayload.appointmentDateKey,
                bookedCount: { $gt: 0 }
              },
              { $inc: { bookedCount: -1 } }
            )
          : Promise.resolve(),
        slotIncremented
          ? AppointmentSlotCounter.updateOne(
              {
                center: appointmentPayload.center,
                dateKey: appointmentPayload.appointmentDateKey,
                slotKey: appointmentPayload.timeSlotKey,
                bookedCount: { $gt: 0 }
              },
              { $inc: { bookedCount: -1 } }
            )
          : Promise.resolve()
      ]);
    }

    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        code: 'APPOINTMENT_CONFLICT',
        message: 'This appointment was already booked. Please refresh and try again.'
      });
    }

    res.status(500).json({ success: false, message: error.message });
  }
};

const getMyAppointments = async (req, res) => {
  try {
    const appointments = await Appointment.find({ applicant: req.user._id })
      .populate('application', 'applicationId fullNameEnglish applicationType status')
      .populate('center', 'name district address contactNumber')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: appointments.length,
      appointments
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const getAllAppointmentsForAdmin = async (req, res) => {
  try {
    const { page, limit, skip } = getPaginationOptions(req.query);
    const filter = {};
    const hasStatusFilter = Boolean(req.query.status);

    if (req.query.status) filter.status = req.query.status;
    if (req.query.centerDistrict) filter.centerDistrict = req.query.centerDistrict;

    if (req.query.centerId && mongoose.Types.ObjectId.isValid(req.query.centerId)) {
      filter.center = req.query.centerId;
    }

    const dateKey = normalizeDateKey(
      req.query.date || req.query.appointmentDate || req.query.appointmentDateKey
    );

    if (dateKey) filter.appointmentDateKey = dateKey;

    const [appointments, total] = await Promise.all([
      Appointment.find(filter)
        .populate('applicant', 'fullName email phone role')
        .populate('center', 'name district address')
        .populate('application', 'applicationId fullNameEnglish applicationType status')
        .sort(getAdminAppointmentSort(hasStatusFilter))
        .skip(skip)
        .limit(limit),
      Appointment.countDocuments(filter)
    ]);

    res.status(200).json({
      success: true,
      count: appointments.length,
      appointments,
      meta: buildPaginationMeta({ page, limit, total })
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const getSingleAppointmentForAdmin = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ success: false, message: 'Invalid appointment id' });
    }

    const appointment = await Appointment.findById(req.params.id)
      .populate('applicant', 'fullName email phone role status')
      .populate('center', 'name district address contactNumber')
      .populate(
        'application',
        'applicationId fullNameEnglish fullNameBangla applicationType status phone email'
      );

    if (!appointment) {
      return res.status(404).json({ success: false, message: 'Appointment not found' });
    }

    res.status(200).json({ success: true, appointment });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const getAppointmentStatsForAdmin = async (req, res) => {
  try {
    const todayKey = getBusinessDateKey();

    const [
      totalAppointments,
      bookedAppointments,
      completedAppointments,
      cancelledAppointments,
      todayAppointments
    ] = await Promise.all([
      Appointment.countDocuments(),
      Appointment.countDocuments({ status: 'booked' }),
      Appointment.countDocuments({ status: 'completed' }),
      Appointment.countDocuments({ status: 'cancelled' }),
      Appointment.countDocuments({ appointmentDateKey: todayKey, status: 'booked' })
    ]);

    res.status(200).json({
      success: true,
      data: {
        totalAppointments,
        bookedAppointments,
        completedAppointments,
        cancelledAppointments,
        todayAppointments
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const updateAppointmentStatusByAdmin = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ success: false, message: 'Invalid appointment id' });
    }

    const { status, reason } = req.body;
    const allowedStatuses = ['booked', 'completed', 'cancelled'];

    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid appointment status' });
    }

    const appointment = await Appointment.findById(req.params.id);

    if (!appointment) {
      return res.status(404).json({ success: false, message: 'Appointment not found' });
    }

    if (
      ['completed', 'cancelled'].includes(appointment.status) &&
      appointment.status !== status
    ) {
      return res.status(400).json({
        success: false,
        message: `Appointment cannot be changed when status is '${appointment.status}'`
      });
    }

    const beforeState = buildAppointmentAuditState(appointment);

    if (status === 'cancelled' && appointment.status === 'booked') {
      await decrementCountersForBookedAppointment(appointment);
      appointment.cancelledAt = new Date();
      appointment.cancelledBy = req.user._id;
      appointment.cancelReason = reason ? String(reason).trim() : 'Cancelled by admin';
    }

    if (status === 'completed' && appointment.status === 'booked') {
      appointment.completedAt = new Date();
      appointment.completedBy = req.user._id;
    }

    appointment.status = status;
    const updatedAppointment = await appointment.save();

    await createAuditLog({
      actor: req.user._id,
      actorRole: req.user.role,
      action: 'UPDATE_APPOINTMENT_STATUS',
      entityType: 'Appointment',
      entityId: updatedAppointment._id,
      message: `Appointment status updated to '${status}'`,
      reason: reason || '',
      sourceModule: 'appointments',
      requestContext: getRequestAuditContext(req),
      beforeState,
      afterState: buildAppointmentAuditState(updatedAppointment)
    });

    res.status(200).json({
      success: true,
      message: `Appointment status updated to '${status}'`,
      appointment: updatedAppointment
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const getAppointmentConfigForAdmin = async (req, res) => {
  try {
    const { centerId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(centerId)) {
      return res.status(400).json({ success: false, message: 'Invalid center id' });
    }

    const [center, config] = await Promise.all([
      Center.findById(centerId),
      AppointmentConfig.findOne({ center: centerId })
    ]);

    if (!center) {
      return res.status(404).json({ success: false, message: 'Center not found' });
    }

    res.status(200).json({
      success: true,
      center: buildCenterSnapshot(center),
      config
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const upsertAppointmentConfigForAdmin = async (req, res) => {
  try {
    const { centerId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(centerId)) {
      return res.status(400).json({ success: false, message: 'Invalid center id' });
    }

    const center = await Center.findById(centerId);

    if (!center) {
      return res.status(404).json({ success: false, message: 'Center not found' });
    }

    const minLeadDays = parseNonNegativeInteger(req.body.minLeadDays, -1);
    const maxAdvanceDays = parsePositiveInteger(req.body.maxAdvanceDays, 0);
    const weeklyTemplates = sanitizeWeeklyTemplates(req.body.weeklyTemplates || []);
    const dateOverrides = sanitizeDateOverrides(req.body.dateOverrides || []);

    if (minLeadDays < 0) {
      return res.status(400).json({ success: false, message: 'Minimum lead days is required' });
    }

    if (!maxAdvanceDays || maxAdvanceDays < minLeadDays) {
      return res.status(400).json({
        success: false,
        message: 'Maximum advance days must be greater than or equal to minimum lead days'
      });
    }

    if (weeklyTemplates.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'At least one weekly template is required'
      });
    }

    const beforeConfig = await AppointmentConfig.findOne({ center: centerId });
    const beforeState = beforeConfig ? beforeConfig.toObject() : null;

    const config = await AppointmentConfig.findOneAndUpdate(
      { center: centerId },
      {
        center: centerId,
        minLeadDays,
        maxAdvanceDays,
        weeklyTemplates,
        dateOverrides,
        isActive: req.body.isActive !== false,
        updatedBy: req.user._id
      },
      {
        new: true,
        upsert: true,
        runValidators: true,
        setDefaultsOnInsert: true
      }
    );

    await createAuditLog({
      actor: req.user._id,
      actorRole: req.user.role,
      action: beforeConfig ? 'UPDATE_APPOINTMENT_CONFIG' : 'CREATE_APPOINTMENT_CONFIG',
      entityType: 'AppointmentConfig',
      entityId: config._id,
      message: `Appointment settings saved for ${center.name}`,
      sourceModule: 'appointments',
      requestContext: getRequestAuditContext(req),
      beforeState,
      afterState: config.toObject(),
      meta: {
        center: center._id,
        centerName: center.name
      }
    });

    res.status(200).json({
      success: true,
      message: 'Appointment settings saved successfully',
      config
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

module.exports = {
  getAvailableCenters,
  getAppointmentAvailability,
  bookAppointment,
  getMyAppointments,
  getAllAppointmentsForAdmin,
  getSingleAppointmentForAdmin,
  getAppointmentStatsForAdmin,
  updateAppointmentStatusByAdmin,
  getAppointmentConfigForAdmin,
  upsertAppointmentConfigForAdmin
};
