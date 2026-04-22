import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  FaCheckCircle,
  FaClock,
  FaTimesCircle,
  FaPrint,
  FaTruck,
  FaHome,
  FaSearch,
  FaFileAlt,
  FaIdCard,
  FaArrowRight,
  FaCalendarAlt,
  FaExclamationTriangle,
  FaSyncAlt
} from 'react-icons/fa';
import api from '../api/axios';
import Loader from '../common/Loader';
import { formatStatus, getStatusColor } from '../utils/helpers';
import '../styles/ApplicationTracker.css';

const TRACKER_STEPS = [
  {
    key: 'submitted',
    label: 'Submitted',
    icon: FaFileAlt,
    description: 'Your application has been submitted successfully.'
  },
  {
    key: 'under_review',
    label: 'Under Review',
    icon: FaSearch,
    description: 'Your documents and information are being reviewed.'
  },
  {
    key: 'approved',
    label: 'Approved',
    icon: FaCheckCircle,
    description: 'Your application has been approved by the authority.'
  },
  {
    key: 'printed',
    label: 'Printed',
    icon: FaPrint,
    description: 'Your Smart NID card has been printed.'
  },
  {
    key: 'dispatched',
    label: 'Dispatched',
    icon: FaTruck,
    description: 'Your Smart NID card has been dispatched.'
  },
  {
    key: 'delivered',
    label: 'Delivered',
    icon: FaHome,
    description: 'Your Smart NID card has been delivered successfully.'
  }
];

const getSafeTime = (value) => {
  if (!value) return 0;
  const time = new Date(value).getTime();
  return Number.isNaN(time) ? 0 : time;
};

const formatTrackerDate = (value) => {
  if (!value) return 'N/A';

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return 'N/A';
  }

  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  }).format(date);
};

