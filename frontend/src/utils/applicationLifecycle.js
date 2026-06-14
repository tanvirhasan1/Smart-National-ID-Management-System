export const ISSUED_NID_STATUSES = ['printed', 'dispatched', 'delivered'];
export const APPOINTMENT_ELIGIBLE_STATUSES = ['approved'];

export const normalizeApplicationStatus = (applicationOrStatus = '') => {
  if (typeof applicationOrStatus === 'string') {
    return applicationOrStatus;
  }

  return String(applicationOrStatus?.status || '').toLowerCase();
};

export const canViewDigitalNid = (applicationOrStatus) =>
  ISSUED_NID_STATUSES.includes(normalizeApplicationStatus(applicationOrStatus));

export const canApplyCorrection = (applicationOrStatus) =>
  ISSUED_NID_STATUSES.includes(normalizeApplicationStatus(applicationOrStatus));

export const canBookAppointment = (applicationOrStatus) =>
  APPOINTMENT_ELIGIBLE_STATUSES.includes(normalizeApplicationStatus(applicationOrStatus));

export const normalizeAppointmentStatus = (appointment = null) =>
  String(appointment?.status || appointment?.appointmentStatus || '').toLowerCase();

export const getApplicationAppointmentSummary = (application = {}, appointment = null) =>
  appointment ||
  application?.appointment ||
  application?.latestAppointment ||
  application?.appointmentSummary ||
  application?.lifecycle?.appointment ||
  null;

export const getApplicationLifecycleStageKey = (application = {}, appointment = null) => {
  const status = normalizeApplicationStatus(application);
  const appointmentStatus = normalizeAppointmentStatus(
    getApplicationAppointmentSummary(application, appointment)
  );

  if (status === 'approved') {
    if (appointmentStatus === 'completed') {
      return 'waiting_for_printing';
    }

    if (appointmentStatus === 'booked') {
      return 'appointment_booked';
    }

    return 'appointment_required';
  }

  if (status === 'printed') return 'printed';
  if (status === 'dispatched') return 'dispatched';
  if (status === 'delivered') return 'delivered';
  if (status === 'submitted') return 'submitted';
  if (status === 'under_review') return 'under_review';
  if (status === 'rejected') return 'rejected';
  if (status === 'cancelled') return 'cancelled';

  return status || 'not_started';
};

export const isAppointmentBookingActionAvailable = (application = {}, appointment = null) =>
  getApplicationLifecycleStageKey(application, appointment) === 'appointment_required';

export const isDigitalNidAvailable = (application = {}, eligibility = null) =>
  Boolean(application?.digitalNidAvailable || application?.lifecycle?.digitalNidAvailable) ||
  canViewDigitalNid(application?.status) ||
  Boolean(
    eligibility?.digitalNidAvailable &&
      String(eligibility.digitalNidApplicationId || '') === String(application?._id || '')
  );

export const isCorrectionEligible = (application = {}, eligibility = null) =>
  Boolean(application?.correctionEligible || application?.lifecycle?.correctionEligible) ||
  canApplyCorrection(application?.status) ||
  Boolean(
    eligibility?.correctionEligible &&
      String(eligibility.correctionEligibleApplicationId || '') === String(application?._id || '')
  );
