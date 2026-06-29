const ISSUED_NID_STATUSES = ['printed', 'dispatched', 'delivered'];
const APPOINTMENT_ELIGIBLE_STATUSES = ['approved'];
const ACTIVE_NEW_NID_STATUSES = [
  'draft',
  'submitted',
  'under_review',
  'approved',
  'printed',
  'dispatched'
];
const NEW_NID_BLOCKING_STATUSES = [
  ...ACTIVE_NEW_NID_STATUSES,
  'delivered'
];

const normalizeStatus = (applicationOrStatus = '') => {
  if (typeof applicationOrStatus === 'string') {
    return applicationOrStatus;
  }

  return String(applicationOrStatus?.status || '').toLowerCase();
};

const isNewNidApplication = (application = {}) =>
  String(application?.applicationType || 'new').toLowerCase() === 'new';

const hasStatus = (applicationOrStatus, statuses) =>
  statuses.includes(normalizeStatus(applicationOrStatus));

const canViewDigitalNid = (application) =>
  isNewNidApplication(application) && hasStatus(application, ISSUED_NID_STATUSES);

const isCorrectionEligibleApplication = (application) =>
  isNewNidApplication(application) && hasStatus(application, ISSUED_NID_STATUSES);

const canBookBiometricAppointment = (application) =>
  isNewNidApplication(application) && hasStatus(application, APPOINTMENT_ELIGIBLE_STATUSES);

const isNewNidBlockingApplication = (application) =>
  isNewNidApplication(application) && hasStatus(application, NEW_NID_BLOCKING_STATUSES);

const isCompletedAppointment = (appointment) =>
  normalizeStatus(appointment) === 'completed';

module.exports = {
  ISSUED_NID_STATUSES,
  APPOINTMENT_ELIGIBLE_STATUSES,
  ACTIVE_NEW_NID_STATUSES,
  NEW_NID_BLOCKING_STATUSES,
  normalizeStatus,
  isNewNidApplication,
  canViewDigitalNid,
  isCorrectionEligibleApplication,
  canBookBiometricAppointment,
  isNewNidBlockingApplication,
  isCompletedAppointment
};
