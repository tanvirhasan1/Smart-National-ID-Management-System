import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import {
  FaPrint,
  FaSearch,
  FaEye,
  FaTimes,
  FaCheck,
  FaSpinner,
  FaCheckSquare,
  FaClock,
  FaIdCard,
  FaUser,
  FaCalendarAlt,
  FaFileExport,
  FaSyncAlt,
  FaChevronLeft,
  FaChevronRight,
  FaCheckCircle,
  FaHourglassHalf,
  FaBoxes,
  FaTruck,
  FaQrcode,
  FaExclamationTriangle,
  FaListUl,
  FaTh,
  FaDownload,
  FaPlay,
  FaPause,
  FaRedo,
  FaLayerGroup,
  FaPlus
} from 'react-icons/fa';
import api from '../api/axios';
import AdminLayout from './AdminLayout';
import Loader from '../common/Loader';
import { formatDate, formatDateTime } from '../utils/helpers';
import '../styles/PrintingQueue.css';

const PrintingQueue = () => {
  // State management
  const [applications, setApplications] = useState([]);
  const [printBatches, setPrintBatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [selectedApplication, setSelectedApplication] = useState(null);
  const [selectedBatch, setSelectedBatch] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showBatchModal, setShowBatchModal] = useState(false);
  const [showCreateBatchModal, setShowCreateBatchModal] = useState(false);

  // View mode
  const [viewMode, setViewMode] = useState('list');
  const [activeTab, setActiveTab] = useState('queue');

  // Selection
  const [selectedItems, setSelectedItems] = useState([]);
  const [selectAll, setSelectAll] = useState(false);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const itemsPerPage = 15;

  // Filters
  const [filters, setFilters] = useState({
    status: '',
    searchQuery: '',
    startDate: '',
    endDate: '',
    priority: ''
  });

  // Create batch form
  const [batchForm, setBatchForm] = useState({
    batchName: '',
    priority: 'normal',
    notes: ''
  });

  // Statistics
  const [stats, setStats] = useState({
    readyForPrint: 0,
    inPrinting: 0,
    printed: 0,
    pendingDispatch: 0,
    totalBatches: 0,
    activeBatches: 0
  });

  useEffect(() => {
    fetchData();
  }, [currentPage, filters, activeTab]);

  useEffect(() => {
    if (selectAll) {
      setSelectedItems(applications.map((app) => app._id));
    } else {
      setSelectedItems([]);
    }
  }, [selectAll, applications]);

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

  const getApplicant = (app) => {
    return app?.userId || app?.user || app?.applicant || app?.createdBy || {};
  };

  const getApplicationDisplayId = (app) => {
    return app?.applicationId || app?.applicationNumber || 'N/A';
  };

  const getPrintBatchLabel = (app) => {
    return (
      app?.printBatchNumber ||
      app?.printBatch?.batchNumber ||
      app?.batch?.batchNumber ||
      'N/A'
    );
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      await Promise.all([fetchApplications(), fetchBatches(), fetchStats()]);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const fetchApplications = async () => {
    try {
      let status = '';

      if (activeTab === 'queue') {
        status = 'approved';
      } else if (activeTab === 'batches') {
        status = 'printing';
      } else if (activeTab === 'completed') {
        status = 'printed,dispatched,delivered';
      }

      let url = `/admin/applications?page=${currentPage}&limit=${itemsPerPage}&status=${status}`;

      if (filters.searchQuery) {
        url += `&search=${encodeURIComponent(filters.searchQuery)}`;
      }
      if (filters.startDate) {
        url += `&startDate=${filters.startDate}`;
      }
      if (filters.endDate) {
        url += `&endDate=${filters.endDate}`;
      }
      if (filters.priority) {
        url += `&priority=${filters.priority}`;
      }

      const response = await requestWithFallback([
        () => api.get(url),
        () =>
          api.get(
            url.replace('/admin/applications', '/admin/printing/applications')
          )
      ]);

      const responseData = response?.data || {};
      const items =
        responseData.data ||
        responseData.applications ||
        responseData.items ||
        [];
      const total =
        responseData.total ||
        responseData.pagination?.total ||
        items.length ||
        0;

      setApplications(items);
      setTotalItems(total);
      setTotalPages(Math.max(1, Math.ceil(total / itemsPerPage)));
    } catch (error) {
      console.error('Error fetching applications:', error);
      setApplications([]);
      setTotalItems(0);
      setTotalPages(1);
    }
  };

  const fetchBatches = async () => {
    try {
      const response = await requestWithFallback([
        () => api.get('/admin/print-batches'),
        () => api.get('/admin/printing/batches')
      ]);

      setPrintBatches(
        response?.data?.data || response?.data?.batches || response?.data || []
      );
    } catch (error) {
      console.error('Error fetching batches:', error);
      setPrintBatches([]);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await requestWithFallback([
        () => api.get('/admin/printing/stats'),
        () => api.get('/admin/print-batches/stats')
      ]);

      setStats(
        response?.data?.data || {
          readyForPrint: 0,
          inPrinting: 0,
          printed: 0,
          pendingDispatch: 0,
          totalBatches: 0,
          activeBatches: 0
        }
      );
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const fetchSingleApplication = async (applicationId) => {
    const response = await requestWithFallback([
      () => api.get(`/admin/applications/${applicationId}`),
      () => api.get(`/applications/${applicationId}`)
    ]);

    return response?.data?.application || response?.data?.data || response?.data;
  };

  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setCurrentPage(1);
  };

  const handleClearFilters = () => {
    setFilters({
      status: '',
      searchQuery: '',
      startDate: '',
      endDate: '',
      priority: ''
    });
    setCurrentPage(1);
  };

  const handleSelectItem = (id) => {
    setSelectedItems((prev) => {
      if (prev.includes(id)) {
        return prev.filter((item) => item !== id);
      }
      return [...prev, id];
    });
  };

  const handleSelectAll = () => {
    setSelectAll(!selectAll);
  };

  const handleMoveToPrinting = async (applicationId) => {
    setActionLoading(true);
    try {
      await requestWithFallback([
        () => api.put(`/admin/applications/${applicationId}/printing`),
        () => api.patch(`/admin/applications/${applicationId}/printing`),
        () => api.put(`/admin/printing/${applicationId}/start`)
      ]);

      toast.success('Moved to printing queue');
      fetchData();
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Failed to update status');
    } finally {
      setActionLoading(false);
    }
  };

  const handleBulkMoveToPrinting = async () => {
    if (selectedItems.length === 0) {
      toast.warning('Please select items to print');
      return;
    }

    setActionLoading(true);
    try {
      await requestWithFallback([
        () =>
          api.post('/admin/applications/bulk-print', {
            applicationIds: selectedItems
          }),
        () =>
          api.post('/admin/printing/bulk-print', {
            applicationIds: selectedItems
          })
      ]);

      toast.success(`${selectedItems.length} items moved to printing`);
      setSelectedItems([]);
      setSelectAll(false);
      fetchData();
    } catch (error) {
      toast.error(
        error?.response?.data?.message || 'Failed to process bulk action'
      );
    } finally {
      setActionLoading(false);
    }
  };

  const handleCreateBatch = async (e) => {
    e.preventDefault();

    if (selectedItems.length === 0) {
      toast.warning('Please select items to create a batch');
      return;
    }

    setActionLoading(true);
    try {
      await requestWithFallback([
        () =>
          api.post('/admin/print-batches', {
            ...batchForm,
            applicationIds: selectedItems
          }),
        () =>
          api.post('/admin/printing/batches', {
            ...batchForm,
            applicationIds: selectedItems
          })
      ]);

      toast.success(`Batch created with ${selectedItems.length} items`);
      setShowCreateBatchModal(false);
      setBatchForm({ batchName: '', priority: 'normal', notes: '' });
      setSelectedItems([]);
      setSelectAll(false);
      fetchData();
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Failed to create batch');
    } finally {
      setActionLoading(false);
    }
  };

  const handleMarkBatchPrinted = async (batchId) => {
    setActionLoading(true);
    try {
      await requestWithFallback([
        () => api.put(`/admin/print-batches/${batchId}/complete`),
        () => api.patch(`/admin/print-batches/${batchId}/complete`),
        () => api.put(`/admin/printing/batches/${batchId}/complete`)
      ]);

      toast.success('Batch marked as printed');
      fetchData();
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Failed to update batch');
    } finally {
      setActionLoading(false);
    }
  };

  const handleMarkAsPrinted = async (applicationId) => {
    setActionLoading(true);
    try {
      await requestWithFallback([
        () => api.put(`/admin/applications/${applicationId}/printed`),
        () => api.patch(`/admin/applications/${applicationId}/printed`),
        () => api.put(`/admin/printing/${applicationId}/printed`)
      ]);

      toast.success('Card marked as printed');
      fetchData();
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Failed to update status');
    } finally {
      setActionLoading(false);
    }
  };

  const handleStartDispatch = async (applicationId) => {
    setActionLoading(true);
    try {
      await requestWithFallback([
        () =>
          api.put(`/admin/applications/${applicationId}/dispatch`, {
            trackingNumber: `TRK${Date.now()}`
          }),
        () =>
          api.patch(`/admin/applications/${applicationId}/dispatch`, {
            trackingNumber: `TRK${Date.now()}`
          }),
        () =>
          api.put(`/admin/delivery/${applicationId}/dispatch`, {
            trackingNumber: `TRK${Date.now()}`
          })
      ]);

      toast.success('Card dispatched');
      fetchData();
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Failed to dispatch');
    } finally {
      setActionLoading(false);
    }
  };

  const handleReprint = async (applicationId) => {
    if (!window.confirm('Are you sure you want to reprint this card?')) return;

    setActionLoading(true);
    try {
      await requestWithFallback([
        () => api.put(`/admin/applications/${applicationId}/reprint`),
        () => api.patch(`/admin/applications/${applicationId}/reprint`),
        () => api.put(`/admin/printing/${applicationId}/reprint`)
      ]);

      toast.success('Card added to reprint queue');
      fetchData();
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Failed to reprint');
    } finally {
      setActionLoading(false);
    }
  };

  const handleViewDetails = async (application) => {
    try {
      setActionLoading(true);
      const fullApplication = await fetchSingleApplication(application._id);
      setSelectedApplication(fullApplication || application);
      setShowDetailModal(true);
    } catch (error) {
      console.error('Error fetching application details:', error);
      setSelectedApplication(application);
      setShowDetailModal(true);
    } finally {
      setActionLoading(false);
    }
  };

  const handleViewBatch = (batch) => {
    setSelectedBatch(batch);
    setShowBatchModal(true);
  };

  const handleExport = async () => {
    try {
      toast.info('Preparing export...');

      const response = await requestWithFallback([
        () =>
          api.get('/admin/printing/export', {
            params: { ...filters, tab: activeTab },
            responseType: 'blob'
          }),
        () =>
          api.get('/admin/print-batches/export', {
            params: { ...filters, tab: activeTab },
            responseType: 'blob'
          })
      ]);

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `print-queue-${formatDate(new Date())}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();

      toast.success('Export completed');
    } catch (error) {
      toast.error('Failed to export data');
    }
  };

  const handleDownloadPrintTemplate = async (applicationId) => {
    try {
      const response = await requestWithFallback([
        () =>
          api.get(`/admin/applications/${applicationId}/print-template`, {
            responseType: 'blob'
          }),
        () =>
          api.get(`/admin/printing/${applicationId}/template`, {
            responseType: 'blob'
          })
      ]);

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `nid-print-${applicationId}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();

      toast.success('Print template downloaded');
    } catch (error) {
      toast.error('Failed to download template');
    }
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      approved: { label: 'Ready to Print', class: 'ready', icon: FaCheckCircle },
      printing: { label: 'In Printing', class: 'printing', icon: FaPrint },
      printed: { label: 'Printed', class: 'printed', icon: FaCheck },
      dispatched: { label: 'Dispatched', class: 'dispatched', icon: FaTruck },
      delivered: { label: 'Delivered', class: 'delivered', icon: FaCheckCircle }
    };

    const config = statusConfig[status] || {
      label: status,
      class: 'default',
      icon: FaClock
    };
    const Icon = config.icon;

    return (
      <span className={`status-badge ${config.class}`}>
        <Icon /> {config.label}
      </span>
    );
  };

  const getBatchStatusBadge = (status) => {
    const statusConfig = {
      pending: { label: 'Pending', class: 'pending', icon: FaClock },
      in_progress: { label: 'In Progress', class: 'in-progress', icon: FaPlay },
      completed: { label: 'Completed', class: 'completed', icon: FaCheckCircle },
      paused: { label: 'Paused', class: 'paused', icon: FaPause }
    };

    const config = statusConfig[status] || statusConfig.pending;
    const Icon = config.icon;

    return (
      <span className={`batch-status ${config.class}`}>
        <Icon /> {config.label}
      </span>
    );
  };

  if (loading && applications.length === 0) {
    return (
      <AdminLayout>
        <div className="admin-loading">
          <Loader size="large" text="Loading printing queue..." />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="printing-queue-page">
        <div className="page-header">
          <div className="header-content">
            <h1><FaPrint /> Printing Queue</h1>
            <p>Manage NID card printing and batch processing</p>
          </div>
          <div className="header-actions">
            <button className="btn btn-outline" onClick={handleExport}>
              <FaFileExport /> Export
            </button>
            <button className="btn btn-primary" onClick={fetchData}>
              <FaSyncAlt /> Refresh
            </button>
          </div>
        </div>

        <div className="stats-row">
          <div className="stat-card stat-ready">
            <div className="stat-icon-wrapper">
              <FaCheckCircle />
            </div>
            <div className="stat-info">
              <span className="stat-value">{stats.readyForPrint || 0}</span>
              <span className="stat-label">Ready to Print</span>
            </div>
          </div>

          <div className="stat-card stat-printing">
            <div className="stat-icon-wrapper">
              <FaPrint />
            </div>
            <div className="stat-info">
              <span className="stat-value">{stats.inPrinting || 0}</span>
              <span className="stat-label">In Printing</span>
            </div>
          </div>

          <div className="stat-card stat-printed">
            <div className="stat-icon-wrapper">
              <FaIdCard />
            </div>
            <div className="stat-info">
              <span className="stat-value">{stats.printed || 0}</span>
              <span className="stat-label">Printed</span>
            </div>
          </div>

          <div className="stat-card stat-dispatch">
            <div className="stat-icon-wrapper">
              <FaTruck />
            </div>
            <div className="stat-info">
              <span className="stat-value">{stats.pendingDispatch || 0}</span>
              <span className="stat-label">Ready for Dispatch</span>
            </div>
          </div>

          <div className="stat-card stat-batches">
            <div className="stat-icon-wrapper">
              <FaBoxes />
            </div>
            <div className="stat-info">
              <span className="stat-value">{stats.activeBatches || 0}</span>
              <span className="stat-label">Active Batches</span>
            </div>
          </div>
        </div>

        <div className="tabs-section">
          <div className="tabs-container">
            <button
              className={`tab-btn ${activeTab === 'queue' ? 'active' : ''}`}
              onClick={() => {
                setActiveTab('queue');
                setCurrentPage(1);
              }}
            >
              <FaHourglassHalf /> Print Queue
              {stats.readyForPrint > 0 && (
                <span className="tab-badge">{stats.readyForPrint}</span>
              )}
            </button>
            <button
              className={`tab-btn ${activeTab === 'batches' ? 'active' : ''}`}
              onClick={() => {
                setActiveTab('batches');
                setCurrentPage(1);
              }}
            >
              <FaLayerGroup /> Batches
              {stats.activeBatches > 0 && (
                <span className="tab-badge">{stats.activeBatches}</span>
              )}
            </button>
            <button
              className={`tab-btn ${activeTab === 'completed' ? 'active' : ''}`}
              onClick={() => {
                setActiveTab('completed');
                setCurrentPage(1);
              }}
            >
              <FaCheckCircle /> Completed
            </button>
          </div>

          <div className="view-toggle">
            <button
              className={`view-btn ${viewMode === 'list' ? 'active' : ''}`}
              onClick={() => setViewMode('list')}
              title="List View"
            >
              <FaListUl />
            </button>
            <button
              className={`view-btn ${viewMode === 'grid' ? 'active' : ''}`}
              onClick={() => setViewMode('grid')}
              title="Grid View"
            >
              <FaTh />
            </button>
          </div>
        </div>

        <div className="filters-card">
          <div className="filters-row">
            <div className="search-box">
              <FaSearch />
              <input
                type="text"
                placeholder="Search by NID #, name, application..."
                value={filters.searchQuery}
                onChange={(e) => handleFilterChange('searchQuery', e.target.value)}
              />
            </div>

            <div className="filter-item">
              <input
                type="date"
                value={filters.startDate}
                onChange={(e) => handleFilterChange('startDate', e.target.value)}
                placeholder="From Date"
              />
            </div>

            <div className="filter-item">
              <input
                type="date"
                value={filters.endDate}
                onChange={(e) => handleFilterChange('endDate', e.target.value)}
                placeholder="To Date"
              />
            </div>

            {Object.values(filters).some((v) => v) && (
              <button className="clear-btn" onClick={handleClearFilters}>
                <FaTimes /> Clear
              </button>
            )}
          </div>

          {activeTab === 'queue' && selectedItems.length > 0 && (
            <div className="bulk-actions">
              <span className="selected-count">
                <FaCheckSquare /> {selectedItems.length} selected
              </span>
              <button
                className="btn btn-sm btn-primary"
                onClick={handleBulkMoveToPrinting}
                disabled={actionLoading}
              >
                <FaPrint /> Print Selected
              </button>
              <button
                className="btn btn-sm btn-secondary"
                onClick={() => setShowCreateBatchModal(true)}
                disabled={actionLoading}
              >
                <FaLayerGroup /> Create Batch
              </button>
              <button
                className="btn btn-sm btn-outline"
                onClick={() => {
                  setSelectedItems([]);
                  setSelectAll(false);
                }}
              >
                Clear Selection
              </button>
            </div>
          )}
        </div>

        {activeTab === 'queue' && (
          <div className="queue-content">
            {viewMode === 'list' ? (
              <div className="queue-table-card">
                <div className="card-header">
                  <h3><FaPrint /> Cards Ready for Printing</h3>
                  <span className="item-count">{totalItems} items</span>
                </div>
                <div className="table-container">
                  <table className="queue-table">
                    <thead>
                      <tr>
                        <th className="checkbox-col">
                          <label className="checkbox-wrapper">
                            <input
                              type="checkbox"
                              checked={selectAll}
                              onChange={handleSelectAll}
                            />
                            <span className="checkmark"></span>
                          </label>
                        </th>
                        <th>Application</th>
                        <th>Applicant</th>
                        <th>NID Number</th>
                        <th>Approved Date</th>
                        <th>Status</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {loading ? (
                        <tr>
                          <td colSpan="7" className="loading-row">
                            <Loader size="small" />
                          </td>
                        </tr>
                      ) : applications.length === 0 ? (
                        <tr>
                          <td colSpan="7" className="empty-row">
                            <FaPrint className="empty-icon" />
                            <p>No cards in print queue</p>
                          </td>
                        </tr>
                      ) : (
                        applications.map((app) => {
                          const applicant = getApplicant(app);

                          return (
                            <tr
                              key={app._id}
                              className={selectedItems.includes(app._id) ? 'selected' : ''}
                            >
                              <td className="checkbox-col">
                                <label className="checkbox-wrapper">
                                  <input
                                    type="checkbox"
                                    checked={selectedItems.includes(app._id)}
                                    onChange={() => handleSelectItem(app._id)}
                                  />
                                  <span className="checkmark"></span>
                                </label>
                              </td>
                              <td>
                                <div className="application-cell">
                                  <span className="app-number">
                                    #{getApplicationDisplayId(app)}
                                  </span>
                                  <span className="app-type">
                                    {app.applicationType || 'N/A'}
                                  </span>
                                </div>
                              </td>
                              <td>
                                <div className="applicant-cell">
                                  <span className="name">
                                    {applicant.fullName || 'N/A'}
                                  </span>
                                  <span className="mobile">
                                    {applicant.mobile || applicant.phone || 'N/A'}
                                  </span>
                                </div>
                              </td>
                              <td>
                                <span className="nid-number">
                                  {app.nidNumber || 'Pending'}
                                </span>
                              </td>
                              <td>
                                <span className="date">
                                  {app.reviewedAt
                                    ? formatDate(app.reviewedAt)
                                    : app.updatedAt
                                    ? formatDate(app.updatedAt)
                                    : 'N/A'}
                                </span>
                              </td>
                              <td>{getStatusBadge(app.status)}</td>
                              <td>
                                <div className="action-buttons">
                                  <button
                                    className="btn-action btn-view"
                                    onClick={() => handleViewDetails(app)}
                                    title="View Details"
                                  >
                                    <FaEye />
                                  </button>
                                  <button
                                    className="btn-action btn-download"
                                    onClick={() => handleDownloadPrintTemplate(app._id)}
                                    title="Download Print Template"
                                  >
                                    <FaDownload />
                                  </button>
                                  <button
                                    className="btn-action btn-print"
                                    onClick={() => handleMoveToPrinting(app._id)}
                                    title="Move to Printing"
                                    disabled={actionLoading}
                                  >
                                    <FaPrint />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div className="queue-grid">
                {applications.length === 0 ? (
                  <div className="empty-state">
                    <FaPrint className="empty-icon" />
                    <h3>No Cards in Queue</h3>
                    <p>There are no cards waiting to be printed</p>
                  </div>
                ) : (
                  applications.map((app) => {
                    const applicant = getApplicant(app);

                    return (
                      <div
                        key={app._id}
                        className={`queue-card ${selectedItems.includes(app._id) ? 'selected' : ''}`}
                      >
                        <div className="card-select">
                          <label className="checkbox-wrapper">
                            <input
                              type="checkbox"
                              checked={selectedItems.includes(app._id)}
                              onChange={() => handleSelectItem(app._id)}
                            />
                            <span className="checkmark"></span>
                          </label>
                        </div>

                        <div className="card-header">
                          <span className="app-number">
                            #{getApplicationDisplayId(app)}
                          </span>
                          {getStatusBadge(app.status)}
                        </div>

                        <div className="card-body">
                          <div className="card-photo">
                            {app.documents?.photo ? (
                              <img src={app.documents.photo} alt="Applicant" />
                            ) : (
                              <div className="no-photo"><FaUser /></div>
                            )}
                          </div>
                          <div className="card-info">
                            <h4>{applicant.fullName || 'N/A'}</h4>
                            <p className="nid">{app.nidNumber || 'NID Pending'}</p>
                            <p className="date">
                              <FaCalendarAlt /> Approved:{' '}
                              {app.reviewedAt
                                ? formatDate(app.reviewedAt)
                                : app.updatedAt
                                ? formatDate(app.updatedAt)
                                : 'N/A'}
                            </p>
                          </div>
                        </div>

                        <div className="card-footer">
                          <button
                            className="btn btn-sm btn-outline"
                            onClick={() => handleViewDetails(app)}
                          >
                            <FaEye /> View
                          </button>
                          <button
                            className="btn btn-sm btn-primary"
                            onClick={() => handleMoveToPrinting(app._id)}
                            disabled={actionLoading}
                          >
                            <FaPrint /> Print
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            )}
          </div>
        )}

        {activeTab === 'batches' && (
          <div className="batches-content">
            <div className="batches-section">
              <div className="section-header">
                <h3><FaLayerGroup /> Print Batches</h3>
                <button
                  className="btn btn-primary btn-sm"
                  onClick={() => {
                    setActiveTab('queue');
                    toast.info('Select cards from the queue to create a batch');
                  }}
                >
                  <FaPlus /> Create New Batch
                </button>
              </div>

              {printBatches.length === 0 ? (
                <div className="empty-state">
                  <FaBoxes className="empty-icon" />
                  <h3>No Active Batches</h3>
                  <p>Create a batch by selecting cards from the queue</p>
                </div>
              ) : (
                <div className="batches-grid">
                  {printBatches.map((batch) => (
                    <div key={batch._id} className="batch-card">
                      <div className="batch-header">
                        <div className="batch-info">
                          <h4>{batch.batchName || `Batch #${batch.batchNumber}`}</h4>
                          <span className="batch-number">{batch.batchNumber}</span>
                        </div>
                        {getBatchStatusBadge(batch.status)}
                      </div>

                      <div className="batch-body">
                        <div className="batch-stat">
                          <span className="stat-label">Total Cards</span>
                          <span className="stat-value">{batch.totalCards || 0}</span>
                        </div>
                        <div className="batch-stat">
                          <span className="stat-label">Printed</span>
                          <span className="stat-value">{batch.printedCards || 0}</span>
                        </div>
                        <div className="batch-stat">
                          <span className="stat-label">Remaining</span>
                          <span className="stat-value">
                            {(batch.totalCards || 0) - (batch.printedCards || 0)}
                          </span>
                        </div>

                        <div className="batch-progress">
                          <div className="progress-bar">
                            <div
                              className="progress-fill"
                              style={{
                                width: `${batch.totalCards ? (batch.printedCards / batch.totalCards) * 100 : 0}%`
                              }}
                            ></div>
                          </div>
                          <span className="progress-text">
                            {batch.totalCards
                              ? Math.round((batch.printedCards / batch.totalCards) * 100)
                              : 0}
                            % Complete
                          </span>
                        </div>

                        <div className="batch-meta">
                          <span><FaCalendarAlt /> Created: {formatDate(batch.createdAt)}</span>
                          {batch.priority === 'high' && (
                            <span className="priority-badge high">
                              <FaExclamationTriangle /> High Priority
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="batch-footer">
                        <button
                          className="btn btn-sm btn-outline"
                          onClick={() => handleViewBatch(batch)}
                        >
                          <FaEye /> View Details
                        </button>
                        {batch.status !== 'completed' && (
                          <button
                            className="btn btn-sm btn-success"
                            onClick={() => handleMarkBatchPrinted(batch._id)}
                            disabled={actionLoading}
                          >
                            <FaCheck /> Mark Complete
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="printing-section">
              <div className="section-header">
                <h3><FaPrint /> Cards In Printing</h3>
              </div>

              <div className="table-container">
                <table className="queue-table">
                  <thead>
                    <tr>
                      <th>Application</th>
                      <th>Applicant</th>
                      <th>NID Number</th>
                      <th>Batch</th>
                      <th>Started</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {applications.length === 0 ? (
                      <tr>
                        <td colSpan="7" className="empty-row">
                          <p>No cards currently in printing</p>
                        </td>
                      </tr>
                    ) : (
                      applications.map((app) => {
                        const applicant = getApplicant(app);

                        return (
                          <tr key={app._id}>
                            <td>
                              <span className="app-number">
                                #{getApplicationDisplayId(app)}
                              </span>
                            </td>
                            <td>
                              <span className="name">{applicant.fullName || 'N/A'}</span>
                            </td>
                            <td>
                              <span className="nid-number">{app.nidNumber || 'N/A'}</span>
                            </td>
                            <td>
                              <span className="batch-ref">{getPrintBatchLabel(app)}</span>
                            </td>
                            <td>
                              <span className="date">
                                {app.printedAt
                                  ? formatDateTime(app.printedAt)
                                  : app.updatedAt
                                  ? formatDateTime(app.updatedAt)
                                  : 'N/A'}
                              </span>
                            </td>
                            <td>{getStatusBadge(app.status)}</td>
                            <td>
                              <div className="action-buttons">
                                <button
                                  className="btn-action btn-view"
                                  onClick={() => handleViewDetails(app)}
                                  title="View Details"
                                >
                                  <FaEye />
                                </button>
                                <button
                                  className="btn-action btn-success"
                                  onClick={() => handleMarkAsPrinted(app._id)}
                                  title="Mark as Printed"
                                  disabled={actionLoading}
                                >
                                  <FaCheck />
                                </button>
                                <button
                                  className="btn-action btn-dispatch"
                                  onClick={() => handleStartDispatch(app._id)}
                                  title="Dispatch"
                                  disabled={actionLoading}
                                >
                                  <FaTruck />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'completed' && (
          <div className="completed-content">
            <div className="queue-table-card">
              <div className="card-header">
                <h3><FaCheckCircle /> Completed Cards</h3>
                <span className="item-count">{totalItems} items</span>
              </div>
              <div className="table-container">
                <table className="queue-table">
                  <thead>
                    <tr>
                      <th>Application</th>
                      <th>Applicant</th>
                      <th>NID Number</th>
                      <th>Printed Date</th>
                      <th>Dispatched Date</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr>
                        <td colSpan="7" className="loading-row">
                          <Loader size="small" />
                        </td>
                      </tr>
                    ) : applications.length === 0 ? (
                      <tr>
                        <td colSpan="7" className="empty-row">
                          <FaCheckCircle className="empty-icon" />
                          <p>No completed cards</p>
                        </td>
                      </tr>
                    ) : (
                      applications.map((app) => {
                        const applicant = getApplicant(app);

                        return (
                          <tr key={app._id}>
                            <td>
                              <span className="app-number">
                                #{getApplicationDisplayId(app)}
                              </span>
                            </td>
                            <td>
                              <div className="applicant-cell">
                                <span className="name">{applicant.fullName || 'N/A'}</span>
                                <span className="mobile">
                                  {applicant.mobile || applicant.phone || 'N/A'}
                                </span>
                              </div>
                            </td>
                            <td>
                              <span className="nid-number">{app.nidNumber || 'N/A'}</span>
                            </td>
                            <td>
                              <span className="date">
                                {app.printedAt ? formatDate(app.printedAt) : 'N/A'}
                              </span>
                            </td>
                            <td>
                              <span className="date">
                                {app.dispatchedAt ? formatDate(app.dispatchedAt) : 'N/A'}
                              </span>
                            </td>
                            <td>{getStatusBadge(app.status)}</td>
                            <td>
                              <div className="action-buttons">
                                <button
                                  className="btn-action btn-view"
                                  onClick={() => handleViewDetails(app)}
                                  title="View Details"
                                >
                                  <FaEye />
                                </button>
                                <button
                                  className="btn-action btn-reprint"
                                  onClick={() => handleReprint(app._id)}
                                  title="Reprint"
                                  disabled={actionLoading}
                                >
                                  <FaRedo />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {totalPages > 1 && (
          <div className="pagination">
            <div className="pagination-info">
              Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, totalItems)} of {totalItems}
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
                onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
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
                onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
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

        {showDetailModal && selectedApplication && (
          <div className="modal-overlay" onClick={() => setShowDetailModal(false)}>
            <div className="modal modal-lg" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h3><FaIdCard /> Card Details</h3>
                <button
                  className="modal-close"
                  onClick={() => setShowDetailModal(false)}
                >
                  <FaTimes />
                </button>
              </div>

              <div className="modal-body">
                <div className="print-details">
                  <div className="card-preview-section">
                    <h4>Card Preview</h4>
                    <div className="nid-card-preview">
                      <div className="preview-header">
                        <span>Smart National ID Card</span>
                      </div>
                      <div className="preview-body">
                        <div className="preview-photo">
                          {selectedApplication.documents?.photo ? (
                            <img src={selectedApplication.documents.photo} alt="Photo" />
                          ) : (
                            <div className="no-photo"><FaUser /></div>
                          )}
                        </div>
                        <div className="preview-info">
                          <p><strong>Name:</strong> {getApplicant(selectedApplication).fullName || 'N/A'}</p>
                          <p><strong>NID:</strong> {selectedApplication.nidNumber || 'N/A'}</p>
                          <p><strong>DOB:</strong> {getApplicant(selectedApplication).dateOfBirth ? formatDate(getApplicant(selectedApplication).dateOfBirth) : 'N/A'}</p>
                        </div>
                        <div className="preview-qr">
                          <FaQrcode />
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="detail-section">
                    <h4><FaFileExport /> Application Information</h4>
                    <div className="detail-grid">
                      <div className="detail-item">
                        <label>Application #</label>
                        <p>{getApplicationDisplayId(selectedApplication)}</p>
                      </div>
                      <div className="detail-item">
                        <label>Type</label>
                        <p>{selectedApplication.applicationType?.toUpperCase() || 'N/A'}</p>
                      </div>
                      <div className="detail-item">
                        <label>NID Number</label>
                        <p className="nid-number-large">{selectedApplication.nidNumber || 'N/A'}</p>
                      </div>
                      <div className="detail-item">
                        <label>Current Status</label>
                        <p>{getStatusBadge(selectedApplication.status)}</p>
                      </div>
                    </div>
                  </div>

                  <div className="detail-section">
                    <h4><FaUser /> Applicant Information</h4>
                    <div className="detail-grid">
                      <div className="detail-item">
                        <label>Full Name</label>
                        <p>{getApplicant(selectedApplication).fullName || 'N/A'}</p>
                      </div>
                      <div className="detail-item">
                        <label>Name (Bangla)</label>
                        <p>{getApplicant(selectedApplication).fullNameBangla || 'N/A'}</p>
                      </div>
                      <div className="detail-item">
                        <label>Father's Name</label>
                        <p>{selectedApplication.fatherName || 'N/A'}</p>
                      </div>
                      <div className="detail-item">
                        <label>Mother's Name</label>
                        <p>{selectedApplication.motherName || 'N/A'}</p>
                      </div>
                      <div className="detail-item">
                        <label>Date of Birth</label>
                        <p>
                          {getApplicant(selectedApplication).dateOfBirth
                            ? formatDate(getApplicant(selectedApplication).dateOfBirth)
                            : 'N/A'}
                        </p>
                      </div>
                      <div className="detail-item">
                        <label>Birth Reg. #</label>
                        <p>{getApplicant(selectedApplication).birthRegNumber || 'N/A'}</p>
                      </div>
                    </div>
                  </div>

                  <div className="detail-section">
                    <h4><FaPrint /> Print Information</h4>
                    <div className="detail-grid">
                      <div className="detail-item">
                        <label>Print Batch</label>
                        <p>{getPrintBatchLabel(selectedApplication)}</p>
                      </div>
                      <div className="detail-item">
                        <label>Printed Date</label>
                        <p>
                          {selectedApplication.printedAt
                            ? formatDateTime(selectedApplication.printedAt)
                            : 'Not Printed'}
                        </p>
                      </div>
                      <div className="detail-item">
                        <label>Tracking Number</label>
                        <p>{selectedApplication.trackingNumber || 'Not Assigned'}</p>
                      </div>
                      <div className="detail-item">
                        <label>Dispatched Date</label>
                        <p>
                          {selectedApplication.dispatchedAt
                            ? formatDateTime(selectedApplication.dispatchedAt)
                            : 'Not Dispatched'}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="modal-footer">
                <button
                  className="btn btn-outline"
                  onClick={() => handleDownloadPrintTemplate(selectedApplication._id)}
                >
                  <FaDownload /> Download Template
                </button>
                {selectedApplication.status === 'approved' && (
                  <button
                    className="btn btn-primary"
                    onClick={() => {
                      handleMoveToPrinting(selectedApplication._id);
                      setShowDetailModal(false);
                    }}
                    disabled={actionLoading}
                  >
                    <FaPrint /> Move to Printing
                  </button>
                )}
                {selectedApplication.status === 'printing' && (
                  <>
                    <button
                      className="btn btn-success"
                      onClick={() => {
                        handleMarkAsPrinted(selectedApplication._id);
                        setShowDetailModal(false);
                      }}
                      disabled={actionLoading}
                    >
                      <FaCheck /> Mark as Printed
                    </button>
                    <button
                      className="btn btn-primary"
                      onClick={() => {
                        handleStartDispatch(selectedApplication._id);
                        setShowDetailModal(false);
                      }}
                      disabled={actionLoading}
                    >
                      <FaTruck /> Dispatch
                    </button>
                  </>
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

        {showCreateBatchModal && (
          <div className="modal-overlay" onClick={() => setShowCreateBatchModal(false)}>
            <div className="modal" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h3><FaLayerGroup /> Create Print Batch</h3>
                <button
                  className="modal-close"
                  onClick={() => setShowCreateBatchModal(false)}
                >
                  <FaTimes />
                </button>
              </div>

              <form onSubmit={handleCreateBatch}>
                <div className="modal-body">
                  <div className="batch-summary">
                    <FaBoxes />
                    <div>
                      <strong>{selectedItems.length} cards selected</strong>
                      <span>Will be added to this batch</span>
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Batch Name (Optional)</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="e.g., Dhaka District Batch - Jan 2024"
                      value={batchForm.batchName}
                      onChange={(e) => setBatchForm({ ...batchForm, batchName: e.target.value })}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Priority</label>
                    <select
                      className="form-select"
                      value={batchForm.priority}
                      onChange={(e) => setBatchForm({ ...batchForm, priority: e.target.value })}
                    >
                      <option value="low">Low</option>
                      <option value="normal">Normal</option>
                      <option value="high">High</option>
                      <option value="urgent">Urgent</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Notes</label>
                    <textarea
                      className="form-textarea"
                      placeholder="Add any notes about this batch..."
                      rows={3}
                      value={batchForm.notes}
                      onChange={(e) => setBatchForm({ ...batchForm, notes: e.target.value })}
                    />
                  </div>
                </div>

                <div className="modal-footer">
                  <button
                    type="button"
                    className="btn btn-outline"
                    onClick={() => setShowCreateBatchModal(false)}
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
                        <FaSpinner className="spinner" /> Creating...
                      </>
                    ) : (
                      <>
                        <FaLayerGroup /> Create Batch
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {showBatchModal && selectedBatch && (
          <div className="modal-overlay" onClick={() => setShowBatchModal(false)}>
            <div className="modal modal-lg" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h3><FaLayerGroup /> Batch Details</h3>
                <button
                  className="modal-close"
                  onClick={() => setShowBatchModal(false)}
                >
                  <FaTimes />
                </button>
              </div>

              <div className="modal-body">
                <div className="batch-details">
                  <div className="batch-info-header">
                    <div className="batch-title">
                      <h4>{selectedBatch.batchName || `Batch #${selectedBatch.batchNumber}`}</h4>
                      <span className="batch-number">{selectedBatch.batchNumber}</span>
                    </div>
                    {getBatchStatusBadge(selectedBatch.status)}
                  </div>

                  <div className="batch-progress-section">
                    <div className="progress-stats">
                      <div className="progress-stat">
                        <span className="value">{selectedBatch.totalCards || 0}</span>
                        <span className="label">Total</span>
                      </div>
                      <div className="progress-stat">
                        <span className="value success">{selectedBatch.printedCards || 0}</span>
                        <span className="label">Printed</span>
                      </div>
                      <div className="progress-stat">
                        <span className="value warning">
                          {(selectedBatch.totalCards || 0) - (selectedBatch.printedCards || 0)}
                        </span>
                        <span className="label">Remaining</span>
                      </div>
                    </div>
                    <div className="progress-bar-large">
                      <div
                        className="progress-fill"
                        style={{
                          width: `${selectedBatch.totalCards ? (selectedBatch.printedCards / selectedBatch.totalCards) * 100 : 0}%`
                        }}
                      ></div>
                    </div>
                    <span className="progress-percentage">
                      {selectedBatch.totalCards
                        ? Math.round((selectedBatch.printedCards / selectedBatch.totalCards) * 100)
                        : 0}
                      % Complete
                    </span>
                  </div>

                  <div className="detail-section">
                    <h4><FaCalendarAlt /> Batch Information</h4>
                    <div className="detail-grid">
                      <div className="detail-item">
                        <label>Created Date</label>
                        <p>{formatDateTime(selectedBatch.createdAt)}</p>
                      </div>
                      <div className="detail-item">
                        <label>Priority</label>
                        <p className={`priority-text ${selectedBatch.priority}`}>
                          {selectedBatch.priority?.toUpperCase()}
                        </p>
                      </div>
                      <div className="detail-item">
                        <label>Created By</label>
                        <p>{selectedBatch.createdBy?.fullName || 'System'}</p>
                      </div>
                      <div className="detail-item">
                        <label>Last Updated</label>
                        <p>{formatDateTime(selectedBatch.updatedAt)}</p>
                      </div>
                    </div>
                    {selectedBatch.notes && (
                      <div className="batch-notes">
                        <label>Notes:</label>
                        <p>{selectedBatch.notes}</p>
                      </div>
                    )}
                  </div>

                  <div className="detail-section">
                    <h4><FaIdCard /> Cards in Batch</h4>
                    <div className="batch-cards-list">
                      {selectedBatch.applications?.map((app, index) => {
                        const applicant = getApplicant(app);

                        return (
                          <div key={app._id || index} className="batch-card-item">
                            <span className="card-number">
                              #{getApplicationDisplayId(app)}
                            </span>
                            <span className="card-name">{applicant.fullName || 'N/A'}</span>
                            <span className="card-nid">{app.nidNumber || 'N/A'}</span>
                            <span className={`card-status ${app.status}`}>
                              {app.status === 'printed' ? <FaCheck /> : <FaClock />}
                            </span>
                          </div>
                        );
                      }) || <p className="no-cards">No cards in this batch</p>}
                    </div>
                  </div>
                </div>
              </div>

              <div className="modal-footer">
                {selectedBatch.status !== 'completed' && (
                  <button
                    className="btn btn-success"
                    onClick={() => {
                      handleMarkBatchPrinted(selectedBatch._id);
                      setShowBatchModal(false);
                    }}
                    disabled={actionLoading}
                  >
                    <FaCheck /> Mark Batch Complete
                  </button>
                )}
                <button
                  className="btn btn-outline"
                  onClick={() => setShowBatchModal(false)}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default PrintingQueue;