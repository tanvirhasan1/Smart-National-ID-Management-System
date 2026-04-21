import React, { useEffect, useMemo, useState } from 'react';
import { toast } from 'react-toastify';
import {
  FaCheckSquare,
  FaFileAlt,
  FaPrint,
  FaSearch,
  FaSpinner,
  FaSquare,
  FaTruck
} from 'react-icons/fa';
import api from '../api/axios';
import AdminLayout from './AdminLayout';
import Loader from '../common/Loader';
import { formatDate, formatDateTime, formatStatus } from '../utils/helpers';
import '../styles/PrintingQueue.css';

const getApplicationsFromResponse = (response) =>
  response?.data?.applications || response?.data?.data || [];

const normalizeText = (value) =>
  String(value ?? '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();

const buildApplicationSearchText = (application) =>
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

const getPrintingStatusClass = (status) => {
  const value = String(status || '').toLowerCase();

  if (value === 'approved') return 'approved';
  if (value === 'printed') return 'printed';
  if (value === 'delivered') return 'delivered';
  return 'neutral';
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

  const [singleModalOpen, setSingleModalOpen] = useState(false);
  const [bulkModalOpen, setBulkModalOpen] = useState(false);

  const [singleForm, setSingleForm] = useState({
    printNote: '',
    batchReference: ''
  });

  const [bulkForm, setBulkForm] = useState({
    printNote: '',
    batchReference: ''
  });

  // Load the latest printing queue rows from backend.
  const fetchApplications = async () => {
    try {
      setLoading(true);

      const response = await api.get('/admin/printing/queue');
      const rows = getApplicationsFromResponse(response);

      setApplications(rows);

      setSelectedApplication((currentSelected) => {
        if (!rows.length) return null;
        if (!currentSelected) return rows[0];

        const stillExists = rows.find((item) => item._id === currentSelected._id);
        return stillExists || rows[0];
      });

      setSelectedIds((currentIds) =>
        currentIds.filter((id) => rows.some((item) => item._id === id))
      );
    } catch (error) {
      console.error('Error fetching printing queue:', error);
      toast.error(error?.response?.data?.message || 'Failed to load printing queue');
    } finally {
      setLoading(false);
    }
  };

  // Load top summary stats for printing operations.
  const fetchStats = async () => {
    try {
      setStatsLoading(true);

      const response = await api.get('/admin/printing/stats');
      setStats(response?.data?.data || null);
    } catch (error) {
      console.error('Error fetching printing stats:', error);
    } finally {
      setStatsLoading(false);
    }
  };

  useEffect(() => {
    fetchApplications();
    fetchStats();
  }, []);

  const visibleApplications = useMemo(() => {
    const normalizedSearch = normalizeText(searchInput);
    const searchTokens = normalizedSearch.split(' ').filter(Boolean);

    return applications.filter((item) => {
      const searchableText = buildApplicationSearchText(item);

      const matchesSearch =
        searchTokens.length === 0 ||
        searchTokens.every((token) => searchableText.includes(token));

      const matchesStatus = !statusFilter || item.status === statusFilter;
      const matchesType = !typeFilter || item.applicationType === typeFilter;

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

      const stillExists = visibleApplications.find(
        (item) => item._id === currentSelected._id
      );

      return stillExists || visibleApplications[0];
    });
  }, [visibleApplications]);

  const selectedApprovedIds = useMemo(() => {
    return selectedIds.filter((id) =>
      applications.some((item) => item._id === id && item.status === 'approved')
    );
  }, [selectedIds, applications]);

  const allVisibleApprovedIds = useMemo(() => {
    return visibleApplications
      .filter((item) => item.status === 'approved')
      .map((item) => item._id);
  }, [visibleApplications]);

  const statsCards = useMemo(() => {
    return [
      {
        key: 'approved',
        title: 'Approved For Print',
        value: statsLoading ? '...' : stats?.approvedForPrint ?? 0,
        icon: FaFileAlt,
        theme: 'yellow'
      },
      {
        key: 'printed',
        title: 'Printed',
        value: statsLoading ? '...' : stats?.printedCount ?? 0,
        icon: FaPrint,
        theme: 'blue'
      },
      {
        key: 'delivered',
        title: 'Delivered After Print',
        value: statsLoading ? '...' : stats?.deliveredAfterPrint ?? 0,
        icon: FaTruck,
        theme: 'green'
      },
      {
        key: 'today',
        title: 'Printed Today',
        value: statsLoading ? '...' : stats?.printedToday ?? 0,
        icon: FaCheckSquare,
        theme: 'purple'
      }
    ];
  }, [stats, statsLoading]);

  const toggleApplicationSelect = (applicationId) => {
    setSelectedIds((currentIds) =>
      currentIds.includes(applicationId)
        ? currentIds.filter((id) => id !== applicationId)
        : [...currentIds, applicationId]
    );
  };

  const toggleSelectAllVisibleApproved = () => {
    const alreadyAllSelected =
      allVisibleApprovedIds.length > 0 &&
      allVisibleApprovedIds.every((id) => selectedIds.includes(id));

    if (alreadyAllSelected) {
      setSelectedIds((currentIds) =>
        currentIds.filter((id) => !allVisibleApprovedIds.includes(id))
      );
      return;
    }

    setSelectedIds((currentIds) => [
      ...new Set([...currentIds, ...allVisibleApprovedIds])
    ]);
  };

  const clearFilters = () => {
    setSearchInput('');
    setStatusFilter('');
    setTypeFilter('');
  };

  const openSingleModal = () => {
    if (!selectedApplication || selectedApplication.status !== 'approved') {
      toast.error('Only approved applications can be printed');
      return;
    }

    setSingleForm({
      printNote: '',
      batchReference: ''
    });

    setSingleModalOpen(true);
  };

  const closeSingleModal = () => {
    if (actionLoading) return;

    setSingleModalOpen(false);
    setSingleForm({
      printNote: '',
      batchReference: ''
    });
  };

  const openBulkModal = () => {
    if (!selectedApprovedIds.length) {
      toast.error('Select at least one approved application');
      return;
    }

    setBulkForm({
      printNote: '',
      batchReference: ''
    });

    setBulkModalOpen(true);
  };

  const closeBulkModal = () => {
    if (actionLoading) return;

    setBulkModalOpen(false);
    setBulkForm({
      printNote: '',
      batchReference: ''
    });
  };

  const handleSingleMarkPrinted = async () => {
    if (!selectedApplication?._id) return;

    try {
      setActionLoading(true);

      await api.patch(`/admin/printing/${selectedApplication._id}/mark-printed`, {
        printNote: singleForm.printNote.trim(),
        batchReference: singleForm.batchReference.trim()
      });

      toast.success('Application marked as printed');
      closeSingleModal();
      await Promise.all([fetchApplications(), fetchStats()]);
    } catch (error) {
      console.error('Error marking application as printed:', error);
      toast.error(error?.response?.data?.message || 'Failed to mark as printed');
    } finally {
      setActionLoading(false);
    }
  };

  const handleBulkMarkPrinted = async () => {
    if (!selectedApprovedIds.length) return;

    try {
      setActionLoading(true);

      await api.patch('/admin/printing/bulk-mark-printed', {
        applicationIds: selectedApprovedIds,
        actionNote: bulkForm.printNote.trim(),
        batchReference: bulkForm.batchReference.trim()
      });

      toast.success('Bulk print action completed');
      setSelectedIds([]);
      closeBulkModal();
      await Promise.all([fetchApplications(), fetchStats()]);
    } catch (error) {
      console.error('Error running bulk print:', error);
      toast.error(error?.response?.data?.message || 'Failed to run bulk print');
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
        {/* Printing overview header */}
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
              onClick={openBulkModal}
              disabled={!selectedApprovedIds.length}
            >
              <FaPrint />
              <span>Bulk Mark Printed ({selectedApprovedIds.length})</span>
            </button>
          </div>

          <div className="printing-queue-stats-grid">
            {statsCards.map((item) => {
              const Icon = item.icon;

              return (
                <div
                  key={item.key}
                  className={`printing-queue-stat-card ${item.theme}`}
                >
                  <div className="printing-queue-stat-icon">
                    <Icon />
                  </div>
                  <div>
                    <p>{item.title}</p>
                    <h3>{item.value}</h3>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Search and filters */}
        <div className="printing-queue-toolbar">
          <div className="printing-queue-search-box">
            <FaSearch className="printing-queue-field-icon" />
            <input
              type="text"
              placeholder="Search by application ID, name, email, phone or BRN"
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
            />
          </div>

          <div className="printing-queue-filter-row">
            <div className="printing-queue-filter-group">
              <select
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
              >
                <option value="">All Status</option>
                <option value="approved">Approved</option>
                <option value="printed">Printed</option>
                <option value="delivered">Delivered</option>
              </select>
            </div>

            <div className="printing-queue-filter-group">
              <select
                value={typeFilter}
                onChange={(event) => setTypeFilter(event.target.value)}
              >
                <option value="">All Types</option>
                <option value="new">New</option>
                <option value="correction">Correction</option>
                <option value="reissue">Reissue</option>
              </select>
            </div>

            <button
              type="button"
              className="printing-queue-secondary-button"
              onClick={toggleSelectAllVisibleApproved}
            >
              {allVisibleApprovedIds.length > 0 &&
              allVisibleApprovedIds.every((id) => selectedIds.includes(id))
                ? 'Unselect Visible Approved'
                : 'Select Visible Approved'}
            </button>

            <button
              type="button"
              className="printing-queue-secondary-button"
              onClick={clearFilters}
            >
              Clear Filters
            </button>
          </div>
        </div>

        <div className="printing-queue-content">
          {/* Queue list */}
          <div className="printing-queue-list-card">
            <div className="printing-queue-card-header">
              <div>
                <h3>Approved and Printed Applications</h3>
                <p>{visibleApplications.length} applications found</p>
              </div>
            </div>

            {visibleApplications.length === 0 ? (
              <div className="printing-queue-empty-state">
                <FaPrint className="printing-queue-empty-icon" />
                <h3>No applications found</h3>
                <p>Try changing your search or filter selection.</p>
              </div>
            ) : (
              <div className="printing-queue-list">
                {visibleApplications.map((item) => {
                  const isSelected = selectedIds.includes(item._id);
                  const isApproved = item.status === 'approved';

                  return (
                    <div
                      key={item._id}
                      className={
                        selectedApplication?._id === item._id
                          ? 'printing-queue-list-item active'
                          : 'printing-queue-list-item'
                      }
                    >
                      <button
                        type="button"
                        className="printing-queue-list-main"
                        onClick={() => setSelectedApplication(item)}
                      >
                        <div className="printing-queue-list-top">
                          <h4>{item.fullNameEnglish || 'Unnamed Applicant'}</h4>

                          <div className="printing-queue-list-badges">
                            <span
                              className={`printing-queue-status-chip ${getPrintingStatusClass(
                                item.status
                              )}`}
                            >
                              {formatStatus(item.status)}
                            </span>
                          </div>
                        </div>

                        <p>{item.applicationId || 'No application ID'}</p>

                        <div className="printing-queue-list-meta">
                          <span className="printing-queue-type-chip">
                            {formatStatus(item.applicationType || 'new')}
                          </span>
                          <small>{item.phone || item.applicant?.phone || 'No phone'}</small>
                        </div>
                      </button>

                      <button
                        type="button"
                        className="printing-queue-check-button"
                        onClick={() => toggleApplicationSelect(item._id)}
                        disabled={!isApproved}
                        title={isApproved ? 'Select application' : 'Only approved items can be selected'}
                      >
                        {isSelected ? <FaCheckSquare /> : <FaSquare />}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Selected application details */}
          <div className="printing-queue-details-card">
            {selectedApplication ? (
              <>
                <div className="printing-queue-details-header">
                  <div>
                    <h2>{selectedApplication.fullNameEnglish || 'Unnamed Applicant'}</h2>
                    <p>{selectedApplication.applicationId || 'No application ID'}</p>
                  </div>

                  <span
                    className={`printing-queue-status-chip ${getPrintingStatusClass(
                      selectedApplication.status
                    )}`}
                  >
                    {formatStatus(selectedApplication.status)}
                  </span>
                </div>

                <div className="printing-queue-summary-grid">
                  <div className="printing-queue-summary-card">
                    <p>Application Type</p>
                    <h4>{formatStatus(selectedApplication.applicationType || 'new')}</h4>
                  </div>

                  <div className="printing-queue-summary-card">
                    <p>Phone</p>
                    <h4>{selectedApplication.phone || selectedApplication.applicant?.phone || 'N/A'}</h4>
                  </div>

                  <div className="printing-queue-summary-card">
                    <p>Approved At</p>
                    <h4>
                      {selectedApplication.approvedAt
                        ? formatDateTime(selectedApplication.approvedAt)
                        : 'Not approved yet'}
                    </h4>
                  </div>

                  <div className="printing-queue-summary-card">
                    <p>Printed At</p>
                    <h4>
                      {selectedApplication.printedAt
                        ? formatDateTime(selectedApplication.printedAt)
                        : 'Not printed yet'}
                    </h4>
                  </div>
                </div>

                <div className="printing-queue-section-card">
                  <h3>Applicant Information</h3>

                  <div className="printing-queue-detail-grid">
                    <div>
                      <p>Email</p>
                      <h4>{selectedApplication.email || selectedApplication.applicant?.email || 'N/A'}</h4>
                    </div>

                    <div>
                      <p>Date of Birth</p>
                      <h4>
                        {selectedApplication.dateOfBirth
                          ? formatDate(selectedApplication.dateOfBirth)
                          : 'N/A'}
                      </h4>
                    </div>

                    <div>
                      <p>Birth Registration Number</p>
                      <h4>{selectedApplication.birthRegistrationNumber || 'N/A'}</h4>
                    </div>

                    <div>
                      <p>Existing NID Number</p>
                      <h4>{selectedApplication.existingNidNumber || 'N/A'}</h4>
                    </div>
                  </div>
                </div>

                <div className="printing-queue-section-card">
                  <h3>Status History</h3>

                  {selectedHistory.length === 0 ? (
                    <div className="printing-queue-empty-inline">
                      No status history found yet
                    </div>
                  ) : (
                    <div className="printing-queue-history-list">
                      {[...selectedHistory]
                        .slice()
                        .reverse()
                        .map((historyItem, index) => (
                          <div
                            key={`${historyItem.changedAt || index}-${index}`}
                            className="printing-queue-history-item"
                          >
                            <div className="printing-queue-history-dot" />
                            <div className="printing-queue-history-content">
                              <div className="printing-queue-history-top">
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

                              <p>{historyItem.reason || historyItem.note || 'No reason added'}</p>
                            </div>
                          </div>
                        ))}
                    </div>
                  )}
                </div>

                <div className="printing-queue-action-row">
                  <button
                    type="button"
                    className="printing-queue-primary-button"
                    onClick={openSingleModal}
                    disabled={selectedApplication.status !== 'approved'}
                  >
                    <FaPrint />
                    <span>Mark as Printed</span>
                  </button>
                </div>
              </>
            ) : (
              <div className="printing-queue-empty-state details">
                <FaPrint className="printing-queue-empty-icon" />
                <h3>Select an application</h3>
                <p>Choose an application from the left side to see full printing details.</p>
              </div>
            )}
          </div>
        </div>

        {/* Single print modal */}
        {singleModalOpen ? (
          <div className="printing-queue-modal-backdrop" onClick={closeSingleModal}>
            <div
              className="printing-queue-modal-card"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="printing-queue-modal-header">
                <h3>Mark Application as Printed</h3>
                <p>Add batch trace so print operations stay auditable.</p>
              </div>

              <div className="printing-queue-modal-body">
                <div className="printing-queue-modal-field">
                  <label>Print Note</label>
                  <textarea
                    rows={4}
                    value={singleForm.printNote}
                    onChange={(event) =>
                      setSingleForm((prev) => ({
                        ...prev,
                        printNote: event.target.value
                      }))
                    }
                    placeholder="Write a print note..."
                  />
                </div>

                <div className="printing-queue-modal-field">
                  <label>Batch Reference</label>
                  <input
                    type="text"
                    value={singleForm.batchReference}
                    onChange={(event) =>
                      setSingleForm((prev) => ({
                        ...prev,
                        batchReference: event.target.value
                      }))
                    }
                    placeholder="Enter batch reference"
                  />
                </div>
              </div>

              <div className="printing-queue-modal-footer">
                <button
                  type="button"
                  className="printing-queue-secondary-button"
                  onClick={closeSingleModal}
                  disabled={actionLoading}
                >
                  Cancel
                </button>

                <button
                  type="button"
                  className="printing-queue-primary-button"
                  onClick={handleSingleMarkPrinted}
                  disabled={actionLoading}
                >
                  {actionLoading ? <FaSpinner className="spin" /> : null}
                  <span>Confirm Print</span>
                </button>
              </div>
            </div>
          </div>
        ) : null}

        {/* Bulk print modal */}
        {bulkModalOpen ? (
          <div className="printing-queue-modal-backdrop" onClick={closeBulkModal}>
            <div
              className="printing-queue-modal-card"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="printing-queue-modal-header">
                <h3>Bulk Mark as Printed</h3>
                <p>
                  You are about to print {selectedApprovedIds.length} approved applications.
                </p>
              </div>

              <div className="printing-queue-modal-body">
                <div className="printing-queue-modal-field">
                  <label>Print Note</label>
                  <textarea
                    rows={4}
                    value={bulkForm.printNote}
                    onChange={(event) =>
                      setBulkForm((prev) => ({
                        ...prev,
                        printNote: event.target.value
                      }))
                    }
                    placeholder="Write a bulk print note..."
                  />
                </div>

                <div className="printing-queue-modal-field">
                  <label>Batch Reference</label>
                  <input
                    type="text"
                    value={bulkForm.batchReference}
                    onChange={(event) =>
                      setBulkForm((prev) => ({
                        ...prev,
                        batchReference: event.target.value
                      }))
                    }
                    placeholder="Enter batch reference"
                  />
                </div>
              </div>

              <div className="printing-queue-modal-footer">
                <button
                  type="button"
                  className="printing-queue-secondary-button"
                  onClick={closeBulkModal}
                  disabled={actionLoading}
                >
                  Cancel
                </button>

                <button
                  type="button"
                  className="printing-queue-primary-button"
                  onClick={handleBulkMarkPrinted}
                  disabled={actionLoading}
                >
                  {actionLoading ? <FaSpinner className="spin" /> : null}
                  <span>Confirm Bulk Print</span>
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </AdminLayout>
  );
};

export default PrintingQueue;