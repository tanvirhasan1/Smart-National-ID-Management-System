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
  FaArrowRight,
  FaSyncAlt
} from 'react-icons/fa';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';
import Loader from '../common/Loader';
import { formatDate, formatStatus, getStatusColor } from '../utils/helpers';
import '../styles/Dashboard.css';

const formatDashboardDateTime = (value) => {
  if (!value) return 'N/A';

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return 'N/A';
  }

  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(date);
};

const getSafeTime = (value) => {
  if (!value) return 0;
  const time = new Date(value).getTime();
  return Number.isNaN(time) ? 0 : time;
};

const CitizenDashboard = () => {
  const { user } = useAuth();

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

  const fetchDashboardData = useCallback(async ({ silent = false } = {}) => {
    try {
      if (silent) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      const [summaryResponse, applicationsResponse] = await Promise.all([
        api.get('/users/dashboard/summary'),
        api.get('/applications/my')
      ]);

      const summaryData = summaryResponse?.data?.data || {};
      const applicationList = applicationsResponse?.data?.applications || [];

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

  const approvedApplication = applications.find((app) =>
    ['approved', 'printed', 'dispatched', 'delivered'].includes(app.status)
  );

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

  const latestStatusHistory = useMemo(() => {
    if (!currentApplication?.statusHistory?.length) {
      return [];
    }

    return [...currentApplication.statusHistory]
      .sort((a, b) => getSafeTime(b?.changedAt) - getSafeTime(a?.changedAt))
      .slice(0, 3);
  }, [currentApplication]);

  const hasApplications = applications.length > 0;

  const noApplicationHighlights = [
    {
      title: 'Prepare your documents',
      description:
        'Keep birth registration number, photo, signature image, and mobile number ready.',
      icon: <FaIdCard />
    },
    {
      title: 'Submit and wait for review',
      description:
        'After submission, the authority will verify your information and documents.',
      icon: <FaClock />
    },
    {
      title: 'Track every next step',
      description:
        'Follow approval, appointment, printing, and delivery updates from this dashboard.',
      icon: <FaSearch />
    }
  ];

  const getPrimaryApplicationState = (application) => {
    if (!application) {
      return {
        badge: 'Not Started',
        badgeClass: 'bg-slate-100 text-slate-700',
        title: 'Start your first Smart NID application',
        description:
          'You have not submitted any application yet. Once you apply, your live status, appointment progress, and delivery updates will appear here.',
        actionLabel: 'Apply for NID',
        actionTo: '/apply',
        secondaryActionLabel: 'Contact support',
        secondaryActionTo: '/support',
        icon: <FaIdCard />
      };
    }

    switch (application.status) {
      case 'submitted':
      case 'under_review':
        return {
          badge: 'In Review',
          badgeClass: 'bg-amber-100 text-amber-700',
          title: 'Your application is under verification',
          description:
            'Your submitted information and supporting documents are being reviewed by the authority.',
          actionLabel: 'Track full status',
          actionTo: `/track-application?id=${application._id}`,
          secondaryActionLabel: 'Contact support',
          secondaryActionTo: '/support',
          icon: <FaClock />
        };

      case 'approved':
        return {
          badge: 'Approved',
          badgeClass: 'bg-emerald-100 text-emerald-700',
          title: 'Your application has been approved',
          description:
            dashboardSummary.appointments.booked > 0
              ? 'Your application is approved and your appointment progress is now the most important update.'
              : 'Your application is approved. Please book your biometric appointment as the next step.',
          actionLabel:
            dashboardSummary.appointments.booked > 0
              ? 'Track full status'
              : 'Book appointment',
          actionTo:
            dashboardSummary.appointments.booked > 0
              ? `/track-application?id=${application._id}`
              : `/book-appointment/${application._id}`,
          secondaryActionLabel: 'View full status',
          secondaryActionTo: `/track-application?id=${application._id}`,
          icon: <FaCheckCircle />
        };

      case 'printed':
        return {
          badge: 'Printed',
          badgeClass: 'bg-sky-100 text-sky-700',
          title: 'Your Smart NID has been printed',
          description:
            'Printing is complete. The next official delivery update will appear here automatically.',
          actionLabel: 'Track full status',
          actionTo: `/track-application?id=${application._id}`,
          secondaryActionLabel: 'View Digital NID',
          secondaryActionTo: `/digital-nid/${application._id}`,
          icon: <FaIdCard />
        };

      case 'dispatched':
        return {
          badge: 'Dispatched',
          badgeClass: 'bg-sky-100 text-sky-700',
          title: 'Your Smart NID is on the way',
          description:
            'Your card has already been dispatched and is now moving through delivery.',
          actionLabel: 'Track full status',
          actionTo: `/track-application?id=${application._id}`,
          secondaryActionLabel: 'View Digital NID',
          secondaryActionTo: `/digital-nid/${application._id}`,
          icon: <FaTruck />
        };

      case 'delivered':
        return {
          badge: 'Delivered',
          badgeClass: 'bg-emerald-100 text-emerald-700',
          title: 'Your Smart NID has been delivered',
          description:
            'Delivery is complete. You can now keep the digital copy for quick reference if available.',
          actionLabel: 'View Digital NID',
          actionTo: `/digital-nid/${application._id}`,
          secondaryActionLabel: 'Track full status',
          secondaryActionTo: `/track-application?id=${application._id}`,
          icon: <FaDownload />
        };

      case 'rejected':
        return {
          badge: 'Rejected',
          badgeClass: 'bg-red-100 text-red-700',
          title: 'Your application needs correction',
          description:
            'Your application was rejected during review. Please read the official reason below and take the next action.',
          actionLabel: 'Contact support',
          actionTo: '/support',
          secondaryActionLabel: 'View full status',
          secondaryActionTo: `/track-application?id=${application._id}`,
          icon: <FaExclamationTriangle />
        };

      case 'cancelled':
        return {
          badge: 'Cancelled',
          badgeClass: 'bg-slate-100 text-slate-700',
          title: 'Your previous application was cancelled',
          description:
            'This application is no longer active. You can start a new application whenever you are ready.',
          actionLabel: 'Apply again',
          actionTo: '/apply',
          secondaryActionLabel: 'Contact support',
          secondaryActionTo: '/support',
          icon: <FaIdCard />
        };

      default:
        return {
          badge: formatStatus(application.status),
          badgeClass: 'bg-slate-100 text-slate-700',
          title: 'Follow your latest NID update',
          description:
            'Your latest application status is available here. Open the tracker for full details.',
          actionLabel: 'Track full status',
          actionTo: `/track-application?id=${application._id}`,
          secondaryActionLabel: 'Contact support',
          secondaryActionTo: '/support',
          icon: <FaSearch />
        };
    }
  };

  const getSidePanels = (application) => {
    if (!application) {
      return [
        {
          title: 'Before you apply',
          description:
            'Keep your birth registration number, recent photo, signature image, and mobile number ready before starting.',
          actionLabel: 'Apply now',
          actionTo: '/apply',
          icon: <FaIdCard />
        },
        {
          title: 'How the process works',
          description:
            'Apply first, wait for review, complete biometric appointment after approval, then follow printing and delivery updates.',
          actionLabel: 'Contact support',
          actionTo: '/support',
          icon: <FaSearch />
        }
      ];
    }

    if (application.status === 'rejected') {
      return [
        {
          title: 'What you should do now',
          description:
            'Review the rejection reason carefully. Update the incorrect document or information before you submit again.',
          actionLabel: 'Apply again',
          actionTo: '/apply',
          icon: <FaExclamationTriangle />
        },
        {
          title: 'Need help with correction?',
          description:
            'Contact support if you need guidance about the rejection reason or the next correction step.',
          actionLabel: 'Get support',
          actionTo: '/support',
          icon: <FaHeadset />
        }
      ];
    }

    if (application.status === 'cancelled') {
      return [
        {
          title: 'Application is no longer active',
          description:
            'This application will not move forward. Start a new application when you are ready.',
          actionLabel: 'Apply again',
          actionTo: '/apply',
          icon: <FaIdCard />
        },
        {
          title: 'Need any support?',
          description:
            'If you cancelled by mistake or need guidance before applying again, contact support.',
          actionLabel: 'Contact support',
          actionTo: '/support',
          icon: <FaHeadset />
        }
      ];
    }

    if (['submitted', 'under_review'].includes(application.status)) {
      return [
        {
          title: 'Review in progress',
          description:
            'Your application is currently under review. No appointment action is needed yet.',
          actionLabel: 'Track application',
          actionTo: `/track-application?id=${application._id}`,
          icon: <FaClock />
        },
        {
          title: 'What happens next?',
          description:
            'After approval, biometric appointment booking and later delivery updates will appear here.',
          actionLabel: 'View full status',
          actionTo: `/track-application?id=${application._id}`,
          icon: <FaSearch />
        }
      ];
    }

    if (application.status === 'approved') {
      return [
        dashboardSummary.appointments.booked > 0
          ? {
            title: 'Appointment Booked',
            description:
              'Your biometric appointment is already booked. Open the tracker to review the latest appointment information.',
            actionLabel: 'Track appointment',
            actionTo: `/track-application?id=${application._id}`,
            icon: <FaCalendarAlt />
          }
          : {
            title: 'Appointment Needed',
            description:
              'Your application is approved. Book your biometric appointment as the next step.',
            actionLabel: 'Book now',
            actionTo: `/book-appointment/${application._id}`,
            icon: <FaCalendarAlt />
          },
        {
          title: 'Delivery not started yet',
          description:
            'Delivery updates will appear only after the printing and dispatch stages are completed.',
          actionLabel: 'View status',
          actionTo: `/track-application?id=${application._id}`,
          icon: <FaTruck />
        }
      ];
    }

    if (application.status === 'printed') {
      return [
        {
          title: 'Printing completed',
          description:
            'Your Smart NID has been printed successfully and is waiting for the next delivery movement.',
          actionLabel: 'Track status',
          actionTo: `/track-application?id=${application._id}`,
          icon: <FaIdCard />
        },
        {
          title: 'Delivery queue started',
          description:
            'Dispatch information will appear here as soon as the delivery step begins.',
          actionLabel: 'View tracker',
          actionTo: `/track-application?id=${application._id}`,
          icon: <FaTruck />
        }
      ];
    }

    if (application.status === 'dispatched') {
      return [
        {
          title: 'Out for delivery',
          description:
            'Your Smart NID has already left the processing stage and is now moving through delivery.',
          actionLabel: 'Track delivery',
          actionTo: `/track-application?id=${application._id}`,
          icon: <FaTruck />
        },
        {
          title: 'Digital copy available',
          description:
            'You can keep the digital NID ready while you wait for the physical card to arrive.',
          actionLabel: 'Open digital NID',
          actionTo: `/digital-nid/${application._id}`,
          icon: <FaDownload />
        }
      ];
    }

    if (application.status === 'delivered') {
      return [
        {
          title: 'Delivery completed',
          description:
            'Your Smart NID delivery is complete. Keep your tracker history for future reference.',
          actionLabel: 'Track history',
          actionTo: `/track-application?id=${application._id}`,
          icon: <FaCheckCircle />
        },
        {
          title: 'Digital copy ready',
          description:
            'Use the digital copy whenever you need a quick reference of your NID information.',
          actionLabel: 'View digital NID',
          actionTo: `/digital-nid/${application._id}`,
          icon: <FaDownload />
        }
      ];
    }

    return [
      {
        title: 'Latest update',
        description:
          'Your latest application status is available here. Open the tracker for the full stage-by-stage progress.',
        actionLabel: 'View full status',
        actionTo: `/track-application?id=${application._id}`,
        icon: <FaSearch />
      },
      {
        title: 'Need support?',
        description:
          'Contact support if you want help understanding your application status or next steps.',
        actionLabel: 'Contact support',
        actionTo: '/support',
        icon: <FaHeadset />
      }
    ];
  };

  const primaryApplicationState = getPrimaryApplicationState(currentApplication);
  const sidePanels = getSidePanels(currentApplication);
  const dashboardStatusTheme = getDashboardStatusTheme(currentApplication);

  const dashboardInsightCards = [
    {
      title: 'Active Application',
      value: currentApplication
        ? `#${currentApplication.applicationId || 'N/A'}`
        : 'Not submitted yet',
      description: currentApplication
        ? 'Latest application selected automatically from your submissions.'
        : 'Start a new Smart NID request when you are ready.',
      icon: <FaIdCard />,
      tone: currentApplication ? 'green' : 'muted'
    },
    {
      title: 'Current Status',
      value: currentApplication ? formatStatus(currentApplication.status) : 'Ready to apply',
      description: currentApplication
        ? currentApplication.status === 'rejected'
          ? 'Correction is required before resubmission.'
          : 'Keep tracking your application from this dashboard.'
        : 'No active application status is available yet.',
      icon: currentApplication ? primaryApplicationState.icon : <FaCheckCircle />,
      tone: currentApplication?.status === 'rejected' ? 'red' : 'green'
    },
    {
      title: 'Next Step',
      value: primaryApplicationState.actionLabel,
      description: hasApplications
        ? primaryApplicationState.description
        : 'Create your first application to begin the Smart NID process.',
      icon: <FaArrowRight />,
      tone: 'blue'
    }
  ];

  const quickActions = [
    {
      to: '/apply',
      title: 'Apply for NID',
      description: hasApplications
        ? 'Submit a new Smart NID application'
        : 'Start your first Smart NID application',
      icon: <FaIdCard />,
      cardClass:
        'border-emerald-100 bg-gradient-to-br from-white to-emerald-50/70',
      iconClass: 'bg-emerald-100 text-emerald-600'
    },
    {
      to: '/track-application',
      title: 'Track Application',
      description: hasApplications
        ? 'Check your application status'
        : 'Use this after submitting your application',
      icon: <FaSearch />,
      cardClass: 'border-sky-100 bg-gradient-to-br from-white to-sky-50/70',
      iconClass: 'bg-sky-100 text-sky-600'
    },
    {
      to: '/support',
      title: 'Support',
      description: 'Get help or raise a ticket',
      icon: <FaHeadset />,
      cardClass:
        'border-violet-100 bg-gradient-to-br from-white to-violet-50/70',
      iconClass: 'bg-violet-100 text-violet-600'
    }
  ];

  if (approvedApplication) {
    quickActions.splice(2, 0, {
      to: `/digital-nid/${approvedApplication._id}`,
      title: 'Digital NID',
      description: 'Open your digital ID card',
      icon: <FaDownload />,
      cardClass:
        'border-amber-100 bg-gradient-to-br from-white to-amber-50/70',
      iconClass: 'bg-amber-100 text-amber-600'
    });
  }

  if (loading) {
    return (
      <div className="dashboard-loading-wrapper flex min-h-[60vh] items-center justify-center">
        <Loader size="large" text="Loading your dashboard..." />
      </div>
    );
  }

  return (
    <div className="dashboard-page-wrapper min-h-[calc(100vh-140px)] bg-[#F9FAFB] px-4 py-8">
      <div className="dashboard-content-shell mx-auto w-full max-w-[1200px]">
        {/* Welcome Section */}
        <section className="dashboard-welcome-panel mb-8 flex flex-col justify-between gap-5 rounded-2xl bg-[linear-gradient(135deg,#16A34A_0%,#15803D_100%)] px-6 py-6 text-white md:flex-row md:items-center md:px-8">
          <div className="dashboard-welcome-content">
            <h1 className="dashboard-welcome-title mb-1 text-[1.75rem] font-bold">
              Welcome, {user?.fullName || user?.fullNameBangla || 'Citizen'}!
            </h1>
            <p className="dashboard-welcome-subtitle mt-3 text-lg text-white/90">
              Track applications, appointments, corrections, and service updates from one place.
            </p>

            <div className="mt-3 flex flex-wrap items-center gap-3">
              {refreshing && (
                <span className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1.5 text-xs font-medium text-white/90 backdrop-blur-sm">
                  <FaSyncAlt className="animate-spin" />
                  Syncing...
                </span>
              )}

              {lastSyncedAt && (
                <span className="inline-flex items-center rounded-full bg-white/15 px-3 py-1.5 text-xs font-medium text-white/90 backdrop-blur-sm">
                  Auto synced: {formatDashboardDateTime(lastSyncedAt)}
                </span>
              )}
            </div>
          </div>

          <div className="dashboard-welcome-actions">
            <Link
              to="/apply"
              className="dashboard-apply-button inline-flex items-center gap-2 rounded-lg bg-white px-5 py-3 text-sm font-semibold text-[#16A34A] transition hover:bg-[#F0FDF4]"
            >
              <FaIdCard />
              <span>{hasApplications ? 'Apply for New NID' : 'Start Application'}</span>
            </Link>
          </div>
        </section>

        <section className="dashboard-insights-grid mb-8 grid gap-4 md:grid-cols-3">
          {dashboardInsightCards.map((item) => (
            <div
              key={item.title}
              className={`dashboard-insight-card dashboard-insight-${item.tone} rounded-2xl border border-[#E5E7EB] bg-white p-5 shadow-[0_1px_3px_rgba(0,0,0,0.06)]`}
            >
              <div className="dashboard-insight-card-top flex items-start justify-between gap-4">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#6B7280]">
                    {item.title}
                  </p>
                  <h3 className="mt-2 break-words text-base font-semibold text-[#111827]">
                    {item.value}
                  </h3>
                </div>

                <span className="dashboard-insight-icon flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-base">
                  {item.icon}
                </span>
              </div>

              <p className="mt-3 text-sm leading-6 text-[#6B7280]">
                {item.description}
              </p>
            </div>
          ))}
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
                      Application ID
                    </p>
                    <p className="mt-1 break-all text-sm font-semibold text-[#111827]">
                      #{currentApplication.applicationId || 'N/A'}
                    </p>
                  </div>
                  <div className={`rounded-xl px-4 py-3 ${dashboardStatusTheme.statusBoxClass}`}>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#6B7280]">
                      Current Status
                    </p>
                    <p className={`mt-1 text-sm font-semibold ${dashboardStatusTheme.statusTextClass}`}>
                      {formatStatus(currentApplication.status)}
                    </p>
                  </div>

                  <div className="rounded-xl bg-[#F9FAFB] px-4 py-3">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#6B7280]">
                      Submitted On
                    </p>
                    <p className="mt-1 text-sm font-semibold text-[#111827]">
                      {currentApplication.createdAt
                        ? formatDashboardDateTime(currentApplication.createdAt)
                        : 'N/A'}
                    </p>
                  </div>

                  <div className="rounded-xl bg-[#F9FAFB] px-4 py-3">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#6B7280]">
                      Last Updated
                    </p>
                    <p className="mt-1 text-sm font-semibold text-[#111827]">
                      {currentApplication.updatedAt
                        ? formatDashboardDateTime(currentApplication.updatedAt)
                        : 'N/A'}
                    </p>
                  </div>
                </div>
              )}

              {currentApplication?.status === 'rejected' &&
                currentApplication?.rejectionReason && (
                  <div className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-4">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-red-700">
                      Rejection Reason
                    </p>
                    <p className="mt-2 text-sm leading-6 text-red-800">
                      {currentApplication.rejectionReason}
                    </p>
                  </div>
                )}

              {latestStatusHistory.length > 0 && (
                <div className="mt-5 rounded-xl border border-[#E5E7EB] bg-white px-4 py-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#6B7280]">
                    Latest Updates
                  </p>

                  <div className="mt-3 flex flex-col gap-3">
                    {latestStatusHistory.map((historyItem, index) => (
                      <div
                        key={`${historyItem.toStatus}-${historyItem.changedAt}-${index}`}
                        className="rounded-lg bg-[#F9FAFB] px-3 py-3"
                      >
                        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                          <p className="text-sm font-semibold text-[#111827]">
                            {formatStatus(historyItem.toStatus)}
                          </p>

                          <p className="text-xs text-[#6B7280]">
                            {historyItem.changedAt
                              ? formatDashboardDateTime(historyItem.changedAt)
                              : 'N/A'}
                          </p>
                        </div>

                        {historyItem.note && (
                          <p className="mt-1 text-sm text-[#6B7280]">
                            {historyItem.note}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
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

                {primaryApplicationState.secondaryActionLabel && (
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
                  <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#F0FDF4] text-xl text-[#059669]">
                    {panel.icon}
                  </div>

                  <h3 className="text-lg font-semibold text-[#111827]">
                    {panel.title}
                  </h3>

                  <p className="mt-2 text-sm leading-7 text-[#6B7280]">
                    {panel.description}
                  </p>

                  <Link
                    to={panel.actionTo}
                    className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-[#059669]"
                  >
                    <span>{panel.actionLabel}</span>
                    <FaArrowRight />
                  </Link>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Quick Actions */}
        <section className="dashboard-actions-section mb-10">
          <div className="mb-5">
            <span className="inline-flex rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
              Quick Actions
            </span>

            <h2 className="mt-3 text-[1.35rem] font-semibold text-[#1F2937]">
              {hasApplications ? 'Continue your application journey' : 'Start from here'}
            </h2>

            <p className="mt-1 text-sm text-[#6B7280]">
              {hasApplications
                ? 'Use these shortcuts to continue your Smart NID journey.'
                : 'Complete your first Smart NID process step by step from these quick shortcuts.'}
            </p>
          </div>

          <div
            className={`dashboard-actions-grid grid gap-5 sm:grid-cols-2 ${quickActions.length === 3 ? 'xl:grid-cols-3' : 'xl:grid-cols-4'
              }`}
          >
            {quickActions.map((action) => (
              <Link
                key={action.title}
                to={action.to}
                className={`dashboard-action-card relative overflow-hidden rounded-2xl border p-6 transition hover:-translate-y-[3px] hover:shadow-[0_8px_20px_rgba(15,23,42,0.08)] ${action.cardClass}`}
              >
                <div
                  className={`dashboard-action-icon mb-4 flex h-[56px] w-[56px] items-center justify-center rounded-2xl text-xl ${action.iconClass}`}
                >
                  {action.icon}
                </div>

                <h4 className="mb-2 text-[1.05rem] font-semibold text-[#1F2937]">
                  {action.title}
                </h4>

                <p className="text-sm leading-6 text-[#6B7280]">
                  {action.description}
                </p>

                <span className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-[#16A34A]">
                  Open <FaArrowRight />
                </span>
              </Link>
            ))}
          </div>
        </section>

        {/* Recent Applications / Getting Started */}
        <section className="dashboard-recent-section">
          <div className="dashboard-section-header mb-5 flex items-center justify-between gap-4">
            <div>
              <h2 className="dashboard-section-title text-[1.25rem] font-semibold text-[#1F2937]">
                {hasApplications ? 'Recent Applications' : 'Getting Started'}
              </h2>
              <p className="mt-1 text-sm text-[#6B7280]">
                {hasApplications
                  ? 'Review your latest submitted applications and open details quickly.'
                  : 'A quick overview of what to prepare before submitting your first application.'}
              </p>
            </div>

            {hasApplications && (
              <Link
                to="/track-application"
                className="dashboard-view-all-link inline-flex items-center gap-2 text-sm font-medium text-[#16A34A]"
              >
                <span>View All</span>
                <FaArrowRight />
              </Link>
            )}
          </div>

          {!hasApplications ? (
            <div className="rounded-2xl border border-[#E5E7EB] bg-white p-6 shadow-[0_1px_3px_rgba(0,0,0,0.08)] md:p-8">
              <div className="grid gap-6 lg:grid-cols-[1fr,1fr]">
                <div>
                  <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#F0FDF4] text-2xl text-[#16A34A]">
                    <FaIdCard />
                  </div>

                  <h3 className="text-xl font-bold text-[#111827]">
                    No applications yet
                  </h3>

                  <p className="mt-2 max-w-[520px] text-sm leading-7 text-[#6B7280]">
                    You have not submitted any Smart NID application yet. Prepare the
                    required information, then start the process from the apply page.
                  </p>

                  <div className="mt-5 flex flex-wrap gap-3">
                    <Link
                      to="/apply"
                      className="inline-flex items-center gap-2 rounded-lg bg-[#16A34A] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#15803D]"
                    >
                      <span>Apply Now</span>
                      <FaArrowRight />
                    </Link>

                    <Link
                      to="/support"
                      className="inline-flex items-center gap-2 rounded-lg border border-[#D1D5DB] bg-white px-5 py-3 text-sm font-semibold text-[#374151] transition hover:border-[#16A34A] hover:text-[#16A34A]"
                    >
                      <span>Need Help?</span>
                    </Link>
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-2xl border border-emerald-100 bg-emerald-50/70 px-4 py-4">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-emerald-700">
                      Step 1
                    </p>
                    <h4 className="mt-2 text-sm font-bold text-[#111827]">
                      Prepare documents
                    </h4>
                    <p className="mt-1 text-sm leading-6 text-[#5B6475]">
                      Keep your birth registration number, recent photo, signature image, and mobile number ready.
                    </p>
                  </div>

                  <div className="rounded-2xl border border-sky-100 bg-sky-50/70 px-4 py-4">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-sky-700">
                      Step 2
                    </p>
                    <h4 className="mt-2 text-sm font-bold text-[#111827]">
                      Submit application
                    </h4>
                    <p className="mt-1 text-sm leading-6 text-[#5B6475]">
                      Fill up the form carefully and submit your Smart NID request online.
                    </p>
                  </div>

                  <div className="rounded-2xl border border-amber-100 bg-amber-50/70 px-4 py-4">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-amber-700">
                      Step 3
                    </p>
                    <h4 className="mt-2 text-sm font-bold text-[#111827]">
                      Wait for review
                    </h4>
                    <p className="mt-1 text-sm leading-6 text-[#5B6475]">
                      After submission, the authority will review your information and documents.
                    </p>
                  </div>

                  <div className="rounded-2xl border border-violet-100 bg-violet-50/70 px-4 py-4">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-violet-700">
                      Step 4
                    </p>
                    <h4 className="mt-2 text-sm font-bold text-[#111827]">
                      Track updates
                    </h4>
                    <p className="mt-1 text-sm leading-6 text-[#5B6475]">
                      Follow approval, appointment, printing, and delivery progress from your dashboard.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="dashboard-applications-list flex flex-col gap-4">
              {applications.slice(0, 3).map((app) => (
                <div
                  key={app._id}
                  className="dashboard-application-card rounded-xl border border-[#E5E7EB] bg-white px-5 py-5 shadow-[0_1px_3px_rgba(0,0,0,0.08)] transition hover:shadow-[0_4px_12px_rgba(0,0,0,0.08)]"
                >
                  <div className="dashboard-application-card-inner">
                    <div className="dashboard-application-card-head">
                      <div className="dashboard-application-title-wrap">
                        <div className="dashboard-application-status-icon">
                          {getStatusIcon(app.status)}
                        </div>

                        <div className="dashboard-application-info">
                          <h4 className="dashboard-application-title">
                            Application #{app.applicationId}
                          </h4>
                        </div>
                      </div>

                      <div className="dashboard-application-status">
                        <span className={`badge badge-${getStatusColor(app.status)}`}>
                          {formatStatus(app.status)}
                        </span>
                      </div>
                    </div>

                    <div className="dashboard-application-meta-row">
                      <span>
                        Type: {(app.applicationType || 'N/A').toUpperCase()}
                      </span>
                      <span>
                        Submitted: {app.createdAt ? formatDate(app.createdAt) : 'N/A'}
                      </span>
                      <span>
                        Updated: {app.updatedAt ? formatDate(app.updatedAt) : 'N/A'}
                      </span>
                    </div>

                    {app.status === 'rejected' && app.rejectionReason && (
                      <p className="dashboard-application-reason">
                        Reason: {app.rejectionReason}
                      </p>
                    )}

                    <div className="dashboard-application-actions">
                      <Link
                        to={`/track-application?id=${app._id}`}
                        className="btn btn-sm btn-outline dashboard-application-action-btn"
                      >
                        View Details
                      </Link>

                      {['approved', 'printed', 'dispatched', 'delivered'].includes(
                        app.status
                      ) && (
                          <Link
                            to={`/digital-nid/${app._id}`}
                            className="btn btn-sm btn-primary dashboard-application-action-btn"
                          >
                            Digital NID
                          </Link>
                        )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
};

export default CitizenDashboard;

