import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  FaIdCard,
  FaCalendarAlt,
  FaSearch,
  FaDownload,
  FaHeadset,
  FaCheckCircle,
  FaClock,
  FaExclamationTriangle,
  FaTruck,
  FaPrint,
  FaArrowRight,
  FaSyncAlt,
  FaEye,
  FaRegFileAlt,
  FaMoneyBillWave
} from 'react-icons/fa';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import api from '../api/axios';
import Loader from '../common/Loader';
import { formatStatus } from '../utils/helpers';
import {
  canApplyCorrection,
  isAppointmentBookingActionAvailable
} from '../../utils/applicationLifecycle';
import '../styles/Dashboard.css';

const formatDashboardDateTime = (value, language = 'en') => {
  if (!value) return 'N/A';

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return 'N/A';
  }

  return new Intl.DateTimeFormat(language === 'bn' ? 'bn-BD' : 'en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(date);
};

const DEFAULT_APPOINTMENT_DETAILS = {
  date: 'Date',
  time: 'Time',
  center: 'Center',
  notAvailable: 'Not available',
  empty: 'Appointment details will appear here once available.'
};

const DEFAULT_APPLICATION_TYPE_LABELS = {
  new: 'New NID',
  correction: 'Correction',
  reissue: 'Reissue'
};

const DEFAULT_STAGE_LABELS = {
  submitted: 'Submitted',
  under_review: 'Under review',
  correction_required: 'Correction required',
  appointment_required: 'Appointment required',
  appointment_booked: 'Appointment booked',
  waiting_for_printing: 'Waiting for printing',
  printed: 'Card printed',
  dispatched: 'Delivery in progress',
  delivered: 'Delivered',
  rejected: 'Rejected',
  cancelled: 'Cancelled'
};

const DEFAULT_APPOINTMENT_DETAILS_BN = {
  date: 'তারিখ',
  time: 'সময়',
  center: 'কেন্দ্র',
  notAvailable: 'প্রযোজ্য নয়',
  empty: 'অ্যাপয়েন্টমেন্ট বিস্তারিত পাওয়া গেলে এখানে দেখা যাবে।'
};

const DEFAULT_APPLICATION_TYPE_LABELS_BN = {
  new: 'নতুন এনআইডি',
  correction: 'সংশোধন',
  reissue: 'রিইস্যু'
};

const DEFAULT_STAGE_LABELS_BN = {
  submitted: 'জমা হয়েছে',
  under_review: 'পর্যালোচনাধীন',
  correction_required: 'সংশোধন প্রয়োজন',
  appointment_required: 'অ্যাপয়েন্টমেন্ট প্রয়োজন',
  appointment_booked: 'অ্যাপয়েন্টমেন্ট বুকড',
  waiting_for_printing: 'প্রিন্টিংয়ের অপেক্ষায়',
  printed: 'কার্ড প্রিন্টেড',
  dispatched: 'ডেলিভারি চলমান',
  delivered: 'ডেলিভারড',
  rejected: 'বাতিল',
  cancelled: 'বাতিল হয়েছে'
};

