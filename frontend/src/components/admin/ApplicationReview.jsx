import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import {
  FaCheck,
  FaChevronLeft,
  FaChevronRight,
  FaClock,
  FaEye,
  FaFileAlt,
  FaFilter,
  FaIdCard,
  FaMapMarkerAlt,
  FaSearch,
  FaSpinner,
  FaTimes,
  FaUndo,
  FaUser
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

const DEFAULT_SORT = '-createdAt';

const getApplicationListFromResponse = (response) =>
  response?.data?.data || response?.data?.applications || [];

const getPaginationMetaFromResponse = (response) =>
  response?.data?.meta || {
    page: 1,
    limit: 10,
    total: 0,
    pages: 1,
    hasPrevPage: false,
    hasNextPage: false
  };

const getApplicationDetailsFromResponse = (response) =>
  response?.data?.application || response?.data?.data || null;

const buildPageNumbers = (currentPage, totalPages) => {
  if (totalPages <= 1) return [1];

  const pages = new Set([1, totalPages, currentPage, currentPage - 1, currentPage + 1]);

  return Array.from(pages)
    .filter((page) => page >= 1 && page <= totalPages)
    .sort((a, b) => a - b);
};

const ApplicationReview = () => {
  const [searchParams, setSearchParams] = useSearchParams();

  const [applications, setApplications] = useState([]);
  const [selectedApp, setSelectedApp] = useState(null);
  const [applicationStats, setApplicationStats] = useState(null);

  const [listLoading, setListLoading] = useState(true);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [statsLoading, setStatsLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const [showActionModal, setShowActionModal] = useState(false);
  const [pendingAction, setPendingAction] = useState('');
  const [decisionNote, setDecisionNote] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');

  const [searchInput, setSearchInput] = useState(searchParams.get('search') || '');

  const queryState = useMemo(() => {
    const pageValue = Number(searchParams.get('page') || 1);

    return {
      page: Number.isFinite(pageValue) && pageValue > 0 ? pageValue : 1,
      status: searchParams.get('status') || '',
      applicationType:
        searchParams.get('applicationType') || searchParams.get('type') || '',
      search: searchParams.get('search') || '',
      sort: searchParams.get('sort') || DEFAULT_SORT,
      selectedId: searchParams.get('id') || ''
    };
  }, [searchParams]);

  const paginationMeta = useMemo(
    () =>
      selectedApp?.__meta || {
        page: 1,
        limit: 10,
        total: applications.length,
        pages: 1,
        hasPrevPage: false,
        hasNextPage: false
      },
    [applications.length, selectedApp]
  );

  const currentMeta = useMemo(() => {
    const appMeta = applications?.__meta;
    if (appMeta) return appMeta;

    return {
      page: 1,
      limit: 10,
      total: applications.length,
      pages: 1,
      hasPrevPage: false,
      hasNextPage: false
    };
  }, [applications]);

  // Keep typing state separate so we do not hit the API on every keypress.
  useEffect(() => {
    setSearchInput(queryState.search);
  }, [queryState.search]);

  const updateQueryParams = useCallback(
    (updates) => {
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);

        Object.entries(updates).forEach(([key, value]) => {
          if (value === null || value === undefined || value === '') {
            next.delete(key);
          } else {
            next.set(key, String(value));
          }
        });

        return next;
      });
    },
    [setSearchParams]
  );

  const fetchApplicationStats = useCallback(async () => {
    try {
      setStatsLoading(true);
      const response = await api.get('/admin/applications/stats');
      setApplicationStats(response?.data?.data || null);
    } catch (error) {
      console.error('Error fetching application stats:', error);
    } finally {
      setStatsLoading(false);
    }
  }, []);

  const fetchApplications = useCallback(async () => {
    try {
      setListLoading(true);

      const query = new URLSearchParams();
      query.set('page', queryState.page);
      query.set('limit', 10);
      query.set('sort', queryState.sort || DEFAULT_SORT);

      if (queryState.status) {
        query.set('status', queryState.status);
      }

      if (queryState.applicationType) {
        query.set('applicationType', queryState.applicationType);
      }

      if (queryState.search) {
        query.set('search', queryState.search);
      }

      const response = await api.get(`/admin/applications?${query.toString()}`);
      const applicationList = getApplicationListFromResponse(response);
      const meta = getPaginationMetaFromResponse(response);

      // We attach meta on the array so the page can read it without another state block.
      applicationList.__meta = meta;

      setApplications(applicationList);

      if (applicationList.length === 0) {
        setSelectedApp(null);

        if (queryState.selectedId) {
          updateQueryParams({ id: null });
        }
      }
    } catch (error) {
      console.error('Error fetching applications:', error);
      toast.error(error?.response?.data?.message || 'Failed to load applications');
    } finally {
      setListLoading(false);
    }
  }, [
    queryState.applicationType,
    queryState.page,
    queryState.search,
    queryState.selectedId,
    queryState.sort,
    queryState.status,
    updateQueryParams
  ]);

  const fetchApplicationDetails = useCallback(async (applicationId) => {
    if (!applicationId) {
      setSelectedApp(null);
      return;
    }

    try {
      setDetailsLoading(true);
      const response = await api.get(`/admin/applications/${applicationId}`);
      const applicationDetails = getApplicationDetailsFromResponse(response);
      setSelectedApp(applicationDetails);
    } catch (error) {
      console.error('Error fetching application details:', error);
      toast.error(error?.response?.data?.message || 'Failed to load application details');
    } finally {
      setDetailsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchApplications();
  }, [fetchApplications]);

  useEffect(() => {
    fetchApplicationStats();
  }, [fetchApplicationStats]);

  // When no selected application exists, auto-pick the first item from the current page.
  useEffect(() => {
    if (!listLoading && applications.length > 0 && !queryState.selectedId) {
      updateQueryParams({ id: applications[0]._id });
    }
  }, [applications, listLoading, queryState.selectedId, updateQueryParams]);

  useEffect(() => {
    if (queryState.selectedId) {
      fetchApplicationDetails(queryState.selectedId);
    }
  }, [fetchApplicationDetails, queryState.selectedId]);

  const pageNumbers = useMemo(
    () => buildPageNumbers(currentMeta.page || 1, currentMeta.pages || 1),
    [currentMeta.page, currentMeta.pages]
  );

  const statsCards = useMemo(() => {
    return [
      {
        key: 'total',
        title: 'Total Applications',
        value: applicationStats?.totalApplications || 0,
        theme: 'neutral'
      },
      {
        key: 'submitted',
        title: 'Submitted',
        value: applicationStats?.submittedApplications || 0,
        theme: 'blue'
      },
      {
        key: 'review',
        title: 'Under Review',
        value: applicationStats?.underReviewApplications || 0,
        theme: 'yellow'
      },
      {
        key: 'approved',
        title: 'Approved',
        value: applicationStats?.approvedApplications || 0,
        theme: 'green'
      }
    ];
  }, [applicationStats]);

  const canApprove =
    selectedApp && ['submitted', 'under_review'].includes(selectedApp.status);

  const canReject =
    selectedApp && ['submitted', 'under_review'].includes(selectedApp.status);

  const canReopen =
    selectedApp && selectedApp.status === 'rejected';

  const openActionModal = (actionType) => {
    setPendingAction(actionType);
    setDecisionNote('');
    setRejectionReason(selectedApp?.rejectionReason || '');
    setShowActionModal(true);
  };

  const closeActionModal = () => {
    if (actionLoading) return;
    setShowActionModal(false);
    setPendingAction('');
    setDecisionNote('');
    setRejectionReason('');
  };

  const getActionModalText = () => {
    if (pendingAction === 'approved') {
      return {
        title: 'Approve Application',
        description: 'Add a short approval note for traceability.',
        confirmText: 'Confirm Approve',
        confirmClass: 'approve'
      };
    }

    if (pendingAction === 'under_review') {
      return {
        title: 'Move to Under Review',
        description: 'Add a note so future admins understand why it was reopened.',
        confirmText: 'Confirm Review',
        confirmClass: 'review'
      };
    }

    return {
      title: 'Reject Application',
      description: 'A clear rejection reason is required before continuing.',
      confirmText: 'Confirm Reject',
      confirmClass: 'reject'
    };
  };

  const handleSelectApplication = (applicationId) => {
    updateQueryParams({ id: applicationId });
  };

  const handleSearchSubmit = (event) => {
    event.preventDefault();

    updateQueryParams({
      search: searchInput.trim() || null,
      page: 1,
      id: null
    });
  };

  const handleClearFilters = () => {
    setSearchInput('');

    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.delete('page');
      next.delete('status');
      next.delete('applicationType');
      next.delete('type');
      next.delete('search');
      next.delete('sort');
      next.delete('id');
      return next;
    });
  };

  const handleFilterChange = (key, value) => {
    updateQueryParams({
      [key]: value || null,
      page: 1,
      id: null
    });
  };

  const handlePageChange = (nextPage) => {
    if (nextPage < 1 || nextPage > (currentMeta.pages || 1)) return;

    updateQueryParams({
      page: nextPage,
      id: null
    });
  };

  const handleReviewAction = async () => {
    if (!selectedApp?._id || !pendingAction) return;

    if (pendingAction === 'rejected' && !rejectionReason.trim()) {
      toast.error('Please provide a rejection reason');
      return;
    }

    setActionLoading(true);

    try {
      const payload = {
        status: pendingAction,
        decisionNote: decisionNote.trim(),
        rejectionReason: pendingAction === 'rejected' ? rejectionReason.trim() : ''
      };

      await api.patch(`/admin/applications/${selectedApp._id}/review`, payload);

      toast.success(`Application ${formatStatus(pendingAction)} successfully`);

      closeActionModal();
      await Promise.all([fetchApplications(), fetchApplicationStats()]);
      await fetchApplicationDetails(selectedApp._id);
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Failed to update application');
    } finally {
      setActionLoading(false);
    }
  };

  const statusHistory = selectedApp?.statusHistory || [];

  const actionModalText = getActionModalText();

  return (
    <AdminLayout>
      <div className="application-review-page-wrapper">
        {/* Page header */}
        <div className="application-review-header-panel">
          <div className="application-review-header-top">
            <div>
              <h1 className="application-review-title">Application Review</h1>
              <p className="application-review-subtitle">
                Review, verify and control citizen applications with a paginated admin workflow.
              </p>
            </div>
          </div>

          <div className="application-review-stats-grid">
            {statsCards.map((item) => (
              <div
                key={item.key}
                className={`application-review-stat-card application-review-stat-${item.theme}`}
              >
                <p>{item.title}</p>
                <h3>{statsLoading ? '...' : item.value}</h3>
              </div>
            ))}
          </div>
        </div>

        {/* Filters */}
        <div className="application-review-toolbar">
          <form className="application-review-search-form" onSubmit={handleSearchSubmit}>
            <div className="application-review-search-box">
              <FaSearch className="application-review-field-icon" />
              <input
                type="text"
                placeholder="Search by application ID, name, phone, BRN or NID"
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
              />
            </div>

            <button type="submit" className="application-review-toolbar-button primary">
              Search
            </button>

            <button
              type="button"
              className="application-review-toolbar-button secondary"
              onClick={handleClearFilters}
            >
              Clear
            </button>
          </form>

          <div className="application-review-filter-row">
            <div className="application-review-filter-group">
              <FaFilter className="application-review-field-icon" />
              <select
                value={queryState.status}
                onChange={(event) => handleFilterChange('status', event.target.value)}
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

            <div className="application-review-filter-group">
              <FaFilter className="application-review-field-icon" />
              <select
                value={queryState.applicationType}
                onChange={(event) => handleFilterChange('applicationType', event.target.value)}
              >
                <option value="">All Types</option>
                <option value="new">New</option>
                <option value="correction">Correction</option>
                <option value="reissue">Reissue</option>
              </select>
            </div>

            <div className="application-review-filter-group">
              <FaFilter className="application-review-field-icon" />
              <select
                value={queryState.sort}
                onChange={(event) => handleFilterChange('sort', event.target.value)}
              >
                <option value="-createdAt">Newest First</option>
                <option value="createdAt">Oldest First</option>
                <option value="-updatedAt">Recently Updated</option>
                <option value="status">Status A-Z</option>
                <option value="-status">Status Z-A</option>
              </select>
            </div>
          </div>
        </div>

        <div className="application-review-content">
          {/* Applications list */}
          <div className="application-review-table-card">
            <div className="application-review-card-header">
              <div>
                <h3>Applications</h3>
                <p>
                  Page {currentMeta.page || 1} of {currentMeta.pages || 1} · Total{' '}
                  {currentMeta.total || 0}
                </p>
              </div>
            </div>

            {listLoading ? (
              <div className="application-review-loading-state">
                <Loader size="medium" text="Loading applications..." />
              </div>
            ) : (
              <>
                <div className="application-review-table-wrap">
                  <table className="application-review-table">
                    <thead>
                      <tr>
                        <th>Application</th>
                        <th>Applicant</th>
                        <th>Type</th>
                        <th>Status</th>
                        <th>Created</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {applications.length === 0 ? (
                        <tr>
                          <td colSpan="6" className="application-review-empty-cell">
                            No applications found for the current filter
                          </td>
                        </tr>
                      ) : (
                        applications.map((app) => (
                          <tr
                            key={app._id}
                            className={
                              selectedApp?._id === app._id
                                ? 'application-review-row active'
                                : 'application-review-row'
                            }
                          >
                            <td>
                              <div className="application-review-primary-text">
                                #{app.applicationId || app._id?.slice(-6)}
                              </div>
                            </td>
                            <td>
                              <div className="application-review-user-cell">
                                <span>{app.applicant?.fullName || app.fullNameEnglish || 'N/A'}</span>
                                <small>{app.phone || app.applicant?.phone || 'N/A'}</small>
                              </div>
                            </td>
                            <td>
                              <span className="application-review-type-chip">
                                {formatStatus(app.applicationType || 'new')}
                              </span>
                            </td>
                            <td>
                              <span
                                className={`badge badge-${getStatusColor(app.status)}`}
                              >
                                {formatStatus(app.status)}
                              </span>
                            </td>
                            <td>{formatDate(app.createdAt)}</td>
                            <td>
                              <button
                                type="button"
                                className="application-review-icon-button"
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

                <div className="application-review-pagination">
                  <button
                    type="button"
                    className="application-review-page-nav"
                    onClick={() => handlePageChange((currentMeta.page || 1) - 1)}
                    disabled={!currentMeta.hasPrevPage}
                  >
                    <FaChevronLeft />
                    <span>Prev</span>
                  </button>

                  <div className="application-review-page-numbers">
                    {pageNumbers.map((pageNumber) => (
                      <button
                        key={pageNumber}
                        type="button"
                        className={
                          pageNumber === (currentMeta.page || 1)
                            ? 'application-review-page-number active'
                            : 'application-review-page-number'
                        }
                        onClick={() => handlePageChange(pageNumber)}
                      >
                        {pageNumber}
                      </button>
                    ))}
                  </div>

                  <button
                    type="button"
                    className="application-review-page-nav"
                    onClick={() => handlePageChange((currentMeta.page || 1) + 1)}
                    disabled={!currentMeta.hasNextPage}
                  >
                    <span>Next</span>
                    <FaChevronRight />
                  </button>
                </div>
              </>
            )}
          </div>

          {/* Details panel */}
          <div className="application-review-details-card">
            {detailsLoading ? (
              <div className="application-review-loading-state large">
                <Loader size="medium" text="Loading application details..." />
              </div>
            ) : selectedApp ? (
              <>
                <div className="application-review-details-header">
                  <div>
                    <h2>#{selectedApp.applicationId || selectedApp._id?.slice(-6)}</h2>
                    <p>
                      Submitted on {selectedApp.createdAt ? formatDateTime(selectedApp.createdAt) : 'N/A'}
                    </p>
                  </div>

                  <span className={`badge badge-${getStatusColor(selectedApp.status)}`}>
                    {formatStatus(selectedApp.status)}
                  </span>
                </div>

                <div className="application-review-summary-grid">
                  <div className="application-review-summary-card">
                    <p>Application Type</p>
                    <h4>{formatStatus(selectedApp.applicationType || 'new')}</h4>
                  </div>

                  <div className="application-review-summary-card">
                    <p>Applicant</p>
                    <h4>{selectedApp.applicant?.fullName || selectedApp.fullNameEnglish || 'N/A'}</h4>
                  </div>
                </div>

                <div className="application-review-section-card">
                  <div className="application-review-section-title">
                    <FaUser className="application-review-section-icon" />
                    <h3>Applicant Information</h3>
                  </div>

                  <div className="application-review-detail-grid">
                    <div>
                      <p>Full Name</p>
                      <h4>{selectedApp.fullNameEnglish || 'N/A'}</h4>
                    </div>
                    <div>
                      <p>Bangla Name</p>
                      <h4>{selectedApp.fullNameBangla || 'N/A'}</h4>
                    </div>
                    <div>
                      <p>Phone</p>
                      <h4>{selectedApp.phone || selectedApp.applicant?.phone || 'N/A'}</h4>
                    </div>
                    <div>
                      <p>Email</p>
                      <h4>{selectedApp.email || selectedApp.applicant?.email || 'N/A'}</h4>
                    </div>
                    <div>
                      <p>Date of Birth</p>
                      <h4>
                        {selectedApp.dateOfBirth ? formatDate(selectedApp.dateOfBirth) : 'N/A'}
                      </h4>
                    </div>
                    <div>
                      <p>Gender</p>
                      <h4>{formatStatus(selectedApp.gender || 'N/A')}</h4>
                    </div>
                  </div>
                </div>

                <div className="application-review-section-card">
                  <div className="application-review-section-title">
                    <FaIdCard className="application-review-section-icon" />
                    <h3>Family Information</h3>
                  </div>

                  <div className="application-review-detail-grid">
                    <div>
                      <p>Father Name</p>
                      <h4>{selectedApp.fatherName || 'N/A'}</h4>
                    </div>
                    <div>
                      <p>Mother Name</p>
                      <h4>{selectedApp.motherName || 'N/A'}</h4>
                    </div>
                    <div>
                      <p>Spouse Name</p>
                      <h4>{selectedApp.spouseName || 'N/A'}</h4>
                    </div>
                    <div>
                      <p>Occupation</p>
                      <h4>{selectedApp.occupation || 'N/A'}</h4>
                    </div>
                  </div>
                </div>

                <div className="application-review-section-card">
                  <div className="application-review-section-title">
                    <FaMapMarkerAlt className="application-review-section-icon" />
                    <h3>Address Information</h3>
                  </div>

                  <div className="application-review-detail-grid">
                    <div>
                      <p>Present Address</p>
                      <h4>
                        {[
                          selectedApp.presentAddress?.division,
                          selectedApp.presentAddress?.district,
                          selectedApp.presentAddress?.upazila,
                          selectedApp.presentAddress?.unionOrWard,
                          selectedApp.presentAddress?.villageOrArea
                        ]
                          .filter(Boolean)
                          .join(', ') || 'N/A'}
                      </h4>
                    </div>
                    <div>
                      <p>Permanent Address</p>
                      <h4>
                        {[
                          selectedApp.permanentAddress?.division,
                          selectedApp.permanentAddress?.district,
                          selectedApp.permanentAddress?.upazila,
                          selectedApp.permanentAddress?.unionOrWard,
                          selectedApp.permanentAddress?.villageOrArea
                        ]
                          .filter(Boolean)
                          .join(', ') || 'N/A'}
                      </h4>
                    </div>
                  </div>
                </div>

                {selectedApp.rejectionReason ? (
                  <div className="application-review-alert-card">
                    <p>Current Rejection Reason</p>
                    <h4>{selectedApp.rejectionReason}</h4>
                  </div>
                ) : null}

                <div className="application-review-section-card">
                  <div className="application-review-section-title">
                    <FaClock className="application-review-section-icon" />
                    <h3>Status History</h3>
                  </div>

                  {statusHistory.length === 0 ? (
                    <div className="application-review-history-empty">
                      No status history found yet
                    </div>
                  ) : (
                    <div className="application-review-history-list">
                      {[...statusHistory]
                        .slice()
                        .reverse()
                        .map((historyItem, index) => (
                          <div key={`${historyItem.changedAt}-${index}`} className="application-review-history-item">
                            <div className="application-review-history-dot" />
                            <div className="application-review-history-content">
                              <div className="application-review-history-top">
                                <span>
                                  {historyItem.fromStatus
                                    ? `${formatStatus(historyItem.fromStatus)} → ${formatStatus(historyItem.toStatus)}`
                                    : formatStatus(historyItem.toStatus)}
                                </span>
                                <small>
                                  {historyItem.changedAt
                                    ? formatDateTime(historyItem.changedAt)
                                    : 'N/A'}
                                </small>
                              </div>

                              <p>
                                {historyItem.reason || historyItem.note || 'No reason added'}
                              </p>

                              <div className="application-review-history-meta">
                                <span>
                                  By: {historyItem.changedByRole
                                    ? formatStatus(historyItem.changedByRole)
                                    : 'System'}
                                </span>
                                {historyItem.requestId ? (
                                  <span>Request: {historyItem.requestId}</span>
                                ) : null}
                              </div>
                            </div>
                          </div>
                        ))}
                    </div>
                  )}
                </div>

                <div className="application-review-action-row">
                  {canReopen ? (
                    <button
                      type="button"
                      className="application-review-action-button neutral"
                      onClick={() => openActionModal('under_review')}
                      disabled={actionLoading}
                    >
                      <FaUndo />
                      <span>Reopen for Review</span>
                    </button>
                  ) : null}

                  {canApprove ? (
                    <button
                      type="button"
                      className="application-review-action-button approve"
                      onClick={() => openActionModal('approved')}
                      disabled={actionLoading}
                    >
                      <FaCheck />
                      <span>Approve</span>
                    </button>
                  ) : null}

                  {canReject ? (
                    <button
                      type="button"
                      className="application-review-action-button reject"
                      onClick={() => openActionModal('rejected')}
                      disabled={actionLoading}
                    >
                      <FaTimes />
                      <span>Reject</span>
                    </button>
                  ) : null}
                </div>
              </>
            ) : (
              <div className="application-review-empty-details">
                <FaFileAlt className="application-review-empty-icon" />
                <h3>Select an Application</h3>
                <p>Choose an application from the left table to review full details.</p>
              </div>
            )}
          </div>
        </div>

        {/* Action modal */}
        {showActionModal ? (
          <div className="application-review-modal-backdrop" onClick={closeActionModal}>
            <div
              className="application-review-modal-card"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="application-review-modal-header">
                <h3>{actionModalText.title}</h3>
                <p>{actionModalText.description}</p>
              </div>

              <div className="application-review-modal-body">
                <div className="application-review-modal-field">
                  <label>Decision Note</label>
                  <textarea
                    rows={4}
                    value={decisionNote}
                    onChange={(event) => setDecisionNote(event.target.value)}
                    placeholder="Write a short admin note for audit trail..."
                  />
                </div>

                {pendingAction === 'rejected' ? (
                  <div className="application-review-modal-field">
                    <label>Rejection Reason *</label>
                    <textarea
                      rows={5}
                      value={rejectionReason}
                      onChange={(event) => setRejectionReason(event.target.value)}
                      placeholder="Write the rejection reason..."
                    />
                  </div>
                ) : null}
              </div>

              <div className="application-review-modal-footer">
                <button
                  type="button"
                  className="application-review-toolbar-button secondary"
                  onClick={closeActionModal}
                  disabled={actionLoading}
                >
                  Cancel
                </button>

                <button
                  type="button"
                  className={`application-review-toolbar-button ${actionModalText.confirmClass}`}
                  onClick={handleReviewAction}
                  disabled={
                    actionLoading ||
                    (pendingAction === 'rejected' && !rejectionReason.trim())
                  }
                >
                  {actionLoading ? <FaSpinner className="spin" /> : null}
                  <span>{actionModalText.confirmText}</span>
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </AdminLayout>
  );
};

export default ApplicationReview;