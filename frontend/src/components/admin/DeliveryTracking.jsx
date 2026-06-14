import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import {
  FaCheckCircle,
  FaCheckSquare,
  FaClipboardList,
  FaEye,
  FaSearch,
  FaSpinner,
  FaSquare,
  FaTruck
} from 'react-icons/fa';
import api from '../api/axios';
import AdminLayout from './AdminLayout';
import Loader from '../common/Loader';
import { formatDateTime, formatStatus } from '../utils/helpers';
import {
  getApplicantName,
  getApplicationsFromResponse,
  getDeliveryPhone,
  getDeliveryQueueDate,
  getDeliveryStatusClass,
  getDeliveryStatusLabel,
  getPaginationMeta,
  isActiveDeliveryRequest
} from './adminQueueUtils';
import '../styles/DeliveryTracking.css';

const PAGE_SIZE = 20;

const DeliveryTracking = () => {
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
  const [bulkModalOpen, setBulkModalOpen] = useState(false);
  const [bulkForm, setBulkForm] = useState({
    deliveryNote: '',
    deliveryReference: ''
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
        const response = await api.get('/admin/delivery/queue', {
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
            rows.some((item) => item._id === id && isActiveDeliveryRequest(item))
          )
        );
      } catch (error) {
        console.error('Error fetching delivery queue:', error);
        toast.error(error?.response?.data?.message || 'Failed to load delivery queue');
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
      const response = await api.get('/admin/delivery/stats');
      setStats(response?.data?.data || null);
    } catch (error) {
      console.error('Error fetching delivery stats:', error);
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

  const selectedActiveDeliveryIds = useMemo(
    () =>
      selectedIds.filter((id) =>
        applications.some((item) => item._id === id && isActiveDeliveryRequest(item))
      ),
    [applications, selectedIds]
  );

  const visibleActiveDeliveryIds = useMemo(
    () => applications.filter(isActiveDeliveryRequest).map((item) => item._id),
    [applications]
  );

  const statsCards = [
    {
      key: 'active',
      title: 'Active Delivery Requests',
      value: statsLoading ? '...' : stats?.activeDeliveryRequests ?? 0,
      theme: 'yellow',
      icon: FaClipboardList
    },
    {
      key: 'delivered',
      title: 'Delivered',
      value: statsLoading ? '...' : stats?.deliveredCount ?? 0,
      theme: 'green',
      icon: FaCheckCircle
    },
    {
      key: 'cancelled',
      title: 'Cancelled',
      value: statsLoading ? '...' : stats?.cancelledCount ?? 0,
      theme: 'red',
      icon: FaTruck
    }
  ];

  const toggleApplicationSelect = (applicationId) => {
    setSelectedIds((currentIds) =>
      currentIds.includes(applicationId)
        ? currentIds.filter((id) => id !== applicationId)
        : [...currentIds, applicationId]
    );
  };

  const toggleSelectVisibleActive = () => {
    const allSelected =
      visibleActiveDeliveryIds.length > 0 &&
      visibleActiveDeliveryIds.every((id) => selectedIds.includes(id));

    setSelectedIds((currentIds) =>
      allSelected
        ? currentIds.filter((id) => !visibleActiveDeliveryIds.includes(id))
        : [...new Set([...currentIds, ...visibleActiveDeliveryIds])]
    );
  };

  const clearFilters = () => {
    setSearchInput('');
    setDebouncedSearch('');
    setStatusFilter('');
    setTypeFilter('');
    setPage(1);
  };

  const closeBulkModal = () => {
    if (actionLoading) return;
    setBulkModalOpen(false);
    setBulkForm({ deliveryNote: '', deliveryReference: '' });
  };

  const handleBulkMarkDelivered = async () => {
    if (!selectedActiveDeliveryIds.length) return;

    try {
      setActionLoading(true);
      const response = await api.patch('/admin/delivery/bulk-mark-delivered', {
        applicationIds: selectedActiveDeliveryIds,
        actionNote: bulkForm.deliveryNote.trim(),
        deliveryReference: bulkForm.deliveryReference.trim()
      });
      const updatedCount = Number(response?.data?.updatedCount || 0);
      const skipped = Array.isArray(response?.data?.skipped) ? response.data.skipped : [];
      if (updatedCount > 0) {
        toast.success(`${updatedCount} delivery requests marked delivered`);
      }
      if (skipped.length > 0) {
        const firstSkipped = skipped[0];
        toast.warning(
          `${skipped.length} skipped. ${firstSkipped.applicationId || 'Application'}: ${firstSkipped.reason}`
        );
      }
      setSelectedIds([]);
      setBulkModalOpen(false);
      setBulkForm({ deliveryNote: '', deliveryReference: '' });
      setPage(1);
      await Promise.all([fetchApplications(1), fetchStats()]);
    } catch (error) {
      console.error('Error running bulk delivery:', error);
      toast.error(error?.response?.data?.message || 'Failed to run bulk delivery');
    } finally {
      setActionLoading(false);
    }
  };

  const openDetails = (applicationId) => {
    navigate(`/admin/delivery/${applicationId}`);
  };

  if (loading && applications.length === 0) {
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
        <div className="delivery-tracking-header-card">
          <div className="delivery-tracking-header-top">
            <div>
              <h1 className="delivery-tracking-title">Delivery Tracking</h1>
              <p className="delivery-tracking-subtitle">
                Earliest active paid delivery requests appear first.
              </p>
            </div>

            <button
              type="button"
              className="delivery-tracking-primary-button"
              onClick={() => setBulkModalOpen(true)}
              disabled={!selectedActiveDeliveryIds.length}
            >
              <FaTruck />
              <span>Bulk Mark Delivered ({selectedActiveDeliveryIds.length})</span>
            </button>
          </div>

          <div className="delivery-tracking-stats-grid">
            {statsCards.map((item) => {
              const StatIcon = item.icon;
              return (
                <div key={item.key} className={`delivery-tracking-stat-card ${item.theme}`}>
                  <div className="delivery-tracking-stat-icon">
                    <StatIcon />
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

        <div className="delivery-tracking-toolbar">
          <div className="delivery-tracking-search-box">
            <FaSearch className="delivery-tracking-field-icon" />
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

          <div className="delivery-tracking-filter-row">
            <div className="delivery-tracking-filter-group">
              <select
                value={statusFilter}
                onChange={(event) => {
                  setStatusFilter(event.target.value);
                  setPage(1);
                }}
              >
                <option value="">All Status</option>
                <option value="printed">Ready for Delivery</option>
                <option value="delivered">Delivered</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>

            <div className="delivery-tracking-filter-group">
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
            </div>

            <button
              type="button"
              className="delivery-tracking-secondary-button"
              onClick={toggleSelectVisibleActive}
              disabled={!visibleActiveDeliveryIds.length}
            >
              {visibleActiveDeliveryIds.length > 0 &&
              visibleActiveDeliveryIds.every((id) => selectedIds.includes(id))
                ? 'Unselect Visible Active'
                : 'Select Visible Active'}
            </button>

            <button type="button" className="delivery-tracking-secondary-button" onClick={clearFilters}>
              Clear Filters
            </button>
          </div>
        </div>

        <section className="delivery-tracking-list-card">
          <div className="delivery-tracking-card-header">
            <div>
              <h3>Delivery Workflow Applications</h3>
              <p>
                Showing {applications.length} of {meta.total} applications
              </p>
            </div>
          </div>

          <div className="delivery-tracking-table-header" aria-hidden="true">
            <span />
            <span>Application ID</span>
            <span>Applicant</span>
            <span>Type</span>
            <span>Contact Phone</span>
            <span>Request / Payment Date</span>
            <span>Delivery Status</span>
            <span>Action</span>
          </div>

          {applications.length === 0 ? (
            <div className="delivery-tracking-empty-state">
              <FaTruck className="delivery-tracking-empty-icon" />
              <h3>No delivery requests are ready.</h3>
              <p>Change the search or filters to review completed delivery records.</p>
            </div>
          ) : (
            <div className="delivery-tracking-list">
              {applications.map((item) => {
                const isSelected = selectedIds.includes(item._id);
                const isDeliveryActive = isActiveDeliveryRequest(item);

                return (
                  <div
                    key={item._id}
                    className="delivery-tracking-list-item"
                    role="button"
                    tabIndex={0}
                    onClick={() => openDetails(item._id)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        openDetails(item._id);
                      }
                    }}
                  >
                    <button
                      type="button"
                      className={isSelected ? 'delivery-tracking-check-button selected' : 'delivery-tracking-check-button'}
                      onClick={(event) => {
                        event.stopPropagation();
                        if (isDeliveryActive) toggleApplicationSelect(item._id);
                      }}
                      disabled={!isDeliveryActive}
                      aria-label={isDeliveryActive ? 'Select delivery request' : 'Delivery request is not active'}
                    >
                      {isSelected ? <FaCheckSquare /> : <FaSquare />}
                    </button>

                    <div className="delivery-tracking-table-cell application-id" data-label="Application ID">
                      <strong>{item.applicationId || item._id}</strong>
                      {item.deliveryInfo?.requestId ? <small>Request {item.deliveryInfo.requestId}</small> : null}
                    </div>

                    <div className="delivery-tracking-table-cell applicant" data-label="Applicant">
                      <strong>{getApplicantName(item)}</strong>
                      <small>{item.email || item.applicant?.email || 'Email not recorded'}</small>
                    </div>

                    <div className="delivery-tracking-table-cell" data-label="Type">
                      <span>{formatStatus(item.applicationType || 'new')}</span>
                    </div>

                    <div className="delivery-tracking-table-cell" data-label="Contact Phone">
                      <strong>{getDeliveryPhone(item)}</strong>
                    </div>

                    <div className="delivery-tracking-table-cell" data-label="Request / Payment Date">
                      <strong>
                        {getDeliveryQueueDate(item)
                          ? formatDateTime(getDeliveryQueueDate(item))
                          : 'Not recorded'}
                      </strong>
                    </div>

                    <div className="delivery-tracking-table-cell status" data-label="Delivery Status">
                      <span className={`delivery-tracking-status-chip ${getDeliveryStatusClass(item)}`}>
                        {getDeliveryStatusLabel(item)}
                      </span>
                    </div>

                    <button
                      type="button"
                      className="delivery-tracking-view-button"
                      onClick={(event) => {
                        event.stopPropagation();
                        openDetails(item._id);
                      }}
                      aria-label="View delivery details"
                    >
                      <FaEye />
                      <span>View</span>
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          <div className="delivery-tracking-pagination">
            <span>
              Page {meta.page} of {meta.totalPages}
            </span>
            <div>
              <button
                type="button"
                className="delivery-tracking-secondary-button"
                disabled={meta.page <= 1 || loading}
                onClick={() => setPage((current) => Math.max(1, current - 1))}
              >
                Previous
              </button>
              <button
                type="button"
                className="delivery-tracking-secondary-button"
                disabled={meta.page >= meta.totalPages || loading}
                onClick={() => setPage((current) => current + 1)}
              >
                Next
              </button>
            </div>
          </div>
        </section>

        {bulkModalOpen ? (
          <div className="delivery-tracking-modal-backdrop" onClick={closeBulkModal}>
            <div className="delivery-tracking-modal-card" onClick={(event) => event.stopPropagation()}>
              <div className="delivery-tracking-modal-header">
                <h3>Bulk Mark Delivered</h3>
                <p>Complete {selectedActiveDeliveryIds.length} active delivery requests.</p>
              </div>

              <div className="delivery-tracking-modal-body">
                <div className="delivery-tracking-modal-field">
                  <label>Delivery Note</label>
                  <textarea
                    rows={4}
                    value={bulkForm.deliveryNote}
                    onChange={(event) =>
                      setBulkForm((current) => ({ ...current, deliveryNote: event.target.value }))
                    }
                    placeholder="Write a delivery note..."
                  />
                </div>

                <div className="delivery-tracking-modal-field">
                  <label>Delivery Reference</label>
                  <input
                    type="text"
                    value={bulkForm.deliveryReference}
                    onChange={(event) =>
                      setBulkForm((current) => ({ ...current, deliveryReference: event.target.value }))
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
                  {actionLoading ? <FaSpinner className="spin" /> : <FaTruck />}
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