const formatTrackerDateTime = (value) => {
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

const getReachedSteps = (status) => {
  switch (status) {
    case 'submitted':
      return ['submitted'];

    case 'under_review':
      return ['submitted', 'under_review'];

    case 'approved':
      return ['submitted', 'under_review', 'approved'];

    case 'printed':
      return ['submitted', 'under_review', 'approved', 'printed'];

    case 'dispatched':
      return ['submitted', 'under_review', 'approved', 'printed', 'dispatched'];

    case 'delivered':
      return [
        'submitted',
        'under_review',
        'approved',
        'printed',
        'dispatched',
        'delivered'
      ];

    case 'rejected':
      return ['submitted', 'under_review'];

    case 'cancelled':
      return ['submitted'];

    default:
      return [];
  }
};

const getPrimaryMessage = (application) => {
  if (!application) {
    return {
      title: 'No application selected',
      description:
        'Select an application from the left side to see the full status timeline.',
      toneClass: 'bg-slate-50 border-slate-200 text-slate-700',
      icon: <FaIdCard />
    };
  }

  switch (application.status) {
    case 'submitted':
    case 'under_review':
      return {
        title: 'Your application is currently under process',
        description:
          'The authority is reviewing your submitted information and supporting documents.',
        toneClass: 'bg-amber-50 border-amber-200 text-amber-800',
        icon: <FaClock />
      };

    case 'approved':
      return {
        title: 'Your application has been approved',
        description:
          'Your review is complete. Follow the next official step from this tracker.',
        toneClass: 'bg-emerald-50 border-emerald-200 text-emerald-800',
        icon: <FaCheckCircle />
      };

    case 'printed':
      return {
        title: 'Your Smart NID card has been printed',
        description:
          'Printing is complete. The next delivery movement will appear here automatically.',
        toneClass: 'bg-sky-50 border-sky-200 text-sky-800',
        icon: <FaPrint />
      };

    case 'dispatched':
      return {
        title: 'Your Smart NID card has been dispatched',
        description:
          'Your card is now moving through delivery. Keep checking this tracker for the next update.',
        toneClass: 'bg-sky-50 border-sky-200 text-sky-800',
        icon: <FaTruck />
      };

    case 'delivered':
      return {
        title: 'Your Smart NID card has been delivered',
        description:
          'Delivery is complete. You can now keep the digital version for quick access if available.',
        toneClass: 'bg-emerald-50 border-emerald-200 text-emerald-800',
        icon: <FaHome />
      };

    case 'rejected':
      return {
        title: 'Your application has been rejected',
        description:
          'Please read the official rejection reason below. Fix the issue before you apply again.',
        toneClass: 'bg-red-50 border-red-200 text-red-800',
        icon: <FaTimesCircle />
      };

    case 'cancelled':
      return {
        title: 'This application was cancelled',
        description:
          'This application is no longer active. You can create a new application when needed.',
        toneClass: 'bg-slate-50 border-slate-200 text-slate-700',
        icon: <FaExclamationTriangle />
      };

    default:
      return {
        title: 'Follow your latest application update',
        description:
          'Open the timeline below to see the current stage of your application.',
        toneClass: 'bg-slate-50 border-slate-200 text-slate-700',
        icon: <FaSearch />
      };
  }
};

const ApplicationTracker = () => {
  const [searchParams] = useSearchParams();
  const queryApplicationId = searchParams.get('id');

  const [applications, setApplications] = useState([]);
  const [selectedAppId, setSelectedAppId] = useState(queryApplicationId || '');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastSyncedAt, setLastSyncedAt] = useState(null);

  useEffect(() => {
    if (queryApplicationId) {
      setSelectedAppId(queryApplicationId);
    }
  }, [queryApplicationId]);

  const fetchApplications = useCallback(
    async ({ silent = false } = {}) => {
      try {
        if (silent) {
          setRefreshing(true);
        } else {
          setLoading(true);
        }

        const response = await api.get('/applications/my');
        const applicationList = response?.data?.applications || [];

        const sortedList = [...applicationList].sort((a, b) => {
          const firstTime = getSafeTime(a?.updatedAt || a?.createdAt);
          const secondTime = getSafeTime(b?.updatedAt || b?.createdAt);
          return secondTime - firstTime;
        });

        setApplications(sortedList);
        setLastSyncedAt(new Date());

        if (queryApplicationId) {
          const matchedByQuery = sortedList.find(
            (app) => app._id === queryApplicationId
          );

          if (matchedByQuery) {
            setSelectedAppId(matchedByQuery._id);
            return;
          }
        }

        if (selectedAppId) {
          const matchedSelected = sortedList.find(
            (app) => app._id === selectedAppId
          );

          if (matchedSelected) {
            setSelectedAppId(matchedSelected._id);
            return;
          }
        }

        if (sortedList.length > 0) {
          setSelectedAppId(sortedList[0]._id);
        }
      } catch (error) {
        console.error('Error fetching applications:', error);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [queryApplicationId, selectedAppId]
  );

  useEffect(() => {
    fetchApplications();

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        fetchApplications({ silent: true });
      }
    };

    const intervalId = setInterval(() => {
      if (document.visibilityState === 'visible') {
        fetchApplications({ silent: true });
      }
    }, 30000);

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearInterval(intervalId);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [fetchApplications]);

  const selectedApp = useMemo(() => {
    return applications.find((app) => app._id === selectedAppId) || applications[0] || null;
  }, [applications, selectedAppId]);

  const reachedSteps = useMemo(() => {
    return getReachedSteps(selectedApp?.status);
  }, [selectedApp]);

  const latestHistory = useMemo(() => {
    if (!selectedApp?.statusHistory?.length) {
      return [];
    }

    return [...selectedApp.statusHistory]
      .sort(
        (a, b) =>
          getSafeTime(b?.changedAt || 0) - getSafeTime(a?.changedAt || 0)
      )
      .slice(0, 5);
  }, [selectedApp]);

  const getStepDate = (application, stepKey) => {
    if (!application || !reachedSteps.includes(stepKey)) {
      return '';
    }

    const historyMatch = [...(application.statusHistory || [])]
      .sort(
        (a, b) =>
          getSafeTime(a?.changedAt || 0) - getSafeTime(b?.changedAt || 0)
      )
      .find((item) => item.toStatus === stepKey);

    if (historyMatch?.changedAt) {
      return historyMatch.changedAt;
    }

    const dateMap = {
      submitted: application.submittedAt || application.createdAt,
      approved: application.approvedAt,
      printed: application.printedAt,
      dispatched: application.dispatchedAt,
      delivered: application.deliveredAt
    };

    return dateMap[stepKey] || '';
  };

  const primaryMessage = getPrimaryMessage(selectedApp);

  if (loading) {
    return (
      <div className="tracker-loading flex min-h-[60vh] items-center justify-center">
        <Loader size="large" text="Loading applications..." />
      </div>
    );
  }

  return (
    <div className="tracker-page-wrapper min-h-[calc(100vh-140px)] bg-[#F9FAFB] px-4 py-8">
      <div className="tracker-shell mx-auto w-full max-w-[1280px]">
        <div className="tracker-header-card mb-8 rounded-2xl bg-[linear-gradient(135deg,#16A34A_0%,#15803D_100%)] px-6 py-6 text-white md:px-8">
          <div className="tracker-header-row flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div className="tracker-header-copy">
              <h1 className="text-[1.9rem] font-bold leading-tight">
                Track Your Smart NID Application
              </h1>
              <p className="mt-2 text-sm text-white/90 md:text-base">
                See every stage of your application journey in one place.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {refreshing && (
                <span className="inline-flex items-center gap-2 rounded-full bg-white/15 px-4 py-2 text-xs font-medium text-white/90 backdrop-blur-sm">
                  <FaSyncAlt className="animate-spin" />
                  Syncing...
                </span>
              )}

              {lastSyncedAt && (
                <div className="tracker-sync-badge inline-flex items-center rounded-full bg-white/15 px-4 py-2 text-xs font-medium text-white/90 backdrop-blur-sm">
                  Auto synced: {formatTrackerDateTime(lastSyncedAt)}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="tracker-layout grid gap-6 xl:grid-cols-[300px,1fr]">
          <div className="tracker-sidebar rounded-2xl border border-[#E5E7EB] bg-white p-5 shadow-[0_1px_3px_rgba(0,0,0,0.08)]">
            <div className="tracker-sidebar-top mb-4">
              <h2 className="text-lg font-bold text-[#111827]">My Applications</h2>
              <p className="mt-1 text-sm text-[#6B7280]">
                Open any application to see full progress.
              </p>
            </div>

            {applications.length === 0 ? (
              <div className="tracker-empty-sidebar rounded-2xl border border-dashed border-[#D1D5DB] bg-[#F9FAFB] px-5 py-10 text-center">
                <FaIdCard className="mx-auto mb-4 text-4xl text-[#D1D5DB]" />
                <h3 className="text-base font-semibold text-[#374151]">
                  No applications found
                </h3>
                <p className="mt-2 text-sm text-[#6B7280]">
                  You have not submitted any application yet.
                </p>
                <Link
                  to="/apply"
                  className="mt-5 inline-flex items-center rounded-lg bg-[#16A34A] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#15803D]"
                >
                  Apply Now
                </Link>
              </div>
            ) : (
              <div className="tracker-application-list flex flex-col gap-3">
                {applications.map((app) => (
                  <button
                    key={app._id}
                    type="button"
                    onClick={() => setSelectedAppId(app._id)}
                    className={`tracker-application-item w-full rounded-2xl border px-4 py-4 text-left transition ${
                      selectedApp?._id === app._id
                        ? 'border-[#16A34A] bg-[#F0FDF4] shadow-[0_4px_12px_rgba(22,163,74,0.08)]'
                        : 'border-[#E5E7EB] bg-white hover:border-[#BBF7D0] hover:bg-[#FAFFFC]'
                    }`}
                  >
                    <div className="mb-3 flex items-start justify-between gap-3">
                      <span className="text-sm font-bold text-[#111827] break-all">
                        #{app.applicationId}
                      </span>

                      <span className={`badge badge-${getStatusColor(app.status)} shrink-0`}>
                        {formatStatus(app.status)}
                      </span>
                    </div>

                    <div className="flex flex-col gap-1 text-sm text-[#6B7280]">
                      <span>
                        Submitted: {app.createdAt ? formatTrackerDate(app.createdAt) : 'N/A'}
                      </span>
                      <span>
                        Updated: {app.updatedAt ? formatTrackerDate(app.updatedAt) : 'N/A'}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {selectedApp ? (
            <div className="tracker-details flex flex-col gap-6">
              <div className="tracker-summary-card rounded-2xl border border-[#E5E7EB] bg-white p-6 shadow-[0_1px_3px_rgba(0,0,0,0.08)]">
                <div className="tracker-summary-top flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                  <div className="tracker-summary-copy">
                    <div className="flex flex-wrap items-center gap-3">
                      <h2 className="text-[1.4rem] font-bold text-[#111827] break-all">
                        Application #{selectedApp.applicationId}
                      </h2>

                      <span
                        className={`badge badge-lg badge-${getStatusColor(
                          selectedApp.status
                        )}`}
                      >
                        {formatStatus(selectedApp.status)}
                      </span>
                    </div>
                  </div>

                  <div
                    className={`tracker-primary-alert flex items-start gap-3 rounded-2xl border px-4 py-4 ${primaryMessage.toneClass}`}
                  >
                    <div className="mt-1 text-lg">{primaryMessage.icon}</div>
                    <div>
                      <h3 className="text-sm font-bold">{primaryMessage.title}</h3>
                      <p className="mt-1 text-sm leading-6">
                        {primaryMessage.description}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="tracker-meta-grid mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                  <div className="rounded-xl bg-[#F9FAFB] px-4 py-3">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#6B7280]">
                      Application Type
                    </p>
                    <p className="mt-1 text-sm font-semibold text-[#111827]">
                      {(selectedApp.applicationType || 'N/A').toUpperCase()}
                    </p>
                  </div>

                  <div className="rounded-xl bg-[#F9FAFB] px-4 py-3">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#6B7280]">
                      Current Status
                    </p>
                    <p className="mt-1 text-sm font-semibold text-[#111827]">
                      {formatStatus(selectedApp.status)}
                    </p>
                  </div>

                  <div className="rounded-xl bg-[#F9FAFB] px-4 py-3">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#6B7280]">
                      Submitted On
                    </p>
                    <p className="mt-1 text-sm font-semibold text-[#111827]">
                      {selectedApp.createdAt
                        ? formatTrackerDateTime(selectedApp.createdAt)
                        : 'N/A'}
                    </p>
                  </div>

                  <div className="rounded-xl bg-[#F9FAFB] px-4 py-3">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#6B7280]">
                      Last Updated
                    </p>
                    <p className="mt-1 text-sm font-semibold text-[#111827]">
                      {selectedApp.updatedAt
                        ? formatTrackerDateTime(selectedApp.updatedAt)
                        : 'N/A'}
                    </p>
                  </div>
                </div>

                {selectedApp.status === 'rejected' &&
                  selectedApp.rejectionReason && (
                    <div className="tracker-rejection-box mt-5 rounded-2xl border border-red-200 bg-red-50 px-5 py-4">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-red-700">
                        Official Rejection Reason
                      </p>
                      <p className="mt-2 text-sm leading-6 text-red-800">
                        {selectedApp.rejectionReason}
                      </p>
                    </div>
                  )}
              </div>

              <div className="tracker-progress-card rounded-2xl border border-[#E5E7EB] bg-white p-6 shadow-[0_1px_3px_rgba(0,0,0,0.08)]">
                <h3 className="text-lg font-bold text-[#111827]">
                  Application Progress
                </h3>
                <p className="mt-1 text-sm text-[#6B7280]">
                  Follow each completed and upcoming stage of your Smart NID process.
                </p>

                <div className="tracker-progress-grid mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {TRACKER_STEPS.map((step) => {
                    const isReached = reachedSteps.includes(step.key);
                    const isRejectedOrCancelled = ['rejected', 'cancelled'].includes(
                      selectedApp.status
                    );
                    const isCurrent =
                      !isRejectedOrCancelled && selectedApp.status === step.key;
                    const isCompleted = isReached && !isCurrent;
                    const stepDate = getStepDate(selectedApp, step.key);

                    return (
                      <div
                        key={step.key}
                        className={`tracker-step-card rounded-2xl border p-5 transition ${
                          isCurrent
                            ? 'border-[#16A34A] bg-[#F0FDF4]'
                            : isCompleted
                              ? 'border-[#BBF7D0] bg-[#FAFFFC]'
                              : 'border-[#E5E7EB] bg-white'
                        }`}
                      >
                        <div className="mb-4 flex items-center justify-between gap-3">
                          <div
                            className={`flex h-12 w-12 items-center justify-center rounded-2xl text-lg ${
                              isCurrent
                                ? 'bg-[#16A34A] text-white'
                                : isCompleted
                                  ? 'bg-[#DCFCE7] text-[#16A34A]'
                                  : 'bg-[#F3F4F6] text-[#9CA3AF]'
                            }`}
                          >
                            <step.icon />
                          </div>

                          <span
                            className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                              isCurrent
                                ? 'bg-[#DCFCE7] text-[#166534]'
                                : isCompleted
                                  ? 'bg-[#ECFDF3] text-[#15803D]'
                                  : 'bg-[#F3F4F6] text-[#6B7280]'
                            }`}
                          >
                            {isCurrent ? 'Current' : isCompleted ? 'Completed' : 'Pending'}
                          </span>
                        </div>

                        <h4 className="text-base font-bold text-[#111827]">
                          {step.label}
                        </h4>

                        <p className="mt-2 text-sm leading-6 text-[#6B7280]">
                          {step.description}
                        </p>

                        <div className="mt-4 rounded-xl bg-[#F9FAFB] px-3 py-3">
                          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#6B7280]">
                            Status Time
                          </p>
                          <p className="mt-1 text-sm font-semibold text-[#111827]">
                            {stepDate ? formatTrackerDateTime(stepDate) : 'Not reached yet'}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {selectedApp.status === 'rejected' && (
                  <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 px-5 py-4">
                    <div className="flex items-start gap-3">
                      <div className="mt-1 text-lg text-red-600">
                        <FaTimesCircle />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-red-800">
                          Final Review Result: Rejected
                        </h4>
                        <p className="mt-1 text-sm leading-6 text-red-700">
                          The application stopped after the review stage. It did not
                          move to approval, printing, dispatch, or delivery.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {selectedApp.status === 'cancelled' && (
                  <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 px-5 py-4">
                    <div className="flex items-start gap-3">
                      <div className="mt-1 text-lg text-slate-600">
                        <FaExclamationTriangle />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-slate-800">
                          Final Review Result: Cancelled
                        </h4>
                        <p className="mt-1 text-sm leading-6 text-slate-700">
                          This application is no longer active and will not move to the
                          next stages.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {latestHistory.length > 0 && (
                <div className="tracker-history-card rounded-2xl border border-[#E5E7EB] bg-white p-6 shadow-[0_1px_3px_rgba(0,0,0,0.08)]">
                  <h3 className="text-lg font-bold text-[#111827]">
                    Recent Status Updates
                  </h3>
                  <p className="mt-1 text-sm text-[#6B7280]">
                    These updates come from the application status history.
                  </p>

                  <div className="mt-5 flex flex-col gap-3">
                    {latestHistory.map((historyItem, index) => (
                      <div
                        key={`${historyItem.toStatus}-${historyItem.changedAt}-${index}`}
                        className="rounded-2xl border border-[#E5E7EB] bg-[#F9FAFB] px-4 py-4"
                      >
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                          <div>
                            <p className="text-sm font-bold text-[#111827]">
                              {formatStatus(historyItem.toStatus)}
                            </p>

                            {historyItem.fromStatus && (
                              <p className="mt-1 text-xs text-[#6B7280]">
                                From {formatStatus(historyItem.fromStatus)}
                              </p>
                            )}
                          </div>

                          <p className="text-xs font-medium text-[#6B7280]">
                            {historyItem.changedAt
                              ? formatTrackerDateTime(historyItem.changedAt)
                              : 'N/A'}
                          </p>
                        </div>

                        {historyItem.note && (
                          <p className="mt-3 text-sm leading-6 text-[#4B5563]">
                            {historyItem.note}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {['printed', 'dispatched', 'delivered'].includes(selectedApp.status) && (
                <div className="tracker-delivery-card rounded-2xl border border-[#E5E7EB] bg-white p-6 shadow-[0_1px_3px_rgba(0,0,0,0.08)]">
                  <h3 className="text-lg font-bold text-[#111827]">
                    Delivery Information
                  </h3>

                  <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                    {selectedApp.trackingNumber && (
                      <div className="rounded-xl bg-[#F9FAFB] px-4 py-3">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#6B7280]">
                          Tracking Number
                        </p>
                        <p className="mt-1 text-sm font-semibold text-[#111827]">
                          {selectedApp.trackingNumber}
                        </p>
                      </div>
                    )}

                    {selectedApp.printedAt && (
                      <div className="rounded-xl bg-[#F9FAFB] px-4 py-3">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#6B7280]">
                          Printed On
                        </p>
                        <p className="mt-1 text-sm font-semibold text-[#111827]">
                          {formatTrackerDateTime(selectedApp.printedAt)}
                        </p>
                      </div>
                    )}

                    {selectedApp.dispatchedAt && (
                      <div className="rounded-xl bg-[#F9FAFB] px-4 py-3">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#6B7280]">
                          Dispatched On
                        </p>
                        <p className="mt-1 text-sm font-semibold text-[#111827]">
                          {formatTrackerDateTime(selectedApp.dispatchedAt)}
                        </p>
                      </div>
                    )}

                    {selectedApp.deliveredAt && (
                      <div className="rounded-xl bg-[#F9FAFB] px-4 py-3">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#6B7280]">
                          Delivered On
                        </p>
                        <p className="mt-1 text-sm font-semibold text-[#111827]">
                          {formatTrackerDateTime(selectedApp.deliveredAt)}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className="tracker-action-row flex flex-wrap gap-3">
                {selectedApp.status === 'approved' && (
                  <Link
                    to={`/book-appointment/${selectedApp._id}`}
                    className="inline-flex items-center gap-2 rounded-lg bg-[#16A34A] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#15803D]"
                  >
                    <FaCalendarAlt />
                    <span>Book Biometric Appointment</span>
                  </Link>
                )}

                {['approved', 'printed', 'dispatched', 'delivered'].includes(
                  selectedApp.status
                ) && (
                  <Link
                    to={`/digital-nid/${selectedApp._id}`}
                    className="inline-flex items-center gap-2 rounded-lg border border-[#16A34A] bg-white px-5 py-3 text-sm font-semibold text-[#16A34A] transition hover:bg-[#F0FDF4]"
                  >
                    <FaIdCard />
                    <span>View Digital NID</span>
                  </Link>
                )}

                {['rejected', 'cancelled'].includes(selectedApp.status) && (
                  <Link
                    to="/apply"
                    className="inline-flex items-center gap-2 rounded-lg bg-[#16A34A] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#15803D]"
                  >
                    <span>Apply Again</span>
                    <FaArrowRight />
                  </Link>
                )}

                <Link
                  to="/support"
                  className="inline-flex items-center gap-2 rounded-lg border border-[#D1D5DB] bg-white px-5 py-3 text-sm font-semibold text-[#374151] transition hover:border-[#16A34A] hover:text-[#16A34A]"
                >
                  <span>Contact Support</span>
                </Link>
              </div>
            </div>
          ) : (
            <div className="tracker-no-selection flex items-center justify-center rounded-2xl border border-dashed border-[#D1D5DB] bg-white p-12 text-center">
              <div>
                <FaFileAlt className="mx-auto mb-4 text-5xl text-[#D1D5DB]" />
                <h3 className="text-xl font-semibold text-[#374151]">
                  Select an Application
                </h3>
                <p className="mt-2 text-sm text-[#6B7280]">
                  Choose an application from the left side to view details.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ApplicationTracker;