const formatAppointmentDate = (appointment, language = 'en') => {
  const rawDate =
    appointment?.appointmentDate ||
    appointment?.appointmentDateKey ||
    appointment?.date ||
    appointment?.scheduledAt;

  if (!rawDate) return '';

  const date =
    typeof rawDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(rawDate)
      ? new Date(`${rawDate}T00:00:00`)
      : new Date(rawDate);

  if (Number.isNaN(date.getTime())) {
    return '';
  }

  return new Intl.DateTimeFormat(language === 'bn' ? 'bn-BD' : 'en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  }).format(date);
};

const getAppointmentTime = (appointment) => {
  if (!appointment) return '';

  if (appointment.timeSlot) return appointment.timeSlot;
  if (appointment.slotTime) return appointment.slotTime;
  if (appointment.slotLabel) return appointment.slotLabel;
  if (appointment.slot?.label) return appointment.slot.label;

  const start = appointment.timeSlotStart || appointment.startTime;
  const end = appointment.timeSlotEnd || appointment.endTime;

  if (start && end) return `${start} - ${end}`;
  return start || end || '';
};

const getAppointmentCenterName = (appointment) =>
  appointment?.centerName ||
  appointment?.center?.name ||
  appointment?.appointmentCenter?.name ||
  appointment?.centerId?.name ||
  '';

const getAppointmentApplicationId = (appointment) => {
  const appointmentApplication = appointment?.application;

  if (!appointmentApplication) return '';
  if (typeof appointmentApplication === 'object') {
    return appointmentApplication._id || appointmentApplication.id || '';
  }

  return appointmentApplication;
};

const doesAppointmentBelongToApplication = (appointment, application) => {
  if (!appointment || !application) return false;

  const appointmentApplicationId = getAppointmentApplicationId(appointment);
  if (!appointmentApplicationId) return false;

  return String(appointmentApplicationId) === String(application._id || application.id);
};

const getApplicationAppointment = (application, eligibility, dashboardSummary) => {
  const activeAppointment = eligibility?.activeAppointment;
  if (doesAppointmentBelongToApplication(activeAppointment, application)) {
    return activeAppointment;
  }

  const latestAppointment = dashboardSummary?.latest?.appointment;
  if (doesAppointmentBelongToApplication(latestAppointment, application)) {
    return latestAppointment;
  }

  return null;
};

const getAppointmentStatus = (appointment) =>
  String(appointment?.status || '').toLowerCase();

const getSafeTime = (value) => {
  if (!value) return 0;
  const time = new Date(value).getTime();
  return Number.isNaN(time) ? 0 : time;
};

const ACTIVE_APPLICATION_STATUSES = new Set([
  'draft',
  'submitted',
  'under_review',
  'correction_required',
  'approved',
  'printed',
  'dispatched'
]);

const NEW_NID_BLOCKING_STATUSES = new Set([
  ...ACTIVE_APPLICATION_STATUSES,
  'delivered'
]);

const isNewNidApplication = (application = {}) =>
  String(application.applicationType || 'new').toLowerCase() === 'new';


const isDeliveryPaymentCompleted = (application) =>
  ['paid', 'waived'].includes(application?.deliveryInfo?.paymentStatus);

const isDeliveryRequestSubmitted = (application) =>
  Boolean(application?.deliveryInfo?.requested) || isDeliveryPaymentCompleted(application);

const needsDeliveryPayment = (application) =>
  application?.status === 'printed' && !isDeliveryRequestSubmitted(application);


const gettingStartedCardStyles = [
  {
    card: 'rounded-2xl border border-emerald-100 bg-emerald-50/70 px-4 py-4',
    label: 'text-[11px] font-semibold uppercase tracking-[0.12em] text-emerald-700'
  },
  {
    card: 'rounded-2xl border border-sky-100 bg-sky-50/70 px-4 py-4',
    label: 'text-[11px] font-semibold uppercase tracking-[0.12em] text-sky-700'
  },
  {
    card: 'rounded-2xl border border-amber-100 bg-amber-50/70 px-4 py-4',
    label: 'text-[11px] font-semibold uppercase tracking-[0.12em] text-amber-700'
  },
  {
    card: 'rounded-2xl border border-violet-100 bg-violet-50/70 px-4 py-4',
    label: 'text-[11px] font-semibold uppercase tracking-[0.12em] text-violet-700'
  }
];

const CitizenDashboard = () => {
  const { user } = useAuth();
  const { language, getTranslation } = useLanguage();
  const copy = getTranslation('dashboardPage');

  const translateStatus = (status) =>
    copy.statusLabels[status] || formatStatus(status);

  const getRecentReviewStatusKey = (application = {}) => {
    const status = String(application.status || '').toLowerCase();
    const applicationType = String(application.applicationType || 'new').toLowerCase();
    const isCorrectionRequest = applicationType === 'correction';

    if (status === 'submitted') {
      return isCorrectionRequest ? 'under_review' : 'submitted';
    }

    if (['under_review', 'correction_required'].includes(status)) {
      return 'under_review';
    }

    if (['approved', 'printed', 'dispatched', 'delivered'].includes(status)) {
      return 'approved';
    }

    if (status === 'rejected') {
      return 'rejected';
    }

    if (['cancelled', 'canceled'].includes(status)) {
      return 'cancelled';
    }

    return status || 'submitted';
  };

  const getRecentReviewStatusLabel = (application) => {
    const reviewStatusKey = getRecentReviewStatusKey(application);
    return (
      copy.recentReviewStatusLabels?.[reviewStatusKey] ||
      translateStatus(reviewStatusKey)
    );
  };

  const displayName =
    language === 'bn'
      ? user?.fullNameBangla || user?.fullName || copy.citizen
      : user?.fullName || user?.fullNameBangla || copy.citizen;

  const formatDashboardDate = (value) =>
    value ? formatDashboardDateTime(value, language) : copy.na;

  const [applications, setApplications] = useState([]);
  const [dashboardSummary, setDashboardSummary] = useState({
    applications: {
      total: 0,
      submitted: 0,
      approved: 0,
      rejected: 0,
      printed: 0,
      delivered: 0
    },
    appointments: {
      total: 0,
      booked: 0,
      completed: 0
    },
    supportTickets: {
      total: 0,
      open: 0,
      resolved: 0
    },
    latest: {
      application: null,
      appointment: null,
      supportTicket: null
    }
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastSyncedAt, setLastSyncedAt] = useState(null);
  const [eligibility, setEligibility] = useState(null);

  const fetchDashboardData = useCallback(async ({ silent = false } = {}) => {
    try {
      if (silent) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      const [summaryResponse, applicationsResponse, eligibilityResponse] = await Promise.all([
        api.get('/users/dashboard/summary'),
        api.get('/applications/my'),
        api.get('/applications/eligibility')
      ]);

      const summaryData = summaryResponse?.data?.data || {};
      const applicationList = applicationsResponse?.data?.applications || [];
      const eligibilityData = eligibilityResponse?.data?.data || null;

      setDashboardSummary({
        applications: summaryData.applications || {
          total: 0,
          submitted: 0,
          approved: 0,
          rejected: 0,
          printed: 0,
          delivered: 0
        },
        appointments: summaryData.appointments || {
          total: 0,
          booked: 0,
          completed: 0
        },
        supportTickets: summaryData.supportTickets || {
          total: 0,
          open: 0,
          resolved: 0
        },
        latest: summaryData.latest || {
          application: null,
          appointment: null,
          supportTicket: null
        }
      });

      setApplications(applicationList);
      setEligibility(eligibilityData);
      setLastSyncedAt(new Date());
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboardData();

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        fetchDashboardData({ silent: true });
      }
    };

    const intervalId = setInterval(() => {
      if (document.visibilityState === 'visible') {
        fetchDashboardData({ silent: true });
      }
    }, 30000);

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearInterval(intervalId);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [fetchDashboardData]);

  const getStatusIcon = (status) => {
    switch (status) {
      case 'approved':
      case 'delivered':
        return <FaCheckCircle className="text-green-600" />;
      case 'submitted':
      case 'under_review':
      case 'printed':
        return <FaClock className="text-amber-500" />;
      case 'correction_required':
        return <FaExclamationTriangle className="text-amber-500" />;
      case 'rejected':
      case 'cancelled':
        return <FaExclamationTriangle className="text-red-500" />;
      case 'dispatched':
        return <FaTruck className="text-sky-500" />;
      default:
        return <FaClock className="text-gray-400" />;
    }
  };

  const getDashboardStatusTheme = (application) => {
    if (!application) {
      return {
        iconBoxClass: 'bg-slate-100 text-slate-600',
        statusBoxClass: 'border border-slate-200 bg-slate-50',
        statusTextClass: 'text-slate-700'
      };
    }

    switch (application.status) {
      case 'submitted':
      case 'under_review':
        return {
          iconBoxClass: 'bg-amber-100 text-amber-600',
          statusBoxClass: 'border border-amber-200 bg-amber-50',
          statusTextClass: 'text-amber-700'
        };

      case 'correction_required':
        return {
          iconBoxClass: 'bg-orange-100 text-orange-600',
          statusBoxClass: 'border border-orange-200 bg-orange-50',
          statusTextClass: 'text-orange-700'
        };

      case 'approved':
        return {
          iconBoxClass: 'bg-emerald-100 text-emerald-600',
          statusBoxClass: 'border border-emerald-200 bg-emerald-50',
          statusTextClass: 'text-emerald-700'
        };

      case 'printed':
      case 'dispatched':
        return {
          iconBoxClass: 'bg-sky-100 text-sky-600',
          statusBoxClass: 'border border-sky-200 bg-sky-50',
          statusTextClass: 'text-sky-700'
        };

      case 'delivered':
        return {
          iconBoxClass: 'bg-green-100 text-green-600',
          statusBoxClass: 'border border-green-200 bg-green-50',
          statusTextClass: 'text-green-700'
        };

      case 'rejected':
        return {
          iconBoxClass: 'bg-red-100 text-red-600',
          statusBoxClass: 'border border-red-200 bg-red-50',
          statusTextClass: 'text-red-700'
        };

      case 'cancelled':
        return {
          iconBoxClass: 'bg-slate-100 text-slate-600',
          statusBoxClass: 'border border-slate-200 bg-slate-50',
          statusTextClass: 'text-slate-700'
        };

      default:
        return {
          iconBoxClass: 'bg-slate-100 text-slate-600',
          statusBoxClass: 'border border-slate-200 bg-slate-50',
          statusTextClass: 'text-slate-700'
        };
    }
  };

  const sortedApplications = useMemo(() => {
    return [...applications].sort((a, b) => {
      const firstTime = getSafeTime(a?.updatedAt || a?.createdAt);
      const secondTime = getSafeTime(b?.updatedAt || b?.createdAt);
      return secondTime - firstTime;
    });
  }, [applications]);

  const currentApplication = useMemo(() => {
    return (
      sortedApplications.find((app) => app.status !== 'cancelled') ||
      sortedApplications[0] ||
      null
    );
  }, [sortedApplications]);

  const currentAppointment = useMemo(
    () => getApplicationAppointment(currentApplication, eligibility, dashboardSummary),
    [currentApplication, eligibility, dashboardSummary]
  );

  const activeApplication = useMemo(() => {
    return (
      sortedApplications.find((app) => ACTIVE_APPLICATION_STATUSES.has(app?.status)) ||
      null
    );
  }, [sortedApplications]);

  const newNidBlockingApplication = useMemo(() => {
    return (
      sortedApplications.find(
        (app) => isNewNidApplication(app) && NEW_NID_BLOCKING_STATUSES.has(app?.status)
      ) || null
    );
  }, [sortedApplications]);

  const approvedOrIssuedNewNidApplication = useMemo(() => {
    return (
      sortedApplications.find(
        (app) =>
          isNewNidApplication(app) &&
          (
            eligibility?.correctionEligibleApplicationId
              ? String(app?._id) === String(eligibility.correctionEligibleApplicationId)
              : canApplyCorrection(app?.status)
          )
      ) || null
    );
  }, [eligibility, sortedApplications]);

  const appointmentNewNidApplication = useMemo(() => {
    if (eligibility?.appointmentApplicationId) {
      const matchedApplication = sortedApplications.find(
        (app) => String(app?._id) === String(eligibility.appointmentApplicationId)
      );

      if (matchedApplication) {
        return matchedApplication;
      }
    }

    return (
      sortedApplications.find(
        (app) => isNewNidApplication(app) && app?.status === 'approved'
      ) || null
    );
  }, [eligibility, sortedApplications]);

  const canStartApplication = !newNidBlockingApplication;
  const canRequestCorrection = Boolean(
    eligibility?.correctionEligible && approvedOrIssuedNewNidApplication
  );
  const currentAppointmentStatus = getAppointmentStatus(currentAppointment);
  const shouldShowAppointmentAction = Boolean(
    appointmentNewNidApplication &&
      !canRequestCorrection &&
      !canStartApplication &&
      isAppointmentBookingActionAvailable(appointmentNewNidApplication, currentAppointment)
  );
  const appointmentActionTo = `/book-appointment/${appointmentNewNidApplication?._id}`;
  const appointmentActionLabel =
    copy.heroStatusLabels?.appointmentNeeded || 'Appointment needed';

  const hasApplications = applications.length > 0;
  const displayedRecentApplications = applications.slice(0, 3);
  const sideCardCopy = copy.sideCards || {};
  const appointmentDetailsCopy =
    sideCardCopy.appointmentDetails ||
    copy.appointmentDetails ||
    (language === 'bn' ? DEFAULT_APPOINTMENT_DETAILS_BN : DEFAULT_APPOINTMENT_DETAILS);
  const applicationTypeLabels =
    copy.applicationTypeLabels ||
    (language === 'bn' ? DEFAULT_APPLICATION_TYPE_LABELS_BN : DEFAULT_APPLICATION_TYPE_LABELS);
  const stageLabels =
    copy.stageLabels ||
    (language === 'bn' ? DEFAULT_STAGE_LABELS_BN : DEFAULT_STAGE_LABELS);

  const getApplicationTypeLabel = (application) => {
    const applicationType = String(application?.applicationType || 'new').toLowerCase();
    return applicationTypeLabels[applicationType] || formatStatus(applicationType);
  };

  const getCurrentStageLabel = (application, appointment) => {
    if (!application) return copy.na;

    switch (application.status) {
      case 'submitted':
        return stageLabels.submitted;
      case 'under_review':
        return stageLabels.under_review;
      case 'correction_required':
        return stageLabels.correction_required;
      case 'approved': {
        const appointmentStatus = getAppointmentStatus(appointment);

        if (appointmentStatus === 'completed') {
          return stageLabels.waiting_for_printing;
        }

        if (appointmentStatus === 'booked') {
          return stageLabels.appointment_booked;
        }

        return stageLabels.appointment_required;
      }
      case 'printed':
        return stageLabels.printed;
      case 'dispatched':
        return stageLabels.dispatched;
      case 'delivered':
        return stageLabels.delivered;
      case 'rejected':
        return stageLabels.rejected;
      case 'cancelled':
        return stageLabels.cancelled;
      default:
        return translateStatus(application.status);
    }
  };

  const getNextStepLabel = (application, appointment) => {
    if (!application) return copy.na;

    const nextStepLabels = copy.nextStepLabels || {};

    switch (application.status) {
      case 'submitted':
      case 'under_review':
        return nextStepLabels.review || 'Wait for review';

      case 'correction_required':
        return nextStepLabels.contactSupport || 'Contact support';

      case 'approved': {
        const appointmentStatus = getAppointmentStatus(appointment);

        if (appointmentStatus === 'completed') {
          return nextStepLabels.waitingForPrinting || 'No action needed';
        }

        if (['booked', 'scheduled'].includes(appointmentStatus)) {
          return nextStepLabels.appointmentBooked || 'Attend appointment';
        }

        return nextStepLabels.appointmentRequired || 'Book appointment';
      }

      case 'printed':
        return needsDeliveryPayment(application)
          ? nextStepLabels.requestDelivery || 'Request delivery'
          : nextStepLabels.waitForDispatch || 'Wait for dispatch';

      case 'dispatched':
        return nextStepLabels.trackDelivery || 'Track delivery';

      case 'delivered':
        return nextStepLabels.noActionNeeded || 'No action needed';

      case 'rejected':
      case 'cancelled':
      case 'canceled':
        return nextStepLabels.reviewStatus || 'Review status';

      default:
        return nextStepLabels.noActionNeeded || 'No action needed';
    }
  };

  const getAppointmentDetailRows = (appointment) => {
    const date = formatAppointmentDate(appointment, language);
    const time = getAppointmentTime(appointment);
    const center = getAppointmentCenterName(appointment);

    if (!date && !time && !center) {
      return [];
    }

    return [
      {
        label: appointmentDetailsCopy.date,
        value: date || appointmentDetailsCopy.notAvailable
      },
      {
        label: appointmentDetailsCopy.time,
        value: time || appointmentDetailsCopy.notAvailable
      },
      {
        label: appointmentDetailsCopy.center,
        value: center || appointmentDetailsCopy.notAvailable
      }
    ];
  };

  const noApplicationHighlights = [
    {
      ...copy.highlights[0],
      icon: <FaIdCard />
    },
    {
      ...copy.highlights[1],
      icon: <FaClock />
    },
    {
      ...copy.highlights[2],
      icon: <FaSearch />
    }
  ];

  const getPrimaryApplicationState = (application) => {
    if (!application) {
      const state = copy.primary.noApplication;
      return {
        badge: state.badge,
        badgeClass: 'bg-slate-100 text-slate-700',
        title: state.title,
        description: state.description,
        actionLabel: state.actionLabel,
        actionTo: '/apply',
        secondaryActionLabel: '',
        secondaryActionTo: '',
        icon: <FaIdCard />
      };
    }

    switch (application.status) {
      case 'submitted': {
        const state = copy.primary.submitted;
        return {
          badge: state.badge,
          badgeClass: 'bg-blue-100 text-blue-700',
          title: state.title,
          description: state.description,
          actionLabel: state.actionLabel,
          actionTo: `/track-application?id=${application._id}`,
          secondaryActionLabel: state.secondaryActionLabel,
          secondaryActionTo: '/support',
          icon: <FaClock />
        };
      }

      case 'under_review': {
        const state = copy.primary.review;
        return {
          badge: state.badge,
          badgeClass: 'bg-amber-100 text-amber-700',
          title: state.title,
          description: state.description,
          actionLabel: state.actionLabel,
          actionTo: `/track-application?id=${application._id}`,
          secondaryActionLabel: state.secondaryActionLabel,
          secondaryActionTo: '/support',
          icon: <FaClock />
        };
      }

      case 'correction_required': {
        const state = copy.primary.correctionRequired;
        return {
          badge: state.badge,
          badgeClass: 'bg-orange-100 text-orange-700',
          title: state.title,
          description: state.description,
          actionLabel: state.actionLabel,
          actionTo: `/track-application?id=${application._id}`,
          secondaryActionLabel: state.secondaryActionLabel,
          secondaryActionTo: '/support',
          icon: <FaExclamationTriangle />
        };
      }

      case 'approved': {
        const state = copy.primary.approved;
        const hasAppointmentProgress = ['booked', 'completed'].includes(currentAppointmentStatus);

        return {
          badge: state.badge,
          badgeClass: 'bg-emerald-100 text-emerald-700',
          title: state.title,
          description: hasAppointmentProgress
            ? state.descriptionBooked
            : state.descriptionNoBooking,
          actionLabel: state.actionBooked,
          actionTo: `/track-application?id=${application._id}`,
          secondaryActionLabel: '',
          secondaryActionTo: `/track-application?id=${application._id}`,
          icon: <FaCheckCircle />
        };
      }

      case 'printed': {
        const state = copy.primary.printed;

        return {
          badge: state.badge,
          badgeClass: 'bg-sky-100 text-sky-700',
          title: state.title,
          description: state.description,
          actionLabel: state.actionLabel,
          actionTo: `/track-application?id=${application._id}`,
          secondaryActionLabel: '',
          secondaryActionTo: `/digital-nid/${application._id}`,
          icon: <FaPrint />
        };
      }

      case 'dispatched': {
        const state = copy.primary.dispatched;
        return {
          badge: state.badge,
          badgeClass: 'bg-sky-100 text-sky-700',
          title: state.title,
          description: state.description,
          actionLabel: state.actionLabel,
          actionTo: `/track-application?id=${application._id}`,
          secondaryActionLabel: state.secondaryActionLabel,
          secondaryActionTo: `/digital-nid/${application._id}`,
          icon: <FaTruck />
        };
      }

      case 'delivered': {
        const state = copy.primary.delivered;
        return {
          badge: state.badge,
          badgeClass: 'bg-emerald-100 text-emerald-700',
          title: state.title,
          description: state.description,
          actionLabel: state.actionLabel,
          actionTo: `/digital-nid/${application._id}`,
          secondaryActionLabel: state.secondaryActionLabel,
          secondaryActionTo: `/track-application?id=${application._id}`,
          icon: <FaDownload />
        };
      }

      case 'rejected': {
        const state = copy.primary.rejected;
        return {
          badge: state.badge,
          badgeClass: 'bg-red-100 text-red-700',
          title: state.title,
          description: state.description,
          actionLabel: state.actionLabel,
          actionTo: '/support',
          secondaryActionLabel: state.secondaryActionLabel,
          secondaryActionTo: `/track-application?id=${application._id}`,
          icon: <FaExclamationTriangle />
        };
      }

      case 'cancelled': {
        const state = copy.primary.cancelled;
        return {
          badge: state.badge,
          badgeClass: 'bg-slate-100 text-slate-700',
          title: state.title,
          description: state.description,
          actionLabel: state.actionLabel,
          actionTo: '/apply',
          secondaryActionLabel: state.secondaryActionLabel,
          secondaryActionTo: '/support',
          icon: <FaIdCard />
        };
      }

      default: {
        const state = copy.primary.default;
        return {
          badge: translateStatus(application.status),
          badgeClass: 'bg-slate-100 text-slate-700',
          title: state.title,
          description: state.description,
          actionLabel: state.actionLabel,
          actionTo: `/track-application?id=${application._id}`,
          secondaryActionLabel: state.secondaryActionLabel,
          secondaryActionTo: '/support',
          icon: <FaSearch />
        };
      }
    }
  };

  const getSidePanels = (application) => {
    const panel = copy.sidePanels;

    if (!application) {
      return [
        {
          ...panel.beforeApply,
          actionLabel: '',
          actionTo: '',
          icon: <FaIdCard />
        },
        {
          ...panel.processWorks,
          actionLabel: '',
          actionTo: '',
          icon: <FaSearch />
        }
      ];
    }

    if (application.status === 'correction_required') {
      return [
        {
          ...panel.correctionAction,
          actionTo: `/track-application?id=${application._id}`,
          icon: <FaExclamationTriangle />
        },
        {
          ...panel.correctionHelp,
          actionTo: '/support',
          icon: <FaHeadset />
        }
      ];
    }

    if (application.status === 'rejected') {
      return [
        {
          ...sideCardCopy.rejected,
          icon: <FaExclamationTriangle />
        }
      ];
    }

    if (application.status === 'cancelled') {
      return [
        {
          ...sideCardCopy.cancelled,
          icon: <FaIdCard />
        }
      ];
    }

    if (['submitted', 'under_review'].includes(application.status)) {
      return [
        {
          ...sideCardCopy.review,
          icon: <FaClock />
        }
      ];
    }

    if (application.status === 'approved') {
      const appointmentDetailRows = getAppointmentDetailRows(currentAppointment);

      if (currentAppointmentStatus === 'completed') {
        return [
          {
            ...sideCardCopy.waitingForPrinting,
            icon: <FaClock />
          }
        ];
      }

      return [
        currentAppointmentStatus === 'booked'
          ? {
            ...sideCardCopy.appointmentBooked,
            details: appointmentDetailRows,
            emptyDetailsText: appointmentDetailsCopy.empty,
            icon: <FaCalendarAlt />
          }
          : {
            ...sideCardCopy.appointmentRequired,
            actionTo: `/book-appointment/${application._id}`,
            icon: <FaCalendarAlt />
          },
        currentAppointmentStatus === 'booked'
          ? {
            ...sideCardCopy.whatHappensNext,
            icon: <FaCheckCircle />
          }
          : null
      ].filter(Boolean);
    }

    if (application.status === 'printed') {
      const deliveryPaymentNeeded = needsDeliveryPayment(application);

      return [
        {
          ...sideCardCopy.cardPrinted,
          actionTo: `/digital-nid/${application._id}`,
          icon: <FaIdCard />
        },
        {
          ...(deliveryPaymentNeeded
            ? sideCardCopy.deliveryRequest
            : sideCardCopy.deliveryRequested),
          actionTo: deliveryPaymentNeeded ? `/delivery-payment/${application._id}` : '',
          icon: deliveryPaymentNeeded ? <FaMoneyBillWave /> : <FaTruck />
        }
      ];
    }

    if (application.status === 'dispatched') {
      return [
        {
          ...sideCardCopy.deliveryInProgress,
          actionTo: `/track-application?id=${application._id}`,
          icon: <FaTruck />
        }
      ];
    }

    if (application.status === 'delivered') {
      return [
        {
          ...sideCardCopy.cardDelivered,
          actionTo: `/digital-nid/${application._id}`,
          icon: <FaCheckCircle />
        }
      ];
    }

    return [
      {
        ...panel.latestUpdate,
        actionTo: `/track-application?id=${application._id}`,
        icon: <FaSearch />
      },
      {
        ...panel.needSupport,
        actionTo: '/support',
        icon: <FaHeadset />
      }
    ];
  };

  const rawPrimaryApplicationState = getPrimaryApplicationState(currentApplication);
  const primaryApplicationState = currentApplication
    ? {
      ...rawPrimaryApplicationState,
      actionLabel: copy.viewFullStatus || 'View full status',
      actionTo: `/track-application?id=${currentApplication._id}`,
      secondaryActionLabel: '',
      secondaryActionTo: ''
    }
    : rawPrimaryApplicationState;
  const sidePanels = getSidePanels(currentApplication);
  const dashboardStatusTheme = getDashboardStatusTheme(currentApplication);
  const shouldShowPrimarySecondaryAction = Boolean(
    primaryApplicationState.secondaryActionLabel &&
      primaryApplicationState.secondaryActionTo &&
      primaryApplicationState.secondaryActionTo !== primaryApplicationState.actionTo
  );

  if (loading) {
    return (
      <div className="dashboard-loading-wrapper flex min-h-[60vh] items-center justify-center">
        <Loader size="large" text={copy.loading} />
      </div>
    );
  }

  return (
    <div
      lang={language === 'bn' ? 'bn' : 'en'}
      className={`dashboard-page-wrapper dashboard-language-${language} min-h-[calc(100vh-140px)] bg-[#F9FAFB] px-4 py-8`}
    >
      <div className="dashboard-content-shell mx-auto w-full max-w-[1200px]">
        {/* Welcome Section */}
        <section className="dashboard-welcome-panel mb-8 flex flex-col justify-between gap-5 rounded-2xl bg-[linear-gradient(135deg,#16A34A_0%,#15803D_100%)] px-6 py-6 text-white md:flex-row md:items-center md:px-8">
          <div className="dashboard-welcome-content">
            <h1 className="dashboard-welcome-title mb-1 text-[1.75rem] font-semibold">
              {copy.welcomePrefix}, {displayName}!
            </h1>
            <p className="dashboard-welcome-subtitle mt-3 text-lg text-white/90">
              {copy.welcomeSubtitle}
            </p>

            <div className="mt-3 flex flex-wrap items-center gap-3">
              {refreshing && (
                <span className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1.5 text-xs font-medium text-white/90 backdrop-blur-sm">
                  <FaSyncAlt className="animate-spin" />
                  {copy.syncing}
                </span>
              )}

              {lastSyncedAt && (
                <span className="inline-flex items-center rounded-full bg-white/15 px-3 py-1.5 text-xs font-medium text-white/90 backdrop-blur-sm">
                  {copy.autoSynced}: {formatDashboardDate(lastSyncedAt)}
                </span>
              )}
            </div>
          </div>

          {(canStartApplication || shouldShowAppointmentAction) && (
            <div className="dashboard-welcome-actions">
              <Link
                to={canStartApplication ? '/apply' : appointmentActionTo}
                className="dashboard-apply-button inline-flex items-center gap-2 rounded-lg bg-white px-5 py-3 text-sm font-semibold text-[#16A34A] transition hover:bg-[#F0FDF4]"
              >
                {shouldShowAppointmentAction ? <FaCalendarAlt /> : <FaIdCard />}
                <span>
                  {canStartApplication
                    ? (hasApplications ? copy.applyForNewNid : copy.startApplication)
                    : appointmentActionLabel}
                </span>
              </Link>
            </div>
          )}
        </section>

        {/* Status Overview */}
        <section className="dashboard-status-section mb-8">
          <div className="dashboard-status-grid grid items-start gap-5 xl:grid-cols-[1.45fr,0.95fr]">
            <div className="dashboard-primary-status-card self-start rounded-2xl border border-[#E5E7EB] bg-white p-6 shadow-[0_1px_3px_rgba(0,0,0,0.08)] lg:p-7">
              <div className="dashboard-primary-status-top flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
                <div className="dashboard-primary-status-copy">
                  <span
                    className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${primaryApplicationState.badgeClass}`}
                  >
                    {primaryApplicationState.badge}
                  </span>

                  <h2 className="mt-4 text-[1.8rem] font-semibold leading-tight text-[#111827]">
                    {primaryApplicationState.title}
                  </h2>

                  <p className="mt-2 max-w-[620px] text-sm leading-7 text-[#6B7280]">
                    {primaryApplicationState.description}
                  </p>
                </div>

                <div
                  className={`dashboard-primary-status-icon flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl text-xl ${dashboardStatusTheme.iconBoxClass}`}
                >
                  {primaryApplicationState.icon}
                </div>
              </div>

              {currentApplication && (
                <div className="dashboard-primary-status-meta mt-5 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-xl bg-[#F9FAFB] px-4 py-3">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#6B7280]">
                      {copy.applicationId}
                    </p>
                    <p className="mt-1 break-all text-sm font-semibold text-[#111827]">
                      #{currentApplication.applicationId || copy.na}
                    </p>
                  </div>

                  <div className="rounded-xl bg-[#F9FAFB] px-4 py-3">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#6B7280]">
                      {copy.applicationType || (language === 'bn' ? 'আবেদনের ধরন' : 'Application Type')}
                    </p>
                    <p className="mt-1 text-sm font-semibold text-[#111827]">
                      {getApplicationTypeLabel(currentApplication)}
                    </p>
                  </div>

                  <div className="rounded-xl bg-[#F9FAFB] px-4 py-3">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#6B7280]">
                      {copy.currentStage || (language === 'bn' ? 'বর্তমান ধাপ' : 'Current Stage')}
                    </p>
                    <p className="mt-1 text-sm font-semibold text-[#111827]">
                      {getCurrentStageLabel(currentApplication, currentAppointment)}
                    </p>
                  </div>

                  <div className={`rounded-xl px-4 py-3 ${dashboardStatusTheme.statusBoxClass}`}>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#6B7280]">
                      {copy.nextStep || (language === 'bn' ? 'পরবর্তী ধাপ' : 'Next Step')}
                    </p>
                    <p className={`mt-1 text-sm font-semibold ${dashboardStatusTheme.statusTextClass}`}>
                      {getNextStepLabel(currentApplication, currentAppointment)}
                    </p>
                  </div>
                </div>
              )}

              {currentApplication?.status === 'rejected' &&
                currentApplication?.rejectionReason && (
                  <div className="dashboard-rejection-note mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-4">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-red-700">
                      {copy.rejectionReason}
                    </p>
                    <p className="mt-2 text-sm leading-6 text-red-800">
                      {currentApplication.rejectionReason}
                    </p>
                  </div>
                )}

              {!currentApplication && (
                <div className="mt-6 grid gap-3 sm:grid-cols-3">
                  {noApplicationHighlights.map((item) => (
                    <div
                      key={item.title}
                      className="rounded-xl border border-emerald-100 bg-emerald-50/60 px-4 py-4"
                    >
                      <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-white text-lg text-[#16A34A] shadow-sm">
                        {item.icon}
                      </div>

                      <h4 className="text-sm font-semibold text-[#111827]">
                        {item.title}
                      </h4>

                      <p className="mt-2 text-sm leading-6 text-[#6B7280]">
                        {item.description}
                      </p>
                    </div>
                  ))}
                </div>
              )}

              <div className="dashboard-primary-status-actions mt-6 flex flex-wrap gap-3">
                <Link
                  to={primaryApplicationState.actionTo}
                  className="inline-flex items-center gap-2 rounded-lg bg-[#16A34A] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#15803D]"
                >
                  <span>{primaryApplicationState.actionLabel}</span>
                  <FaArrowRight />
                </Link>

                {shouldShowPrimarySecondaryAction && (
                  <Link
                    to={primaryApplicationState.secondaryActionTo}
                    className="inline-flex items-center gap-2 rounded-lg border border-[#D1D5DB] bg-white px-5 py-3 text-sm font-semibold text-[#374151] transition hover:border-[#16A34A] hover:text-[#16A34A]"
                  >
                    <span>{primaryApplicationState.secondaryActionLabel}</span>
                  </Link>
                )}
              </div>
            </div>

            <div className="dashboard-side-panels grid self-start gap-5 md:grid-cols-2 xl:grid-cols-1">
              {sidePanels.map((panel, index) => (
                <div
                  key={`${panel.title}-${index}`}
                  className="dashboard-update-card rounded-2xl border border-[#E5E7EB] bg-white p-6 shadow-[0_1px_3px_rgba(0,0,0,0.08)]"
                >
                  <div className="dashboard-side-panel-heading mb-4 flex items-center gap-4">
                    <div className="dashboard-side-panel-icon flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#F0FDF4] text-xl text-[#059669]">
                      {panel.icon}
                    </div>

                    <h3 className="dashboard-side-panel-title text-lg font-semibold text-[#111827]">
                      {panel.title}
                    </h3>
                  </div>

                  <p className="dashboard-side-panel-description text-sm leading-7 text-[#6B7280]">
                    {panel.description}
                  </p>

                  {panel.details?.length > 0 ? (
                    <dl className="dashboard-appointment-details">
                      {panel.details.map((detail) => (
                        <div key={detail.label} className="dashboard-appointment-detail-row">
                          <dt>{detail.label}</dt>
                          <dd>{detail.value}</dd>
                        </div>
                      ))}
                    </dl>
                  ) : panel.emptyDetailsText ? (
                    <p className="dashboard-appointment-details-empty">
                      {panel.emptyDetailsText}
                    </p>
                  ) : null}

                  {panel.actionTo && panel.actionLabel && (
                    <Link
                      to={panel.actionTo}
                      className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-[#059669]"
                    >
                      <span>{panel.actionLabel}</span>
                      <FaArrowRight />
                    </Link>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Recent Applications / Getting Started */}
        <section className="dashboard-recent-section">
          {!hasApplications ? (
            <>
              <div className="dashboard-section-header mb-5 flex items-center justify-between gap-4">
                <div>
                  <h2 className="dashboard-section-title text-[1.25rem] font-semibold text-[#1F2937]">
                    {copy.gettingStarted}
                  </h2>
                  <p className="mt-1 text-sm text-[#6B7280]">
                    {copy.gettingStartedText}
                  </p>
                </div>
              </div>

              <div className="rounded-2xl border border-[#E5E7EB] bg-white p-6 shadow-[0_1px_3px_rgba(0,0,0,0.08)] md:p-8">
                <div className="grid gap-6 lg:grid-cols-[1fr,1fr]">
                  <div>
                    <div className="flex items-center gap-4">
                      <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[#F0FDF4] text-2xl text-[#16A34A]">
                        <FaIdCard />
                      </div>

                      <h3 className="text-xl font-semibold text-[#111827]">
                        {copy.noApplicationsYet}
                      </h3>
                    </div>

                    <p className="mt-4 max-w-[620px] text-sm leading-7 text-[#6B7280]">
                      {copy.noApplicationsText}
                    </p>

                    <div className="mt-5 flex flex-wrap gap-3">
                      <Link
                        to="/support"
                        className="inline-flex items-center gap-2 rounded-lg border border-[#D1D5DB] bg-white px-5 py-3 text-sm font-semibold text-[#374151] transition hover:border-[#16A34A] hover:text-[#16A34A]"
                      >
                        <span>{copy.needHelp}</span>
                      </Link>
                    </div>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    {copy.gettingStartedSteps.map((item, index) => {
                      const style = gettingStartedCardStyles[index] || gettingStartedCardStyles[0];

                      return (
                        <div key={`${item.step}-${item.title}`} className={style.card}>
                          <p className={style.label}>{item.step}</p>
                          <h4 className="mt-2 text-sm font-medium text-[#111827]">
                            {item.title}
                          </h4>
                          <p className="mt-1 text-sm leading-6 text-[#5B6475]">
                            {item.description}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="dashboard-recent-table-card">
              <div className="dashboard-recent-table-header">
                <div>
                  <h2>{copy.recentApplications}</h2>
                  <p>{copy.recentApplicationsText}</p>
                </div>

                <Link to="/track-application" className="dashboard-recent-table-view-all">
                  <span>{copy.viewAll}</span>
                  <FaArrowRight />
                </Link>
              </div>

              <div className="dashboard-recent-table-scroll">
                <table className="dashboard-recent-table">
                  <thead>
                    <tr>
                      <th>{copy.applicationId}</th>
                      <th>{copy.type}</th>
                      <th>{copy.submitted}</th>
                      <th>{copy.updated}</th>
                      <th>{copy.reviewStatus || (language === 'bn' ? 'পর্যালোচনা স্ট্যাটাস' : 'Review Status')}</th>
                      <th>{copy.action}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {displayedRecentApplications.map((app) => {
                      const reviewStatusKey = getRecentReviewStatusKey(app);
                      const reviewStatusLabel = getRecentReviewStatusLabel(app);

                      return (
                        <tr key={app._id}>
                          <td className="dashboard-recent-application-cell">
                            <div className="dashboard-recent-application-info">
                              <span
                                className={`dashboard-recent-file-icon status-${app.status || 'default'}`}
                              >
                                <FaRegFileAlt />
                              </span>

                              <div>
                                <h4>#{app.applicationId}</h4>

                                {app.status === 'rejected' && app.rejectionReason && (
                                  <p className="dashboard-recent-reason">
                                    <FaExclamationTriangle />
                                    <span>{copy.reason}: {app.rejectionReason}</span>
                                  </p>
                                )}
                              </div>
                            </div>
                          </td>

                          <td>
                            <span className="dashboard-recent-type-pill">
                              {getApplicationTypeLabel(app)}
                            </span>
                          </td>

                          <td>{app.createdAt ? formatDashboardDate(app.createdAt) : copy.na}</td>

                          <td>{app.updatedAt ? formatDashboardDate(app.updatedAt) : copy.na}</td>

                          <td>
                            <span className={`dashboard-recent-status-pill status-${reviewStatusKey || 'default'}`}>
                              <span className="dashboard-recent-status-dot" />
                              {reviewStatusLabel}
                            </span>
                          </td>

                          <td>
                            <div className="dashboard-recent-action-group">
                              <Link
                                to={`/application-details/${app._id}`}
                                className="dashboard-recent-action-btn"
                              >
                                <FaEye />
                                <span>{copy.viewDetails}</span>
                              </Link>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </section>

      </div>
    </div>
  );
};

export default CitizenDashboard;
