import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-toastify';
import {
  FaHeadset,
  FaSearch,
  FaFilter,
  FaEye,
  FaReply,
  FaSpinner,
  FaClock,
  FaExclamationTriangle,
  FaUser,
  FaCalendarAlt,
  FaChevronLeft,
  FaChevronRight,
  FaPaperPlane,
  FaUserPlus,
  FaSyncAlt,
  FaCheckCircle,
  FaTicketAlt,
  FaAlignLeft,
  FaComments,
  FaTimes,
  FaTimesCircle
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
import '../styles/SupportManagement.css';

const SupportManagement = () => {
  const { user } = useAuth();

  // State management
  const [tickets, setTickets] = useState([]);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showRespondModal, setShowRespondModal] = useState(false);
  const [responseText, setResponseText] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalTickets, setTotalTickets] = useState(0);
  const ticketsPerPage = 15;

  // Filters
  const [filters, setFilters] = useState({
    status: '',
    category: '',
    priority: '',
    searchQuery: '',
    assignedTo: ''
  });

  // Statistics
  const [stats, setStats] = useState({
    open: 0,
    inProgress: 0,
    resolved: 0,
    closed: 0,
    urgent: 0
  });

  useEffect(() => {
    fetchTickets();
    fetchStats();
  }, [currentPage, filters]);

  const getTicketUser = (ticket) => {
    return (
      ticket?.userId ||
      ticket?.user ||
      ticket?.applicant ||
      ticket?.createdBy ||
      {}
    );
  };

  const getTicketApplication = (ticket) => {
    return ticket?.applicationId || ticket?.application || {};
  };

  const requestWithFallback = async (requests = []) => {
    let lastError = null;

    for (const request of requests) {
      try {
        return await request();
      } catch (error) {
        lastError = error;
      }
    }

    throw lastError;
  };

  const fetchTickets = async () => {
    try {
      setLoading(true);

      let url = `/admin/support/tickets?page=${currentPage}&limit=${ticketsPerPage}`;

      if (filters.status) url += `&status=${filters.status}`;
      if (filters.category) url += `&category=${filters.category}`;
      if (filters.priority) url += `&priority=${filters.priority}`;
      if (filters.assignedTo) url += `&assignedTo=${filters.assignedTo}`;
      if (filters.searchQuery) {
        url += `&search=${encodeURIComponent(filters.searchQuery)}`;
      }

      const response = await requestWithFallback([
        () => api.get(url),
        () =>
          api.get(
            url
              .replace('/admin/support/tickets', '/admin/support')
          )
      ]);

      const responseData = response?.data || {};
      const ticketList =
        responseData.data ||
        responseData.tickets ||
        responseData.supportTickets ||
        [];
      const total =
        responseData.total ||
        responseData.pagination?.total ||
        ticketList.length ||
        0;

      setTickets(ticketList);
      setTotalTickets(total);
      setTotalPages(Math.max(1, Math.ceil(total / ticketsPerPage)));
    } catch (error) {
      console.error('Error fetching tickets:', error);
      toast.error(
        error?.response?.data?.message || 'Failed to load support tickets'
      );
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await requestWithFallback([
        () => api.get('/admin/support/stats'),
        () => api.get('/admin/support/tickets/stats')
      ]);

      const statsData = response?.data?.data || response?.data || {};

      setStats({
        open: statsData.open || 0,
        inProgress: statsData.inProgress || statsData.in_progress || 0,
        resolved: statsData.resolved || 0,
        closed: statsData.closed || 0,
        urgent: statsData.urgent || 0
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const fetchSingleTicket = async (ticketId) => {
    const response = await requestWithFallback([
      () => api.get(`/admin/support/tickets/${ticketId}`),
      () => api.get(`/admin/support/${ticketId}`)
    ]);

    return response?.data?.ticket || response?.data?.data || response?.data;
  };

  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setCurrentPage(1);
  };

  const handleClearFilters = () => {
    setFilters({
      status: '',
      category: '',
      priority: '',
      searchQuery: '',
      assignedTo: ''
    });
    setCurrentPage(1);
  };

  const handleViewTicket = async (ticket) => {
    try {
      setActionLoading(true);
      const fullTicket = await fetchSingleTicket(ticket._id);
      setSelectedTicket(fullTicket || ticket);
      setShowDetailModal(true);
    } catch (error) {
      console.error('Error loading ticket details:', error);
      toast.error(
        error?.response?.data?.message || 'Failed to load ticket details'
      );
    } finally {
      setActionLoading(false);
    }
  };

  const handleRespond = async (ticket) => {
    try {
      setActionLoading(true);
      const fullTicket = await fetchSingleTicket(ticket._id);
      setSelectedTicket(fullTicket || ticket);
      setResponseText('');
      setShowRespondModal(true);
    } catch (error) {
      console.error('Error loading ticket for response:', error);
      toast.error(
        error?.response?.data?.message || 'Failed to load ticket details'
      );
    } finally {
      setActionLoading(false);
    }
  };

  const handleSendResponse = async (event) => {
    event.preventDefault();

    if (!selectedTicket || !responseText.trim()) {
      toast.error('Please enter a response message');
      return;
    }

    setActionLoading(true);
    try {
      await requestWithFallback([
        () =>
          api.post(`/admin/support/tickets/${selectedTicket._id}/respond`, {
            message: responseText
          }),
        () =>
          api.post(`/admin/support/${selectedTicket._id}/respond`, {
            message: responseText
          })
      ]);

      toast.success('Response sent successfully');
      setShowRespondModal(false);
      setResponseText('');
      fetchTickets();
      fetchStats();
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Failed to send response');
    } finally {
      setActionLoading(false);
    }
  };

  const handleUpdateStatus = async (ticketId, status) => {
    setActionLoading(true);
    try {
      await requestWithFallback([
        () => api.put(`/admin/support/tickets/${ticketId}/status`, { status }),
        () => api.patch(`/admin/support/tickets/${ticketId}/status`, { status }),
        () => api.put(`/admin/support/${ticketId}/status`, { status }),
        () => api.patch(`/admin/support/${ticketId}/status`, { status })
      ]);

      toast.success(`Ticket marked as ${formatStatus(status)}`);
      fetchTickets();
      fetchStats();
      setShowDetailModal(false);
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Failed to update status');
    } finally {
      setActionLoading(false);
    }
  };

  const handleAssignTicket = async (ticketId, adminId) => {
    setActionLoading(true);
    try {
      await requestWithFallback([
        () =>
          api.put(`/admin/support/tickets/${ticketId}/assign`, {
            assignedTo: adminId
          }),
        () =>
          api.patch(`/admin/support/tickets/${ticketId}/assign`, {
            assignedTo: adminId
          }),
        () =>
          api.put(`/admin/support/${ticketId}/assign`, {
            assignedTo: adminId
          }),
        () =>
          api.patch(`/admin/support/${ticketId}/assign`, {
            assignedTo: adminId
          })
      ]);

      toast.success('Ticket assigned successfully');
      fetchTickets();
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Failed to assign ticket');
    } finally {
      setActionLoading(false);
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'open':
        return <FaClock className="status-icon open" />;
      case 'in_progress':
        return <FaSyncAlt className="status-icon in-progress" />;
      case 'resolved':
        return <FaCheckCircle className="status-icon resolved" />;
      case 'closed':
        return <FaTimesCircle className="status-icon closed" />;
      default:
        return <FaClock />;
    }
  };

  const filteredTickets = useMemo(() => {
    return tickets.filter((ticket) => {
      const ticketUser = getTicketUser(ticket);
      const ticketNumber = ticket.ticketNumber || '';
      const subject = ticket.subject || '';
      const userName = ticketUser.fullName || '';
      const userPhone = ticketUser.mobile || ticketUser.phone || '';
      const query = filters.searchQuery.toLowerCase();

      return (
        ticketNumber.toLowerCase().includes(query) ||
        subject.toLowerCase().includes(query) ||
        userName.toLowerCase().includes(query) ||
        userPhone.toLowerCase().includes(query)
      );
    });
  }, [tickets, filters.searchQuery]);

  if (loading && tickets.length === 0) {
    return (
      <AdminLayout>
        <div className="admin-loading">
          <Loader size="large" text="Loading support tickets..." />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="support-management-page">
        {/* Page Header */}
        <div className="page-header">
          <div className="header-content">
            <h1><FaHeadset /> Support Management</h1>
            <p>Manage citizen support tickets and resolve issues</p>
          </div>
          <div className="header-actions">
            <button
              className="btn btn-primary"
              onClick={fetchTickets}
              disabled={loading}
            >
              <FaSyncAlt /> Refresh
            </button>
          </div>
        </div>

        {/* Statistics Cards */}
        <div className="stats-row">
          <div className="stat-card stat-open">
            <div className="stat-icon-wrapper">
              <FaClock />
            </div>
            <div className="stat-info">
              <span className="stat-value">{stats.open || 0}</span>
              <span className="stat-label">Open Tickets</span>
            </div>
          </div>

          <div className="stat-card stat-in-progress">
            <div className="stat-icon-wrapper">
              <FaSyncAlt />
            </div>
            <div className="stat-info">
              <span className="stat-value">{stats.inProgress || 0}</span>
              <span className="stat-label">In Progress</span>
            </div>
          </div>

          <div className="stat-card stat-resolved">
            <div className="stat-icon-wrapper">
              <FaCheckCircle />
            </div>
            <div className="stat-info">
              <span className="stat-value">{stats.resolved || 0}</span>
              <span className="stat-label">Resolved</span>
            </div>
          </div>

          <div className="stat-card stat-urgent">
            <div className="stat-icon-wrapper">
              <FaExclamationTriangle />
            </div>
            <div className="stat-info">
              <span className="stat-value">{stats.urgent || 0}</span>
              <span className="stat-label">Urgent</span>
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
                  placeholder="Search by ID, name, subject..."
                  value={filters.searchQuery}
                  onChange={(e) => handleFilterChange('searchQuery', e.target.value)}
                />
              </div>
            </div>

            {/* Status Filter */}
            <div className="filter-item">
              <label>Status</label>
              <select
                value={filters.status}
                onChange={(e) => handleFilterChange('status', e.target.value)}
              >
                <option value="">All Status</option>
                <option value="open">Open</option>
                <option value="in_progress">In Progress</option>
                <option value="resolved">Resolved</option>
                <option value="closed">Closed</option>
              </select>
            </div>

            {/* Category Filter */}
            <div className="filter-item">
              <label>Category</label>
              <select
                value={filters.category}
                onChange={(e) => handleFilterChange('category', e.target.value)}
              >
                <option value="">All Categories</option>
                <option value="application_issue">Application Issue</option>
                <option value="appointment">Appointment</option>
                <option value="payment">Payment</option>
                <option value="delivery">Delivery</option>
                <option value="technical">Technical Issue</option>
                <option value="other">Other</option>
              </select>
            </div>

            {/* Priority Filter */}
            <div className="filter-item">
              <label>Priority</label>
              <select
                value={filters.priority}
                onChange={(e) => handleFilterChange('priority', e.target.value)}
              >
                <option value="">All Priorities</option>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>

            {/* Assigned To Filter */}
            <div className="filter-item">
              <label>Assigned To</label>
              <select
                value={filters.assignedTo}
                onChange={(e) => handleFilterChange('assignedTo', e.target.value)}
              >
                <option value="">All Admins</option>
                <option value="unassigned">Unassigned</option>
              </select>
            </div>
          </div>
        </div>

        {/* Tickets Table */}
        <div className="tickets-card">
          <div className="card-header">
            <h3><FaTicketAlt /> Support Tickets</h3>
            <span className="tickets-count">{totalTickets} total tickets</span>
          </div>

          <div className="table-container">
            <table className="tickets-table">
              <thead>
                <tr>
                  <th>Ticket ID</th>
                  <th>Applicant</th>
                  <th>Subject</th>
                  <th>Category</th>
                  <th>Priority</th>
                  <th>Status</th>
                  <th>Assigned To</th>
                  <th>Created</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="9" className="loading-row">
                      <Loader size="small" />
                    </td>
                  </tr>
                ) : filteredTickets.length === 0 ? (
                  <tr>
                    <td colSpan="9" className="empty-row">
                      <FaTicketAlt className="empty-icon" />
                      <p>No tickets found</p>
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
                  filteredTickets.map((ticket) => {
                    const ticketUser = getTicketUser(ticket);

                    return (
                      <tr key={ticket._id}>
                        <td>
                          <span className="ticket-id">#{ticket.ticketNumber}</span>
                        </td>
                        <td>
                          <div className="applicant-cell">
                            <span className="name">{ticketUser.fullName || 'N/A'}</span>
                            <span className="mobile">
                              {ticketUser.mobile || ticketUser.phone || 'N/A'}
                            </span>
                          </div>
                        </td>
                        <td>
                          <span className="subject">{ticket.subject}</span>
                        </td>
                        <td>
                          <span className={`category-badge ${ticket.category}`}>
                            {formatStatus(ticket.category)}
                          </span>
                        </td>
                        <td>
                          <span className={`priority-badge ${ticket.priority}`}>
                            {ticket.priority?.toUpperCase()}
                          </span>
                        </td>
                        <td>
                          <span className={`status-badge ${ticket.status}`}>
                            {getStatusIcon(ticket.status)}
                            {formatStatus(ticket.status)}
                          </span>
                        </td>
                        <td>
                          <span className="assigned-to">
                            {ticket.assignedTo?.fullName || 'Unassigned'}
                          </span>
                        </td>
                        <td>
                          <span className="date">
                            {formatDate(ticket.createdAt)}
                          </span>
                        </td>
                        <td>
                          <div className="action-buttons">
                            <button
                              className="btn-action btn-view"
                              onClick={() => handleViewTicket(ticket)}
                              title="View Details"
                            >
                              <FaEye />
                            </button>
                            {ticket.status !== 'closed' && (
                              <button
                                className="btn-action btn-respond"
                                onClick={() => handleRespond(ticket)}
                                title="Respond"
                              >
                                <FaReply />
                              </button>
                            )}
                            {ticket.status === 'open' && user?._id && (
                              <button
                                className="btn-action btn-assign"
                                onClick={() => handleAssignTicket(ticket._id, user._id)}
                                title="Assign to Me"
                                disabled={actionLoading}
                              >
                                <FaUserPlus />
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
                Showing {((currentPage - 1) * ticketsPerPage) + 1} to {Math.min(currentPage * ticketsPerPage, totalTickets)} of {totalTickets}
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

        {/* Ticket Detail Modal */}
        {showDetailModal && selectedTicket && (
          <div className="modal-overlay" onClick={() => setShowDetailModal(false)}>
            <div className="modal modal-lg" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h3><FaTicketAlt /> Ticket #{selectedTicket.ticketNumber}</h3>
                <button
                  className="modal-close"
                  onClick={() => setShowDetailModal(false)}
                >
                  <FaTimes />
                </button>
              </div>

              <div className="modal-body">
                <div className="ticket-details">
                  {/* Status Banner */}
                  <div className={`status-banner ${selectedTicket.status}`}>
                    <div className="status-icon">
                      {getStatusIcon(selectedTicket.status)}
                    </div>
                    <div className="status-info">
                      <h4>{formatStatus(selectedTicket.status)}</h4>
                      <p>
                        {selectedTicket.status === 'open' && 'Awaiting admin response'}
                        {selectedTicket.status === 'in_progress' && 'Being processed by support team'}
                        {selectedTicket.status === 'resolved' && 'Issue resolved'}
                        {selectedTicket.status === 'closed' && 'Ticket closed'}
                      </p>
                    </div>
                  </div>

                  {/* Ticket Info */}
                  <div className="detail-section">
                    <h4><FaInfoCircle /> Ticket Information</h4>
                    <div className="detail-grid">
                      <div className="detail-item">
                        <label>Subject</label>
                        <p>{selectedTicket.subject}</p>
                      </div>
                      <div className="detail-item">
                        <label>Category</label>
                        <p>{formatStatus(selectedTicket.category)}</p>
                      </div>
                      <div className="detail-item">
                        <label>Priority</label>
                        <p>{selectedTicket.priority?.toUpperCase()}</p>
                      </div>
                      <div className="detail-item">
                        <label>Created Date</label>
                        <p>{formatDateTime(selectedTicket.createdAt)}</p>
                      </div>
                      <div className="detail-item">
                        <label>Last Updated</label>
                        <p>{formatDateTime(selectedTicket.updatedAt)}</p>
                      </div>
                      {getTicketApplication(selectedTicket)?._id && (
                        <div className="detail-item">
                          <label>Related Application</label>
                          <p>
                            #
                            {getTicketApplication(selectedTicket)?.applicationId ||
                              getTicketApplication(selectedTicket)?.applicationNumber ||
                              'N/A'}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Applicant Details */}
                  <div className="detail-section">
                    <h4><FaUser /> Applicant Information</h4>
                    <div className="applicant-details">
                      <div className="applicant-photo">
                        {getTicketUser(selectedTicket)?.documents?.photo ? (
                          <img src={getTicketUser(selectedTicket).documents.photo} alt="Applicant" />
                        ) : (
                          <div className="no-photo"><FaUser /></div>
                        )}
                      </div>
                      <div className="applicant-info">
                        <div className="info-row">
                          <span className="label">Name:</span>
                          <span className="value">
                            {getTicketUser(selectedTicket)?.fullName || 'N/A'}
                          </span>
                        </div>
                        <div className="info-row">
                          <span className="label">Mobile:</span>
                          <span className="value">
                            {getTicketUser(selectedTicket)?.mobile ||
                              getTicketUser(selectedTicket)?.phone ||
                              'N/A'}
                          </span>
                        </div>
                        <div className="info-row">
                          <span className="label">Email:</span>
                          <span className="value">
                            {getTicketUser(selectedTicket)?.email || 'N/A'}
                          </span>
                        </div>
                        <div className="info-row">
                          <span className="label">Address:</span>
                          <span className="value">
                            {[
                              getTicketUser(selectedTicket)?.presentAddress?.village,
                              getTicketUser(selectedTicket)?.presentAddress?.union,
                              getTicketUser(selectedTicket)?.presentAddress?.upazila,
                              getTicketUser(selectedTicket)?.presentAddress?.district,
                              getTicketUser(selectedTicket)?.presentAddress?.division
                            ]
                              .filter(Boolean)
                              .join(', ') || 'N/A'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Description */}
                  <div className="detail-section">
                    <h4><FaAlignLeft /> Description</h4>
                    <div className="description-box">
                      <p>{selectedTicket.description}</p>
                    </div>
                  </div>

                  {/* Responses */}
                  {selectedTicket.responses?.length > 0 && (
                    <div className="detail-section">
                      <h4><FaComments /> Conversation History</h4>
                      <div className="responses-container">
                        {selectedTicket.responses.map((response, index) => (
                          <div
                            key={index}
                            className={`response-item ${response.responderRole === 'admin' ? 'admin-response' : 'user-response'}`}
                          >
                            <div className="response-header">
                              <div className="responder-info">
                                <span className="responder-name">
                                  {response.responderName || 'Unknown'}
                                </span>
                                <span className={`responder-role ${response.responderRole}`}>
                                  {response.responderRole === 'admin' ? 'Support Team' : 'Applicant'}
                                </span>
                              </div>
                              <span className="response-time">
                                {formatDateTime(response.createdAt)}
                              </span>
                            </div>
                            <div className="response-content">
                              <p>{response.message}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="modal-footer">
                {selectedTicket.status !== 'closed' && selectedTicket.status !== 'resolved' && (
                  <button
                    className="btn btn-primary"
                    onClick={() => {
                      setShowDetailModal(false);
                      handleRespond(selectedTicket);
                    }}
                  >
                    <FaReply /> Respond
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

        {/* Respond Modal */}
        {showRespondModal && selectedTicket && (
          <div className="modal-overlay" onClick={() => setShowRespondModal(false)}>
            <div className="modal" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h3><FaReply /> Respond to Ticket</h3>
                <button
                  className="modal-close"
                  onClick={() => setShowRespondModal(false)}
                >
                  <FaTimes />
                </button>
              </div>

              <form onSubmit={handleSendResponse}>
                <div className="modal-body">
                  <div className="ticket-reference">
                    <p>Replying to: <strong>#{selectedTicket.ticketNumber}</strong></p>
                    <p className="ticket-subject">{selectedTicket.subject}</p>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Your Response *</label>
                    <textarea
                      className="form-textarea"
                      placeholder="Type your response here..."
                      value={responseText}
                      onChange={(e) => setResponseText(e.target.value)}
                      rows={6}
                      required
                    />
                  </div>

                  <div className="form-actions">
                    <label className="checkbox-label">
                      <input type="checkbox" />
                      <span>Send notification to applicant</span>
                    </label>
                  </div>
                </div>

                <div className="modal-footer">
                  <button
                    type="button"
                    className="btn btn-outline"
                    onClick={() => setShowRespondModal(false)}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={actionLoading || !responseText.trim()}
                  >
                    {actionLoading ? (
                      <>
                        <FaSpinner className="spinner" /> Sending...
                      </>
                    ) : (
                      <>
                        <FaPaperPlane /> Send Response
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

export default SupportManagement;