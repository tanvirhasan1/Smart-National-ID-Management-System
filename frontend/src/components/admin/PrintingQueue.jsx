import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import {
  FaCheckCircle,
  FaCheckSquare,
  FaEye,
  FaFileAlt,
  FaPrint,
  FaRegSquare,
  FaSearch,
  FaSpinner
} from 'react-icons/fa';
import api from '../api/axios';
import AdminLayout from './AdminLayout';
import Loader from '../common/Loader';
import { formatDate, formatStatus } from '../utils/helpers';
import {
  getApplicantName,
  getApplicantPhone,
  getApplicationsFromResponse,
  getPaginationMeta,
  getPrintingQueueDate,
  getPrintingStatusClass,
  getPrintingStatusLabel,
  getQueueAge,
  isApplicationPrintReady
} from './adminQueueUtils';
import '../styles/PrintingQueue.css';

const PAGE_SIZE = 20;

const PrintingQueue = () => {
  const navigate = useNavigate();
  const [applications, setApplications] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [searchInput, setSearchInput] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState({
    page: 1,
    limit: PAGE_SIZE,
    total: 0,
    totalPages: 1
  });

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedSearch(searchInput.trim());
    }, 350);

    return () => window.clearTimeout(timer);
  }, [searchInput]);

  const fetchApplications = useCallback(
    async (requestedPage = page) => {
      try {
        setLoading(true);
        const response = await api.get('/admin/printing/queue', {
          params: {
            page: requestedPage,
            limit: PAGE_SIZE,
            search: debouncedSearch || undefined,
            status: statusFilter || undefined,
            applicationType: typeFilter || undefined
          }
        });

        const rows = getApplicationsFromResponse(response);
        setApplications(rows);
        setMeta(getPaginationMeta(response, requestedPage, PAGE_SIZE));
        setSelectedIds((currentIds) =>
          currentIds.filter((id) =>
            rows.some((item) => item._id === id && isApplicationPrintReady(item))
          )
        );
      } catch (error) {
        console.error('Error fetching printing queue:', error);
        toast.error(error?.response?.data?.message || 'Failed to load printing queue');
        setApplications([]);
      } finally {
        setLoading(false);
      }
    },
    [debouncedSearch, page, statusFilter, typeFilter]
  );

  const fetchStats = useCallback(async () => {
    try {
      setStatsLoading(true);
      const response = await api.get('/admin/printing/stats');
      setStats(response?.data?.data || response?.data || null);
    } catch (error) {
      console.error('Error fetching printing stats:', error);
    } finally {
      setStatsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchApplications();
  }, [fetchApplications]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  const selectedPrintReadyIds = useMemo(
    () =>
      selectedIds.filter((id) =>
        applications.some((item) => item._id === id && isApplicationPrintReady(item))
      ),
    [applications, selectedIds]
  );

  const visiblePrintReadyIds = useMemo(
    () => applications.filter(isApplicationPrintReady).map((item) => item._id),
    [applications]
  );

  const filtersActive = Boolean(searchInput || debouncedSearch || statusFilter || typeFilter);

  const statsCards = [
    {
      key: 'approved',
      title: 'Ready For Print',
      value: statsLoading ? '...' : stats?.approvedForPrint ?? 0,
      note: 'Accepted after biometric completion',
      icon: <FaFileAlt />
    },
    {
      key: 'printed',
      title: 'Printed',
      value: statsLoading ? '...' : stats?.printedCount ?? 0,
      note: 'Cards already accepted for print',
      icon: <FaPrint />
    },
    {
      key: 'today',
      title: 'Printed Today',
      value: statsLoading ? '...' : stats?.printedToday ?? 0,
      note: 'Completed in the current day',
      icon: <FaCheckCircle />
    }
  ];

  const toggleApplicationSelect = (applicationId) => {
    setSelectedIds((currentIds) =>
      currentIds.includes(applicationId)
        ? currentIds.filter((id) => id !== applicationId)
        : [...currentIds, applicationId]
    );
  };

  const toggleSelectVisibleReady = () => {
    const allSelected =
      visiblePrintReadyIds.length > 0 &&
      visiblePrintReadyIds.every((id) => selectedIds.includes(id));

    setSelectedIds((currentIds) =>
      allSelected
        ? currentIds.filter((id) => !visiblePrintReadyIds.includes(id))
        : [...new Set([...currentIds, ...visiblePrintReadyIds])]
    );
  };

  const clearFilters = () => {
    setSearchInput('');
    setDebouncedSearch('');
    setStatusFilter('');
    setTypeFilter('');
    setPage(1);
  };

  const handleBulkMarkPrinted = async () => {
    if (!selectedPrintReadyIds.length) {
      toast.error('Select at least one ready-for-print application');
      return;
    }

    try {
      setActionLoading(true);
      const response = await api.patch('/admin/printing/bulk-mark-printed', {
        applicationIds: selectedPrintReadyIds,
        actionNote: 'Marked printed from Printing Queue'
      });
      const updatedCount = Number(response?.data?.updatedCount || 0);
      const skipped = Array.isArray(response?.data?.skipped) ? response.data.skipped : [];

      if (updatedCount > 0) {
        toast.success(`${updatedCount} applications marked printed`);
      }
      if (skipped.length > 0) {
        const firstSkipped = skipped[0];
        toast.warning(
          `${skipped.length} skipped. ${firstSkipped.applicationId || 'Application'}: ${firstSkipped.reason}`
        );
      }
      setSelectedIds([]);
      setPage(1);
      await Promise.all([fetchApplications(1), fetchStats()]);
    } catch (error) {
      console.error('Error running bulk print action:', error);
      toast.error(error?.response?.data?.message || 'Failed to run bulk print action');
    } finally {
      setActionLoading(false);
    }
  };

  const openDetails = (applicationId) => {
    navigate(`/admin/printing/${applicationId}`);
  };

  if (loading && applications.length === 0) {
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
        <div className="printing-queue-page-header">
          <div>
            <h1>Printing Queue</h1>
            <p>Review biometric-completed applications and manage secure physical card printing.</p>
          </div>

          <button
            type="button"
            className="printing-queue-primary-button"
            onClick={handleBulkMarkPrinted}
            disabled={!selectedPrintReadyIds.length || actionLoading}
          >
            {actionLoading ? <FaSpinner className="printing-queue-spin" /> : <FaPrint />}
            <span>Bulk Mark Printed ({selectedPrintReadyIds.length})</span>
          </button>
        </div>

        <div className="printing-queue-stats-grid">
          {statsCards.map((item) => (
            <div key={item.key} className="printing-queue-stat-card">
              <div className="printing-queue-stat-icon">{item.icon}</div>
              <div>
                <span>{item.title}</span>
                <strong>{item.value}</strong>
                <small>{item.note}</small>
              </div>
            </div>
          ))}
        </div>

        <div className="printing-queue-toolbar-card">
          <div className="printing-queue-search-box">
            <FaSearch />
            <input
              type="text"
              placeholder="Search by application ID, name, email, phone or BRN"
              value={searchInput}
              onChange={(event) => {
                setSearchInput(event.target.value);
                setPage(1);
              }}
            />
          </div>

          <div className="printing-queue-filter-row">
            <label className="printing-queue-filter-control">
              <span>Status</span>
              <select
                value={statusFilter}
                onChange={(event) => {
                  setStatusFilter(event.target.value);
                  setPage(1);
                }}
              >
                <option value="">All Statuses</option>
                <option value="approved">Ready for Print</option>
                <option value="printed">Printed</option>
              </select>
            </label>

            <label className="printing-queue-filter-control">
              <span>Type</span>
              <select
                value={typeFilter}
                onChange={(event) => {
                  setTypeFilter(event.target.value);
                  setPage(1);
                }}
              >
                <option value="">All Types</option>
                <option value="new">New</option>
                <option value="correction">Correction</option>
                <option value="reissue">Reissue</option>
              </select>
            </label>

            <button
              type="button"
              className="printing-queue-secondary-button"
              onClick={toggleSelectVisibleReady}
              disabled={!visiblePrintReadyIds.length}
            >
              {visiblePrintReadyIds.length > 0 &&
              visiblePrintReadyIds.every((id) => selectedIds.includes(id)) ? (
                <FaCheckSquare />
              ) : (
                <FaRegSquare />
              )}
              <span>Select Visible Ready</span>
            </button>

            <button
              type="button"
              className="printing-queue-secondary-button"
              onClick={clearFilters}
              disabled={!filtersActive}
            >
              Clear Filters
            </button>
          </div>
        </div>

        <section className="printing-queue-list-card">
          <div className="printing-queue-card-header">
            <div>
              <h2>Print Workflow Applications</h2>
              <p>
                Showing {applications.length} of {meta.total} applications
              </p>
            </div>
          </div>

          <div className="printing-queue-table-scroll">
            <div className="printing-queue-table">
              <div className="printing-queue-table-header" aria-hidden="true">
                <span />
                <span>Application ID</span>
                <span>Applicant</span>
                <span>Type</span>
                <span>Phone / BRN</span>
                <span>Ready Date / Age</span>
                <span>Print Status</span>
                <span>Action</span>
              </div>

              <div className="printing-queue-list">
                {applications.length === 0 ? (
                  <div className="printing-queue-empty-state compact">
                    <FaPrint />
                    <h3>No applications are ready for printing.</h3>
                    <p>Change the search or filters to review completed print records.</p>
                  </div>
                ) : (
                  applications.map((application) => {
                    const isPrintReady = isApplicationPrintReady(application);
                    const isSelected = selectedIds.includes(application._id);

                    return (
                      <div
                        key={application._id}
                        className="printing-queue-list-item"
                        role="button"
                        tabIndex={0}
                        onClick={() => openDetails(application._id)}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter' || event.key === ' ') {
                            event.preventDefault();
                            openDetails(application._id);
                          }
                        }}
                      >
                        <button
                          type="button"
                          className={`printing-queue-check ${isSelected ? 'checked' : ''} ${!isPrintReady ? 'disabled' : ''}`}
                          onClick={(event) => {
                            event.stopPropagation();
                            if (isPrintReady) toggleApplicationSelect(application._id);
                          }}
                          disabled={!isPrintReady}
                          aria-label={isPrintReady ? 'Select application' : 'Application is not ready for printing'}
                        >
                          {isSelected ? <FaCheckSquare /> : <FaRegSquare />}
                        </button>

                        <div className="printing-queue-table-cell application-id" data-label="Application ID">
                          <strong>{application.applicationId || application._id}</strong>
                          {application.nidNumber ? <small>NID {application.nidNumber}</small> : null}
                        </div>

                        <div className="printing-queue-table-cell applicant" data-label="Applicant">
                          <strong>{getApplicantName(application) || 'Unknown Citizen'}</strong>
                          <small>{application.email || application.applicant?.email || 'Email not recorded'}</small>
                        </div>

                        <div className="printing-queue-table-cell" data-label="Type">
                          <span>{formatStatus(application.applicationType) || 'New'}</span>
                        </div>

                        <div className="printing-queue-table-cell" data-label="Phone / BRN">
                          <strong>{getApplicantPhone(application)}</strong>
                          <small>{application.birthRegistrationNumber || 'BRN not recorded'}</small>
                        </div>

                        <div className="printing-queue-table-cell" data-label="Ready Date / Age">
                          <strong>{formatDate(getPrintingQueueDate(application)) || 'Not recorded'}</strong>
                          <small>{getQueueAge(getPrintingQueueDate(application))}</small>
                        </div>

                        <div className="printing-queue-table-cell status" data-label="Print Status">
                          <span className={`printing-queue-status-badge ${getPrintingStatusClass(application)}`}>
                            {getPrintingStatusLabel(application)}
                          </span>
                        </div>

                        <button
                          type="button"
                          className="printing-queue-view-button"
                          onClick={(event) => {
                            event.stopPropagation();
                            openDetails(application._id);
                          }}
                          aria-label="View printing details"
                        >
                          <FaEye />
                          <span>View</span>
                        </button>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>

          <div className="printing-queue-pagination">
            <span>
              Page {meta.page} of {meta.totalPages}
            </span>
            <div>
              <button
                type="button"
                className="printing-queue-secondary-button"
                disabled={meta.page <= 1 || loading}
                onClick={() => setPage((current) => Math.max(1, current - 1))}
              >
                Previous
              </button>
              <button
                type="button"
                className="printing-queue-secondary-button"
                disabled={meta.page >= meta.totalPages || loading}
                onClick={() => setPage((current) => current + 1)}
              >
                Next
              </button>
            </div>
          </div>
        </section>
      </div>
    </AdminLayout>
  );
};

export default PrintingQueue;
