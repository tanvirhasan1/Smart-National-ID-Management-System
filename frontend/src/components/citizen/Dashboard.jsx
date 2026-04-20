import React, { useEffect, useMemo, useState } from 'react';
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
  FaArrowRight
} from 'react-icons/fa';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';
import Loader from '../common/Loader';
import { formatDate, formatStatus, getStatusColor } from '../utils/helpers';
import '../styles/Dashboard.css';

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
  const [lastSyncedAt, setLastSyncedAt] = useState(null);

  useEffect(() => {
    fetchDashboardData();

    const intervalId = setInterval(() => {
      fetchDashboardData({ silent: true });
    }, 20000);

    return () => clearInterval(intervalId);
  }, []);

  const fetchDashboardData = async ({ silent = false } = {}) => {
    try {
      if (!silent) {
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
      if (!silent) {
        setLoading(false);
      }
    }
  };

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

  const approvedApplication = applications.find((app) =>
    ['approved', 'printed', 'dispatched', 'delivered'].includes(app.status)
  );

  const sortedApplications = useMemo(() => {
    return [...applications].sort((a, b) => {
      const firstTime = new Date(a?.updatedAt || a?.createdAt || 0).getTime();
      const secondTime = new Date(b?.updatedAt || b?.createdAt || 0).getTime();
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
      .sort(
        (a, b) =>
          new Date(b?.changedAt || 0).getTime() -
          new Date(a?.changedAt || 0).getTime()
      )
      .slice(0, 3);
  }, [currentApplication]);

  const getPrimaryApplicationState = (application) => {
    if (!application) {
      return {
        badge: 'Not Started',
        badgeClass: 'bg-slate-100 text-slate-700',
        title: 'Start your Smart NID application',
        description:
          'You have not submitted any application yet. Once you apply, your full status journey will appear here.',
        actionLabel: 'Apply for NID',
        actionTo: '/apply',
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
            'Your submitted information and documents are being reviewed by the authority. Please wait for the next update.',
          actionLabel: 'Track application',
          actionTo: `/track-application?id=${application._id}`,
          icon: <FaClock />
        };

      case 'approved':
        return {
          badge: 'Approved',
          badgeClass: 'bg-emerald-100 text-emerald-700',
          title: 'Your application has been approved',
          description:
            dashboardSummary.appointments.booked > 0
              ? 'Your application is approved and your appointment progress is available now.'
              : 'Your application is approved. Book your biometric appointment as the next step.',
          actionLabel:
            dashboardSummary.appointments.booked > 0
              ? 'Track application'
              : 'Book appointment',
          actionTo:
            dashboardSummary.appointments.booked > 0
              ? `/track-application?id=${application._id}`
              : `/book-appointment/${application._id}`,
          icon: <FaCheckCircle />
        };

      case 'printed':
        return {
          badge: 'Printed',
          badgeClass: 'bg-sky-100 text-sky-700',
          title: 'Your Smart NID has been printed',
          description:
            'Printing is complete. The next delivery-related update will appear here automatically.',
          actionLabel: 'Track application',
          actionTo: `/track-application?id=${application._id}`,
          icon: <FaIdCard />
        };

      case 'dispatched':
        return {
          badge: 'Dispatched',
          badgeClass: 'bg-sky-100 text-sky-700',
          title: 'Your Smart NID is on the way',
          description:
            'Your card has already been dispatched. Please follow the tracker for the latest delivery progress.',
          actionLabel: 'Track delivery',
          actionTo: `/track-application?id=${application._id}`,
          icon: <FaTruck />
        };

      case 'delivered':
        return {
          badge: 'Delivered',
          badgeClass: 'bg-emerald-100 text-emerald-700',
          title: 'Your Smart NID has been delivered',
          description:
            'Delivery is complete. You can keep tracking history or open the digital copy if available.',
          actionLabel: 'Download digital NID',
          actionTo: `/digital-nid/${application._id}`,
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
          icon: <FaExclamationTriangle />
        };

      case 'cancelled':
        return {
          badge: 'Cancelled',
          badgeClass: 'bg-slate-100 text-slate-700',
          title: 'Your previous application was cancelled',
          description: 'You can create a new application whenever you are ready.',
          actionLabel: 'Apply again',
          actionTo: '/apply',
          icon: <FaIdCard />
        };

      default:
        return {
          badge: formatStatus(application.status),
          badgeClass: 'bg-slate-100 text-slate-700',
          title: 'Follow your latest NID update',
          description:
            'Your latest application status is available here. Open the tracker for the full details.',
          actionLabel: 'Track application',
          actionTo: `/track-application?id=${application._id}`,
          icon: <FaSearch />
        };
    }
  };

  const getAppointmentState = (application) => {
    if (!application) {
      return {
        title: 'Appointment Update',
        description:
          'Appointment details will appear here after your application moves to the approved stage.',
        actionLabel: 'Apply first',
        actionTo: '/apply',
        icon: <FaCalendarAlt />
      };
    }

    if (dashboardSummary.appointments.booked > 0) {
      return {
        title: 'Appointment Booked',
        description:
          'Your biometric appointment is already booked. Open the tracker to review the latest appointment information.',
        actionLabel: 'Track appointment',
        actionTo: `/track-application?id=${application._id}`,
        icon: <FaCalendarAlt />
      };
    }

    if (application.status === 'approved') {
      return {
        title: 'Appointment Needed',
        description:
          'Your application is approved. Book your biometric appointment to continue the process.',
        actionLabel: 'Book now',
        actionTo: `/book-appointment/${application._id}`,
        icon: <FaCalendarAlt />
      };
    }

    if (['printed', 'dispatched', 'delivered'].includes(application.status)) {
      return {
        title: 'Appointment Completed',
        description:
          'Your appointment step is already completed and your application has moved forward.',
        actionLabel: 'View status',
        actionTo: `/track-application?id=${application._id}`,
        icon: <FaCheckCircle />
      };
    }

    return {
      title: 'Appointment Pending',
      description:
        'Appointment booking will become available when your application reaches the required stage.',
      actionLabel: 'View progress',
      actionTo: `/track-application?id=${application._id}`,
      icon: <FaClock />
    };
  };

  const getDeliveryState = (application) => {
    if (!application) {
      return {
        title: 'NID Delivery Update',
        description:
          'Printing and delivery updates will appear here after your application progresses.',
        actionLabel: 'Apply first',
        actionTo: '/apply',
        icon: <FaTruck />
      };
    }

    if (application.status === 'delivered') {
      return {
        title: 'Delivered Successfully',
        description:
          'Your Smart NID delivery is complete. You can download the digital copy if available.',
        actionLabel: 'Download NID',
        actionTo: `/digital-nid/${application._id}`,
        icon: <FaDownload />
      };
    }

    if (application.status === 'dispatched') {
      return {
        title: 'Out for Delivery',
        description:
          'Your Smart NID has been dispatched and is now in the delivery stage.',
        actionLabel: 'Track delivery',
        actionTo: `/track-application?id=${application._id}`,
        icon: <FaTruck />
      };
    }

    if (application.status === 'printed') {
      return {
        title: 'Printing Completed',
        description:
          'Your Smart NID has already been printed and is waiting for the next update.',
        actionLabel: 'Track progress',
        actionTo: `/track-application?id=${application._id}`,
        icon: <FaIdCard />
      };
    }

    return {
      title: 'Delivery Not Started',
      description:
        'Delivery updates will show automatically when your application reaches the printing and dispatch stage.',
      actionLabel: 'View status',
      actionTo: `/track-application?id=${application._id}`,
      icon: <FaSearch />
    };
  };

  const primaryApplicationState = getPrimaryApplicationState(currentApplication);
  const appointmentState = getAppointmentState(currentApplication);
  const deliveryState = getDeliveryState(currentApplication);

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
              স্বাগতম, {user?.fullNameBangla || user?.fullName || 'Citizen'}!
            </h1>
            <p className="dashboard-welcome-subtitle text-white/90">
              Welcome to Smart NID Management System
            </p>
            {lastSyncedAt && (
              <p className="mt-2 text-xs text-white/80">
                Auto synced: {formatDate(lastSyncedAt)}
              </p>
            )}
          </div>

          <div className="dashboard-welcome-actions">
            <Link
              to="/apply"
              className="dashboard-apply-button inline-flex items-center gap-2 rounded-lg bg-white px-5 py-3 text-sm font-semibold text-[#16A34A] transition hover:bg-[#F0FDF4]"
            >
              <FaIdCard />
              <span>Apply for New NID</span>
            </Link>
          </div>
        </section>

        {/* Status Overview */}
        <section className="dashboard-status-section mb-8">
          <div className="dashboard-status-grid grid gap-5 xl:grid-cols-[1.5fr,1fr,1fr]">
            <div className="dashboard-primary-status-card rounded-2xl border border-[#E5E7EB] bg-white p-6 shadow-[0_1px_3px_rgba(0,0,0,0.08)] lg:p-7">
              <div className="dashboard-primary-status-top flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
                <div className="dashboard-primary-status-copy">
                  <span
                    className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${primaryApplicationState.badgeClass}`}
                  >
                    {primaryApplicationState.badge}
                  </span>

                  <h2 className="mt-4 text-[1.35rem] font-bold leading-tight text-[#111827]">
                    {primaryApplicationState.title}
                  </h2>

                  <p className="mt-2 max-w-[560px] text-sm leading-6 text-[#6B7280]">
                    {primaryApplicationState.description}
                  </p>
                </div>

                <div className="dashboard-primary-status-icon flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[#F0FDF4] text-xl text-[#16A34A]">
                  {primaryApplicationState.icon}
                </div>
              </div>

              {currentApplication && (
                <div className="dashboard-primary-status-meta mt-5 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-xl bg-[#F9FAFB] px-4 py-3">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#6B7280]">
                      Application ID
                    </p>
                    <p className="mt-1 text-sm font-semibold text-[#111827]">
                      #{currentApplication.applicationId || 'N/A'}
                    </p>
                  </div>

                  <div className="rounded-xl bg-[#F9FAFB] px-4 py-3">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#6B7280]">
                      Current Status
                    </p>
                    <p className="mt-1 text-sm font-semibold text-[#111827]">
                      {formatStatus(currentApplication.status)}
                    </p>
                  </div>

                  <div className="rounded-xl bg-[#F9FAFB] px-4 py-3">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#6B7280]">
                      Submitted On
                    </p>
                    <p className="mt-1 text-sm font-semibold text-[#111827]">
                      {currentApplication.createdAt
                        ? formatDate(currentApplication.createdAt)
                        : 'N/A'}
                    </p>
                  </div>

                  <div className="rounded-xl bg-[#F9FAFB] px-4 py-3">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#6B7280]">
                      Last Updated
                    </p>
                    <p className="mt-1 text-sm font-semibold text-[#111827]">
                      {currentApplication.updatedAt
                        ? formatDate(currentApplication.updatedAt)
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
                              ? formatDate(historyItem.changedAt)
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

              <div className="dashboard-primary-status-actions mt-6 flex flex-wrap gap-3">
                <Link
                  to={primaryApplicationState.actionTo}
                  className="inline-flex items-center gap-2 rounded-lg bg-[#16A34A] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#15803D]"
                >
                  <span>{primaryApplicationState.actionLabel}</span>
                  <FaArrowRight />
                </Link>

                {currentApplication && (
                  <Link
                    to={`/track-application?id=${currentApplication._id}`}
                    className="inline-flex items-center gap-2 rounded-lg border border-[#D1D5DB] bg-white px-5 py-3 text-sm font-semibold text-[#374151] transition hover:border-[#16A34A] hover:text-[#16A34A]"
                  >
                    <span>View full status</span>
                  </Link>
                )}
              </div>
            </div>

            <div className="dashboard-update-card rounded-2xl border border-[#E5E7EB] bg-white p-6 shadow-[0_1px_3px_rgba(0,0,0,0.08)]">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#F0FDF4] text-xl text-[#16A34A]">
                {appointmentState.icon}
              </div>

              <h3 className="text-lg font-bold text-[#111827]">
                {appointmentState.title}
              </h3>

              <p className="mt-2 text-sm leading-6 text-[#6B7280]">
                {appointmentState.description}
              </p>

              <Link
                to={appointmentState.actionTo}
                className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-[#16A34A]"
              >
                <span>{appointmentState.actionLabel}</span>
                <FaArrowRight />
              </Link>
            </div>

            <div className="dashboard-update-card rounded-2xl border border-[#E5E7EB] bg-white p-6 shadow-[0_1px_3px_rgba(0,0,0,0.08)]">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#F0FDF4] text-xl text-[#16A34A]">
                {deliveryState.icon}
              </div>

              <h3 className="text-lg font-bold text-[#111827]">
                {deliveryState.title}
              </h3>

              <p className="mt-2 text-sm leading-6 text-[#6B7280]">
                {deliveryState.description}
              </p>

              <Link
                to={deliveryState.actionTo}
                className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-[#16A34A]"
              >
                <span>{deliveryState.actionLabel}</span>
                <FaArrowRight />
              </Link>
            </div>
          </div>
        </section>

        {/* Quick Actions */}
        <section className="dashboard-actions-section mb-8">
          <h2 className="dashboard-section-title mb-5 text-[1.25rem] font-semibold text-[#1F2937]">
            Quick Actions
          </h2>

          <div className="dashboard-actions-grid grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
            <Link
              to="/apply"
              className="dashboard-action-card relative overflow-hidden rounded-xl border border-[#E5E7EB] bg-white p-6 transition hover:-translate-y-[2px] hover:border-[#16A34A] hover:shadow-[0_4px_12px_rgba(22,163,74,0.1)]"
            >
              <div className="dashboard-action-icon mb-4 flex h-[50px] w-[50px] items-center justify-center rounded-xl bg-[#F0FDF4] text-xl text-[#16A34A]">
                <FaIdCard />
              </div>
              <h4 className="mb-2 text-base font-semibold text-[#1F2937]">
                Apply for NID
              </h4>
              <p className="text-sm text-[#6B7280]">
                Submit a new Smart NID application
              </p>
            </Link>

            <Link
              to="/track-application"
              className="dashboard-action-card relative overflow-hidden rounded-xl border border-[#E5E7EB] bg-white p-6 transition hover:-translate-y-[2px] hover:border-[#16A34A] hover:shadow-[0_4px_12px_rgba(22,163,74,0.1)]"
            >
              <div className="dashboard-action-icon mb-4 flex h-[50px] w-[50px] items-center justify-center rounded-xl bg-[#F0FDF4] text-xl text-[#16A34A]">
                <FaSearch />
              </div>
              <h4 className="mb-2 text-base font-semibold text-[#1F2937]">
                Track Application
              </h4>
              <p className="text-sm text-[#6B7280]">
                Check your application status
              </p>
            </Link>

            {approvedApplication && (
              <Link
                to={`/digital-nid/${approvedApplication._id}`}
                className="dashboard-action-card relative overflow-hidden rounded-xl border border-[#E5E7EB] bg-white p-6 transition hover:-translate-y-[2px] hover:border-[#16A34A] hover:shadow-[0_4px_12px_rgba(22,163,74,0.1)]"
              >
                <div className="dashboard-action-icon mb-4 flex h-[50px] w-[50px] items-center justify-center rounded-xl bg-[#F0FDF4] text-xl text-[#16A34A]">
                  <FaDownload />
                </div>
                <h4 className="mb-2 text-base font-semibold text-[#1F2937]">
                  Download Digital NID
                </h4>
                <p className="text-sm text-[#6B7280]">
                  Get your digital ID card
                </p>
              </Link>
            )}

            <Link
              to="/support"
              className="dashboard-action-card relative overflow-hidden rounded-xl border border-[#E5E7EB] bg-white p-6 transition hover:-translate-y-[2px] hover:border-[#16A34A] hover:shadow-[0_4px_12px_rgba(22,163,74,0.1)]"
            >
              <div className="dashboard-action-icon mb-4 flex h-[50px] w-[50px] items-center justify-center rounded-xl bg-[#F0FDF4] text-xl text-[#16A34A]">
                <FaHeadset />
              </div>
              <h4 className="mb-2 text-base font-semibold text-[#1F2937]">
                Support
              </h4>
              <p className="text-sm text-[#6B7280]">
                Get help or raise a ticket
              </p>
            </Link>
          </div>
        </section>

        {/* Recent Applications */}
        <section className="dashboard-recent-section">
          <div className="dashboard-section-header mb-5 flex items-center justify-between gap-4">
            <h2 className="dashboard-section-title text-[1.25rem] font-semibold text-[#1F2937]">
              Recent Applications
            </h2>

            <Link
              to="/track-application"
              className="dashboard-view-all-link inline-flex items-center gap-2 text-sm font-medium text-[#16A34A]"
            >
              <span>View All</span>
              <FaArrowRight />
            </Link>
          </div>

          {applications.length === 0 ? (
            <div className="dashboard-empty-state rounded-xl border border-dashed border-[#E5E7EB] bg-white px-6 py-12 text-center">
              <FaIdCard className="mx-auto mb-4 text-5xl text-[#D1D5DB]" />
              <h3 className="mb-2 text-xl text-[#374151]">No Applications Yet</h3>
              <p className="mb-6 text-[#6B7280]">
                You haven&apos;t submitted any NID applications.
              </p>
              <Link
                to="/apply"
                className="inline-flex items-center rounded-lg bg-[#16A34A] px-5 py-3 text-sm font-medium text-white transition hover:bg-[#15803D]"
              >
                Apply Now
              </Link>
            </div>
          ) : (
            <div className="dashboard-applications-list flex flex-col gap-4">
              {applications.slice(0, 3).map((app) => (
                <div
                  key={app._id}
                  className="dashboard-application-card flex flex-col gap-4 rounded-xl bg-white px-5 py-5 shadow-[0_1px_3px_rgba(0,0,0,0.1)] transition hover:shadow-[0_4px_12px_rgba(0,0,0,0.1)] md:flex-row md:items-center"
                >
                  <div className="dashboard-application-status-icon text-2xl">
                    {getStatusIcon(app.status)}
                  </div>

                  <div className="dashboard-application-info flex-1">
                    <h4 className="mb-1 text-base font-semibold text-[#1F2937]">
                      Application #{app.applicationId}
                    </h4>
                    <p className="text-sm text-[#6B7280]">
                      Type: {(app.applicationType || 'N/A').toUpperCase()}
                    </p>
                    <p className="text-sm text-[#6B7280]">
                      Submitted: {app.createdAt ? formatDate(app.createdAt) : 'N/A'}
                    </p>

                    {app.status === 'rejected' && app.rejectionReason && (
                      <p className="mt-2 text-sm font-medium text-red-600">
                        Reason: {app.rejectionReason}
                      </p>
                    )}
                  </div>

                  <div className="dashboard-application-status">
                    <span className={`badge badge-${getStatusColor(app.status)}`}>
                      {formatStatus(app.status)}
                    </span>
                  </div>

                  <div className="dashboard-application-actions flex flex-wrap gap-2">
                    <Link
                      to={`/track-application?id=${app._id}`}
                      className="btn btn-sm btn-outline"
                    >
                      View Details
                    </Link>

                    {['approved', 'printed', 'dispatched', 'delivered'].includes(
                      app.status
                    ) && (
                      <Link
                        to={`/digital-nid/${app._id}`}
                        className="btn btn-sm btn-primary"
                      >
                        Download NID
                      </Link>
                    )}
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

