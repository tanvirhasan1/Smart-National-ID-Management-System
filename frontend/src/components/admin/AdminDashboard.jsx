// Admin Dashboard Page Start
import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  FaUsers,
  FaFileAlt,
  FaClock,
  FaCheckCircle,
  FaTimesCircle,
  FaPrint,
  FaTruck,
  FaTicketAlt,
  FaSyncAlt,
  FaExclamationTriangle
} from 'react-icons/fa';
import api from '../api/axios';
import Loader from '../common/Loader';
import { useAuth } from '../context/AuthContext';
import { formatDate, formatStatus, getStatusColor } from '../utils/helpers';
import '../styles/AdminDashboard.css';

const AdminDashboard = () => {
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  const canViewRecentApplications = user?.role === 'admin';

  const fetchDashboardSummary = async () => {
    try {
      setLoading(true);

      const response = await api.get('/admin/dashboard/summary');
      const summary =
        response?.data?.data ||
        response?.data?.summary ||
        response?.data ||
        {};

      setDashboardData(summary);
    } catch (error) {
      console.error('Error fetching admin dashboard summary:', error);
    } finally {
      setLoading(false);
    }
  };

  // Load dashboard summary after authenticated role is available.
  useEffect(() => {
    if (user?.role) {
      fetchDashboardSummary();
    }
  }, [user?.role]);

  // Make response shape flexible so backend mismatch na hoy
  const normalizedData = useMemo(() => {
    const source = dashboardData || {};

    return {
      totals: {
        users:
          source?.totals?.users ??
          source?.users?.total ??
          source?.stats?.users ??
          0,
        applications:
          source?.totals?.applications ??
          source?.applications?.total ??
          source?.stats?.applications ??
          0,
        pendingApplications:
          source?.totals?.pendingApplications ??
          source?.applications?.submitted ??
          source?.applications?.under_review ??
          0,
        approvedApplications:
          source?.totals?.approvedApplications ??
          source?.applications?.approved ??
          0,
        rejectedApplications:
          source?.totals?.rejectedApplications ??
          source?.applications?.rejected ??
          0,
        printing:
          source?.totals?.printing ??
          source?.printing?.pending ??
          source?.printing?.total ??
          0,
        delivery:
          source?.totals?.delivery ??
          source?.delivery?.pending ??
          source?.delivery?.total ??
          0,
        supportTickets:
          source?.totals?.supportTickets ??
          source?.supportTickets?.total ??
          source?.support?.total ??
          0
      },
      applications: source?.applications || {},
      appointments: source?.appointments || {},
      supportTickets: source?.supportTickets || source?.support || {},
      printing: source?.printing || {},
      delivery: source?.delivery || {},
      recentApplications:
        canViewRecentApplications
          ? source?.recentApplications ||
            source?.latestApplications ||
            source?.applications?.recent ||
            []
          : []
    };
  }, [dashboardData, canViewRecentApplications]);

  const statCards = [
    {
      key: 'users',
      title: 'Total Users',
      value: normalizedData.totals.users,
      icon: FaUsers,
      colorClass: 'admin-dashboard-stat-users'
    },
    {
      key: 'applications',
      title: 'Total Applications',
      value: normalizedData.totals.applications,
      icon: FaFileAlt,
      colorClass: 'admin-dashboard-stat-applications'
    },
    {
      key: 'pendingApplications',
      title: 'Pending Review',
      value: normalizedData.totals.pendingApplications,
      icon: FaClock,
      colorClass: 'admin-dashboard-stat-pending'
    },
    {
      key: 'approvedApplications',
      title: 'Approved',
      value: normalizedData.totals.approvedApplications,
      icon: FaCheckCircle,
      colorClass: 'admin-dashboard-stat-approved'
    },
    {
      key: 'printing',
      title: 'Printing Queue',
      value: normalizedData.totals.printing,
      icon: FaPrint,
      colorClass: 'admin-dashboard-stat-printing'
    },
    {
      key: 'delivery',
      title: 'Delivery Queue',
      value: normalizedData.totals.delivery,
      icon: FaTruck,
      colorClass: 'admin-dashboard-stat-delivery'
    },
    {
      key: 'supportTickets',
      title: 'Support Tickets',
      value: normalizedData.totals.supportTickets,
      icon: FaTicketAlt,
      colorClass: 'admin-dashboard-stat-support'
    },
    {
      key: 'rejectedApplications',
      title: 'Rejected',
      value: normalizedData.totals.rejectedApplications,
      icon: FaTimesCircle,
      colorClass: 'admin-dashboard-stat-rejected'
    }
  ];

  if (loading) {
    return (
      <div className="admin-dashboard-loading-wrapper flex min-h-[60vh] items-center justify-center">
        <Loader size="large" text="Loading admin dashboard..." />
      </div>
    );
  }

  return (
    <div className="admin-dashboard-page-wrapper">
      {/* Dashboard top header */}
      <div className="admin-dashboard-header-panel mb-8 rounded-2xl bg-white p-6 shadow-[0_4px_12px_rgba(0,0,0,0.06)]">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="admin-dashboard-title mb-1 text-[1.9rem] font-bold text-[#1F2937]">
              Admin Dashboard
            </h1>
            <p className="admin-dashboard-subtitle text-[#6B7280]">
              Overview of applications, printing, delivery and support activity.
            </p>
          </div>

          <div className="header-actions flex flex-wrap items-center gap-3">
            {user?.role === 'admin' && user?.isMainAdmin && (
              <Link
                to="/admin/users"
                className="inline-flex items-center rounded-lg bg-[#16A34A] px-4 py-2 text-sm font-medium text-white no-underline transition hover:bg-[#15803D]"
              >
                Manage Users
              </Link>
            )}

            <button
              type="button"
              className="admin-dashboard-refresh-button inline-flex items-center gap-2 rounded-lg bg-[#16A34A] px-5 py-3 text-sm font-medium text-white transition hover:bg-[#15803D]"
              onClick={fetchDashboardSummary}
            >
              <FaSyncAlt />
              <span>Refresh Data</span>
            </button>
          </div>
        </div>
      </div>

      {/* Summary cards */}
      <div className="admin-dashboard-stats-grid mb-8 grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
        {statCards.map((card) => {
          const Icon = card.icon;

          return (
            <div
              key={card.key}
              className="admin-dashboard-stat-card rounded-2xl bg-white p-5 shadow-[0_4px_12px_rgba(0,0,0,0.06)] transition hover:-translate-y-[2px] hover:shadow-[0_8px_18px_rgba(0,0,0,0.08)]"
            >
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="mb-2 text-sm font-medium text-[#6B7280]">
                    {card.title}
                  </p>
                  <h3 className="text-[2rem] font-bold text-[#1F2937]">
                    {card.value}
                  </h3>
                </div>

                <div
                  className={`admin-dashboard-stat-icon ${card.colorClass} flex h-[56px] w-[56px] items-center justify-center rounded-2xl text-2xl text-white`}
                >
                  <Icon />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="admin-dashboard-content-grid grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        {/* Status overview */}
        <div className="admin-dashboard-overview-panel rounded-2xl bg-white p-6 shadow-[0_4px_12px_rgba(0,0,0,0.06)]">
          <h2 className="mb-5 text-xl font-semibold text-[#1F2937]">
            Status Overview
          </h2>

          <div className="grid gap-5 md:grid-cols-2">
            <div className="admin-dashboard-section-card rounded-2xl border border-[#E5E7EB] bg-[#F9FAFB] p-5">
              <h3 className="mb-4 text-lg font-semibold text-[#1F2937]">
                Applications
              </h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-[#6B7280]">Submitted</span>
                  <span className="font-semibold text-[#1F2937]">
                    {normalizedData.applications.submitted || 0}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-[#6B7280]">Under Review</span>
                  <span className="font-semibold text-[#1F2937]">
                    {normalizedData.applications.under_review || 0}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-[#6B7280]">Approved</span>
                  <span className="font-semibold text-[#1F2937]">
                    {normalizedData.applications.approved || 0}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-[#6B7280]">Rejected</span>
                  <span className="font-semibold text-[#1F2937]">
                    {normalizedData.applications.rejected || 0}
                  </span>
                </div>
              </div>
            </div>

            <div className="admin-dashboard-section-card rounded-2xl border border-[#E5E7EB] bg-[#F9FAFB] p-5">
              <h3 className="mb-4 text-lg font-semibold text-[#1F2937]">
                Appointments
              </h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-[#6B7280]">Booked</span>
                  <span className="font-semibold text-[#1F2937]">
                    {normalizedData.appointments.booked || 0}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-[#6B7280]">Completed</span>
                  <span className="font-semibold text-[#1F2937]">
                    {normalizedData.appointments.completed || 0}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-[#6B7280]">Cancelled</span>
                  <span className="font-semibold text-[#1F2937]">
                    {normalizedData.appointments.cancelled || 0}
                  </span>
                </div>
              </div>
            </div>

            <div className="admin-dashboard-section-card rounded-2xl border border-[#E5E7EB] bg-[#F9FAFB] p-5">
              <h3 className="mb-4 text-lg font-semibold text-[#1F2937]">
                Support Tickets
              </h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-[#6B7280]">Open</span>
                  <span className="font-semibold text-[#1F2937]">
                    {normalizedData.supportTickets.open || 0}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-[#6B7280]">In Progress</span>
                  <span className="font-semibold text-[#1F2937]">
                    {normalizedData.supportTickets.in_progress || 0}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-[#6B7280]">Resolved</span>
                  <span className="font-semibold text-[#1F2937]">
                    {normalizedData.supportTickets.resolved || 0}
                  </span>
                </div>
              </div>
            </div>

            <div className="admin-dashboard-section-card rounded-2xl border border-[#E5E7EB] bg-[#F9FAFB] p-5">
              <h3 className="mb-4 text-lg font-semibold text-[#1F2937]">
                Printing & Delivery
              </h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-[#6B7280]">Printed</span>
                  <span className="font-semibold text-[#1F2937]">
                    {normalizedData.printing.completed ||
                      normalizedData.applications.printed ||
                      0}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-[#6B7280]">Pending Delivery</span>
                  <span className="font-semibold text-[#1F2937]">
                    {normalizedData.delivery.pending || 0}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-[#6B7280]">Delivered</span>
                  <span className="font-semibold text-[#1F2937]">
                    {normalizedData.delivery.completed ||
                      normalizedData.applications.delivered ||
                      0}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Recent applications */}
        <div className="admin-dashboard-recent-panel rounded-2xl bg-white p-6 shadow-[0_4px_12px_rgba(0,0,0,0.06)]">
          <h2 className="mb-5 text-xl font-semibold text-[#1F2937]">
            Recent Applications
          </h2>

          {!canViewRecentApplications ? (
            <div className="admin-dashboard-empty-state flex min-h-[240px] flex-col items-center justify-center rounded-2xl border border-dashed border-[#E5E7EB] bg-[#F9FAFB] px-5 text-center">
              <FaExclamationTriangle className="mb-4 text-4xl text-[#D1D5DB]" />
              <h3 className="mb-2 text-lg font-semibold text-[#374151]">
                Limited access
              </h3>
              <p className="text-sm text-[#6B7280]">
                Recent application details are available for admin only.
              </p>
            </div>
          ) : normalizedData.recentApplications.length === 0 ? (
            <div className="admin-dashboard-empty-state flex min-h-[240px] flex-col items-center justify-center rounded-2xl border border-dashed border-[#E5E7EB] bg-[#F9FAFB] px-5 text-center">
              <FaExclamationTriangle className="mb-4 text-4xl text-[#D1D5DB]" />
              <h3 className="mb-2 text-lg font-semibold text-[#374151]">
                No recent applications
              </h3>
              <p className="text-sm text-[#6B7280]">
                Recent application activity will appear here.
              </p>
            </div>
          ) : (
            <div className="admin-dashboard-recent-list flex flex-col gap-4">
              {normalizedData.recentApplications.slice(0, 6).map((application) => (
                <div
                  key={application._id || application.applicationId}
                  className="admin-dashboard-recent-card rounded-2xl border border-[#E5E7EB] bg-[#F9FAFB] p-4"
                >
                  <div className="mb-3 flex items-start justify-between gap-3">
                    <div>
                      <h4 className="text-base font-semibold text-[#1F2937]">
                        {application.fullNameEnglish || 'Unnamed Applicant'}
                      </h4>
                      <p className="text-sm text-[#6B7280]">
                        {application.applicationId || 'N/A'}
                      </p>
                    </div>

                    <span
                      className={`badge badge-${getStatusColor(application.status)}`}
                    >
                      {formatStatus(application.status)}
                    </span>
                  </div>

                  <div className="grid gap-3 md:grid-cols-2">
                    <div>
                      <p className="text-xs text-[#6B7280]">Type</p>
                      <p className="text-sm font-medium text-[#1F2937]">
                        {formatStatus(application.applicationType || 'new')}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs text-[#6B7280]">Created</p>
                      <p className="text-sm font-medium text-[#1F2937]">
                        {application.createdAt
                          ? formatDate(application.createdAt)
                          : 'N/A'}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;