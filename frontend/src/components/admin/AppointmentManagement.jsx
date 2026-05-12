// Appointment Management Page Start
import React, { useEffect, useMemo, useState } from 'react';
import { toast } from 'react-toastify';
import {
  FaBan,
  FaBuilding,
  FaCalendarAlt,
  FaCheck,
  FaChevronLeft,
  FaChevronRight,
  FaClock,
  FaCopy,
  FaEdit,
  FaEye,
  FaFilter,
  FaInfoCircle,
  FaMapMarkerAlt,
  FaPlus,
  FaRedo,
  FaSave,
  FaSearch,
  FaSpinner,
  FaTimes,
  FaTrash,
  FaUserCheck,
  FaUsers
} from 'react-icons/fa';
import api from '../api/axios';
import AdminLayout from './AdminLayout';
import Loader from '../common/Loader';
import {
  formatDateTime,
  formatStatus,
  getStatusColor
} from '../utils/helpers';
import '../styles/AppointmentManagement.css';

const WEEKDAYS = [
  { value: 0, label: 'Sunday', shortLabel: 'Sun' },
  { value: 1, label: 'Monday', shortLabel: 'Mon' },
  { value: 2, label: 'Tuesday', shortLabel: 'Tue' },
  { value: 3, label: 'Wednesday', shortLabel: 'Wed' },
  { value: 4, label: 'Thursday', shortLabel: 'Thu' },
  { value: 5, label: 'Friday', shortLabel: 'Fri' },
  { value: 6, label: 'Saturday', shortLabel: 'Sat' }
];

const EMPTY_CONFIG = {
  minLeadDays: '',
  maxAdvanceDays: '',
  isActive: true,
  weeklyTemplates: [],
  dateOverrides: []
};

const initialCenterForm = {
  name: '',
  district: '',
  address: '',
  contactNumber: '',
  officeHours: '',
  dailyCapacity: '',
  isActive: true
};

const createEmptySlot = () => ({
  label: '',
  startTime: '',
  endTime: '',
  capacity: 1,
  isActive: true
});

const createWeekdayTemplate = (weekday) => ({
  weekday,
  isOpen: false,
  dailyLimit: '',
  note: '',
  slots: []
});

const createDateOverride = () => ({
  dateKey: '',
  mode: 'closed',
  reason: '',
  dailyLimit: '',
  slots: []
});

const getInitialSlotGenerator = () => ({
  officeStartTime: '',
  officeEndTime: '',
  slotDurationMinutes: 30,
  capacityPerSlot: 1,
  labelPrefix: ''
});

const timeStringToMinutes = (timeValue) => {
  if (!timeValue || !timeValue.includes(':')) return NaN;

  const [hours, minutes] = timeValue.split(':').map(Number);

  if (Number.isNaN(hours) || Number.isNaN(minutes)) return NaN;

  return hours * 60 + minutes;
};

const minutesToTimeString = (totalMinutes) => {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
};

const buildGeneratedTimeSlots = (generator) => {
  const officeStartMinutes = timeStringToMinutes(generator.officeStartTime);
  const officeEndMinutes = timeStringToMinutes(generator.officeEndTime);
  const slotDurationMinutes = Number(generator.slotDurationMinutes);
  const capacityPerSlot = Number(generator.capacityPerSlot);

  if (Number.isNaN(officeStartMinutes) || Number.isNaN(officeEndMinutes)) {
    throw new Error('Office start time and office end time are required.');
  }

  if (officeEndMinutes <= officeStartMinutes) {
    throw new Error('Office end time must be after office start time.');
  }

  if (!slotDurationMinutes || slotDurationMinutes < 1) {
    throw new Error('Minutes per citizen must be at least 1.');
  }

  if (!capacityPerSlot || capacityPerSlot < 1) {
    throw new Error('Capacity per slot must be at least 1.');
  }

  const slots = [];
  let currentMinutes = officeStartMinutes;
  let slotSerial = 1;

  while (currentMinutes + slotDurationMinutes <= officeEndMinutes) {
    const startTime = minutesToTimeString(currentMinutes);
    const endTime = minutesToTimeString(currentMinutes + slotDurationMinutes);

    slots.push({
      label: generator.labelPrefix?.trim()
        ? `${generator.labelPrefix.trim()} ${slotSerial}`
        : `${startTime} - ${endTime}`,
      startTime,
      endTime,
      capacity: capacityPerSlot,
      isActive: true
    });

    currentMinutes += slotDurationMinutes;
    slotSerial += 1;
  }

  if (slots.length === 0) {
    throw new Error(
      'No slot could be generated. Please check office start time, end time and duration.'
    );
  }

  return slots;
};

const cloneDeep = (value) => JSON.parse(JSON.stringify(value));

const getTotalActiveSlotCapacity = (slots = []) => {
  return slots
    .filter((slot) => slot.isActive !== false)
    .reduce((sum, slot) => sum + Number(slot.capacity || 0), 0);
};

const formatDateKey = (dateKey) => {
  if (!dateKey) return 'N/A';

  const parsedDate = new Date(`${dateKey}T00:00:00`);

  if (Number.isNaN(parsedDate.getTime())) return dateKey;

  return parsedDate.toLocaleDateString('en-GB', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });
};

const getApplicationText = (appointment) => {
  return appointment?.application?.applicationId || appointment?.applicationId || 'N/A';
};

const getApplicantText = (appointment) => {
  return (
    appointment?.applicant?.fullName ||
    appointment?.application?.fullNameEnglish ||
    appointment?.application?.fullNameBangla ||
    'N/A'
  );
};

