// Admin Application Review Page Start
import React, { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import {
  FaSearch,
  FaFilter,
  FaEye,
  FaCheck,
  FaTimes,
  FaSpinner,
  FaUser,
  FaIdCard,
  FaMapMarkerAlt,
  FaExclamationTriangle
} from 'react-icons/fa';
import api from '../api/axios';
import AdminLayout from './AdminLayout';
import Loader from '../common/Loader';
import {
  formatDate,
  formatDateTime,
  formatStatus,
  getStatusColor
} from '../utils/helpers';
import '../styles/ApplicationReview.css';

const ApplicationReview = () => {
  const [searchParams, setSearchParams] = useSearchParams();

  const [applications, setApplications] = useState([]);
  const [selectedApp, setSelectedApp] = useState(null);
  const [applicationStats, setApplicationStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');

  const [statusFilter, setStatusFilter] = useState(searchParams.get('status') || '');
  const [typeFilter, setTypeFilter] = useState(searchParams.get('type') || '');
  const [searchQuery, setSearchQuery] = useState('');

  // Load applications and stats when filter changes
  useEffect(() => {
    fetchApplications();
    fetchApplicationStats();
  }, [statusFilter, typeFilter]);

  const fetchApplications = async () => {
    try {
      setLoading(true);

      const queryParams = new URLSearchParams();

      if (statusFilter) {
        queryParams.set('status', statusFilter);
      }

      if (typeFilter) {
        queryParams.set('applicationType', typeFilter);
      }

      const queryString = queryParams.toString();
      const url = queryString
        ? `/admin/applications?${queryString}`
        : '/admin/applications';

      const response = await api.get(url);
      const applicationList = response?.data?.applications || [];

      setApplications(applicationList);

      const appIdFromUrl = searchParams.get('id');

      if (appIdFromUrl) {
        const existingApp = applicationList.find((app) => app._id === appIdFromUrl);

        if (existingApp) {
          await handleSelectApplication(existingApp._id);
          return;
        }
      }

      if (selectedApp?._id) {
        const stillExists = applicationList.find((app) => app._id === selectedApp._id);
        if (stillExists) {
          return;
        }
      }

      if (applicationList.length > 0) {
        await handleSelectApplication(applicationList[0]._id);
      } else {
        setSelectedApp(null);
      }
    } catch (error) {
      console.error('Error fetching applications:', error);
      toast.error(
        error?.response?.data?.message || 'Failed to load applications'
      );
    } finally {
      setLoading(false);
    }
  };

  const fetchApplicationStats = async () => {
    try {
      const response = await api.get('/admin/applications/stats');
      setApplicationStats(response?.data?.data || null);
    } catch (error) {
      console.error('Error fetching application stats:', error);
    }
  };

  // Load single application details
  const handleSelectApplication = async (applicationId) => {
    try {
      setDetailsLoading(true);

      const response = await api.get(`/admin/applications/${applicationId}`);
      const applicationDetails = response?.data?.application || null;

      setSelectedApp(applicationDetails);
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        next.set('id', applicationId);
        return next;
      });
    } catch (error) {
      console.error('Error fetching application details:', error);
      toast.error(
        error?.response?.data?.message || 'Failed to load application details'
      );
    } finally {
      setDetailsLoading(false);
    }
  };

  const handleReviewAction = async (status) => {
    if (!selectedApp?._id) return;

    if (status === 'rejected' && !rejectionReason.trim()) {
      toast.error('Please provide a rejection reason');
      return;
    }

    setActionLoading(true);

    try {
      const payload = {
        status,
        rejectionReason: status === 'rejected' ? rejectionReason.trim() : ''
      };

      await api.patch(`/admin/applications/${selectedApp._id}/review`, payload);

      toast.success(`Application ${formatStatus(status)} successfully`);

      setShowRejectModal(false);
      setRejectionReason('');

      await fetchApplications();
      await fetchApplicationStats();
      await handleSelectApplication(selectedApp._id);
    } catch (error) {
      toast.error(
        error?.response?.data?.message || 'Failed to update application'
      );
    } finally {
      setActionLoading(false);
    }
  };

  const filteredApplications = useMemo(() => {
    return applications.filter((app) => {
      const applicationId = app.applicationId || '';
      const applicantName = app.applicant?.fullName || '';
      const applicantPhone = app.applicant?.phone || '';

      const query = searchQuery.toLowerCase();

      return (
        applicationId.toLowerCase().includes(query) ||
        applicantName.toLowerCase().includes(query) ||
        applicantPhone.toLowerCase().includes(query)
      );
    });
  }, [applications, searchQuery]);

  const canReview =
    selectedApp && ['submitted', 'under_review'].includes(selectedApp.status);

  if (loading) {
    return (
      <AdminLayout>
        <div className="admin-review-loading-wrapper flex min-h-[60vh] items-center justify-center">
          <Loader size="large" text="Loading applications..." />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="application-review-page-wrapper">
        {/* Page header */}
        <div className="application-review-header-panel mb-8 rounded-2xl bg-white p-6 shadow-[0_4px_12px_rgba(0,0,0,0.06)]">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="application-review-title mb-1 text-[1.9rem] font-bold text-[#1F2937]">
                Application Review
              </h1>
              <p className="application-review-subtitle text-[#6B7280]">
                Review, approve or reject citizen NID applications.
              </p>
            </div>
          </div>

          {applicationStats && (
            <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-xl bg-[#F9FAFB] p-4">
                <p className="mb-1 text-sm text-[#6B7280]">Total Applications</p>
                <p className="text-2xl font-bold text-[#1F2937]">
                  {applicationStats.totalApplications || 0}
                </p>
              </div>
              <div className="rounded-xl bg-[#F9FAFB] p-4">
                <p className="mb-1 text-sm text-[#6B7280]">Submitted</p>
                <p className="text-2xl font-bold text-[#1F2937]">
                  {applicationStats.submittedApplications || 0}
                </p>
              </div>
              <div className="rounded-xl bg-[#F9FAFB] p-4">
                <p className="mb-1 text-sm text-[#6B7280]">Under Review</p>
                <p className="text-2xl font-bold text-[#1F2937]">
                  {applicationStats.underReviewApplications || 0}
                </p>
              </div>
              <div className="rounded-xl bg-[#F9FAFB] p-4">
                <p className="mb-1 text-sm text-[#6B7280]">Approved</p>
                <p className="text-2xl font-bold text-[#1F2937]">
                  {applicationStats.approvedApplications || 0}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Filters */}
        <div className="application-review-filters mb-6 flex flex-col gap-4 lg:flex-row">
          <div className="application-review-search-box flex items-center gap-3 rounded-xl border border-[#E5E7EB] bg-white px-4 py-3 lg:min-w-[320px]">
            <FaSearch className="text-[#9CA3AF]" />
            <input
              type="text"
              placeholder="Search by application ID, applicant or phone"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              className="w-full border-none bg-transparent text-sm text-[#1F2937] outline-none"
            />
          </div>

          <div className="flex flex-col gap-4 sm:flex-row">
            <div className="application-review-filter-group flex items-center gap-3 rounded-xl border border-[#E5E7EB] bg-white px-4 py-3">
              <FaFilter className="text-[#6B7280]" />
              <select
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
                className="border-none bg-transparent text-sm text-[#374151] outline-none"
              >
                <option value="">All Status</option>
                <option value="submitted">Submitted</option>
                <option value="under_review">Under Review</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
                <option value="printed">Printed</option>
                <option value="delivered">Delivered</option>
              </select>
            </div>

            <div className="application-review-filter-group flex items-center gap-3 rounded-xl border border-[#E5E7EB] bg-white px-4 py-3">
              <FaFilter className="text-[#6B7280]" />
              <select
                value={typeFilter}
                onChange={(event) => setTypeFilter(event.target.value)}
                className="border-none bg-transparent text-sm text-[#374151] outline-none"
              >
                <option value="">All Types</option>
                <option value="new">New</option>
                <option value="correction">Correction</option>
                <option value="reissue">Reissue</option>
              </select>
            </div>
          </div>
        </div>

        <div className="application-review-content grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
          {/* Applications table */}
          <div className="application-review-table-card rounded-2xl bg-white shadow-[0_4px_12px_rgba(0,0,0,0.06)]">
            <div className="border-b border-[#E5E7EB] px-5 py-4">
              <h3 className="text-lg font-semibold text-[#1F2937]">
                Applications ({filteredApplications.length})
              </h3>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full border-collapse">
                <thead className="bg-[#F9FAFB]">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-[#6B7280]">
                      Application
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-[#6B7280]">
                      Applicant
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-[#6B7280]">
                      Type
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-[#6B7280]">
                      Status
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-[#6B7280]">
                      Created
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-[#6B7280]">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredApplications.length === 0 ? (
                    <tr>
                      <td
                        colSpan="6"
                        className="px-4 py-10 text-center text-sm text-[#9CA3AF]"
                      >
                        No applications found
                      </td>
                    </tr>
                  ) : (
                    filteredApplications.map((app) => (
                      <tr
                        key={app._id}
                        className={`border-t border-[#F3F4F6] transition hover:bg-[#F9FAFB] ${
                          selectedApp?._id === app._id ? 'bg-[#F0FDF4]' : ''
                        }`}
                      >
                        <td className="px-4 py-4 text-sm font-semibold text-[#16A34A]">
                          #{app.applicationId}
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex flex-col">
                            <span className="text-sm font-medium text-[#1F2937]">
                              {app.applicant?.fullName || 'N/A'}
                            </span>
                            <span className="text-xs text-[#6B7280]">
                              {app.applicant?.phone || 'N/A'}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <span className="inline-flex rounded-md bg-[#F3F4F6] px-3 py-1 text-xs font-semibold text-[#374151]">
                            {formatStatus(app.applicationType || 'new')}
                          </span>
                        </td>
                        <td className="px-4 py-4">
                          <span className={`badge badge-${getStatusColor(app.status)}`}>
                            {formatStatus(app.status)}
                          </span>
                        </td>
                        <td className="px-4 py-4 text-sm text-[#6B7280]">
                          {formatDate(app.createdAt)}
                        </td>
                        <td className="px-4 py-4">
                          <button
                            type="button"
                            className="inline-flex items-center justify-center rounded-lg border border-[#D1D5DB] bg-white p-2 text-[#374151] transition hover:bg-[#F9FAFB]"
                            onClick={() => handleSelectApplication(app._id)}
                            title="View details"
                          >
                            <FaEye />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Details panel */}
          <div className="application-review-details-card rounded-2xl bg-white p-6 shadow-[0_4px_12px_rgba(0,0,0,0.06)]">
            {detailsLoading ? (
              <div className="flex min-h-[420px] items-center justify-center">
                <Loader size="medium" text="Loading application details..." />
              </div>
            ) : selectedApp ? (
              <>
                <div className="mb-6 border-b border-[#E5E7EB] pb-5">
                  <div className="mb-4 flex items-start justify-between gap-4">
                    <div>
                      <h2 className="mb-1 text-2xl font-bold text-[#1F2937]">
                        #{selectedApp.applicationId}
                      </h2>
                      <p className="text-sm text-[#6B7280]">
                        Submitted on {formatDateTime(selectedApp.createdAt)}
                      </p>
                    </div>

                    <span className={`badge badge-${getStatusColor(selectedApp.status)}`}>
                      {formatStatus(selectedApp.status)}
                    </span>
                  </div>

                  <div className="grid gap-3 md:grid-cols-2">
                    <div className="rounded-xl bg-[#F9FAFB] p-4">
                      <p className="mb-1 text-sm text-[#6B7280]">Application Type</p>
                      <p className="font-semibold text-[#1F2937]">
                        {formatStatus(selectedApp.applicationType || 'new')}
                      </p>
                    </div>

                    <div className="rounded-xl bg-[#F9FAFB] p-4">
                      <p className="mb-1 text-sm text-[#6B7280]">Applicant</p>
                      <p className="font-semibold text-[#1F2937]">
                        {selectedApp.applicant?.fullName || 'N/A'}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-5">
                  <div className="rounded-2xl border border-[#E5E7EB] bg-[#F9FAFB] p-5">
                    <div className="mb-4 flex items-center gap-2 text-[#1F2937]">
                      <FaUser className="text-[#16A34A]" />
                      <h3 className="text-lg font-semibold">Applicant Information</h3>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                      <div>
                        <p className="text-sm text-[#6B7280]">Full Name</p>
                        <p className="font-semibold text-[#1F2937]">
                          {selectedApp.fullNameEnglish || 'N/A'}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-[#6B7280]">Bangla Name</p>
                        <p className="font-semibold text-[#1F2937]">
                          {selectedApp.fullNameBangla || 'N/A'}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-[#6B7280]">Phone</p>
                        <p className="font-semibold text-[#1F2937]">
                          {selectedApp.phone || selectedApp.applicant?.phone || 'N/A'}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-[#6B7280]">Email</p>
                        <p className="font-semibold text-[#1F2937]">
                          {selectedApp.email || selectedApp.applicant?.email || 'N/A'}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-[#6B7280]">Date of Birth</p>
                        <p className="font-semibold text-[#1F2937]">
                          {selectedApp.dateOfBirth ? formatDate(selectedApp.dateOfBirth) : 'N/A'}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-[#6B7280]">Gender</p>
                        <p className="font-semibold text-[#1F2937]">
                          {formatStatus(selectedApp.gender || 'N/A')}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-[#E5E7EB] bg-[#F9FAFB] p-5">
                    <div className="mb-4 flex items-center gap-2 text-[#1F2937]">
                      <FaIdCard className="text-[#16A34A]" />
                      <h3 className="text-lg font-semibold">Family Information</h3>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                      <div>
                        <p className="text-sm text-[#6B7280]">Father Name</p>
                        <p className="font-semibold text-[#1F2937]">
                          {selectedApp.fatherName || 'N/A'}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-[#6B7280]">Mother Name</p>
                        <p className="font-semibold text-[#1F2937]">
                          {selectedApp.motherName || 'N/A'}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-[#6B7280]">Spouse Name</p>
                        <p className="font-semibold text-[#1F2937]">
                          {selectedApp.spouseName || 'N/A'}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-[#6B7280]">Occupation</p>
                        <p className="font-semibold text-[#1F2937]">
                          {selectedApp.occupation || 'N/A'}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-[#E5E7EB] bg-[#F9FAFB] p-5">
                    <div className="mb-4 flex items-center gap-2 text-[#1F2937]">
                      <FaMapMarkerAlt className="text-[#16A34A]" />
                      <h3 className="text-lg font-semibold">Address Information</h3>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                      <div>
                        <p className="text-sm text-[#6B7280]">Present Address</p>
                        <p className="font-semibold text-[#1F2937]">
                          {[
                            selectedApp.presentAddress?.division,
                            selectedApp.presentAddress?.district,
                            selectedApp.presentAddress?.upazila
                          ]
                            .filter(Boolean)
                            .join(', ') || 'N/A'}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-[#6B7280]">Permanent Address</p>
                        <p className="font-semibold text-[#1F2937]">
                          {[
                            selectedApp.permanentAddress?.division,
                            selectedApp.permanentAddress?.district,
                            selectedApp.permanentAddress?.upazila
                          ]
                            .filter(Boolean)
                            .join(', ') || 'N/A'}
                        </p>
                      </div>
                    </div>
                  </div>

                  {selectedApp.rejectionReason && (
                    <div className="rounded-2xl border border-red-200 bg-red-50 p-5">
                      <div className="mb-2 flex items-center gap-2 text-red-700">
                        <FaExclamationTriangle />
                        <span className="font-semibold">Rejection Reason</span>
                      </div>
                      <p className="text-sm text-red-800">
                        {selectedApp.rejectionReason}
                      </p>
                    </div>
                  )}

                  {canReview && (
                    <div className="flex flex-wrap gap-3 border-t border-[#E5E7EB] pt-2">
                      <button
                        type="button"
                        className="inline-flex items-center gap-2 rounded-lg border border-[#D1D5DB] bg-white px-5 py-3 text-sm font-medium text-[#374151] transition hover:bg-[#F9FAFB] disabled:cursor-not-allowed disabled:opacity-60"
                        onClick={() => handleReviewAction('under_review')}
                        disabled={actionLoading}
                      >
                        {actionLoading ? <FaSpinner className="animate-spin" /> : <FaEye />}
                        <span>Mark Under Review</span>
                      </button>

                      <button
                        type="button"
                        className="inline-flex items-center gap-2 rounded-lg bg-[#16A34A] px-5 py-3 text-sm font-medium text-white transition hover:bg-[#15803D] disabled:cursor-not-allowed disabled:opacity-60"
                        onClick={() => handleReviewAction('approved')}
                        disabled={actionLoading}
                      >
                        {actionLoading ? <FaSpinner className="animate-spin" /> : <FaCheck />}
                        <span>Approve</span>
                      </button>

                      <button
                        type="button"
                        className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-5 py-3 text-sm font-medium text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
                        onClick={() => setShowRejectModal(true)}
                        disabled={actionLoading}
                      >
                        <FaTimes />
                        <span>Reject</span>
                      </button>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="flex min-h-[520px] flex-col items-center justify-center rounded-2xl border border-dashed border-[#E5E7EB] bg-[#F9FAFB] px-6 text-center">
                <FaEye className="mb-4 text-5xl text-[#D1D5DB]" />
                <h3 className="mb-2 text-xl font-semibold text-[#374151]">
                  Select an Application
                </h3>
                <p className="max-w-[420px] text-[#6B7280]">
                  Choose an application from the table to review full details.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Reject modal */}
        {showRejectModal && (
          <div
            className="fixed inset-0 z-[120] flex items-center justify-center bg-black/50 px-4 py-6"
            onClick={() => setShowRejectModal(false)}
          >
            <div
              className="w-full max-w-[520px] rounded-2xl bg-white shadow-[0_18px_40px_rgba(0,0,0,0.16)]"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="border-b border-[#E5E7EB] px-6 py-5">
                <h3 className="text-xl font-semibold text-[#1F2937]">
                  Reject Application
                </h3>
                <p className="mt-1 text-sm text-[#6B7280]">
                  Please provide a clear reason for rejection.
                </p>
              </div>

              <div className="px-6 py-6">
                <label className="mb-2 block text-sm font-medium text-[#374151]">
                  Rejection Reason *
                </label>
                <textarea
                  rows={5}
                  value={rejectionReason}
                  onChange={(event) => setRejectionReason(event.target.value)}
                  placeholder="Write the rejection reason..."
                  className="w-full rounded-lg border border-[#D1D5DB] bg-white px-4 py-3 text-[15px] text-[#111827] outline-none transition focus:border-red-600 focus:ring-4 focus:ring-red-600/10"
                />
              </div>

              <div className="flex flex-col gap-3 border-t border-[#E5E7EB] px-6 py-5 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  className="inline-flex items-center justify-center rounded-lg border border-[#D1D5DB] bg-white px-5 py-3 text-sm font-medium text-[#374151] transition hover:bg-[#F9FAFB]"
                  onClick={() => {
                    setShowRejectModal(false);
                    setRejectionReason('');
                  }}
                >
                  Cancel
                </button>

                <button
                  type="button"
                  className="inline-flex items-center justify-center gap-2 rounded-lg bg-red-600 px-5 py-3 text-sm font-medium text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
                  onClick={() => handleReviewAction('rejected')}
                  disabled={actionLoading || !rejectionReason.trim()}
                >
                  {actionLoading ? <FaSpinner className="animate-spin" /> : <FaTimes />}
                  <span>Confirm Reject</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default ApplicationReview;
// Admin Application Review Page End