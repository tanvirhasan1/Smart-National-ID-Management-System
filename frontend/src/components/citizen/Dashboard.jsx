import React, { useEffect, useState } from 'react';
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

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);

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
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
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
    ['approved', 'printed', 'delivered'].includes(app.status)
  );

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

        {/* Stats Cards */}
        <section className="dashboard-stats-section mb-8">
          <div className="dashboard-stats-grid grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
            <div className="dashboard-stat-card flex items-center gap-4 rounded-xl bg-white p-6 shadow-[0_1px_3px_rgba(0,0,0,0.1)] transition hover:-translate-y-[2px] hover:shadow-[0_4px_12px_rgba(0,0,0,0.1)]">
              <div className="dashboard-stat-icon flex h-[50px] w-[50px] items-center justify-center rounded-xl bg-[linear-gradient(135deg,#16A34A_0%,#22C55E_100%)] text-xl text-white">
                <FaIdCard />
              </div>
              <div className="dashboard-stat-info">
                <h3 className="text-[1.75rem] font-bold text-[#1F2937]">
                  {dashboardSummary.applications.total}
                </h3>
                <p className="text-sm text-[#6B7280]">Total Applications</p>
              </div>
            </div>

            <div className="dashboard-stat-card flex items-center gap-4 rounded-xl bg-white p-6 shadow-[0_1px_3px_rgba(0,0,0,0.1)] transition hover:-translate-y-[2px] hover:shadow-[0_4px_12px_rgba(0,0,0,0.1)]">
              <div className="dashboard-stat-icon flex h-[50px] w-[50px] items-center justify-center rounded-xl bg-[linear-gradient(135deg,#F59E0B_0%,#FBBF24_100%)] text-xl text-white">
                <FaClock />
              </div>
              <div className="dashboard-stat-info">
                <h3 className="text-[1.75rem] font-bold text-[#1F2937]">
                  {dashboardSummary.applications.submitted}
                </h3>
                <p className="text-sm text-[#6B7280]">Submitted</p>
              </div>
            </div>

            <div className="dashboard-stat-card flex items-center gap-4 rounded-xl bg-white p-6 shadow-[0_1px_3px_rgba(0,0,0,0.1)] transition hover:-translate-y-[2px] hover:shadow-[0_4px_12px_rgba(0,0,0,0.1)]">
              <div className="dashboard-stat-icon flex h-[50px] w-[50px] items-center justify-center rounded-xl bg-[linear-gradient(135deg,#10B981_0%,#34D399_100%)] text-xl text-white">
                <FaCheckCircle />
              </div>
              <div className="dashboard-stat-info">
                <h3 className="text-[1.75rem] font-bold text-[#1F2937]">
                  {dashboardSummary.applications.approved}
                </h3>
                <p className="text-sm text-[#6B7280]">Approved</p>
              </div>
            </div>

            <div className="dashboard-stat-card flex items-center gap-4 rounded-xl bg-white p-6 shadow-[0_1px_3px_rgba(0,0,0,0.1)] transition hover:-translate-y-[2px] hover:shadow-[0_4px_12px_rgba(0,0,0,0.1)]">
              <div className="dashboard-stat-icon flex h-[50px] w-[50px] items-center justify-center rounded-xl bg-[linear-gradient(135deg,#0EA5E9_0%,#38BDF8_100%)] text-xl text-white">
                <FaCalendarAlt />
              </div>
              <div className="dashboard-stat-info">
                <h3 className="text-[1.75rem] font-bold text-[#1F2937]">
                  {dashboardSummary.appointments.booked}
                </h3>
                <p className="text-sm text-[#6B7280]">Booked Appointments</p>
              </div>
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
              <span className="dashboard-action-arrow absolute right-4 top-1/2 text-[#16A34A] opacity-0 transition">
                <FaArrowRight />
              </span>
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
              <span className="dashboard-action-arrow absolute right-4 top-1/2 text-[#16A34A] opacity-0 transition">
                <FaArrowRight />
              </span>
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
                <span className="dashboard-action-arrow absolute right-4 top-1/2 text-[#16A34A] opacity-0 transition">
                  <FaArrowRight />
                </span>
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
              <span className="dashboard-action-arrow absolute right-4 top-1/2 text-[#16A34A] opacity-0 transition">
                <FaArrowRight />
              </span>
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
                      Submitted: {formatDate(app.createdAt)}
                    </p>
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

                    {app.status === 'approved' && (
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