const AppointmentManagement = () => {
  const [activeTab, setActiveTab] = useState('appointments');
  const [appointments, setAppointments] = useState([]);
  const [centers, setCenters] = useState([]);
  const [stats, setStats] = useState({
    totalAppointments: 0,
    bookedAppointments: 0,
    completedAppointments: 0,
    cancelledAppointments: 0,
    todayAppointments: 0
  });
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [centerFilter, setCenterFilter] = useState('');
  const [districtFilter, setDistrictFilter] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    pages: 1
  });

  const [showAppointmentModal, setShowAppointmentModal] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState(null);
  const [statusReason, setStatusReason] = useState('');

  const [showCenterModal, setShowCenterModal] = useState(false);
  const [editingCenter, setEditingCenter] = useState(null);
  const [centerForm, setCenterForm] = useState(initialCenterForm);

  const [settingsCenterId, setSettingsCenterId] = useState('');
  const [config, setConfig] = useState(EMPTY_CONFIG);
  const [selectedWeekday, setSelectedWeekday] = useState(1);
  const [copySourceWeekday, setCopySourceWeekday] = useState(1);
  const [settingsLoading, setSettingsLoading] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);
  const [weekdaySlotGenerator, setWeekdaySlotGenerator] = useState(
    getInitialSlotGenerator()
  );
  const [overrideSlotGenerators, setOverrideSlotGenerators] = useState({});

  useEffect(() => {
    fetchInitialData();
  }, []);

  useEffect(() => {
    if (activeTab === 'appointments') {
      fetchAppointments(1);
      fetchStats();
    }
  }, [activeTab, statusFilter, centerFilter, districtFilter, dateFilter]);

  useEffect(() => {
    if (activeTab === 'settings' && settingsCenterId) {
      fetchAppointmentSettings(settingsCenterId);
    }
  }, [activeTab, settingsCenterId]);

  const fetchInitialData = async () => {
    try {
      setLoading(true);
      await Promise.all([fetchCenters(), fetchAppointments(1), fetchStats()]);
    } catch (error) {
      toast.error('Failed to load appointment management data');
    } finally {
      setLoading(false);
    }
  };

  const fetchAppointments = async (page = pagination.page) => {
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(pagination.limit)
      });

      if (statusFilter) params.set('status', statusFilter);
      if (centerFilter) params.set('centerId', centerFilter);
      if (districtFilter) params.set('centerDistrict', districtFilter);
      if (dateFilter) params.set('date', dateFilter);

      const response = await api.get(`/appointments/admin?${params.toString()}`);

      setAppointments(response?.data?.appointments || []);
      setPagination(
        response?.data?.meta || {
          page,
          limit: pagination.limit,
          total: 0,
          pages: 1
        }
      );
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Failed to load appointments');
    }
  };

  const fetchStats = async () => {
    try {
      const response = await api.get('/appointments/admin/stats');
      setStats(response?.data?.data || {});
    } catch (error) {
      // Stats should not block the page.
    }
  };

  const fetchCenters = async () => {
    try {
      const response = await api.get('/admin/centers');
      const nextCenters = response?.data?.centers || [];

      setCenters(nextCenters);

      if (!settingsCenterId && nextCenters[0]?._id) {
        setSettingsCenterId(nextCenters[0]._id);
      }
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Failed to load centers');
    }
  };

  const fetchAppointmentSettings = async (centerId) => {
    if (!centerId) return;

    try {
      setSettingsLoading(true);

      const response = await api.get(`/appointments/admin/settings/${centerId}`);
      const existingConfig = response?.data?.config || null;

      setConfig(
        existingConfig
          ? {
            minLeadDays: existingConfig.minLeadDays ?? '',
            maxAdvanceDays: existingConfig.maxAdvanceDays ?? '',
            isActive: existingConfig.isActive !== false,
            weeklyTemplates: existingConfig.weeklyTemplates || [],
            dateOverrides: existingConfig.dateOverrides || []
          }
          : EMPTY_CONFIG
      );
    } catch (error) {
      toast.error(
        error?.response?.data?.message || 'Failed to load appointment settings'
      );
      setConfig(EMPTY_CONFIG);
    } finally {
      setSettingsLoading(false);
    }
  };

  const refreshPage = async () => {
    if (activeTab === 'appointments') {
      await Promise.all([fetchAppointments(pagination.page), fetchStats(), fetchCenters()]);
      return;
    }

    if (activeTab === 'settings') {
      await Promise.all([
        fetchCenters(),
        settingsCenterId ? fetchAppointmentSettings(settingsCenterId) : Promise.resolve()
      ]);
      return;
    }

    await fetchCenters();
  };

  const clearFilters = () => {
    setSearchQuery('');
    setStatusFilter('');
    setCenterFilter('');
    setDistrictFilter('');
    setDateFilter('');
  };

  const filteredAppointments = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    if (!query) return appointments;

    return appointments.filter((appointment) => {
      const fields = [
        getApplicationText(appointment),
        getApplicantText(appointment),
        appointment?.applicant?.phone,
        appointment?.applicant?.email,
        appointment?.centerName,
        appointment?.center?.name,
        appointment?.centerDistrict,
        appointment?.timeSlot
      ];

      return fields.some((field) =>
        String(field || '').toLowerCase().includes(query)
      );
    });
  }, [appointments, searchQuery]);

  const districtOptions = useMemo(() => {
    return [...new Set(centers.map((center) => center.district).filter(Boolean))];
  }, [centers]);

  const selectedSettingsCenter = useMemo(() => {
    return centers.find((center) => center._id === settingsCenterId) || null;
  }, [centers, settingsCenterId]);

  const getWeekdayTemplate = (weekday) => {
    return (
      config.weeklyTemplates.find(
        (template) => Number(template.weekday) === Number(weekday)
      ) || createWeekdayTemplate(weekday)
    );
  };

  const selectedTemplate = getWeekdayTemplate(selectedWeekday);
  const selectedTemplateCapacity = getTotalActiveSlotCapacity(selectedTemplate.slots);

  const upsertWeekdayTemplate = (weekday, nextTemplate) => {
    setConfig((prev) => {
      const others = prev.weeklyTemplates.filter(
        (template) => Number(template.weekday) !== Number(weekday)
      );

      return {
        ...prev,
        weeklyTemplates: [...others, nextTemplate].sort(
          (a, b) => a.weekday - b.weekday
        )
      };
    });
  };

  const updateSelectedWeekday = (patch) => {
    const current = getWeekdayTemplate(selectedWeekday);

    upsertWeekdayTemplate(selectedWeekday, {
      ...current,
      ...patch
    });
  };

  const updateWeekdaySlot = (slotIndex, patch) => {
    const current = getWeekdayTemplate(selectedWeekday);
    const slots = [...(current.slots || [])];

    slots[slotIndex] = {
      ...slots[slotIndex],
      ...patch
    };

    upsertWeekdayTemplate(selectedWeekday, {
      ...current,
      slots
    });
  };

  const addWeekdaySlot = () => {
    const current = getWeekdayTemplate(selectedWeekday);

    upsertWeekdayTemplate(selectedWeekday, {
      ...current,
      isOpen: true,
      slots: [...(current.slots || []), createEmptySlot()]
    });
  };

  const removeWeekdaySlot = (slotIndex) => {
    const current = getWeekdayTemplate(selectedWeekday);

    upsertWeekdayTemplate(selectedWeekday, {
      ...current,
      slots: (current.slots || []).filter((_, index) => index !== slotIndex)
    });
  };

  const copySlotsFromWeekday = (sourceWeekday) => {
    const source = getWeekdayTemplate(Number(sourceWeekday));
    const current = getWeekdayTemplate(selectedWeekday);

    if (Number(source.weekday) === Number(selectedWeekday)) {
      toast.info('Select another weekday to copy from');
      return;
    }

    upsertWeekdayTemplate(selectedWeekday, {
      ...current,
      isOpen: source.isOpen,
      dailyLimit: source.dailyLimit || '',
      note: source.note || '',
      slots: cloneDeep(source.slots || [])
    });

    toast.success(
      `Copied schedule from ${WEEKDAYS.find((day) => day.value === Number(sourceWeekday))?.label
      }`
    );
  };

  const copySlotsFromPreviousDay = () => {
    const previousWeekday = selectedWeekday === 0 ? 6 : selectedWeekday - 1;
    copySlotsFromWeekday(previousWeekday);
  };

  const addDateOverride = () => {
    setConfig((prev) => ({
      ...prev,
      dateOverrides: [...prev.dateOverrides, createDateOverride()]
    }));
  };

  const updateDateOverride = (overrideIndex, patch) => {
    setConfig((prev) => {
      const dateOverrides = [...prev.dateOverrides];
      const current = dateOverrides[overrideIndex] || createDateOverride();

      dateOverrides[overrideIndex] = {
        ...current,
        ...patch
      };

      return {
        ...prev,
        dateOverrides
      };
    });
  };

  const removeDateOverride = (overrideIndex) => {
    setConfig((prev) => ({
      ...prev,
      dateOverrides: prev.dateOverrides.filter((_, index) => index !== overrideIndex)
    }));
  };

  const addOverrideSlot = (overrideIndex) => {
    const override = config.dateOverrides[overrideIndex] || createDateOverride();

    updateDateOverride(overrideIndex, {
      mode: 'custom',
      slots: [...(override.slots || []), createEmptySlot()]
    });
  };

  const updateOverrideSlot = (overrideIndex, slotIndex, patch) => {
    const override = config.dateOverrides[overrideIndex] || createDateOverride();
    const slots = [...(override.slots || [])];

    slots[slotIndex] = {
      ...slots[slotIndex],
      ...patch
    };

    updateDateOverride(overrideIndex, { slots });
  };

  const removeOverrideSlot = (overrideIndex, slotIndex) => {
    const override = config.dateOverrides[overrideIndex] || createDateOverride();

    updateDateOverride(overrideIndex, {
      slots: (override.slots || []).filter((_, index) => index !== slotIndex)
    });
  };

  const copySelectedWeekdayToOverride = (overrideIndex) => {

    const source = getWeekdayTemplate(selectedWeekday);

    updateDateOverride(overrideIndex, {
      mode: 'custom',
      dailyLimit: source.dailyLimit || '',
      slots: cloneDeep(source.slots || [])
    });

    toast.success(
      `Copied ${WEEKDAYS.find((day) => day.value === selectedWeekday)?.label
      } slots to date exception`
    );
  };

  const getOverrideSlotGenerator = (overrideIndex) => {
    return overrideSlotGenerators[overrideIndex] || getInitialSlotGenerator();
  };

  const updateOverrideSlotGenerator = (overrideIndex, patch) => {
    setOverrideSlotGenerators((prev) => ({
      ...prev,
      [overrideIndex]: {
        ...(prev[overrideIndex] || getInitialSlotGenerator()),
        ...patch
      }
    }));
  };

  const generateWeekdaySlots = () => {
    try {
      const generatedSlots = buildGeneratedTimeSlots(weekdaySlotGenerator);
      const currentTemplate = getWeekdayTemplate(selectedWeekday);
      const generatedCapacity = getTotalActiveSlotCapacity(generatedSlots);

      upsertWeekdayTemplate(selectedWeekday, {
        ...currentTemplate,
        isOpen: true,
        slots: generatedSlots,
        dailyLimit:
          currentTemplate.dailyLimit !== '' &&
            Number(currentTemplate.dailyLimit) > generatedCapacity
            ? ''
            : currentTemplate.dailyLimit
      });

      toast.success(`${generatedSlots.length} time slots generated successfully`);
    } catch (error) {
      toast.error(error.message || 'Failed to generate time slots');
    }
  };

  const generateOverrideSlots = (overrideIndex) => {
    try {
      const generator = getOverrideSlotGenerator(overrideIndex);
      const generatedSlots = buildGeneratedTimeSlots(generator);
      const currentOverride = config.dateOverrides[overrideIndex] || createDateOverride();
      const generatedCapacity = getTotalActiveSlotCapacity(generatedSlots);

      updateDateOverride(overrideIndex, {
        ...currentOverride,
        mode: 'custom',
        slots: generatedSlots,
        dailyLimit:
          currentOverride.dailyLimit !== '' &&
            Number(currentOverride.dailyLimit) > generatedCapacity
            ? ''
            : currentOverride.dailyLimit
      });

      toast.success(`${generatedSlots.length} time slots generated successfully`);
    } catch (error) {
      toast.error(error.message || 'Failed to generate time slots');
    }
  };

  const validateSlotList = (slots = [], labelPrefix = 'Slot') => {
    const seen = new Set();

    for (const slot of slots) {
      if (!slot.startTime || !slot.endTime) {
        return `${labelPrefix}: every slot must have start and end time.`;
      }

      if (slot.startTime >= slot.endTime) {
        return `${labelPrefix}: slot end time must be after start time.`;
      }

      if (Number(slot.capacity) < 1) {
        return `${labelPrefix}: slot capacity must be at least 1.`;
      }

      const key = `${slot.startTime}-${slot.endTime}`;

      if (seen.has(key)) {
        return `${labelPrefix}: duplicate slot found (${key}).`;
      }

      seen.add(key);
    }

    return '';
  };

  const validateConfigBeforeSave = () => {
    if (!settingsCenterId) return 'Please select a center first.';

    if (config.minLeadDays === '' || Number(config.minLeadDays) < 0) {
      return 'Minimum lead days is required and cannot be negative.';
    }

    if (config.maxAdvanceDays === '' || Number(config.maxAdvanceDays) < 1) {
      return 'Maximum advance days is required and must be at least 1.';
    }

    if (Number(config.maxAdvanceDays) < Number(config.minLeadDays)) {
      return 'Maximum advance days must be greater than or equal to minimum lead days.';
    }

    const activeTemplates = config.weeklyTemplates.filter(
      (template) => template.isOpen !== false
    );

    if (activeTemplates.length === 0) {
      return 'At least one weekday must be open with appointment slots.';
    }

    for (const template of config.weeklyTemplates) {
      const weekdayName =
        WEEKDAYS.find((day) => day.value === Number(template.weekday))?.label ||
        'Weekday';

      const activeCapacity = getTotalActiveSlotCapacity(template.slots);
      const slotError = validateSlotList(template.slots || [], weekdayName);

      if (slotError) return slotError;

      if (template.isOpen !== false && activeCapacity < 1) {
        return `${weekdayName} is open but has no active slot.`;
      }

      if (
        template.isOpen !== false &&
        template.dailyLimit !== '' &&
        Number(template.dailyLimit) > activeCapacity
      ) {
        return `${weekdayName} daily limit cannot exceed active slot capacity (${activeCapacity}).`;
      }
    }

    const seenDateKeys = new Set();

    for (const override of config.dateOverrides) {
      if (!override.dateKey) return 'Every date exception must have a date.';

      if (seenDateKeys.has(override.dateKey)) {
        return `Duplicate date exception found: ${override.dateKey}.`;
      }

      seenDateKeys.add(override.dateKey);

      if (override.mode === 'custom') {
        const activeCapacity = getTotalActiveSlotCapacity(override.slots);
        const slotError = validateSlotList(override.slots || [], override.dateKey);

        if (slotError) return slotError;

        if (activeCapacity < 1) {
          return `${override.dateKey} custom schedule needs at least one active slot.`;
        }

        if (
          override.dailyLimit !== '' &&
          Number(override.dailyLimit) > activeCapacity
        ) {
          return `${override.dateKey} daily limit cannot exceed active slot capacity (${activeCapacity}).`;
        }
      }
    }

    return '';
  };

  const normalizeSlotList = (slots = []) => {
    return slots.map((slot) => ({
      label: slot.label?.trim() || `${slot.startTime} - ${slot.endTime}`,
      startTime: slot.startTime,
      endTime: slot.endTime,
      capacity: Number(slot.capacity),
      isActive: slot.isActive !== false
    }));
  };

  const normalizeConfigPayload = () => ({
    minLeadDays: Number(config.minLeadDays),
    maxAdvanceDays: Number(config.maxAdvanceDays),
    isActive: config.isActive !== false,
    weeklyTemplates: config.weeklyTemplates.map((template) => ({
      weekday: Number(template.weekday),
      isOpen: template.isOpen !== false,
      dailyLimit: template.dailyLimit === '' ? undefined : Number(template.dailyLimit),
      note: template.note?.trim() || '',
      slots: normalizeSlotList(template.slots || [])
    })),
    dateOverrides: config.dateOverrides.map((override) => ({
      dateKey: override.dateKey,
      mode: override.mode === 'custom' ? 'custom' : 'closed',
      reason: override.reason?.trim() || '',
      dailyLimit: override.dailyLimit === '' ? undefined : Number(override.dailyLimit),
      slots: override.mode === 'custom' ? normalizeSlotList(override.slots || []) : []
    }))
  });

  const handleSaveConfig = async () => {
    const validationError = validateConfigBeforeSave();

    if (validationError) {
      toast.error(validationError);
      return;
    }

    try {
      setSavingSettings(true);

      const response = await api.put(
        `/appointments/admin/settings/${settingsCenterId}`,
        normalizeConfigPayload()
      );

      const savedConfig = response?.data?.config;

      if (savedConfig) {
        setConfig({
          minLeadDays: savedConfig.minLeadDays ?? '',
          maxAdvanceDays: savedConfig.maxAdvanceDays ?? '',
          isActive: savedConfig.isActive !== false,
          weeklyTemplates: savedConfig.weeklyTemplates || [],
          dateOverrides: savedConfig.dateOverrides || []
        });
      }

      toast.success('Appointment schedule settings saved successfully');
    } catch (error) {
      toast.error(
        error?.response?.data?.message || 'Failed to save appointment settings'
      );
    } finally {
      setSavingSettings(false);
    }
  };

  const handleViewAppointment = async (appointmentId) => {
    try {
      setActionLoading(true);
      setStatusReason('');

      const response = await api.get(`/appointments/admin/${appointmentId}`);

      setSelectedAppointment(response?.data?.appointment || null);
      setShowAppointmentModal(true);
    } catch (error) {
      toast.error(
        error?.response?.data?.message || 'Failed to load appointment details'
      );
    } finally {
      setActionLoading(false);
    }
  };

  const handleAppointmentStatusUpdate = async (appointmentId, status) => {
    try {
      setActionLoading(true);

      await api.patch(`/appointments/admin/${appointmentId}/status`, {
        status,
        reason: statusReason
      });

      toast.success(`Appointment ${formatStatus(status)} successfully`);

      await Promise.all([fetchAppointments(pagination.page), fetchStats()]);

      if (selectedAppointment?._id === appointmentId) {
        await handleViewAppointment(appointmentId);
      }
    } catch (error) {
      toast.error(
        error?.response?.data?.message || 'Failed to update appointment status'
      );
    } finally {
      setActionLoading(false);
    }
  };

  const resetCenterForm = () => {
    setCenterForm(initialCenterForm);
    setEditingCenter(null);
  };

  const openCreateCenterModal = () => {
    resetCenterForm();
    setShowCenterModal(true);
  };

  const openEditCenterModal = (center) => {
    setEditingCenter(center);
    setCenterForm({
      name: center.name || '',
      district: center.district || '',
      address: center.address || '',
      contactNumber: center.contactNumber || '',
      officeHours: center.officeHours || '',
      dailyCapacity: center.dailyCapacity || '',
      isActive: center.isActive ?? true
    });
    setShowCenterModal(true);
  };

  const handleCenterFormChange = (event) => {
    const { name, value, type, checked } = event.target;

    setCenterForm((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSaveCenter = async (event) => {
    event.preventDefault();

    if (!centerForm.name || !centerForm.district || !centerForm.address) {
      toast.error('Center name, district and address are required');
      return;
    }

    try {
      setActionLoading(true);

      const payload = {
        name: centerForm.name,
        district: centerForm.district,
        address: centerForm.address,
        contactNumber: centerForm.contactNumber,
        officeHours: centerForm.officeHours,
        dailyCapacity: centerForm.dailyCapacity
          ? Number(centerForm.dailyCapacity)
          : undefined,
        isActive: centerForm.isActive
      };

      if (editingCenter?._id) {
        await api.put(`/admin/centers/${editingCenter._id}`, payload);
        toast.success('Center updated successfully');
      } else {
        await api.post('/admin/centers', payload);
        toast.success('Center created successfully');
      }

      setShowCenterModal(false);
      resetCenterForm();
      await fetchCenters();
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Failed to save center');
    } finally {
      setActionLoading(false);
    }
  };

  const handleToggleCenterStatus = async (centerId) => {
    try {
      setActionLoading(true);

      await api.patch(`/admin/centers/${centerId}/toggle-status`);

      toast.success('Center status updated successfully');
      await fetchCenters();
    } catch (error) {
      toast.error(
        error?.response?.data?.message || 'Failed to update center status'
      );
    } finally {
      setActionLoading(false);
    }
  };

  const statCards = [
    {
      key: 'total',
      title: 'Total Appointments',
      value: stats.totalAppointments || 0,
      helpText: 'All appointment records',
      icon: FaCalendarAlt,
      tone: 'blue'
    },
    {
      key: 'today',
      title: 'Today Booked',
      value: stats.todayAppointments || 0,
      helpText: 'Citizens expected today',
      icon: FaUsers,
      tone: 'green'
    },
    {
      key: 'completed',
      title: 'Completed',
      value: stats.completedAppointments || 0,
      helpText: 'Biometric completed',
      icon: FaUserCheck,
      tone: 'purple'
    },
    {
      key: 'cancelled',
      title: 'Cancelled',
      value: stats.cancelledAppointments || 0,
      helpText: 'Cancelled appointments',
      icon: FaBan,
      tone: 'red'
    }
  ];

  const renderStatCards = () => (
    <div className="appointment-management__stats-grid">
      {statCards.map((card) => {
        const Icon = card.icon;

        return (
          <div key={card.key} className="appointment-management__stat-card">
            <div>
              <span>{card.title}</span>
              <strong>{card.value}</strong>
              <small>{card.helpText}</small>
            </div>

            <span className={`appointment-management__stat-icon is-${card.tone}`}>
              <Icon />
            </span>
          </div>
        );
      })}
    </div>
  );

  const renderAppointmentsTab = () => (
    <div className="appointment-management__tab-content">
      {renderStatCards()}

      <div className="appointment-management__panel">
        <div className="appointment-management__panel-head">
          <div>
            <h2>Appointment Records</h2>
            <p>
              Search, filter, view details, cancel appointments or mark biometric
              completed.
            </p>
          </div>
        </div>

        <div className="appointment-management__filters">
          <label className="appointment-management__search-field">
            <FaSearch />
            <input
              type="text"
              placeholder="Search application, citizen, phone or center"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
            />
          </label>

          <label className="appointment-management__select-field">
            <FaFilter />
            <select
              value={centerFilter}
              onChange={(event) => setCenterFilter(event.target.value)}
            >
              <option value="">All Centers</option>
              {centers.map((center) => (
                <option key={center._id} value={center._id}>
                  {center.name}
                </option>
              ))}
            </select>
          </label>

          <label className="appointment-management__select-field">
            <FaMapMarkerAlt />
            <select
              value={districtFilter}
              onChange={(event) => setDistrictFilter(event.target.value)}
            >
              <option value="">All Districts</option>
              {districtOptions.map((district) => (
                <option key={district} value={district}>
                  {district}
                </option>
              ))}
            </select>
          </label>

          <label className="appointment-management__select-field">
            <FaFilter />
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
            >
              <option value="">All Status</option>
              <option value="booked">Booked</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </label>

          <label className="appointment-management__date-field">
            <FaCalendarAlt />
            <input
              type="date"
              value={dateFilter}
              onChange={(event) => setDateFilter(event.target.value)}
            />
          </label>

          {(searchQuery || centerFilter || districtFilter || statusFilter || dateFilter) && (
            <button type="button" className="btn btn-outline btn-sm" onClick={clearFilters}>
              <FaTimes />
              Clear
            </button>
          )}
        </div>

        <div className="appointment-management__table-wrap">
          <table className="appointment-management__table">
            <thead>
              <tr>
                <th>Application</th>
                <th>Citizen</th>
                <th>Center</th>
                <th>Date</th>
                <th>Slot</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>

            <tbody>
              {filteredAppointments.length === 0 ? (
                <tr>
                  <td colSpan="7">
                    <div className="appointment-management__empty-row">
                      <FaInfoCircle />
                      No appointments found.
                    </div>
                  </td>
                </tr>
              ) : (
                filteredAppointments.map((appointment) => (
                  <tr key={appointment._id}>
                    <td>
                      <strong>{getApplicationText(appointment)}</strong>
                      <span>{appointment?.application?.applicationType || 'N/A'}</span>
                    </td>

                    <td>
                      <strong>{getApplicantText(appointment)}</strong>
                      <span>
                        {appointment?.applicant?.phone ||
                          appointment?.applicant?.email ||
                          'N/A'}
                      </span>
                    </td>

                    <td>
                      <strong>
                        {appointment.centerName || appointment?.center?.name || 'N/A'}
                      </strong>
                      <span>
                        {appointment.centerDistrict ||
                          appointment?.center?.district ||
                          'N/A'}
                      </span>
                    </td>

                    <td>
                      <strong>{formatDateKey(appointment.appointmentDateKey)}</strong>
                      <span>
                        Booked:{' '}
                        {formatDateTime(appointment.bookedAt || appointment.createdAt)}
                      </span>
                    </td>

                    <td>
                      <strong>{appointment.timeSlot}</strong>
                      <span>Serial #{appointment.slotSerial || 'N/A'}</span>
                    </td>

                    <td>
                      <span className={`badge badge-${getStatusColor(appointment.status)}`}>
                        {formatStatus(appointment.status)}
                      </span>
                    </td>

                    <td>
                      <div className="appointment-management__table-actions">
                        <button
                          type="button"
                          className="appointment-management__icon-btn"
                          onClick={() => handleViewAppointment(appointment._id)}
                          title="View details"
                        >
                          <FaEye />
                        </button>

                        {appointment.status === 'booked' && (
                          <>
                            <button
                              type="button"
                              className="appointment-management__icon-btn is-success"
                              onClick={() =>
                                handleAppointmentStatusUpdate(
                                  appointment._id,
                                  'completed'
                                )
                              }
                              disabled={actionLoading}
                              title="Mark biometric completed"
                            >
                              <FaCheck />
                            </button>

                            <button
                              type="button"
                              className="appointment-management__icon-btn is-danger"
                              onClick={() =>
                                handleAppointmentStatusUpdate(
                                  appointment._id,
                                  'cancelled'
                                )
                              }
                              disabled={actionLoading}
                              title="Cancel appointment"
                            >
                              <FaBan />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="appointment-management__pagination">
          <span>
            Page {pagination.page || 1} of {pagination.pages || 1} •{' '}
            {pagination.total || 0} records
          </span>

          <div>
            <button
              type="button"
              className="btn btn-outline btn-sm"
              disabled={!pagination.hasPrevPage}
              onClick={() => fetchAppointments((pagination.page || 1) - 1)}
            >
              <FaChevronLeft />
              Prev
            </button>

            <button
              type="button"
              className="btn btn-outline btn-sm"
              disabled={!pagination.hasNextPage}
              onClick={() => fetchAppointments((pagination.page || 1) + 1)}
            >
              Next
              <FaChevronRight />
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  const renderSlotRows = ({
    slots = [],
    onAdd,
    onUpdate,
    onRemove,
    disabled = false,
    generator,
    onGeneratorChange,
    onGenerate
  }) => (
    <div className="appointment-management__slots-box">
      <div className="appointment-management__slots-head">
        <div>
          <strong>Time Slot List</strong>
          <span>Total active capacity: {getTotalActiveSlotCapacity(slots)}</span>
        </div>

        <button
          type="button"
          className="btn btn-outline btn-sm"
          onClick={onAdd}
          disabled={disabled}
        >
          <FaPlus />
          Add Slot
        </button>
      </div>

      <div className="appointment-management__generator-box">
        <div className="appointment-management__generator-head">
          <div>
            <strong>Quick Slot Generator</strong>
            <span>
              Office start/end time আর per citizen duration দিলে system automatic
              slot generate করবে.
            </span>
          </div>
        </div>

        <div className="appointment-management__generator-grid">
          <label className="appointment-management__field">
            <span>Office Start Time</span>
            <input
              type="time"
              value={generator?.officeStartTime || ''}
              onChange={(event) =>
                onGeneratorChange?.({ officeStartTime: event.target.value })
              }
              disabled={disabled}
            />
          </label>

          <label className="appointment-management__field">
            <span>Office End Time</span>
            <input
              type="time"
              value={generator?.officeEndTime || ''}
              onChange={(event) =>
                onGeneratorChange?.({ officeEndTime: event.target.value })
              }
              disabled={disabled}
            />
          </label>

          <label className="appointment-management__field">
            <span>Minutes Per Citizen</span>
            <input
              type="number"
              min="1"
              value={generator?.slotDurationMinutes || 30}
              onChange={(event) =>
                onGeneratorChange?.({ slotDurationMinutes: event.target.value })
              }
              disabled={disabled}
              placeholder="30"
            />
          </label>

          <label className="appointment-management__field">
            <span>Capacity Per Slot</span>
            <input
              type="number"
              min="1"
              value={generator?.capacityPerSlot || 1}
              onChange={(event) =>
                onGeneratorChange?.({ capacityPerSlot: event.target.value })
              }
              disabled={disabled}
              placeholder="1"
            />
          </label>

          <label className="appointment-management__field appointment-management__field--wide">
            <span>Optional Label Prefix</span>
            <input
              type="text"
              value={generator?.labelPrefix || ''}
              onChange={(event) =>
                onGeneratorChange?.({ labelPrefix: event.target.value })
              }
              disabled={disabled}
              placeholder="Example: Morning"
            />
          </label>

          <div className="appointment-management__generator-actions">
            <button
              type="button"
              className="btn btn-primary"
              onClick={onGenerate}
              disabled={disabled}
            >
              <FaClock />
              Generate Slots
            </button>
          </div>
        </div>

        <div className="appointment-management__generator-note">
          <FaInfoCircle />
          Generate করলে current slot list replace হবে। পরে নিচের row গুলো তুমি
          manually edit / delete / add করতে পারবে।
        </div>
      </div>

      {slots.length === 0 ? (
        <div className="appointment-management__empty-slot">
          <FaClock />
          No slot added yet.
        </div>
      ) : (
        <div className="appointment-management__slot-list">
          {slots.map((slot, index) => (
            <div
              key={`${slot.startTime}-${slot.endTime}-${index}`}
              className="appointment-management__slot-row"
            >
              <label>
                <span>Label</span>
                <input
                  type="text"
                  value={slot.label || ''}
                  placeholder="Morning 1"
                  onChange={(event) => onUpdate(index, { label: event.target.value })}
                  disabled={disabled}
                />
              </label>

              <label>
                <span>Start</span>
                <input
                  type="time"
                  value={slot.startTime || ''}
                  onChange={(event) =>
                    onUpdate(index, { startTime: event.target.value })
                  }
                  disabled={disabled}
                />
              </label>

              <label>
                <span>End</span>
                <input
                  type="time"
                  value={slot.endTime || ''}
                  onChange={(event) => onUpdate(index, { endTime: event.target.value })}
                  disabled={disabled}
                />
              </label>

              <label>
                <span>Capacity</span>
                <input
                  type="number"
                  min="1"
                  value={slot.capacity || 1}
                  onChange={(event) => onUpdate(index, { capacity: event.target.value })}
                  disabled={disabled}
                />
              </label>

              <label className="appointment-management__switch-line">
                <input
                  type="checkbox"
                  checked={slot.isActive !== false}
                  onChange={(event) =>
                    onUpdate(index, { isActive: event.target.checked })
                  }
                  disabled={disabled}
                />
                Active
              </label>

              <button
                type="button"
                className="appointment-management__icon-btn is-danger"
                onClick={() => onRemove(index)}
                disabled={disabled}
                title="Remove slot"
              >
                <FaTrash />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  const renderSettingsTab = () => (
    <div className="appointment-management__tab-content">
      <div className="appointment-management__panel appointment-management__settings-hero">
        <div className="appointment-management__panel-head">
          <div>
            <h2>Dynamic Appointment Schedule Settings</h2>
            <p>
              Admin can set center-wise weekly schedule, per-day time slots,
              special date exceptions and citizen booking window.
            </p>
          </div>

          <button
            type="button"
            className="btn btn-primary"
            onClick={handleSaveConfig}
            disabled={savingSettings || settingsLoading || !settingsCenterId}
          >
            {savingSettings ? (
              <FaSpinner className="appointment-management__spin" />
            ) : (
              <FaSave />
            )}
            Save Settings
          </button>
        </div>

        <div className="appointment-management__settings-grid">
          <label className="appointment-management__field">
            <span>Appointment Center</span>
            <select
              value={settingsCenterId}
              onChange={(event) => setSettingsCenterId(event.target.value)}
            >
              <option value="">Select center</option>
              {centers.map((center) => (
                <option key={center._id} value={center._id}>
                  {center.name} - {center.district}
                </option>
              ))}
            </select>
          </label>

          <label className="appointment-management__field">
            <span>Citizen can book after days</span>
            <input
              type="number"
              min="0"
              value={config.minLeadDays}
              onChange={(event) =>
                setConfig((prev) => ({ ...prev, minLeadDays: event.target.value }))
              }
              placeholder="Example: 2"
            />
          </label>

          <label className="appointment-management__field">
            <span>Citizen can book within days</span>
            <input
              type="number"
              min="1"
              value={config.maxAdvanceDays}
              onChange={(event) =>
                setConfig((prev) => ({ ...prev, maxAdvanceDays: event.target.value }))
              }
              placeholder="Example: 30"
            />
          </label>

          <label className="appointment-management__switch-card">
            <input
              type="checkbox"
              checked={config.isActive !== false}
              onChange={(event) =>
                setConfig((prev) => ({ ...prev, isActive: event.target.checked }))
              }
            />
            <span>
              <strong>Appointment booking active</strong>
              <small>Turn off to stop citizen booking for this center.</small>
            </span>
          </label>
        </div>

        {selectedSettingsCenter && (
          <div className="appointment-management__center-note">
            <FaBuilding />
            <div>
              <strong>{selectedSettingsCenter.name}</strong>
              <span>
                {selectedSettingsCenter.address || 'No address'} •{' '}
                {selectedSettingsCenter.district || 'No district'}
              </span>
            </div>
          </div>
        )}
      </div>

      {settingsLoading ? (
        <div className="appointment-management__panel appointment-management__inline-loader">
          <FaSpinner className="appointment-management__spin" />
          Loading appointment settings...
        </div>
      ) : (
        <>
          <div className="appointment-management__panel">
            <div className="appointment-management__panel-head">
              <div>
                <h2>Weekly Slot Templates</h2>
                <p>
                  Set different time slots for each weekday. If a date has no
                  exception, this weekday template will apply automatically.
                </p>
              </div>
            </div>

            <div className="appointment-management__weekday-grid">
              {WEEKDAYS.map((day) => {
                const template = getWeekdayTemplate(day.value);
                const capacity = getTotalActiveSlotCapacity(template.slots);
                const isActive = Number(selectedWeekday) === Number(day.value);

                return (
                  <button
                    key={day.value}
                    type="button"
                    className={`appointment-management__weekday-btn ${isActive ? 'is-active' : ''
                      } ${template.isOpen === false ? 'is-closed' : ''}`}
                    onClick={() => setSelectedWeekday(day.value)}
                  >
                    <strong>{day.shortLabel}</strong>
                    <span>
                      {template.isOpen === false ? 'Closed' : `${capacity} capacity`}
                    </span>
                    {template.note && <small>{template.note}</small>}
                  </button>
                );
              })}
            </div>

            <div className="appointment-management__template-editor">
              <div className="appointment-management__template-top">
                <div>
                  <h3>
                    {WEEKDAYS.find((day) => day.value === selectedWeekday)?.label}{' '}
                    Template
                  </h3>
                  <p>
                    Previous selection stays saved in the editor. Only change the
                    day that needs update.
                  </p>
                </div>

                <div className="appointment-management__copy-actions">
                  <button
                    type="button"
                    className="btn btn-outline btn-sm"
                    onClick={copySlotsFromPreviousDay}
                  >
                    <FaCopy />
                    Copy Previous Day
                  </button>

                  <select
                    value={copySourceWeekday}
                    onChange={(event) => setCopySourceWeekday(Number(event.target.value))}
                  >
                    {WEEKDAYS.map((day) => (
                      <option key={day.value} value={day.value}>
                        Copy from {day.label}
                      </option>
                    ))}
                  </select>

                  <button
                    type="button"
                    className="btn btn-outline btn-sm"
                    onClick={() => copySlotsFromWeekday(copySourceWeekday)}
                  >
                    Apply Copy
                  </button>
                </div>
              </div>

              <div className="appointment-management__settings-grid is-compact">
                <label className="appointment-management__switch-card">
                  <input
                    type="checkbox"
                    checked={selectedTemplate.isOpen !== false}
                    onChange={(event) =>
                      updateSelectedWeekday({ isOpen: event.target.checked })
                    }
                  />
                  <span>
                    <strong>Open this weekday</strong>
                    <small>If closed, citizens cannot select this weekday.</small>
                  </span>
                </label>

                <label className="appointment-management__field">
                  <span>Daily limit</span>
                  <input
                    type="number"
                    min="1"
                    value={selectedTemplate.dailyLimit || ''}
                    placeholder={`Auto: ${selectedTemplateCapacity}`}
                    onChange={(event) =>
                      updateSelectedWeekday({ dailyLimit: event.target.value })
                    }
                    disabled={selectedTemplate.isOpen === false}
                  />
                </label>

                <label className="appointment-management__field is-wide">
                  <span>Internal note / citizen reason</span>
                  <input
                    type="text"
                    value={selectedTemplate.note || ''}
                    placeholder="Example: Friday weekly holiday / Short schedule"
                    onChange={(event) => updateSelectedWeekday({ note: event.target.value })}
                  />
                </label>
              </div>

              <div className="appointment-management__capacity-note">
                <FaInfoCircle />
                Active slot capacity is {selectedTemplateCapacity}. Daily limit must be
                equal or lower. If daily limit is blank, total active slot capacity
                will be used.
              </div>

              {renderSlotRows({
                slots: selectedTemplate.slots || [],
                disabled: selectedTemplate.isOpen === false,
                onAdd: addWeekdaySlot,
                onUpdate: updateWeekdaySlot,
                onRemove: removeWeekdaySlot,
                generator: weekdaySlotGenerator,
                onGeneratorChange: (patch) =>
                  setWeekdaySlotGenerator((prev) => ({
                    ...prev,
                    ...patch
                  })),
                onGenerate: generateWeekdaySlots
              })}
            </div>
          </div>

          <div className="appointment-management__panel">
            <div className="appointment-management__panel-head">
              <div>
                <h2>Specific Date Exceptions</h2>
                <p>
                  Use this for public holidays, emergency closure, special service
                  day, or custom slots for one date.
                </p>
              </div>

              <button type="button" className="btn btn-outline" onClick={addDateOverride}>
                <FaPlus />
                Add Date Exception
              </button>
            </div>

            {config.dateOverrides.length === 0 ? (
              <div className="appointment-management__empty-slot">
                <FaCalendarAlt />
                No date exception added. Citizens will see weekly templates by default.
              </div>
            ) : (
              <div className="appointment-management__override-list">
                {config.dateOverrides.map((override, overrideIndex) => {
                  const activeCapacity = getTotalActiveSlotCapacity(override.slots);

                  return (
                    <div
                      key={`${override.dateKey}-${overrideIndex}`}
                      className="appointment-management__override-card"
                    >
                      <div className="appointment-management__override-head">
                        <div>
                          <strong>
                            {override.dateKey
                              ? formatDateKey(override.dateKey)
                              : 'New date exception'}
                          </strong>
                          <span>
                            {override.mode === 'closed'
                              ? 'Closed date'
                              : `Custom schedule • ${activeCapacity} active capacity`}
                          </span>
                        </div>

                        <button
                          type="button"
                          className="appointment-management__icon-btn is-danger"
                          onClick={() => removeDateOverride(overrideIndex)}
                          title="Remove exception"
                        >
                          <FaTrash />
                        </button>
                      </div>

                      <div className="appointment-management__settings-grid is-compact">
                        <label className="appointment-management__field">
                          <span>Date</span>
                          <input
                            type="date"
                            value={override.dateKey || ''}
                            onChange={(event) =>
                              updateDateOverride(overrideIndex, {
                                dateKey: event.target.value
                              })
                            }
                          />
                        </label>

                        <label className="appointment-management__field">
                          <span>Mode</span>
                          <select
                            value={override.mode || 'closed'}
                            onChange={(event) =>
                              updateDateOverride(overrideIndex, {
                                mode: event.target.value
                              })
                            }
                          >
                            <option value="closed">Closed</option>
                            <option value="custom">Custom slots</option>
                          </select>
                        </label>

                        <label className="appointment-management__field">
                          <span>Daily limit</span>
                          <input
                            type="number"
                            min="1"
                            value={override.dailyLimit || ''}
                            placeholder={
                              override.mode === 'custom'
                                ? `Auto: ${activeCapacity}`
                                : 'Not needed'
                            }
                            disabled={override.mode !== 'custom'}
                            onChange={(event) =>
                              updateDateOverride(overrideIndex, {
                                dailyLimit: event.target.value
                              })
                            }
                          />
                        </label>

                        <label className="appointment-management__field is-wide">
                          <span>Reason / note</span>
                          <input
                            type="text"
                            value={override.reason || ''}
                            placeholder="Example: Public holiday"
                            onChange={(event) =>
                              updateDateOverride(overrideIndex, {
                                reason: event.target.value
                              })
                            }
                          />
                        </label>
                      </div>

                      {override.mode === 'custom' && (
                        <>
                          <div className="appointment-management__copy-actions is-left">
                            <button
                              type="button"
                              className="btn btn-outline btn-sm"
                              onClick={() => copySelectedWeekdayToOverride(overrideIndex)}
                            >
                              <FaCopy />
                              Copy Selected Weekday Slots
                            </button>
                          </div>

                          {renderSlotRows({
                            slots: override.slots || [],
                            onAdd: () => addOverrideSlot(overrideIndex),
                            onUpdate: (slotIndex, patch) =>
                              updateOverrideSlot(overrideIndex, slotIndex, patch),
                            onRemove: (slotIndex) => removeOverrideSlot(overrideIndex, slotIndex),
                            generator: getOverrideSlotGenerator(overrideIndex),
                            onGeneratorChange: (patch) =>
                              updateOverrideSlotGenerator(overrideIndex, patch),
                            onGenerate: () => generateOverrideSlots(overrideIndex)
                          })}
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );

  const renderCentersTab = () => (
    <div className="appointment-management__tab-content">
      <div className="appointment-management__panel">
        <div className="appointment-management__panel-head">
          <div>
            <h2>Appointment Centers</h2>
            <p>
              Manage biometric appointment centers. Scheduling is configured
              separately in Schedule Settings.
            </p>
          </div>

          <button type="button" className="btn btn-primary" onClick={openCreateCenterModal}>
            <FaPlus />
            Create Center
          </button>
        </div>

        <div className="appointment-management__center-grid">
          {centers.length === 0 ? (
            <div className="appointment-management__empty-slot">
              <FaBuilding />
              No appointment center found.
            </div>
          ) : (
            centers.map((center) => (
              <div key={center._id} className="appointment-management__center-card">
                <div className="appointment-management__center-top">
                  <span className="appointment-management__center-icon">
                    <FaBuilding />
                  </span>

                  <span className={`badge badge-${center.isActive ? 'success' : 'gray'}`}>
                    {center.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>

                <h3>{center.name}</h3>
                <p>{center.address || 'No address provided'}</p>

                <div className="appointment-management__center-meta">
                  <span>District: {center.district || 'N/A'}</span>
                  <span>Contact: {center.contactNumber || 'N/A'}</span>
                  <span>Office: {center.officeHours || 'N/A'}</span>
                </div>

                <div className="appointment-management__center-actions">
                  <button
                    type="button"
                    className="btn btn-outline btn-sm"
                    onClick={() => openEditCenterModal(center)}
                  >
                    <FaEdit />
                    Edit
                  </button>

                  <button
                    type="button"
                    className="btn btn-outline btn-sm"
                    onClick={() => {
                      setSettingsCenterId(center._id);
                      setActiveTab('settings');
                    }}
                  >
                    <FaClock />
                    Schedule
                  </button>

                  <button
                    type="button"
                    className={center.isActive ? 'btn btn-danger btn-sm' : 'btn btn-success btn-sm'}
                    onClick={() => handleToggleCenterStatus(center._id)}
                    disabled={actionLoading}
                  >
                    {center.isActive ? 'Disable' : 'Enable'}
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );

  const renderAppointmentModal = () => {
    if (!showAppointmentModal || !selectedAppointment) return null;

    return (
      <div className="appointment-management__modal-backdrop" role="presentation">
        <div
          className="appointment-management__modal appointment-management__modal--large"
          role="dialog"
          aria-modal="true"
        >
          <div className="appointment-management__modal-head">
            <div>
              <h2>Appointment Details</h2>
              <p>{getApplicationText(selectedAppointment)}</p>
            </div>

            <button
              type="button"
              className="appointment-management__icon-btn"
              onClick={() => setShowAppointmentModal(false)}
            >
              <FaTimes />
            </button>
          </div>

          <div className="appointment-management__details-grid">
            <div>
              <span>Application ID</span>
              <strong>{getApplicationText(selectedAppointment)}</strong>
            </div>

            <div>
              <span>Citizen</span>
              <strong>{getApplicantText(selectedAppointment)}</strong>
            </div>

            <div>
              <span>Phone</span>
              <strong>
                {selectedAppointment?.applicant?.phone ||
                  selectedAppointment?.application?.phone ||
                  'N/A'}
              </strong>
            </div>

            <div>
              <span>Email</span>
              <strong>
                {selectedAppointment?.applicant?.email ||
                  selectedAppointment?.application?.email ||
                  'N/A'}
              </strong>
            </div>

            <div>
              <span>Center</span>
              <strong>
                {selectedAppointment.centerName ||
                  selectedAppointment?.center?.name ||
                  'N/A'}
              </strong>
            </div>

            <div>
              <span>District</span>
              <strong>
                {selectedAppointment.centerDistrict ||
                  selectedAppointment?.center?.district ||
                  'N/A'}
              </strong>
            </div>

            <div>
              <span>Date</span>
              <strong>{formatDateKey(selectedAppointment.appointmentDateKey)}</strong>
            </div>

            <div>
              <span>Time Slot</span>
              <strong>{selectedAppointment.timeSlot}</strong>
            </div>

            <div>
              <span>Serial</span>
              <strong>#{selectedAppointment.slotSerial || 'N/A'}</strong>
            </div>

            <div>
              <span>Status</span>
              <strong className={`badge badge-${getStatusColor(selectedAppointment.status)}`}>
                {formatStatus(selectedAppointment.status)}
              </strong>
            </div>

            <div>
              <span>Booked At</span>
              <strong>
                {formatDateTime(selectedAppointment.bookedAt || selectedAppointment.createdAt)}
              </strong>
            </div>

            <div>
              <span>Completed At</span>
              <strong>{formatDateTime(selectedAppointment.completedAt) || 'N/A'}</strong>
            </div>
          </div>

          <label className="appointment-management__field">
            <span>Status update reason / note</span>
            <textarea
              rows="3"
              value={statusReason}
              onChange={(event) => setStatusReason(event.target.value)}
              placeholder="Example: Biometric completed by officer / Citizen requested cancellation"
            />
          </label>

          <div className="appointment-management__modal-actions">
            <button
              type="button"
              className="btn btn-outline"
              onClick={() => setShowAppointmentModal(false)}
            >
              Close
            </button>

            {selectedAppointment.status === 'booked' && (
              <>
                <button
                  type="button"
                  className="btn btn-danger"
                  onClick={() =>
                    handleAppointmentStatusUpdate(selectedAppointment._id, 'cancelled')
                  }
                  disabled={actionLoading}
                >
                  <FaBan />
                  Cancel Appointment
                </button>

                <button
                  type="button"
                  className="btn btn-success"
                  onClick={() =>
                    handleAppointmentStatusUpdate(selectedAppointment._id, 'completed')
                  }
                  disabled={actionLoading}
                >
                  <FaUserCheck />
                  Mark Biometric Completed
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderCenterModal = () => {
    if (!showCenterModal) return null;

    return (
      <div className="appointment-management__modal-backdrop" role="presentation">
        <form className="appointment-management__modal" onSubmit={handleSaveCenter}>
          <div className="appointment-management__modal-head">
            <div>
              <h2>{editingCenter ? 'Edit Center' : 'Create Center'}</h2>
              <p>Center information is separated from appointment schedule settings.</p>
            </div>

            <button
              type="button"
              className="appointment-management__icon-btn"
              onClick={() => setShowCenterModal(false)}
            >
              <FaTimes />
            </button>
          </div>

          <div className="appointment-management__form-grid">
            <label className="appointment-management__field">
              <span>Center Name</span>
              <input
                name="name"
                value={centerForm.name}
                onChange={handleCenterFormChange}
                required
              />
            </label>

            <label className="appointment-management__field">
              <span>District</span>
              <input
                name="district"
                value={centerForm.district}
                onChange={handleCenterFormChange}
                required
              />
            </label>

            <label className="appointment-management__field is-wide">
              <span>Address</span>
              <textarea
                name="address"
                rows="3"
                value={centerForm.address}
                onChange={handleCenterFormChange}
                required
              />
            </label>

            <label className="appointment-management__field">
              <span>Contact Number</span>
              <input
                name="contactNumber"
                value={centerForm.contactNumber}
                onChange={handleCenterFormChange}
              />
            </label>

            <label className="appointment-management__field">
              <span>Office Hours</span>
              <input
                name="officeHours"
                value={centerForm.officeHours}
                onChange={handleCenterFormChange}
                placeholder="Example: 9 AM - 5 PM"
              />
            </label>

            <label className="appointment-management__field">
              <span>Legacy daily capacity</span>
              <input
                name="dailyCapacity"
                type="number"
                min="1"
                value={centerForm.dailyCapacity}
                onChange={handleCenterFormChange}
                placeholder="Optional"
              />
            </label>

            <label className="appointment-management__switch-card">
              <input
                name="isActive"
                type="checkbox"
                checked={centerForm.isActive}
                onChange={handleCenterFormChange}
              />
              <span>
                <strong>Center active</strong>
                <small>Inactive center cannot be selected by citizens.</small>
              </span>
            </label>
          </div>

          <div className="appointment-management__modal-actions">
            <button
              type="button"
              className="btn btn-outline"
              onClick={() => setShowCenterModal(false)}
            >
              Cancel
            </button>

            <button type="submit" className="btn btn-primary" disabled={actionLoading}>
              {actionLoading ? (
                <FaSpinner className="appointment-management__spin" />
              ) : (
                <FaSave />
              )}
              Save Center
            </button>
          </div>
        </form>
      </div>
    );
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="appointment-management appointment-management--loading">
          <Loader size="large" text="Loading appointment management..." />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="appointment-management">
        <div className="appointment-management__hero">
          <div>
            <span className="appointment-management__eyebrow">
              <FaCalendarAlt />
              Appointment Control Panel
            </span>

            <h1>Appointment Management</h1>
            <p>
              Manage citizen appointments, center schedule rules, dynamic weekday
              slots, date exceptions and biometric completion.
            </p>
          </div>

          <button
            type="button"
            className="btn btn-primary"
            onClick={refreshPage}
            disabled={actionLoading || settingsLoading}
          >
            <FaRedo />
            Refresh
          </button>
        </div>

        <div className="appointment-management__tabs">
          <button
            type="button"
            className={activeTab === 'appointments' ? 'is-active' : ''}
            onClick={() => setActiveTab('appointments')}
          >
            <FaCalendarAlt />
            Appointments
          </button>

          <button
            type="button"
            className={activeTab === 'settings' ? 'is-active' : ''}
            onClick={() => setActiveTab('settings')}
          >
            <FaClock />
            Schedule Settings
          </button>

          <button
            type="button"
            className={activeTab === 'centers' ? 'is-active' : ''}
            onClick={() => setActiveTab('centers')}
          >
            <FaBuilding />
            Centers
          </button>
        </div>

        {activeTab === 'appointments' && renderAppointmentsTab()}
        {activeTab === 'settings' && renderSettingsTab()}
        {activeTab === 'centers' && renderCentersTab()}

        {renderAppointmentModal()}
        {renderCenterModal()}
      </div>
    </AdminLayout>
  );
};

export default AppointmentManagement;
// Appointment Management Page End