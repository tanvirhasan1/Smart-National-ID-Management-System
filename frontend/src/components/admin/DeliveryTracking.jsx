import React, { useEffect, useMemo, useState } from 'react';
import { toast } from 'react-toastify';
import {
  FaCheckSquare,
  FaSearch,
  FaSpinner,
  FaSquare,
  FaTruck
} from 'react-icons/fa';
import api from '../api/axios';
import AdminLayout from './AdminLayout';
import Loader from '../common/Loader';
import { formatDate, formatDateTime, formatStatus } from '../utils/helpers';
import '../styles/DeliveryTracking.css';

const getApplicationsFromResponse = (response) =>
  response?.data?.applications || response?.data?.data || [];

const normalizeText = (value) =>
  String(value ?? '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();

const buildDeliverySearchText = (application) =>
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

const getDeliveryStatusClass = (status) => {
  const value = String(status || '').toLowerCase();

  if (value === 'printed') return 'printed';
  if (value === 'delivered') return 'delivered';
  if (value === 'cancelled') return 'cancelled';
  return 'neutral';
};

const DeliveryTracking = () => {
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
    deliveryNote: '',
    deliveryReference: ''
  });

  const [bulkForm, setBulkForm] = useState({
    deliveryNote: '',
    deliveryReference: ''
  });

  // Load the current delivery queue from backend.
  const fetchApplications = async () => {
    try {
      setLoading(true);

      const response = await api.get('/admin/delivery/queue');
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
      console.error('Error fetching delivery queue:', error);
      toast.error(error?.response?.data?.message || 'Failed to load delivery queue');
    } finally {
      setLoading(false);
    }
  };

  // Load delivery summary cards for the top area.
  const fetchStats = async () => {
    try {
      setStatsLoading(true);

      const response = await api.get('/admin/delivery/stats');
      setStats(response?.data?.data || null);
    } catch (error) {
      console.error('Error fetching delivery stats:', error);
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
      const searchableText = buildDeliverySearchText(item);

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

  const selectedPrintedIds = useMemo(() => {
    return selectedIds.filter((id) =>
      applications.some((item) => item._id === id && item.status === 'printed')
    );
  }, [selectedIds, applications]);

  const allVisiblePrintedIds = useMemo(() => {
    return visibleApplications
      .filter((item) => item.status === 'printed')
      .map((item) => item._id);
  }, [visibleApplications]);

  const statsCards = useMemo(() => {
    return [
      {
        key: 'ready',
        title: 'Ready For Delivery',
        value: statsLoading ? '...' : stats?.readyForDelivery ?? 0,
        theme: 'yellow'
      },
      {
        key: 'delivered',
        title: 'Delivered',
        value: statsLoading ? '...' : stats?.deliveredCount ?? 0,
        theme: 'green'
      },
      {
        key: 'today',
        title: 'Delivered Today',
        value: statsLoading ? '...' : stats?.deliveredToday ?? 0,
        theme: 'blue'
      },
      {
        key: 'cancelled',
        title: 'Cancelled',
        value: statsLoading ? '...' : stats?.cancelledCount ?? 0,
        theme: 'red'
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

  const toggleSelectAllVisiblePrinted = () => {
    const alreadyAllSelected =
      allVisiblePrintedIds.length > 0 &&
      allVisiblePrintedIds.every((id) => selectedIds.includes(id));

    if (alreadyAllSelected) {
      setSelectedIds((currentIds) =>
        currentIds.filter((id) => !allVisiblePrintedIds.includes(id))
      );
      return;
    }

    setSelectedIds((currentIds) => [
      ...new Set([...currentIds, ...allVisiblePrintedIds])
    ]);
  };

  const clearFilters = () => {
    setSearchInput('');
    setStatusFilter('');
    setTypeFilter('');
  };

  const openSingleModal = () => {
    if (!selectedApplication || selectedApplication.status !== 'printed') {
      toast.error('Only printed applications can be delivered');
      return;
    }

    setSingleForm({
      deliveryNote: '',
      deliveryReference: ''
    });

    setSingleModalOpen(true);
  };

  const closeSingleModal = () => {
    if (actionLoading) return;

    setSingleModalOpen(false);
    setSingleForm({
      deliveryNote: '',
      deliveryReference: ''
    });
  };

  const openBulkModal = () => {
    if (!selectedPrintedIds.length) {
      toast.error('Select at least one printed application');
      return;
    }

    setBulkForm({
      deliveryNote: '',
      deliveryReference: ''
    });

    setBulkModalOpen(true);
  };

  const closeBulkModal = () => {
    if (actionLoading) return;

    setBulkModalOpen(false);
    setBulkForm({
      deliveryNote: '',
      deliveryReference: ''
    });
  };

  const handleSingleMarkDelivered = async () => {
    if (!selectedApplication?._id) return;

    try {
      setActionLoading(true);

      await api.patch(`/admin/delivery/${selectedApplication._id}/mark-delivered`, {
        deliveryNote: singleForm.deliveryNote.trim(),
        deliveryReference: singleForm.deliveryReference.trim()
      });

      toast.success('Application marked as delivered');
      closeSingleModal();
      await Promise.all([fetchApplications(), fetchStats()]);
    } catch (error) {
      console.error('Error marking application as delivered:', error);
      toast.error(error?.response?.data?.message || 'Failed to mark as delivered');
    } finally {
      setActionLoading(false);
    }
  };

  const handleBulkMarkDelivered = async () => {
    if (!selectedPrintedIds.length) return;

    try {
      setActionLoading(true);

      await api.patch('/admin/delivery/bulk-mark-delivered', {
        applicationIds: selectedPrintedIds,
        actionNote: bulkForm.deliveryNote.trim(),
        deliveryReference: bulkForm.deliveryReference.trim()
      });

      toast.success('Bulk delivery action completed');
      setSelectedIds([]);
      closeBulkModal();
      await Promise.all([fetchApplications(), fetchStats()]);
    } catch (error) {
      console.error('Error running bulk delivery:', error);
      toast.error(error?.response?.data?.message || 'Failed to run bulk delivery');
    } finally {
      setActionLoading(false);
    }
  };

  const selectedHistory = selectedApplication?.statusHistory || [];

  if (loading) {
    return (
      <AdminLayout>
        <div className="delivery-tracking-loading-state">
          <Loader size="large" text="Loading delivery queue..." />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="delivery-tracking-page">
        {/* Delivery overview header */}
        <div className="delivery-tracking-header-card">
          <div className="delivery-tracking-header-top">
            <div>
              <h1 className="delivery-tracking-title">Delivery Tracking</h1>
              <p className="delivery-tracking-subtitle">
                Track printed applications and move them into final delivery workflow.
              </p>
            </div>

            <button
              type="button"
              className="delivery-tracking-primary-button"
              onClick={openBulkModal}
              disabled={!selectedPrintedIds.length}
            >
              <FaTruck />
              <span>Bulk Mark Delivered ({selectedPrintedIds.length})</span>
            </button>
          </div>

          <div className="delivery-tracking-stats-grid">
            {statsCards.map((item) => (
              <div
                key={item.key}
                className={`delivery-tracking-stat-card ${item.theme}`}
              >
                <div className="delivery-tracking-stat-icon">
                  <FaTruck />
                </div>
                <div>
                  <p>{item.title}</p>
                  <h3>{item.value}</h3>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Search and filters */}
        <div className="delivery-tracking-toolbar">
          <div className="delivery-tracking-search-box">
            <FaSearch className="delivery-tracking-field-icon" />
            <input
              type="text"
              placeholder="Search by application ID, name, email, phone or BRN"
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
            />
          </div>

          <div className="delivery-tracking-filter-row">
            <div className="delivery-tracking-filter-group">
              <select
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
              >
                <option value="">All Status</option>
                <option value="printed">Printed</option>
                <option value="delivered">Delivered</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>

            <div className="delivery-tracking-filter-group">
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
              className="delivery-tracking-secondary-button"
              onClick={toggleSelectAllVisiblePrinted}
            >
              {allVisiblePrintedIds.length > 0 &&
              allVisiblePrintedIds.every((id) => selectedIds.includes(id))
                ? 'Unselect Visible Printed'
                : 'Select Visible Printed'}
            </button>

            <button
              type="button"
              className="delivery-tracking-secondary-button"
              onClick={clearFilters}
            >
              Clear Filters
            </button>
          </div>
        </div>

        <div className="delivery-tracking-content">
          {/* Queue list */}
          <div className="delivery-tracking-list-card">
            <div className="delivery-tracking-card-header">
              <div>
                <h3>Printed and Delivered Applications</h3>
                <p>{visibleApplications.length} applications found</p>
              </div>
            </div>

            {visibleApplications.length === 0 ? (
              <div className="delivery-tracking-empty-state">
                <FaTruck className="delivery-tracking-empty-icon" />
                <h3>No applications found</h3>
                <p>Try changing your search or filter selection.</p>
              </div>
            ) : (
              <div className="delivery-tracking-list">
                {visibleApplications.map((item) => {
                  const isSelected = selectedIds.includes(item._id);
                  const isPrinted = item.status === 'printed';

                  return (
                    <div
                      key={item._id}
                      className={
                        selectedApplication?._id === item._id
                          ? 'delivery-tracking-list-item active'
                          : 'delivery-tracking-list-item'
                      }
                    >
                      <button
                        type="button"
                        className="delivery-tracking-list-main"
                        onClick={() => setSelectedApplication(item)}
                      >
                        <div className="delivery-tracking-list-top">
                          <h4>{item.fullNameEnglish || 'Unnamed Applicant'}</h4>

                          <div className="delivery-tracking-list-badges">
                            <span
                              className={`delivery-tracking-status-chip ${getDeliveryStatusClass(
                                item.status
                              )}`}
                            >
                              {formatStatus(item.status)}
                            </span>
                          </div>
                        </div>

                        <p>{item.applicationId || 'No application ID'}</p>

                        <div className="delivery-tracking-list-meta">
                          <span className="delivery-tracking-type-chip">
                            {formatStatus(item.applicationType || 'new')}
                          </span>
                          <small>{item.phone || item.applicant?.phone || 'No phone'}</small>
                        </div>
                      </button>

                      <button
                        type="button"
                        className="delivery-tracking-check-button"
                        onClick={() => toggleApplicationSelect(item._id)}
                        disabled={!isPrinted}
                        title={isPrinted ? 'Select application' : 'Only printed items can be selected'}
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
          <div className="delivery-tracking-details-card">
            {selectedApplication ? (
              <>
                <div className="delivery-tracking-details-header">
                  <div>
                    <h2>{selectedApplication.fullNameEnglish || 'Unnamed Applicant'}</h2>
                    <p>{selectedApplication.applicationId || 'No application ID'}</p>
                  </div>

                  <span
                    className={`delivery-tracking-status-chip ${getDeliveryStatusClass(
                      selectedApplication.status
                    )}`}
                  >
                    {formatStatus(selectedApplication.status)}
                  </span>
                </div>

                <div className="delivery-tracking-summary-grid">
                  <div className="delivery-tracking-summary-card">
                    <p>Application Type</p>
                    <h4>{formatStatus(selectedApplication.applicationType || 'new')}</h4>
                  </div>

                  <div className="delivery-tracking-summary-card">
                    <p>Phone</p>
                    <h4>{selectedApplication.phone || selectedApplication.applicant?.phone || 'N/A'}</h4>
                  </div>

                  <div className="delivery-tracking-summary-card">
                    <p>Printed At</p>
                    <h4>
                      {selectedApplication.printedAt
                        ? formatDateTime(selectedApplication.printedAt)
                        : 'Not printed yet'}
                    </h4>
                  </div>

                  <div className="delivery-tracking-summary-card">
                    <p>Delivered At</p>
                    <h4>
                      {selectedApplication.deliveredAt
                        ? formatDateTime(selectedApplication.deliveredAt)
                        : 'Not delivered yet'}
                    </h4>
                  </div>
                </div>

                <div className="delivery-tracking-section-card">
                  <h3>Applicant Information</h3>

                  <div className="delivery-tracking-detail-grid">
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

                <div className="delivery-tracking-section-card">
                  <h3>Status History</h3>

                  {selectedHistory.length === 0 ? (
                    <div className="delivery-tracking-empty-inline">
                      No status history found yet
                    </div>
                  ) : (
                    <div className="delivery-tracking-history-list">
                      {[...selectedHistory]
                        .slice()
                        .reverse()
                        .map((historyItem, index) => (
                          <div
                            key={`${historyItem.changedAt || index}-${index}`}
                            className="delivery-tracking-history-item"
                          >
                            <div className="delivery-tracking-history-dot" />
                            <div className="delivery-tracking-history-content">
                              <div className="delivery-tracking-history-top">
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

                <div className="delivery-tracking-action-row">
                  <button
                    type="button"
                    className="delivery-tracking-primary-button"
                    onClick={openSingleModal}
                    disabled={selectedApplication.status !== 'printed'}
                  >
                    <FaTruck />
                    <span>Mark as Delivered</span>
                  </button>
                </div>
              </>
            ) : (
              <div className="delivery-tracking-empty-state details">
                <FaTruck className="delivery-tracking-empty-icon" />
                <h3>Select an application</h3>
                <p>Choose an application from the left side to see full delivery details.</p>
              </div>
            )}
          </div>
        </div>

        {/* Single delivery modal */}
        {singleModalOpen ? (
          <div className="delivery-tracking-modal-backdrop" onClick={closeSingleModal}>
            <div
              className="delivery-tracking-modal-card"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="delivery-tracking-modal-header">
                <h3>Mark Application as Delivered</h3>
                <p>Add delivery trace so handover stays auditable.</p>
              </div>

              <div className="delivery-tracking-modal-body">
                <div className="delivery-tracking-modal-field">
                  <label>Delivery Note</label>
                  <textarea
                    rows={4}
                    value={singleForm.deliveryNote}
                    onChange={(event) =>
                      setSingleForm((prev) => ({
                        ...prev,
                        deliveryNote: event.target.value
                      }))
                    }
                    placeholder="Write a delivery note..."
                  />
                </div>

                <div className="delivery-tracking-modal-field">
                  <label>Delivery Reference</label>
                  <input
                    type="text"
                    value={singleForm.deliveryReference}
                    onChange={(event) =>
                      setSingleForm((prev) => ({
                        ...prev,
                        deliveryReference: event.target.value
                      }))
                    }
                    placeholder="Enter delivery reference"
                  />
                </div>
              </div>

              <div className="delivery-tracking-modal-footer">
                <button
                  type="button"
                  className="delivery-tracking-secondary-button"
                  onClick={closeSingleModal}
                  disabled={actionLoading}
                >
                  Cancel
                </button>

                <button
                  type="button"
                  className="delivery-tracking-primary-button"
                  onClick={handleSingleMarkDelivered}
                  disabled={actionLoading}
                >
                  {actionLoading ? <FaSpinner className="spin" /> : null}
                  <span>Confirm Delivery</span>
                </button>
              </div>
            </div>
          </div>
        ) : null}

        {/* Bulk delivery modal */}
        {bulkModalOpen ? (
          <div className="delivery-tracking-modal-backdrop" onClick={closeBulkModal}>
            <div
              className="delivery-tracking-modal-card"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="delivery-tracking-modal-header">
                <h3>Bulk Mark Delivered</h3>
                <p>
                  You are about to deliver {selectedPrintedIds.length} printed applications.
                </p>
              </div>

              <div className="delivery-tracking-modal-body">
                <div className="delivery-tracking-modal-field">
                  <label>Delivery Note</label>
                  <textarea
                    rows={4}
                    value={bulkForm.deliveryNote}
                    onChange={(event) =>
                      setBulkForm((prev) => ({
                        ...prev,
                        deliveryNote: event.target.value
                      }))
                    }
                    placeholder="Write a bulk delivery note..."
                  />
                </div>

                <div className="delivery-tracking-modal-field">
                  <label>Delivery Reference</label>
                  <input
                    type="text"
                    value={bulkForm.deliveryReference}
                    onChange={(event) =>
                      setBulkForm((prev) => ({
                        ...prev,
                        deliveryReference: event.target.value
                      }))
                    }
                    placeholder="Enter delivery reference"
                  />
                </div>
              </div>

              <div className="delivery-tracking-modal-footer">
                <button
                  type="button"
                  className="delivery-tracking-secondary-button"
                  onClick={closeBulkModal}
                  disabled={actionLoading}
                >
                  Cancel
                </button>

                <button
                  type="button"
                  className="delivery-tracking-primary-button"
                  onClick={handleBulkMarkDelivered}
                  disabled={actionLoading}
                >
                  {actionLoading ? <FaSpinner className="spin" /> : null}
                  <span>Confirm Bulk Delivery</span>
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </AdminLayout>
  );
};

export default DeliveryTracking;