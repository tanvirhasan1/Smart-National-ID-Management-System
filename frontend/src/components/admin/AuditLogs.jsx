import React, { useState, useEffect, useMemo } from 'react';
import { toast } from 'react-toastify';
import {
  FaHistory,
  FaSearch,
  FaFilter,
  FaEye,
  FaTimes,
  FaUser,
  FaCalendarAlt,
  FaClock,
  FaGlobe,
  FaFileExport,
  FaChevronLeft,
  FaChevronRight,
  FaFileAlt,
  FaUsers,
  FaTicketAlt,
  FaCog,
  FaShieldAlt,
  FaCheckCircle,
  FaTimesCircle,
  FaEdit,
  FaPlus,
  FaTrash,
  FaSignInAlt,
  FaUserPlus,
  FaPrint,
  FaTruck,
  FaSyncAlt
} from 'react-icons/fa';
import api from '../api/axios';
import AdminLayout from './AdminLayout';
import Loader from '../common/Loader';
import { formatDate, formatDateTime } from '../utils/helpers';
import '../styles/AuditLogs.css';

const AuditLogs = () => {
  // State management
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedLog, setSelectedLog] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalLogs, setTotalLogs] = useState(0);
  const logsPerPage = 20;

  // Filters
  const [filters, setFilters] = useState({
    module: '',
    action: '',
    userRole: '',
    startDate: '',
    endDate: '',
    searchQuery: ''
  });

  // Statistics
  const [stats, setStats] = useState({
    totalToday: 0,
    totalThisWeek: 0,
    totalThisMonth: 0,
    byModule: {}
  });

  useEffect(() => {
    fetchLogs();
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

  const getLogUser = (log) => {
    return log?.userId || log?.user || log?.performedBy || {};
  };

  const normalizeLogsResponse = (response) => {
    const responseData = response?.data || {};

    const items =
      responseData.data ||
      responseData.logs ||
      responseData.auditLogs ||
      responseData.items ||
      [];

    const total =
      responseData.total ||
      responseData.pagination?.total ||
      responseData.count ||
      items.length ||
      0;

    return { items, total };
  };

  const fetchLogs = async () => {
    try {
      setLoading(true);

      const queryParams = new URLSearchParams();
      queryParams.set('page', currentPage);
      queryParams.set('limit', logsPerPage);

      if (filters.module) queryParams.set('module', filters.module);
      if (filters.action) queryParams.set('action', filters.action);
      if (filters.userRole) queryParams.set('userRole', filters.userRole);
      if (filters.startDate) queryParams.set('startDate', filters.startDate);
      if (filters.endDate) queryParams.set('endDate', filters.endDate);
      if (filters.searchQuery) {
        queryParams.set('search', filters.searchQuery);
      }

      const queryString = queryParams.toString();

      const response = await requestWithFallback([
        () => api.get(`/admin/audit-logs?${queryString}`),
        () => api.get(`/admin/audit?${queryString}`)
      ]);

      const { items, total } = normalizeLogsResponse(response);

      setLogs(items);
      setTotalLogs(total);
      setTotalPages(Math.max(1, Math.ceil(total / logsPerPage)));
    } catch (error) {
      console.error('Error fetching audit logs:', error);
      toast.error(
        error?.response?.data?.message || 'Failed to load audit logs'
      );
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await requestWithFallback([
        () => api.get('/admin/audit-logs/stats'),
        () => api.get('/admin/audit/stats')
      ]);

      setStats(
        response?.data?.data || {
          totalToday: 0,
          totalThisWeek: 0,
          totalThisMonth: 0,
          byModule: {}
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
      module: '',
      action: '',
      userRole: '',
      startDate: '',
      endDate: '',
      searchQuery: ''
    });
    setCurrentPage(1);
  };

  const handleExport = async () => {
    try {
      toast.info('Preparing export...');

      const response = await requestWithFallback([
        () =>
          api.get('/admin/audit-logs/export', {
            params: filters,
            responseType: 'blob'
          }),
        () =>
          api.get('/admin/audit/export', {
            params: filters,
            responseType: 'blob'
          })
      ]);

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `audit-logs-${formatDate(new Date())}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();

      toast.success('Export completed');
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Failed to export logs');
    }
  };

  const handleViewDetails = (log) => {
    setSelectedLog(log);
    setShowDetailModal(true);
  };

  const getActionIcon = (action = '') => {
    const iconMap = {
      user_registered: FaUserPlus,
      user_login: FaSignInAlt,
      account_verified: FaCheckCircle,
      application_created: FaPlus,
      application_submitted: FaFileAlt,
      application_approved: FaCheckCircle,
      application_rejected: FaTimesCircle,
      appointment_booked: FaCalendarAlt,
      appointment_completed: FaCheckCircle,
      appointment_cancelled: FaTimesCircle,
      ticket_created: FaTicketAlt,
      ticket_resolved: FaCheckCircle,
      nid_generated: FaShieldAlt,
      card_printed: FaPrint,
      card_dispatched: FaTruck,
      card_delivered: FaCheckCircle,
      profile_updated: FaEdit,
      password_changed: FaShieldAlt,
      center_created: FaPlus,
      center_updated: FaEdit,
      center_deleted: FaTrash,
      default: FaHistory
    };

    const Icon = iconMap[action] || iconMap.default;
    return <Icon />;
  };

  const getActionColor = (action = '') => {
    if (
      action.includes('created') ||
      action.includes('registered') ||
      action.includes('approved') ||
      action.includes('completed') ||
      action.includes('verified') ||
      action.includes('generated') ||
      action.includes('delivered')
    ) {
      return 'success';
    }

    if (
      action.includes('rejected') ||
      action.includes('cancelled') ||
      action.includes('deleted')
    ) {
      return 'danger';
    }

    if (
      action.includes('updated') ||
      action.includes('changed') ||
      action.includes('submitted')
    ) {
      return 'warning';
    }

    if (
      action.includes('login') ||
      action.includes('booked') ||
      action.includes('dispatched') ||
      action.includes('printed')
    ) {
      return 'info';
    }

    return 'default';
  };

  const getModuleIcon = (module = '') => {
    const iconMap = {
      users: FaUsers,
      applications: FaFileAlt,
      appointments: FaCalendarAlt,
      tickets: FaTicketAlt,
      support: FaTicketAlt,
      system: FaCog,
      default: FaHistory
    };

    const Icon = iconMap[module] || iconMap.default;
    return <Icon />;
  };

  const formatActionName = (action = '') => {
    return action
      .split('_')
      .filter(Boolean)
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  const modules = [
    { value: 'users', label: 'Users' },
    { value: 'applications', label: 'Applications' },
    { value: 'appointments', label: 'Appointments' },
    { value: 'tickets', label: 'Support Tickets' },
    { value: 'support', label: 'Support Tickets' },
    { value: 'system', label: 'System' }
  ];

  const actions = [
    { value: 'user_registered', label: 'User Registered' },
    { value: 'user_login', label: 'User Login' },
    { value: 'account_verified', label: 'Account Verified' },
    { value: 'application_created', label: 'Application Created' },
    { value: 'application_submitted', label: 'Application Submitted' },
    { value: 'application_approved', label: 'Application Approved' },
    { value: 'application_rejected', label: 'Application Rejected' },
    { value: 'appointment_booked', label: 'Appointment Booked' },
    { value: 'appointment_completed', label: 'Appointment Completed' },
    { value: 'ticket_created', label: 'Ticket Created' },
    { value: 'ticket_resolved', label: 'Ticket Resolved' },
    { value: 'nid_generated', label: 'NID Generated' },
    { value: 'card_printed', label: 'Card Printed' },
    { value: 'card_dispatched', label: 'Card Dispatched' }
  ];

  const filteredLogs = useMemo(() => {
    if (!filters.searchQuery) return logs;

    const query = filters.searchQuery.toLowerCase();

    return logs.filter((log) => {
      const logUser = getLogUser(log);

      return (
        (logUser?.fullName || '').toLowerCase().includes(query) ||
        (logUser?.mobile || logUser?.phone || '').toLowerCase().includes(query) ||
        (log?.action || '').toLowerCase().includes(query) ||
        (log?.module || '').toLowerCase().includes(query) ||
        (log?.ipAddress || '').toLowerCase().includes(query)
      );
    });
  }, [logs, filters.searchQuery]);

  if (loading && logs.length === 0) {
    return (
      <AdminLayout>
        <div className="admin-loading">
          <Loader size="large" text="Loading audit logs..." />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="audit-logs-page">
        <div className="page-header">
          <div className="header-content">
            <h1><FaHistory /> Audit Logs</h1>
            <p>System activity and security logs</p>
          </div>
          <div className="header-actions">
            <button className="btn btn-outline" onClick={handleExport}>
              <FaFileExport /> Export
            </button>
            <button
              className="btn btn-primary"
              onClick={() => {
                fetchLogs();
                fetchStats();
              }}
            >
              <FaSyncAlt /> Refresh
            </button>
          </div>
        </div>

        <div className="stats-row">
          <div className="stat-card">
            <div className="stat-icon bg-blue">
              <FaHistory />
            </div>
            <div className="stat-info">
              <span className="stat-value">{stats.totalToday || 0}</span>
              <span className="stat-label">Today</span>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon bg-green">
              <FaCalendarAlt />
            </div>
            <div className="stat-info">
              <span className="stat-value">{stats.totalThisWeek || 0}</span>
              <span className="stat-label">This Week</span>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon bg-purple">
              <FaFileAlt />
            </div>
            <div className="stat-info">
              <span className="stat-value">{stats.totalThisMonth || 0}</span>
              <span className="stat-label">This Month</span>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon bg-orange">
              <FaShieldAlt />
            </div>
            <div className="stat-info">
              <span className="stat-value">{totalLogs}</span>
              <span className="stat-label">Total Logs</span>
            </div>
          </div>
        </div>

        <div className="filters-card">
          <div className="filters-header">
            <h3><FaFilter /> Filters</h3>
            {Object.values(filters).some((v) => v) && (
              <button className="clear-filters-btn" onClick={handleClearFilters}>
                <FaTimes /> Clear All
              </button>
            )}
          </div>

          <div className="filters-grid">
            <div className="filter-item">
              <label>Search</label>
              <div className="search-input">
                <FaSearch />
                <input
                  type="text"
                  placeholder="Search by user, action..."
                  value={filters.searchQuery}
                  onChange={(e) => handleFilterChange('searchQuery', e.target.value)}
                />
              </div>
            </div>

            <div className="filter-item">
              <label>Module</label>
              <select
                value={filters.module}
                onChange={(e) => handleFilterChange('module', e.target.value)}
              >
                <option value="">All Modules</option>
                {modules.map((mod) => (
                  <option key={mod.value} value={mod.value}>
                    {mod.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="filter-item">
              <label>Action</label>
              <select
                value={filters.action}
                onChange={(e) => handleFilterChange('action', e.target.value)}
              >
                <option value="">All Actions</option>
                {actions.map((act) => (
                  <option key={act.value} value={act.value}>
                    {act.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="filter-item">
              <label>User Role</label>
              <select
                value={filters.userRole}
                onChange={(e) => handleFilterChange('userRole', e.target.value)}
              >
                <option value="">All Roles</option>
                <option value="citizen">Citizen</option>
                <option value="admin">Admin</option>
                <option value="super_admin">Super Admin</option>
              </select>
            </div>

            <div className="filter-item">
              <label>Start Date</label>
              <input
                type="date"
                value={filters.startDate}
                onChange={(e) => handleFilterChange('startDate', e.target.value)}
              />
            </div>

            <div className="filter-item">
              <label>End Date</label>
              <input
                type="date"
                value={filters.endDate}
                onChange={(e) => handleFilterChange('endDate', e.target.value)}
              />
            </div>
          </div>
        </div>

        <div className="logs-card">
          <div className="card-header">
            <h3>Activity Logs</h3>
            <span className="logs-count">{totalLogs} total logs</span>
          </div>

          <div className="table-container">
            <table className="logs-table">
              <thead>
                <tr>
                  <th>Timestamp</th>
                  <th>User</th>
                  <th>Role</th>
                  <th>Module</th>
                  <th>Action</th>
                  <th>IP Address</th>
                  <th>Details</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="7" className="loading-row">
                      <Loader size="small" />
                    </td>
                  </tr>
                ) : filteredLogs.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="empty-row">
                      <FaHistory className="empty-icon" />
                      <p>No audit logs found</p>
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
                  filteredLogs.map((log, index) => {
                    const logUser = getLogUser(log);

                    return (
                      <tr key={log._id || index}>
                        <td>
                          <div className="timestamp-cell">
                            <span className="date">
                              {formatDate(log.timestamp || log.createdAt)}
                            </span>
                            <span className="time">
                              <FaClock />{' '}
                              {new Date(
                                log.timestamp || log.createdAt || new Date()
                              ).toLocaleTimeString()}
                            </span>
                          </div>
                        </td>
                        <td>
                          <div className="user-cell">
                            <div className="user-avatar">
                              <FaUser />
                            </div>
                            <div className="user-info">
                              <span className="user-name">
                                {logUser?.fullName || 'System'}
                              </span>
                              <span className="user-id">
                                {logUser?.mobile || logUser?.phone || 'N/A'}
                              </span>
                            </div>
                          </div>
                        </td>
                        <td>
                          <span className={`role-badge ${log.userRole || logUser?.role || ''}`}>
                            {log.userRole || logUser?.role || 'N/A'}
                          </span>
                        </td>
                        <td>
                          <div className="module-cell">
                            <span className={`module-icon module-${log.module}`}>
                              {getModuleIcon(log.module)}
                            </span>
                            <span className="module-name">{log.module || 'system'}</span>
                          </div>
                        </td>
                        <td>
                          <div className={`action-badge action-${getActionColor(log.action || '')}`}>
                            {getActionIcon(log.action)}
                            <span>{formatActionName(log.action || 'unknown_action')}</span>
                          </div>
                        </td>
                        <td>
                          <div className="ip-cell">
                            <FaGlobe />
                            <span>{log.ipAddress || 'N/A'}</span>
                          </div>
                        </td>
                        <td>
                          <button
                            className="btn-view"
                            onClick={() => handleViewDetails(log)}
                            title="View Details"
                          >
                            <FaEye />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="pagination">
              <div className="pagination-info">
                Showing {((currentPage - 1) * logsPerPage) + 1} to {Math.min(currentPage * logsPerPage, totalLogs)} of {totalLogs} logs
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
        </div>

        {showDetailModal && selectedLog && (
          <div className="modal-overlay" onClick={() => setShowDetailModal(false)}>
            <div className="modal modal-lg" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h3><FaHistory /> Log Details</h3>
                <button
                  className="modal-close"
                  onClick={() => setShowDetailModal(false)}
                >
                  <FaTimes />
                </button>
              </div>

              <div className="modal-body">
                <div className="log-details">
                  <div className={`action-banner action-${getActionColor(selectedLog.action || '')}`}>
                    <div className="action-icon-large">
                      {getActionIcon(selectedLog.action)}
                    </div>
                    <div className="action-info">
                      <h4>{formatActionName(selectedLog.action || 'unknown_action')}</h4>
                      <span className="module-tag">
                        {getModuleIcon(selectedLog.module)}
                        {selectedLog.module || 'system'}
                      </span>
                    </div>
                  </div>

                  <div className="detail-section">
                    <h4><FaUser /> User Information</h4>
                    <div className="detail-grid">
                      <div className="detail-item">
                        <label>User Name</label>
                        <p>{getLogUser(selectedLog)?.fullName || 'System'}</p>
                      </div>
                      <div className="detail-item">
                        <label>Mobile</label>
                        <p>{getLogUser(selectedLog)?.mobile || getLogUser(selectedLog)?.phone || 'N/A'}</p>
                      </div>
                      <div className="detail-item">
                        <label>Role</label>
                        <p>
                          <span className={`role-badge ${selectedLog.userRole || getLogUser(selectedLog)?.role || ''}`}>
                            {selectedLog.userRole || getLogUser(selectedLog)?.role || 'N/A'}
                          </span>
                        </p>
                      </div>
                      <div className="detail-item">
                        <label>User ID</label>
                        <p className="mono-text">
                          {getLogUser(selectedLog)?._id || 'N/A'}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="detail-section">
                    <h4><FaClock /> Timestamp & Location</h4>
                    <div className="detail-grid">
                      <div className="detail-item">
                        <label>Date & Time</label>
                        <p>{formatDateTime(selectedLog.timestamp || selectedLog.createdAt)}</p>
                      </div>
                      <div className="detail-item">
                        <label>IP Address</label>
                        <p className="mono-text">
                          <FaGlobe /> {selectedLog.ipAddress || 'N/A'}
                        </p>
                      </div>
                      <div className="detail-item full-width">
                        <label>User Agent</label>
                        <p className="user-agent-text">
                          {selectedLog.userAgent || 'N/A'}
                        </p>
                      </div>
                    </div>
                  </div>

                  {selectedLog.targetId && (
                    <div className="detail-section">
                      <h4><FaFileAlt /> Target Information</h4>
                      <div className="detail-grid">
                        <div className="detail-item">
                          <label>Target ID</label>
                          <p className="mono-text">{selectedLog.targetId}</p>
                        </div>
                        <div className="detail-item">
                          <label>Module</label>
                          <p>{selectedLog.module || 'system'}</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {selectedLog.details && Object.keys(selectedLog.details).length > 0 && (
                    <div className="detail-section">
                      <h4><FaCog /> Additional Details</h4>
                      <div className="details-json">
                        <pre>{JSON.stringify(selectedLog.details, null, 2)}</pre>
                      </div>
                    </div>
                  )}

                  <div className="detail-section">
                    <h4><FaShieldAlt /> Log Metadata</h4>
                    <div className="detail-grid">
                      <div className="detail-item">
                        <label>Log ID</label>
                        <p className="mono-text">{selectedLog._id}</p>
                      </div>
                      <div className="detail-item">
                        <label>Created At</label>
                        <p>{formatDateTime(selectedLog.timestamp || selectedLog.createdAt)}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="modal-footer">
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
      </div>
    </AdminLayout>
  );
};

export default AuditLogs;