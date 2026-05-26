import React, { useEffect, useMemo, useState } from 'react';
import { toast } from 'react-toastify';
import {
  FaCheckSquare,
  FaPrint,
  FaRegSquare,
  FaSearch,
  FaSpinner,
  FaTruck,
  FaFileAlt,
  FaCheckCircle,
  FaClock,
  FaLayerGroup
} from 'react-icons/fa';
import api from '../api/axios';
import AdminLayout from './AdminLayout';
import Loader from '../common/Loader';
import { formatDate, formatDateTime, formatStatus } from '../utils/helpers';
import '../styles/PrintingQueue.css';

const PRINT_QUEUE_STATUSES = ['approved', 'printed'];

const getApplicationsFromResponse = (response) => {
  const payload = response?.data;

  if (Array.isArray(payload?.applications)) return payload.applications;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.data?.applications)) return payload.data.applications;
  if (Array.isArray(payload)) return payload;

  return [];
};

const normalizeText = (value) =>
  String(value ?? '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();

const normalizeStatus = (status) => normalizeText(status).replace(/\s+/g, '_');

const buildPrintingSearchText = (application) =>
  normalizeText(
    [
      application?.applicationId,
      application?.fullNameEnglish,
      application?.fullNameBangla,
      application?.email,
      application?.phone,
      application?.applicationType,
      application?.status,
      application?.birthRegistrationNumber,
      application?.existingNidNumber,
      application?.applicant?.fullName,
      application?.applicant?.email,
      application?.applicant?.phone
    ]
      .filter(Boolean)
      .join(' ')
  );

const getStatusClass = (status) => {
  const value = normalizeStatus(status);

  if (value === 'approved') return 'approved';
  if (value === 'printed') return 'printed';
  if (value === 'delivered' || value === 'dispatched') return 'delivered';
  return 'neutral';
};

const getApplicantName = (application) =>
  application?.fullNameEnglish ||
  application?.applicant?.fullName ||
  application?.fullNameBangla ||
  'Unknown applicant';

const getSubmittedDate = (application) =>
  application?.submittedAt || application?.approvedAt || application?.createdAt;

const getLastUpdatedDate = (application) =>
  application?.printedAt ||
  application?.latestStatusChangedAt ||
  application?.updatedAt ||
  application?.createdAt;

const getQueueAge = (application) => {
  const baseDate = new Date(application?.approvedAt || application?.submittedAt || application?.createdAt);
  if (Number.isNaN(baseDate.getTime())) return '—';

  const diff = Date.now() - baseDate.getTime();
  const days = Math.max(0, Math.floor(diff / 86400000));

  if (days === 0) return 'Today';
  if (days === 1) return '1 day';
  return `${days} days`;
};

const buildComputedStats = (applications) => {
  const today = new Date().toDateString();

  return {
    approvedForPrint: applications.filter((item) => item.status === 'approved').length,
    printedCount: applications.filter((item) => item.status === 'printed').length,
    deliveredAfterPrint: applications.filter((item) => ['dispatched', 'delivered'].includes(item.status)).length,
    printedToday: applications.filter((item) => {
      if (!item.printedAt) return false;
      const printedDate = new Date(item.printedAt);
      return !Number.isNaN(printedDate.getTime()) && printedDate.toDateString() === today;
    }).length
  };
};

const PrintingQueue = () => {
  const [applications, setApplications] = useState([]);
  const [selectedApplication, setSelectedApplication] = useState(null);
  const [selectedIds, setSelectedIds] = useState([]);
  const [stats, setStats] = useState(null);

  const [loading, setLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const [searchInput, setSearchInput] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');

  const loadApplicationFallback = async () => {
    const response = await api.get('/admin/applications', {
      params: {
        page: 1,
        limit: 100,
        sort: '-updatedAt'
      }
    });

    const rows = getApplicationsFromResponse(response);

    return rows.filter((item) => PRINT_QUEUE_STATUSES.includes(normalizeStatus(item?.status)));
  };

  const fetchApplications = async () => {
    try {
      setLoading(true);

      let rows = [];
      let usedFallback = false;

      try {
        const response = await api.get('/admin/printing/queue');
        rows = getApplicationsFromResponse(response);
      } catch (queueError) {
        usedFallback = true;
        rows = await loadApplicationFallback();
      }

      const normalizedRows = rows
        .filter((item) => PRINT_QUEUE_STATUSES.includes(normalizeStatus(item?.status)))
        .sort((a, b) => {
          const aStatus = normalizeStatus(a?.status) === 'approved' ? 0 : 1;
          const bStatus = normalizeStatus(b?.status) === 'approved' ? 0 : 1;
          if (aStatus !== bStatus) return aStatus - bStatus;

          const aDate = new Date(getLastUpdatedDate(a)).getTime() || 0;
          const bDate = new Date(getLastUpdatedDate(b)).getTime() || 0;
          return bDate - aDate;
        });

      setApplications(normalizedRows);

      setSelectedApplication((currentSelected) => {
        if (!normalizedRows.length) return null;
        if (!currentSelected) return normalizedRows[0];

        const stillExists = normalizedRows.find((item) => item._id === currentSelected._id);
        return stillExists || normalizedRows[0];
      });

      setSelectedIds((currentIds) =>
        currentIds.filter((id) =>
          normalizedRows.some((item) => item._id === id && normalizeStatus(item.status) === 'approved')
        )
      );

      if (usedFallback) {
        setStats((currentStats) => currentStats || buildComputedStats(normalizedRows));
      }
    } catch (error) {
      console.error('Error fetching printing queue:', error);
      toast.error(error?.response?.data?.message || 'Failed to load printing queue');
      setApplications([]);
      setSelectedApplication(null);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      setStatsLoading(true);
      const response = await api.get('/admin/printing/stats');
      setStats(response?.data?.data || response?.data || null);
    } catch (error) {
      console.error('Error fetching printing stats:', error);
      setStats((currentStats) => currentStats || buildComputedStats(applications));
    } finally {
      setStatsLoading(false);
    }
  };

  useEffect(() => {
    fetchApplications();
    fetchStats();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!stats || statsLoading) {
      return;
    }

    const hasUsefulStats = [
      stats?.approvedForPrint,
      stats?.printedCount,
      stats?.deliveredAfterPrint,
      stats?.printedToday
    ].some((value) => Number(value) > 0);

    if (!hasUsefulStats && applications.length) {
      setStats(buildComputedStats(applications));
    }
  }, [applications, stats, statsLoading]);

  const visibleApplications = useMemo(() => {
    const normalizedSearch = normalizeText(searchInput);
    const searchTokens = normalizedSearch.split(' ').filter(Boolean);

    return applications.filter((item) => {
      const searchableText = buildPrintingSearchText(item);
      const normalizedItemStatus = normalizeStatus(item.status);

      const matchesSearch =
        searchTokens.length === 0 || searchTokens.every((token) => searchableText.includes(token));

      const matchesStatus = !statusFilter || normalizedItemStatus === statusFilter;
      const matchesType = !typeFilter || normalizeStatus(item.applicationType) === typeFilter;

      return matchesSearch && matchesStatus && matchesType;
    });
  }, [applications, searchInput, statusFilter, typeFilter]);

  useEffect(() => {
    if (!visibleApplications.length) {
      setSelectedApplication(null);
      return;
    }

    setSelectedApplication((currentSelected) => {
      if (!currentSelected) return visibleApplications[0];

      const stillExists = visibleApplications.find((item) => item._id === currentSelected._id);
      return stillExists || visibleApplications[0];
    });
  }, [visibleApplications]);

  const selectedApprovedIds = useMemo(() => {
    return selectedIds.filter((id) =>
      applications.some((item) => item._id === id && normalizeStatus(item.status) === 'approved')
    );
  }, [selectedIds, applications]);

  const allVisibleApprovedIds = useMemo(() => {
    return visibleApplications
      .filter((item) => normalizeStatus(item.status) === 'approved')
      .map((item) => item._id);
  }, [visibleApplications]);

  const statsCards = useMemo(() => {
    const safeStats = stats || buildComputedStats(applications);

    return [
      {
        key: 'approved',
        title: 'Approved For Print',
        value: statsLoading ? '...' : safeStats?.approvedForPrint ?? 0,
        theme: 'yellow',
        icon: <FaFileAlt />
      },
      {
        key: 'printed',
        title: 'Printed',
        value: statsLoading ? '...' : safeStats?.printedCount ?? 0,
        theme: 'blue',
        icon: <FaPrint />
      },
      {
        key: 'delivered',
        title: 'Delivered After Print',
        value: statsLoading ? '...' : safeStats?.deliveredAfterPrint ?? 0,
        theme: 'green',
        icon: <FaTruck />
      },
      {
        key: 'today',
        title: 'Printed Today',
        value: statsLoading ? '...' : safeStats?.printedToday ?? 0,
        theme: 'purple',
        icon: <FaCheckCircle />
      }
    ];
  }, [stats, statsLoading, applications]);

  const toggleApplicationSelect = (applicationId) => {
    setSelectedIds((currentIds) =>
      currentIds.includes(applicationId)
        ? currentIds.filter((id) => id !== applicationId)
        : [...currentIds, applicationId]
    );
  };

  const toggleSelectAllVisibleApproved = () => {
    const alreadyAllSelected =
      allVisibleApprovedIds.length > 0 && allVisibleApprovedIds.every((id) => selectedIds.includes(id));

    if (alreadyAllSelected) {
      setSelectedIds((currentIds) => currentIds.filter((id) => !allVisibleApprovedIds.includes(id)));
      return;
    }

    setSelectedIds((currentIds) => [...new Set([...currentIds, ...allVisibleApprovedIds])]);
  };

  const clearFilters = () => {
    setSearchInput('');
    setStatusFilter('');
    setTypeFilter('');
  };

  const refreshAfterPrintAction = async () => {
    await Promise.all([fetchApplications(), fetchStats()]);
  };

  const markIdsAsPrinted = async (applicationIds) => {
    if (!applicationIds.length) return;

    await api.patch('/admin/printing/bulk-mark-printed', {
      applicationIds,
      actionNote: 'Marked printed from Printing Queue'
    });
  };

  const handleSingleMarkPrinted = async () => {
    if (!selectedApplication?._id) return;

    if (normalizeStatus(selectedApplication.status) !== 'approved') {
      toast.error('Only approved applications can be marked as printed');
      return;
    }

    try {
      setActionLoading(true);
      await markIdsAsPrinted([selectedApplication._id]);
      toast.success('Application marked as printed');
      setSelectedIds((currentIds) => currentIds.filter((id) => id !== selectedApplication._id));
      await refreshAfterPrintAction();
    } catch (error) {
      console.error('Error marking application as printed:', error);
      toast.error(error?.response?.data?.message || 'Failed to mark as printed');
    } finally {
      setActionLoading(false);
    }
  };

  const handleBulkMarkPrinted = async () => {
    if (!selectedApprovedIds.length) {
      toast.error('Select at least one approved application');
      return;
    }

    try {
      setActionLoading(true);
      await markIdsAsPrinted(selectedApprovedIds);
      toast.success('Selected applications marked as printed');
      setSelectedIds([]);
      await refreshAfterPrintAction();
    } catch (error) {
      console.error('Error running bulk print action:', error);
      toast.error(error?.response?.data?.message || 'Failed to run bulk print action');
    } finally {
      setActionLoading(false);
    }
  };

  const selectedHistory = selectedApplication?.statusHistory || [];

  if (loading) {
    return (
      <AdminLayout>
        <div className="printing-queue-loading-state">
          <Loader size="large" text="Loading printing queue..." />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="printing-queue-page">
        <div className="printing-queue-header-card">
          <div className="printing-queue-header-top">
            <div>
              <h1 className="printing-queue-title">Printing Queue</h1>
              <p className="printing-queue-subtitle">
                Control approved applications and move them into secure print workflow.
              </p>
            </div>

            <button
              type="button"
              className="printing-queue-primary-button"
              onClick={handleBulkMarkPrinted}
              disabled={!selectedApprovedIds.length || actionLoading}
            >
              {actionLoading ? <FaSpinner className="printing-queue-spin" /> : <FaPrint />}
              <span>Bulk Mark Printed ({selectedApprovedIds.length})</span>
            </button>
          </div>

          <div className="printing-queue-stats-grid">
            {statsCards.map((item) => (
              <div key={item.key} className={`printing-queue-stat-card ${item.theme}`}>
                <div className="printing-queue-stat-icon">{item.icon}</div>
                <div>
                  <p>{item.title}</p>
                  <h3>{item.value}</h3>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="printing-queue-toolbar-card">
          <div className="printing-queue-search-row">
            <div className="printing-queue-search-box">
              <FaSearch />
              <input
                type="text"
                placeholder="Search by application ID, name, email, phone or BRN"
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
              />
            </div>
          </div>

          <div className="printing-queue-filter-row">
            <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
              <option value="">All Status</option>
              <option value="approved">Approved</option>
              <option value="printed">Printed</option>
            </select>

            <select value={typeFilter} onChange={(event) => setTypeFilter(event.target.value)}>
              <option value="">All Types</option>
              <option value="new">New</option>
              <option value="correction">Correction</option>
              <option value="reissue">Reissue</option>
            </select>

            <button
              type="button"
              className="printing-queue-secondary-button"
              onClick={toggleSelectAllVisibleApproved}
              disabled={!allVisibleApprovedIds.length}
            >
              {allVisibleApprovedIds.length > 0 && allVisibleApprovedIds.every((id) => selectedIds.includes(id)) ? (
                <FaCheckSquare />
              ) : (
                <FaRegSquare />
              )}
              <span>Select Visible Approved</span>
            </button>

            <button type="button" className="printing-queue-secondary-button" onClick={clearFilters}>
              Clear Filters
            </button>
          </div>
        </div>

        <div className="printing-queue-workspace-grid">
          <section className="printing-queue-list-card">
            <div className="printing-queue-card-header">
              <div>
                <h2>Approved and Printed Applications</h2>
                <p>{visibleApplications.length} applications found</p>
              </div>
            </div>

            <div className="printing-queue-list">
              {visibleApplications.length === 0 ? (
                <div className="printing-queue-empty-state compact">
                  <FaPrint />
                  <h3>No applications found</h3>
                  <p>Try changing your search or filter selection.</p>
                </div>
              ) : (
                visibleApplications.map((application) => {
                  const status = normalizeStatus(application.status);
                  const isApproved = status === 'approved';
                  const isSelected = selectedIds.includes(application._id);
                  const isActive = selectedApplication?._id === application._id;

                  return (
                    <button
                      key={application._id}
                      type="button"
                      className={`printing-queue-list-item ${isActive ? 'active' : ''}`}
                      onClick={() => setSelectedApplication(application)}
                    >
                      <div className="printing-queue-list-main">
                        <div className="printing-queue-check-column">
                          <span
                            role="button"
                            tabIndex={0}
                            className={`printing-queue-check ${isSelected ? 'checked' : ''} ${!isApproved ? 'disabled' : ''}`}
                            onClick={(event) => {
                              event.stopPropagation();
                              if (isApproved) toggleApplicationSelect(application._id);
                            }}
                            onKeyDown={(event) => {
                              if ((event.key === 'Enter' || event.key === ' ') && isApproved) {
                                event.preventDefault();
                                event.stopPropagation();
                                toggleApplicationSelect(application._id);
                              }
                            }}
                            aria-label={isApproved ? 'Select application' : 'Printed application'}
                          >
                            {isSelected ? <FaCheckSquare /> : <FaRegSquare />}
                          </span>
                        </div>

                        <div className="printing-queue-list-content">
                          <div className="printing-queue-list-top">
                            <div>
                              <h3>{application.applicationId || application._id}</h3>
                              <p>{getApplicantName(application)}</p>
                            </div>
                            <span className={`printing-queue-status-badge ${getStatusClass(application.status)}`}>
                              {formatStatus(application.status) || 'Unknown'}
                            </span>
                          </div>

                          <div className="printing-queue-list-meta">
                            <span>{formatStatus(application.applicationType) || 'New'}</span>
                            <span>{application.phone || 'No phone'}</span>
                            <span>{getQueueAge(application)}</span>
                          </div>
                        </div>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </section>

          <section className="printing-queue-details-card">
            {selectedApplication ? (
              <>
                <div className="printing-queue-details-header">
                  <div>
                    <h2>{selectedApplication.applicationId || selectedApplication._id}</h2>
                    <p>{getApplicantName(selectedApplication)}</p>
                  </div>
                  <span className={`printing-queue-status-badge ${getStatusClass(selectedApplication.status)}`}>
                    {formatStatus(selectedApplication.status) || 'Unknown'}
                  </span>
                </div>

                <div className="printing-queue-details-grid">
                  <div className="printing-queue-detail-box">
                    <span>Application Type</span>
                    <strong>{formatStatus(selectedApplication.applicationType) || 'New'}</strong>
                  </div>
                  <div className="printing-queue-detail-box">
                    <span>Submitted</span>
                    <strong>{formatDate(getSubmittedDate(selectedApplication)) || 'Not recorded'}</strong>
                  </div>
                  <div className="printing-queue-detail-box">
                    <span>Queue Age</span>
                    <strong>{getQueueAge(selectedApplication)}</strong>
                  </div>
                  <div className="printing-queue-detail-box">
                    <span>Last Updated</span>
                    <strong>{formatDateTime(getLastUpdatedDate(selectedApplication)) || 'Not recorded'}</strong>
                  </div>
                </div>

                <div className="printing-queue-info-panel">
                  <div className="printing-queue-info-title">
                    <FaLayerGroup />
                    <h3>Applicant Information</h3>
                  </div>
                  <div className="printing-queue-info-grid">
                    <div>
                      <span>Name</span>
                      <strong>{getApplicantName(selectedApplication)}</strong>
                    </div>
                    <div>
                      <span>Phone</span>
                      <strong>{selectedApplication.phone || selectedApplication.applicant?.phone || 'Not recorded'}</strong>
                    </div>
                    <div>
                      <span>Email</span>
                      <strong>{selectedApplication.email || selectedApplication.applicant?.email || 'Not recorded'}</strong>
                    </div>
                    <div>
                      <span>Birth Registration</span>
                      <strong>{selectedApplication.birthRegistrationNumber || 'Not recorded'}</strong>
                    </div>
                  </div>
                </div>

                <div className="printing-queue-history-panel">
                  <div className="printing-queue-info-title">
                    <FaClock />
                    <h3>Status History</h3>
                  </div>

                  {selectedHistory.length ? (
                    <div className="printing-queue-history-list">
                      {selectedHistory.slice().reverse().slice(0, 4).map((entry, index) => (
                        <div key={`${entry.changedAt || index}-${index}`} className="printing-queue-history-item">
                          <span>{formatStatus(entry.toStatus || entry.status) || 'Updated'}</span>
                          <strong>{formatDateTime(entry.changedAt || entry.createdAt) || 'Not recorded'}</strong>
                          {entry.reason ? <p>{entry.reason}</p> : null}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="printing-queue-history-empty">No status history recorded yet.</div>
                  )}
                </div>

                <div className="printing-queue-action-panel">
                  <div>
                    <h3>Print Action</h3>
                    <p>
                      Approved applications can be marked as printed and moved to delivery workflow.
                    </p>
                  </div>
                  <button
                    type="button"
                    className="printing-queue-primary-button compact"
                    onClick={handleSingleMarkPrinted}
                    disabled={normalizeStatus(selectedApplication.status) !== 'approved' || actionLoading}
                  >
                    {actionLoading ? <FaSpinner className="printing-queue-spin" /> : <FaPrint />}
                    <span>
                      {normalizeStatus(selectedApplication.status) === 'approved' ? 'Mark Printed' : 'Already Printed'}
                    </span>
                  </button>
                </div>
              </>
            ) : (
              <div className="printing-queue-empty-state detail">
                <FaPrint />
                <h3>Select an application</h3>
                <p>Choose an approved or printed application from the left side to see full printing details.</p>
              </div>
            )}
          </section>
        </div>
      </div>
    </AdminLayout>
  );
};

export default PrintingQueue;
