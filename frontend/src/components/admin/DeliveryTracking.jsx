import React, { useState, useEffect, useMemo } from 'react';
import { toast } from 'react-toastify';
import {
  FaTruck,
  FaSearch,
  FaFilter,
  FaEye,
  FaTimes,
  FaCheck,
  FaSpinner,
  FaMapMarkerAlt,
  FaCalendarAlt,
  FaUser,
  FaIdCard,
  FaBox,
  FaShippingFast,
  FaHome,
  FaClock,
  FaEdit,
  FaBarcode,
  FaPhone,
  FaExclamationTriangle,
  FaSyncAlt,
  FaChevronLeft,
  FaChevronRight,
  FaFileExport,
  FaPrint,
  FaCheckCircle,
  FaTimesCircle,
  FaHourglassHalf
} from 'react-icons/fa';
import api from '../api/axios';
import AdminLayout from './AdminLayout';
import Loader from '../common/Loader';
import { formatDate, formatDateTime } from '../utils/helpers';
import '../styles/DeliveryTracking.css';

const DeliveryTracking = () => {
  // State management
  const [deliveries, setDeliveries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [selectedDelivery, setSelectedDelivery] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showUpdateModal, setShowUpdateModal] = useState(false);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalDeliveries, setTotalDeliveries] = useState(0);
  const deliveriesPerPage = 15;

  // Filters
  const [filters, setFilters] = useState({
    status: '',
    deliveryStatus: '',
    searchQuery: '',
    startDate: '',
    endDate: ''
  });

  // Update form state
  const [updateForm, setUpdateForm] = useState({
    trackingNumber: '',
    deliveryStatus: '',
    deliveryNotes: '',
    estimatedDeliveryDate: ''
  });

  // Statistics
  const [stats, setStats] = useState({
    totalApproved: 0,
    printing: 0,
    dispatched: 0,
    inTransit: 0,
    delivered: 0,
    pending: 0
  });

  useEffect(() => {
    fetchDeliveries();
    fetchStats();
  }, [currentPage, filters]);

  const requestWithFallback = async (requests = []) => {
    let lastError = null;

    for (const requestFn of requests) {
      try {
        return await requestFn();
      } catch (error) {
        lastError = error;
      }
    }

    throw lastError;
  };

  const getDeliveryUser = (delivery) => {
    return (
      delivery?.userId ||
      delivery?.user ||
      delivery?.applicant ||
      delivery?.createdBy ||
      {}
    );
  };

  const getApplicationNumber = (delivery) => {
    return (
      delivery?.applicationNumber ||
      delivery?.applicationId ||
      delivery?.application?.applicationId ||
      delivery?.application?.applicationNumber ||
      'N/A'
    );
  };

  const getApplicationType = (delivery) => {
    return (
      delivery?.applicationType ||
      delivery?.application?.applicationType ||
      'N/A'
    );
  };

  const getDeliveryAddressText = (delivery) => {
    const user = getDeliveryUser(delivery);
    const address = user?.presentAddress || user?.permanentAddress || {};

    return [address.district, address.division].filter(Boolean).join(', ') || 'N/A';
  };

  const normalizeDeliveryListResponse = (response) => {
    const responseData = response?.data || {};

    const items =
      responseData.data ||
      responseData.deliveries ||
      responseData.applications ||
      responseData.items ||
      [];

    const total =
      responseData.total ||
      responseData.pagination?.total ||
      responseData.count ||
      items.length ||
      0;

    return {
      items,
      total
    };
  };

  const fetchSingleDelivery = async (deliveryId) => {
    const response = await requestWithFallback([
      () => api.get(`/admin/delivery/${deliveryId}`),
      () => api.get(`/admin/deliveries/${deliveryId}`),
      () => api.get(`/admin/applications/${deliveryId}`)
    ]);

    return response?.data?.delivery || response?.data?.application || response?.data?.data || response?.data;
  };

  const fetchDeliveries = async () => {
    try {
      setLoading(true);

      const queryParams = new URLSearchParams();
      queryParams.set('page', currentPage);
      queryParams.set('limit', deliveriesPerPage);

      if (filters.status) queryParams.set('status', filters.status);
      if (filters.deliveryStatus) queryParams.set('deliveryStatus', filters.deliveryStatus);
      if (filters.searchQuery) queryParams.set('search', filters.searchQuery);
      if (filters.startDate) queryParams.set('startDate', filters.startDate);
      if (filters.endDate) queryParams.set('endDate', filters.endDate);

      const queryString = queryParams.toString();

      const response = await requestWithFallback([
        () => api.get(`/admin/delivery?${queryString}`),
        () => api.get(`/admin/deliveries?${queryString}`),
        () => api.get(`/admin/delivery/queue?${queryString}`)
      ]);

      const { items, total } = normalizeDeliveryListResponse(response);

      setDeliveries(items);
      setTotalDeliveries(total);
      setTotalPages(Math.max(1, Math.ceil(total / deliveriesPerPage)));
    } catch (error) {
      console.error('Error fetching deliveries:', error);
      toast.error(error?.response?.data?.message || 'Failed to load delivery data');
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await requestWithFallback([
        () => api.get('/admin/delivery/stats'),
        () => api.get('/admin/deliveries/stats')
      ]);

      setStats(
        response?.data?.data || {
          totalApproved: 0,
          printing: 0,
          dispatched: 0,
          inTransit: 0,
          delivered: 0,
          pending: 0
        }
      );
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setCurrentPage(1);
  };

  const handleClearFilters = () => {
    setFilters({
      status: '',
      deliveryStatus: '',
      searchQuery: '',
      startDate: '',
      endDate: ''
    });
    setCurrentPage(1);
  };

  // Move to printing
  const handleMoveToPrinting = async (applicationId) => {
    setActionLoading(true);
    try {
      await requestWithFallback([
        () => api.put(`/admin/applications/${applicationId}/printing`),
        () => api.patch(`/admin/applications/${applicationId}/printing`),
        () => api.put(`/admin/printing/${applicationId}/start`)
      ]);

      toast.success('Moved to printing queue');
      fetchDeliveries();
      fetchStats();
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Failed to update status');
    } finally {
      setActionLoading(false);
    }
  };

  // Dispatch card
  const handleDispatch = (delivery) => {
    setSelectedDelivery(delivery);
    setUpdateForm({
      trackingNumber: delivery?.trackingNumber || `TRK${Date.now()}`,
      deliveryStatus: delivery?.deliveryStatus || 'in_transit',
      deliveryNotes: '',
      estimatedDeliveryDate: ''
    });
    setShowUpdateModal(true);
  };

  // Update delivery status
  const handleUpdateDelivery = async (e) => {
    e.preventDefault();

    if (!selectedDelivery) return;

    setActionLoading(true);
    try {
      await requestWithFallback([
        () =>
          api.put(`/admin/delivery/${selectedDelivery._id}/dispatch`, {
            trackingNumber: updateForm.trackingNumber,
            deliveryStatus: updateForm.deliveryStatus,
            deliveryNotes: updateForm.deliveryNotes,
            estimatedDeliveryDate: updateForm.estimatedDeliveryDate
          }),
        () =>
          api.put(`/admin/deliveries/${selectedDelivery._id}/dispatch`, {
            trackingNumber: updateForm.trackingNumber,
            deliveryStatus: updateForm.deliveryStatus,
            deliveryNotes: updateForm.deliveryNotes,
            estimatedDeliveryDate: updateForm.estimatedDeliveryDate
          }),
        () =>
          api.put(`/admin/applications/${selectedDelivery._id}/dispatch`, {
            trackingNumber: updateForm.trackingNumber,
            deliveryStatus: updateForm.deliveryStatus,
            deliveryNotes: updateForm.deliveryNotes,
            estimatedDeliveryDate: updateForm.estimatedDeliveryDate
          }),
        () =>
          api.patch(`/admin/applications/${selectedDelivery._id}/dispatch`, {
            trackingNumber: updateForm.trackingNumber,
            deliveryStatus: updateForm.deliveryStatus,
            deliveryNotes: updateForm.deliveryNotes,
            estimatedDeliveryDate: updateForm.estimatedDeliveryDate
          })
      ]);

      toast.success('Delivery status updated successfully');
      setShowUpdateModal(false);
      setSelectedDelivery(null);
      fetchDeliveries();
      fetchStats();
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Failed to update delivery');
    } finally {
      setActionLoading(false);
    }
  };

  // Mark as delivered
  const handleMarkDelivered = async (applicationId) => {
    if (!window.confirm('Confirm that this card has been delivered?')) return;

    setActionLoading(true);
    try {
      await requestWithFallback([
        () => api.put(`/admin/delivery/${applicationId}/delivered`),
        () => api.put(`/admin/deliveries/${applicationId}/delivered`),
        () => api.put(`/admin/applications/${applicationId}/delivered`),
        () => api.patch(`/admin/applications/${applicationId}/delivered`)
      ]);

      toast.success('Marked as delivered');
      fetchDeliveries();
      fetchStats();
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Failed to update status');
    } finally {
      setActionLoading(false);
    }
  };

  // View details
  const handleViewDetails = async (delivery) => {
    try {
      setActionLoading(true);
      const fullDelivery = await fetchSingleDelivery(delivery._id);
      setSelectedDelivery(fullDelivery || delivery);
      setShowDetailModal(true);
    } catch (error) {
      console.error('Error loading delivery details:', error);
      setSelectedDelivery(delivery);
      setShowDetailModal(true);
    } finally {
      setActionLoading(false);
    }
  };

  // Get status icon
  const getStatusIcon = (status) => {
    switch (status) {
      case 'approved':
        return <FaCheckCircle className="status-icon approved" />;
      case 'printing':
        return <FaPrint className="status-icon printing" />;
      case 'dispatched':
        return <FaShippingFast className="status-icon dispatched" />;
      case 'delivered':
        return <FaHome className="status-icon delivered" />;
      default:
        return <FaHourglassHalf className="status-icon pending" />;
    }
  };

  // Get delivery status badge
  const getDeliveryStatusBadge = (status) => {
    const statusConfig = {
      pending: { label: 'Pending', class: 'pending', icon: FaClock },
      in_transit: { label: 'In Transit', class: 'in-transit', icon: FaTruck },
      delivered: { label: 'Delivered', class: 'delivered', icon: FaCheckCircle },
      failed: { label: 'Failed', class: 'failed', icon: FaTimesCircle }
    };

    const config = statusConfig[status] || statusConfig.pending;
    const Icon = config.icon;

    return (
      <span className={`delivery-badge ${config.class}`}>
        <Icon /> {config.label}
      </span>
    );
  };

  // Generate tracking timeline
  const getTrackingTimeline = (delivery) => {
    const timeline = [];

    if (delivery.reviewedAt) {
      timeline.push({
        status: 'Approved',
        date: delivery.reviewedAt,
        description: 'Application approved by admin',
        icon: FaCheckCircle,
        completed: true
      });
    }

    if (delivery.printedAt) {
      timeline.push({
        status: 'Printed',
        date: delivery.printedAt,
        description: `Card printed. Batch: ${delivery.printBatchNumber || 'N/A'}`,
        icon: FaPrint,
        completed: true
      });
    }

    if (delivery.dispatchedAt) {
      timeline.push({
        status: 'Dispatched',
        date: delivery.dispatchedAt,
        description: `Dispatched for delivery. Tracking: ${delivery.trackingNumber || 'N/A'}`,
        icon: FaShippingFast,
        completed: true
      });
    }

    if (delivery.deliveryStatus === 'in_transit') {
      timeline.push({
        status: 'In Transit',
        date: null,
        description: 'Package is on the way',
        icon: FaTruck,
        completed: false,
        current: true
      });
    }

    if (delivery.deliveredAt) {
      timeline.push({
        status: 'Delivered',
        date: delivery.deliveredAt,
        description: 'Successfully delivered to recipient',
        icon: FaHome,
        completed: true
      });
    }

    return timeline;
  };

  const filteredDeliveries = useMemo(() => {
    if (!filters.searchQuery) return deliveries;

    const query = filters.searchQuery.toLowerCase();

    return deliveries.filter((delivery) => {
      const user = getDeliveryUser(delivery);

      return (
        getApplicationNumber(delivery).toLowerCase().includes(query) ||
        (user?.fullName || '').toLowerCase().includes(query) ||
        (user?.mobile || user?.phone || '').toLowerCase().includes(query) ||
        (delivery?.trackingNumber || '').toLowerCase().includes(query) ||
        (delivery?.nidNumber || '').toLowerCase().includes(query)
      );
    });
  }, [deliveries, filters.searchQuery]);

  // Export deliveries
  const handleExport = async () => {
    try {
      toast.info('Preparing export...');

      const response = await requestWithFallback([
        () =>
          api.get('/admin/delivery/export', {
            params: filters,
            responseType: 'blob'
          }),
        () =>
          api.get('/admin/deliveries/export', {
            params: filters,
            responseType: 'blob'
          })
      ]);

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `deliveries-${formatDate(new Date())}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();

      toast.success('Export completed');
    } catch (error) {
      toast.error('Failed to export data');
    }
  };

  if (loading && deliveries.length === 0) {
    return (
      <AdminLayout>
        <div className="admin-loading">
          <Loader size="large" text="Loading delivery data..." />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="delivery-tracking-page">
        {/* Page Header */}
        <div className="page-header">
          <div className="header-content">
            <h1><FaTruck /> Delivery Tracking</h1>
            <p>Track and manage NID card deliveries</p>
          </div>
          <div className="header-actions">
            <button
              className="btn btn-outline"
              onClick={handleExport}
            >
              <FaFileExport /> Export
            </button>
            <button
              className="btn btn-primary"
              onClick={() => {
                fetchDeliveries();
                fetchStats();
              }}
            >
              <FaSyncAlt /> Refresh
            </button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="stats-row">
          <div className="stat-card stat-approved">
            <div className="stat-icon-wrapper">
              <FaCheckCircle />
            </div>
            <div className="stat-info">
              <span className="stat-value">{stats.totalApproved || 0}</span>
              <span className="stat-label">Total Approved</span>
            </div>
          </div>

          <div className="stat-card stat-printing">
            <div className="stat-icon-wrapper">
              <FaPrint />
            </div>
            <div className="stat-info">
              <span className="stat-value">{stats.printing || 0}</span>
              <span className="stat-label">In Printing</span>
            </div>
          </div>

          <div className="stat-card stat-dispatched">
            <div className="stat-icon-wrapper">
              <FaShippingFast />
            </div>
            <div className="stat-info">
              <span className="stat-value">{stats.dispatched || 0}</span>
              <span className="stat-label">Dispatched</span>
            </div>
          </div>

          <div className="stat-card stat-transit">
            <div className="stat-icon-wrapper">
              <FaTruck />
            </div>
            <div className="stat-info">
              <span className="stat-value">{stats.inTransit || 0}</span>
              <span className="stat-label">In Transit</span>
            </div>
          </div>

          <div className="stat-card stat-delivered">
            <div className="stat-icon-wrapper">
              <FaHome />
            </div>
            <div className="stat-info">
              <span className="stat-value">{stats.delivered || 0}</span>
              <span className="stat-label">Delivered</span>
            </div>
          </div>
        </div>

        {/* Filters Section */}
        <div className="filters-card">
          <div className="filters-header">
            <h3><FaFilter /> Filters</h3>
            {Object.values(filters).some((v) => v) && (
              <button
                className="clear-filters-btn"
                onClick={handleClearFilters}
              >
                <FaTimes /> Clear All
              </button>
            )}
          </div>

          <div className="filters-grid">
            {/* Search */}
            <div className="filter-item filter-search">
              <label>Search</label>
              <div className="search-input">
                <FaSearch />
                <input
                  type="text"
                  placeholder="Search by NID #, name, tracking..."
                  value={filters.searchQuery}
                  onChange={(e) => handleFilterChange('searchQuery', e.target.value)}
                />
              </div>
            </div>

            {/* Application Status Filter */}
            <div className="filter-item">
              <label>Application Status</label>
              <select
                value={filters.status}
                onChange={(e) => handleFilterChange('status', e.target.value)}
              >
                <option value="">All Status</option>
                <option value="approved">Approved</option>
                <option value="printing">Printing</option>
                <option value="dispatched">Dispatched</option>
                <option value="delivered">Delivered</option>
              </select>
            </div>

            {/* Delivery Status Filter */}
            <div className="filter-item">
              <label>Delivery Status</label>
              <select
                value={filters.deliveryStatus}
                onChange={(e) => handleFilterChange('deliveryStatus', e.target.value)}
              >
                <option value="">All</option>
                <option value="pending">Pending</option>
                <option value="in_transit">In Transit</option>
                <option value="delivered">Delivered</option>
                <option value="failed">Failed</option>
              </select>
            </div>

            {/* Start Date */}
            <div className="filter-item">
              <label>From Date</label>
              <input
                type="date"
                value={filters.startDate}
                onChange={(e) => handleFilterChange('startDate', e.target.value)}
              />
            </div>

            {/* End Date */}
            <div className="filter-item">
              <label>To Date</label>
              <input
                type="date"
                value={filters.endDate}
                onChange={(e) => handleFilterChange('endDate', e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Deliveries Table */}
        <div className="deliveries-card">
          <div className="card-header">
            <h3><FaBox /> Delivery Queue</h3>
            <span className="deliveries-count">{totalDeliveries} records</span>
          </div>

          <div className="table-container">
            <table className="deliveries-table">
              <thead>
                <tr>
                  <th>Application</th>
                  <th>Recipient</th>
                  <th>NID Number</th>
                  <th>Status</th>
                  <th>Delivery Status</th>
                  <th>Tracking #</th>
                  <th>Address</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="8" className="loading-row">
                      <Loader size="small" />
                    </td>
                  </tr>
                ) : filteredDeliveries.length === 0 ? (
                  <tr>
                    <td colSpan="8" className="empty-row">
                      <FaTruck className="empty-icon" />
                      <p>No delivery records found</p>
                      {Object.values(filters).some((v) => v) && (
                        <button
                          className="btn btn-sm btn-outline"
                          onClick={handleClearFilters}
                        >
                          Clear Filters
                        </button>
                      )}
                    </td>
                  </tr>
                ) : (
                  filteredDeliveries.map((delivery) => {
                    const user = getDeliveryUser(delivery);

                    return (
                      <tr key={delivery._id}>
                        <td>
                          <div className="application-cell">
                            <span className="app-number">#{getApplicationNumber(delivery)}</span>
                            <span className="app-type">{getApplicationType(delivery)}</span>
                          </div>
                        </td>
                        <td>
                          <div className="recipient-cell">
                            <span className="recipient-name">{user?.fullName || 'N/A'}</span>
                            <span className="recipient-phone">
                              <FaPhone /> {user?.mobile || user?.phone || 'N/A'}
                            </span>
                          </div>
                        </td>
                        <td>
                          <span className="nid-number">
                            {delivery.nidNumber || 'Not Generated'}
                          </span>
                        </td>
                        <td>
                          <div className="status-cell">
                            {getStatusIcon(delivery.status)}
                            <span className={`status-text ${delivery.status}`}>
                              {delivery.status?.replace('_', ' ')}
                            </span>
                          </div>
                        </td>
                        <td>
                          {getDeliveryStatusBadge(delivery.deliveryStatus)}
                        </td>
                        <td>
                          <div className="tracking-cell">
                            {delivery.trackingNumber ? (
                              <>
                                <FaBarcode />
                                <span>{delivery.trackingNumber}</span>
                              </>
                            ) : (
                              <span className="no-tracking">Not assigned</span>
                            )}
                          </div>
                        </td>
                        <td>
                          <div className="address-cell">
                            <FaMapMarkerAlt />
                            <span>{getDeliveryAddressText(delivery)}</span>
                          </div>
                        </td>
                        <td>
                          <div className="action-buttons">
                            {/* View Details */}
                            <button
                              className="btn-action btn-view"
                              onClick={() => handleViewDetails(delivery)}
                              title="View Details"
                            >
                              <FaEye />
                            </button>

                            {/* Move to Printing */}
                            {delivery.status === 'approved' && (
                              <button
                                className="btn-action btn-print"
                                onClick={() => handleMoveToPrinting(delivery._id)}
                                title="Move to Printing"
                                disabled={actionLoading}
                              >
                                <FaPrint />
                              </button>
                            )}

                            {/* Dispatch */}
                            {delivery.status === 'printing' && (
                              <button
                                className="btn-action btn-dispatch"
                                onClick={() => handleDispatch(delivery)}
                                title="Dispatch"
                                disabled={actionLoading}
                              >
                                <FaShippingFast />
                              </button>
                            )}

                            {/* Mark Delivered */}
                            {delivery.status === 'dispatched' && delivery.deliveryStatus === 'in_transit' && (
                              <button
                                className="btn-action btn-deliver"
                                onClick={() => handleMarkDelivered(delivery._id)}
                                title="Mark as Delivered"
                                disabled={actionLoading}
                              >
                                <FaCheck />
                              </button>
                            )}

                            {/* Update Delivery */}
                            {['dispatched'].includes(delivery.status) && (
                              <button
                                className="btn-action btn-edit"
                                onClick={() => {
                                  setSelectedDelivery(delivery);
                                  setUpdateForm({
                                    trackingNumber: delivery.trackingNumber || '',
                                    deliveryStatus: delivery.deliveryStatus || 'pending',
                                    deliveryNotes: '',
                                    estimatedDeliveryDate: ''
                                  });
                                  setShowUpdateModal(true);
                                }}
                                title="Update Delivery"
                                disabled={actionLoading}
                              >
                                <FaEdit />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="pagination">
              <div className="pagination-info">
                Showing {((currentPage - 1) * deliveriesPerPage) + 1} to {Math.min(currentPage * deliveriesPerPage, totalDeliveries)} of {totalDeliveries}
              </div>
              <div className="pagination-controls">
                <button
                  className="pagination-btn"
                  onClick={() => setCurrentPage(1)}
                  disabled={currentPage === 1}
                >
                  First
                </button>
                <button
                  className="pagination-btn"
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                >
                  <FaChevronLeft />
                </button>

                <div className="page-numbers">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum;
                    if (totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (currentPage <= 3) {
                      pageNum = i + 1;
                    } else if (currentPage >= totalPages - 2) {
                      pageNum = totalPages - 4 + i;
                    } else {
                      pageNum = currentPage - 2 + i;
                    }

                    return (
                      <button
                        key={pageNum}
                        className={`page-btn ${currentPage === pageNum ? 'active' : ''}`}
                        onClick={() => setCurrentPage(pageNum)}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                </div>

                <button
                  className="pagination-btn"
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                >
                  <FaChevronRight />
                </button>
                <button
                  className="pagination-btn"
                  onClick={() => setCurrentPage(totalPages)}
                  disabled={currentPage === totalPages}
                >
                  Last
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Delivery Details Modal */}
        {showDetailModal && selectedDelivery && (
          <div className="modal-overlay" onClick={() => setShowDetailModal(false)}>
            <div className="modal modal-lg" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h3><FaTruck /> Delivery Details</h3>
                <button
                  className="modal-close"
                  onClick={() => setShowDetailModal(false)}
                >
                  <FaTimes />
                </button>
              </div>

              <div className="modal-body">
                <div className="delivery-details">
                  {/* Status Banner */}
                  <div className={`status-banner status-${selectedDelivery.status}`}>
                    <div className="status-icon-large">
                      {getStatusIcon(selectedDelivery.status)}
                    </div>
                    <div className="status-info">
                      <h4>{selectedDelivery.status?.replace('_', ' ').toUpperCase()}</h4>
                      <span>Application #{getApplicationNumber(selectedDelivery)}</span>
                    </div>
                    <div className="delivery-status-badge">
                      {getDeliveryStatusBadge(selectedDelivery.deliveryStatus)}
                    </div>
                  </div>

                  {/* Tracking Timeline */}
                  <div className="detail-section">
                    <h4><FaClock /> Tracking Timeline</h4>
                    <div className="tracking-timeline">
                      {getTrackingTimeline(selectedDelivery).map((item, index) => (
                        <div
                          key={index}
                          className={`timeline-item ${item.completed ? 'completed' : ''} ${item.current ? 'current' : ''}`}
                        >
                          <div className="timeline-icon">
                            <item.icon />
                          </div>
                          <div className="timeline-content">
                            <h5>{item.status}</h5>
                            <p>{item.description}</p>
                            {item.date && (
                              <span className="timeline-date">{formatDateTime(item.date)}</span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Recipient Information */}
                  <div className="detail-section">
                    <h4><FaUser /> Recipient Information</h4>
                    <div className="detail-grid">
                      <div className="detail-item">
                        <label>Full Name</label>
                        <p>{getDeliveryUser(selectedDelivery)?.fullName || 'N/A'}</p>
                      </div>
                      <div className="detail-item">
                        <label>Name (Bangla)</label>
                        <p>{getDeliveryUser(selectedDelivery)?.fullNameBangla || 'N/A'}</p>
                      </div>
                      <div className="detail-item">
                        <label>Mobile Number</label>
                        <p>
                          <FaPhone /> {getDeliveryUser(selectedDelivery)?.mobile || getDeliveryUser(selectedDelivery)?.phone || 'N/A'}
                        </p>
                      </div>
                      <div className="detail-item">
                        <label>Email</label>
                        <p>{getDeliveryUser(selectedDelivery)?.email || 'N/A'}</p>
                      </div>
                    </div>
                  </div>

                  {/* Delivery Address */}
                  <div className="detail-section">
                    <h4><FaMapMarkerAlt /> Delivery Address</h4>
                    <div className="address-card">
                      <div className="address-icon">
                        <FaHome />
                      </div>
                      <div className="address-content">
                        <p className="address-line">
                          {getDeliveryUser(selectedDelivery)?.presentAddress?.village && `${getDeliveryUser(selectedDelivery).presentAddress.village}, `}
                          {getDeliveryUser(selectedDelivery)?.presentAddress?.union && `${getDeliveryUser(selectedDelivery).presentAddress.union}, `}
                          {getDeliveryUser(selectedDelivery)?.presentAddress?.upazila}
                        </p>
                        <p className="address-line">
                          {getDeliveryUser(selectedDelivery)?.presentAddress?.district}, {getDeliveryUser(selectedDelivery)?.presentAddress?.division}
                        </p>
                        {getDeliveryUser(selectedDelivery)?.presentAddress?.postCode && (
                          <p className="address-postcode">
                            Post Code: {getDeliveryUser(selectedDelivery).presentAddress.postCode}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* NID Card Information */}
                  <div className="detail-section">
                    <h4><FaIdCard /> NID Card Information</h4>
                    <div className="detail-grid">
                      <div className="detail-item">
                        <label>NID Number</label>
                        <p className="nid-number-large">{selectedDelivery.nidNumber || 'Not Generated'}</p>
                      </div>
                      <div className="detail-item">
                        <label>Application Type</label>
                        <p>{String(getApplicationType(selectedDelivery)).toUpperCase()}</p>
                      </div>
                      {(selectedDelivery.printBatchNumber || selectedDelivery.printBatch?.batchNumber) && (
                        <div className="detail-item">
                          <label>Print Batch</label>
                          <p>{selectedDelivery.printBatchNumber || selectedDelivery.printBatch?.batchNumber}</p>
                        </div>
                      )}
                      {selectedDelivery.trackingNumber && (
                        <div className="detail-item">
                          <label>Tracking Number</label>
                          <p className="tracking-number">
                            <FaBarcode /> {selectedDelivery.trackingNumber}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Timestamps */}
                  <div className="detail-section">
                    <h4><FaCalendarAlt /> Important Dates</h4>
                    <div className="detail-grid">
                      <div className="detail-item">
                        <label>Approved On</label>
                        <p>{selectedDelivery.reviewedAt ? formatDateTime(selectedDelivery.reviewedAt) : 'N/A'}</p>
                      </div>
                      <div className="detail-item">
                        <label>Printed On</label>
                        <p>{selectedDelivery.printedAt ? formatDateTime(selectedDelivery.printedAt) : 'N/A'}</p>
                      </div>
                      <div className="detail-item">
                        <label>Dispatched On</label>
                        <p>{selectedDelivery.dispatchedAt ? formatDateTime(selectedDelivery.dispatchedAt) : 'N/A'}</p>
                      </div>
                      <div className="detail-item">
                        <label>Delivered On</label>
                        <p>{selectedDelivery.deliveredAt ? formatDateTime(selectedDelivery.deliveredAt) : 'Pending'}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="modal-footer">
                {selectedDelivery.status === 'approved' && (
                  <button
                    className="btn btn-primary"
                    onClick={() => {
                      handleMoveToPrinting(selectedDelivery._id);
                      setShowDetailModal(false);
                    }}
                    disabled={actionLoading}
                  >
                    <FaPrint /> Move to Printing
                  </button>
                )}
                {selectedDelivery.status === 'printing' && (
                  <button
                    className="btn btn-primary"
                    onClick={() => {
                      setShowDetailModal(false);
                      handleDispatch(selectedDelivery);
                    }}
                    disabled={actionLoading}
                  >
                    <FaShippingFast /> Dispatch
                  </button>
                )}
                {selectedDelivery.status === 'dispatched' && selectedDelivery.deliveryStatus !== 'delivered' && (
                  <button
                    className="btn btn-success"
                    onClick={() => {
                      handleMarkDelivered(selectedDelivery._id);
                      setShowDetailModal(false);
                    }}
                    disabled={actionLoading}
                  >
                    <FaCheck /> Mark as Delivered
                  </button>
                )}
                <button
                  className="btn btn-outline"
                  onClick={() => setShowDetailModal(false)}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Update Delivery Modal */}
        {showUpdateModal && selectedDelivery && (
          <div className="modal-overlay" onClick={() => setShowUpdateModal(false)}>
            <div className="modal" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h3><FaEdit /> Update Delivery Status</h3>
                <button
                  className="modal-close"
                  onClick={() => setShowUpdateModal(false)}
                >
                  <FaTimes />
                </button>
              </div>

              <form onSubmit={handleUpdateDelivery}>
                <div className="modal-body">
                  <div className="update-info">
                    <p>Updating delivery for:</p>
                    <strong>#{getApplicationNumber(selectedDelivery)}</strong>
                    <span>{getDeliveryUser(selectedDelivery)?.fullName}</span>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Tracking Number *</label>
                    <div className="input-with-icon">
                      <FaBarcode />
                      <input
                        type="text"
                        className="form-input"
                        placeholder="Enter tracking number"
                        value={updateForm.trackingNumber}
                        onChange={(e) => setUpdateForm({ ...updateForm, trackingNumber: e.target.value })}
                        required
                      />
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Delivery Status *</label>
                    <select
                      className="form-select"
                      value={updateForm.deliveryStatus}
                      onChange={(e) => setUpdateForm({ ...updateForm, deliveryStatus: e.target.value })}
                      required
                    >
                      <option value="pending">Pending</option>
                      <option value="in_transit">In Transit</option>
                      <option value="delivered">Delivered</option>
                      <option value="failed">Failed</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Estimated Delivery Date</label>
                    <input
                      type="date"
                      className="form-input"
                      value={updateForm.estimatedDeliveryDate}
                      onChange={(e) => setUpdateForm({ ...updateForm, estimatedDeliveryDate: e.target.value })}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Delivery Notes</label>
                    <textarea
                      className="form-textarea"
                      placeholder="Add any notes about the delivery..."
                      rows={3}
                      value={updateForm.deliveryNotes}
                      onChange={(e) => setUpdateForm({ ...updateForm, deliveryNotes: e.target.value })}
                    />
                  </div>
                </div>

                <div className="modal-footer">
                  <button
                    type="button"
                    className="btn btn-outline"
                    onClick={() => setShowUpdateModal(false)}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={actionLoading}
                  >
                    {actionLoading ? (
                      <>
                        <FaSpinner className="spinner" /> Updating...
                      </>
                    ) : (
                      <>
                        <FaCheck /> Update Delivery
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default DeliveryTracking;