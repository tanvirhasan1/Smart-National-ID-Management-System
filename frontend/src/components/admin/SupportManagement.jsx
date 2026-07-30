import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'react-toastify';
import {
  FaChevronLeft,
  FaChevronRight,
  FaClock,
  FaExchangeAlt,
  FaExclamationTriangle,
  FaEye,
  FaFilter,
  FaHeadset,
  FaPaperPlane,
  FaSearch,
  FaSpinner,
  FaTicketAlt,
  FaTimes,
  FaUserCheck,
  FaUserClock,
  FaUsers
} from 'react-icons/fa';
import api from '../api/axios';
import AdminLayout from './AdminLayout';
import Loader from '../common/Loader';
import { formatDateTime, formatStatus } from '../utils/helpers';
import '../styles/SupportManagement.css';

const DEFAULT_SORT = '-createdAt';

const getTicketListFromResponse = (response) =>
  response?.data?.data || response?.data?.tickets || [];

const getMetaFromResponse = (response) =>
  response?.data?.meta || {
    page: 1,
    limit: 10,
    total: 0,
    pages: 1,
    hasPrevPage: false,
    hasNextPage: false
  };

const getTicketDetailsFromResponse = (response) =>
  response?.data?.data || response?.data?.ticket || null;

const buildPageNumbers = (currentPage, totalPages) => {
  if (totalPages <= 1) return [1];

  const pages = new Set([1, totalPages, currentPage, currentPage - 1, currentPage + 1]);

  return Array.from(pages)
    .filter((page) => page >= 1 && page <= totalPages)
    .sort((a, b) => a - b);
};

const getPriorityClass = (priority) => {
  const value = String(priority || '').toLowerCase();

  if (value === 'urgent') return 'urgent';
  if (value === 'high') return 'high';
  if (value === 'medium') return 'medium';
  return 'low';
};

const getStatusClass = (status) => {
  const value = String(status || '').toLowerCase();

  if (value === 'open') return 'open';
  if (value === 'in_progress') return 'progress';
  if (value === 'resolved') return 'resolved';
  if (value === 'closed') return 'closed';
  return 'neutral';
};

const SupportManagement = () => {
  const [tickets, setTickets] = useState([]);
  const [meta, setMeta] = useState({
    page: 1,
    limit: 10,
    total: 0,
    pages: 1,
    hasPrevPage: false,
    hasNextPage: false
  });

  const [stats, setStats] = useState(null);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [teamMembers, setTeamMembers] = useState([]);

  const [loadingList, setLoadingList] = useState(true);
  const [loadingStats, setLoadingStats] = useState(false);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [loadingTeam, setLoadingTeam] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [replyMessage, setReplyMessage] = useState('');
  const [sendingReply, setSendingReply] = useState(false);
  const messagesEndRef = useRef(null);

  const [searchInput, setSearchInput] = useState('');

  const [filters, setFilters] = useState({
    page: 1,
    status: '',
    priority: '',
    category: '',
    assignedTo: '',
    sort: DEFAULT_SORT,
    search: ''
  });

  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [statusModalOpen, setStatusModalOpen] = useState(false);

  const [assignForm, setAssignForm] = useState({
    assignedTo: '',
    assignmentReason: '',
    assignmentNote: ''
  });

  const [statusForm, setStatusForm] = useState({
    status: '',
    statusNote: '',
    resolutionNotes: ''
  });

  // Load support stats for the top summary row.
  const fetchSupportStats = useCallback(async () => {
    try {
      setLoadingStats(true);
      const response = await api.get('/admin/support/stats');
      setStats(response?.data?.data || response?.data || null);
    } catch (error) {
      console.error('Error fetching support stats:', error);
    } finally {
      setLoadingStats(false);
    }
  }, []);

  // Load the support ticket list with backend pagination and filters.
  const fetchTickets = useCallback(async () => {
    try {
      setLoadingList(true);

      const query = new URLSearchParams();
      query.set('page', filters.page);
      query.set('limit', 10);
      query.set('sort', filters.sort || DEFAULT_SORT);

      if (filters.status) query.set('status', filters.status);
      if (filters.priority) query.set('priority', filters.priority);
      if (filters.category) query.set('category', filters.category);
      if (filters.assignedTo) query.set('assignedTo', filters.assignedTo);
      if (filters.search) query.set('search', filters.search);

      const response = await api.get(`/admin/support/tickets?${query.toString()}`);
      const ticketList = getTicketListFromResponse(response);
      const ticketMeta = getMetaFromResponse(response);

      setTickets(ticketList);
      setMeta(ticketMeta);

      if (ticketList.length === 0) {
        setSelectedTicket(null);
        setDetailsModalOpen(false);
        return;
      }

      setSelectedTicket((current) => {
        if (!current) return null;

        const stillExists = ticketList.find((ticket) => ticket._id === current._id);
        return stillExists ? current : null;
      });
    } catch (error) {
      console.error('Error fetching support tickets:', error);
      toast.error(error?.response?.data?.message || 'Failed to load support tickets');
    } finally {
      setLoadingList(false);
    }
  }, [filters]);

  // Load single ticket details if the endpoint exists, otherwise keep selected list data.
  const fetchTicketDetails = useCallback(async (ticketId, options = {}) => {
    if (!ticketId) {
      setSelectedTicket(null);
      return;
    }

    const silent = Boolean(options.silent);

    try {
      if (!silent) setLoadingDetails(true);
      const response = await api.get(`/admin/support/tickets/${ticketId}`);
      const ticket = getTicketDetailsFromResponse(response);

      if (ticket) {
        setSelectedTicket(ticket);
      }
    } catch (error) {
      if (!silent) {
        toast.error(error?.response?.data?.message || 'Failed to load ticket details');
      }
    } finally {
      if (!silent) setLoadingDetails(false);
    }
  }, []);

  // Load internal support/admin users for assignment.
  const fetchTeamMembers = useCallback(async () => {
    try {
      setLoadingTeam(true);

      const ticketQuery = selectedTicket?._id
        ? `?ticketId=${encodeURIComponent(selectedTicket._id)}`
        : '';
      const response = await api.get(`/admin/support/assignees${ticketQuery}`);
      setTeamMembers(response?.data?.data || []);
    } catch (error) {
      console.error('Error fetching team members:', error);
    } finally {
      setLoadingTeam(false);
    }
  }, [selectedTicket?._id]);

  useEffect(() => {
    fetchSupportStats();
  }, [fetchSupportStats]);

  useEffect(() => {
    fetchTickets();
  }, [fetchTickets]);

  useEffect(() => {
    if (!detailsModalOpen || !selectedTicket?._id) return undefined;

    const refreshLiveTicket = () => {
      if (document.visibilityState === 'visible') {
        fetchTicketDetails(selectedTicket._id, { silent: true });
      }
    };

    const intervalId = window.setInterval(refreshLiveTicket, 4000);
    document.addEventListener('visibilitychange', refreshLiveTicket);

    return () => {
      window.clearInterval(intervalId);
      document.removeEventListener('visibilitychange', refreshLiveTicket);
    };
  }, [detailsModalOpen, selectedTicket?._id, fetchTicketDetails]);

  useEffect(() => {
    if (!detailsModalOpen) return;
    messagesEndRef.current?.scrollIntoView({ block: 'nearest' });
  }, [detailsModalOpen, selectedTicket?._id, selectedTicket?.responses?.length]);

  const statCards = useMemo(() => {
    return [
      {
        key: 'open',
        title: 'Open Tickets',
        value: stats?.openTickets ?? stats?.open ?? 0,
        icon: FaTicketAlt,
        theme: 'orange'
      },
      {
        key: 'inProgress',
        title: 'In Progress',
        value: stats?.inProgressTickets ?? stats?.inProgress ?? 0,
        icon: FaClock,
        theme: 'blue'
      },
      {
        key: 'urgent',
        title: 'Urgent Tickets',
        value: stats?.urgentTickets ?? stats?.urgent ?? 0,
        icon: FaExclamationTriangle,
        theme: 'red'
      },
      {
        key: 'unassigned',
        title: 'Unassigned',
        value: stats?.unassignedTickets ?? stats?.unassigned ?? 0,
        icon: FaUserClock,
        theme: 'yellow'
      }
    ];
  }, [stats]);

  const pageNumbers = useMemo(
    () => buildPageNumbers(meta.page || 1, meta.pages || 1),
    [meta.page, meta.pages]
  );

  const selectedResponses = selectedTicket?.responses || [];

  const hasActiveFilters = Boolean(
    filters.status ||
      filters.priority ||
      filters.category ||
      filters.assignedTo ||
      filters.search ||
      filters.sort !== DEFAULT_SORT ||
      searchInput.trim()
  );

  const handleApplySearch = (event) => {
    event.preventDefault();

    setFilters((prev) => ({
      ...prev,
      page: 1,
      search: searchInput.trim()
    }));
  };

  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({
      ...prev,
      [key]: value,
      page: 1
    }));
  };

  const handleClearFilters = () => {
    setSearchInput('');
    setFilters({
      page: 1,
      status: '',
      priority: '',
      category: '',
      assignedTo: '',
      sort: DEFAULT_SORT,
      search: ''
    });
  };

  const handlePageChange = (nextPage) => {
    if (nextPage < 1 || nextPage > (meta.pages || 1)) return;

    setFilters((prev) => ({
      ...prev,
      page: nextPage
    }));
  };

  const openTicketDetails = async (ticket) => {
    if (!ticket?._id) return;

    setSelectedTicket(ticket);
    setDetailsModalOpen(true);
    await fetchTicketDetails(ticket._id);
  };

  const closeTicketDetails = () => {
    if (actionLoading) return;
    setDetailsModalOpen(false);
    setReplyMessage('');
  };

  const openAssignModal = () => {
    if (!selectedTicket?._id) return;

    setAssignForm({
      assignedTo: selectedTicket?.assignedTo?._id || '',
      assignmentReason: '',
      assignmentNote: ''
    });

    setAssignModalOpen(true);
    fetchTeamMembers();
  };

  const closeAssignModal = (force = false) => {
    if (actionLoading && force !== true) return;
    setAssignModalOpen(false);
    setAssignForm({
      assignedTo: '',
      assignmentReason: '',
      assignmentNote: ''
    });
  };

  const openStatusModal = () => {
    if (!selectedTicket?._id) return;

    setStatusForm({
      status: selectedTicket?.status || 'open',
      statusNote: '',
      resolutionNotes: selectedTicket?.resolutionNotes || ''
    });

    setStatusModalOpen(true);
  };

  const closeStatusModal = (force = false) => {
    if (actionLoading && force !== true) return;
    setStatusModalOpen(false);
    setStatusForm({
      status: '',
      statusNote: '',
      resolutionNotes: ''
    });
  };

  const refreshCurrentTicketData = async (ticketId) => {
    await Promise.all([fetchTickets(), fetchSupportStats()]);
    await fetchTicketDetails(ticketId);
  };

  const handleAssignTicket = async () => {
    if (!selectedTicket?._id) return;

    if (!assignForm.assignedTo) {
      toast.error('Please select a team member');
      return;
    }

    if (!assignForm.assignmentReason.trim()) {
      toast.error('Please provide an assignment reason');
      return;
    }

    try {
      setActionLoading(true);

      await api.patch(`/admin/support/tickets/${selectedTicket._id}/assign`, {
        assignedTo: assignForm.assignedTo,
        assignmentReason: assignForm.assignmentReason.trim(),
        assignmentNote: assignForm.assignmentNote.trim()
      });

      toast.success('Support ticket assigned successfully');
      closeAssignModal(true);
      await refreshCurrentTicketData(selectedTicket._id);
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Failed to assign support ticket');
    } finally {
      setActionLoading(false);
    }
  };

  const handleSendReply = async (event) => {
    event.preventDefault();

    const message = replyMessage.trim();
    if (!message || !selectedTicket?._id) return;

    try {
      setSendingReply(true);
      const response = await api.post(
        `/support/tickets/${selectedTicket._id}/respond`,
        { message }
      );
      const updatedTicket = getTicketDetailsFromResponse(response);

      if (updatedTicket) {
        setSelectedTicket(updatedTicket);
      }

      setReplyMessage('');
      toast.success('Reply sent successfully');
      await Promise.all([fetchTickets(), fetchSupportStats()]);
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Failed to send reply');
    } finally {
      setSendingReply(false);
    }
  };

  const handleUpdateTicketStatus = async () => {
    if (!selectedTicket?._id) return;

    if (!statusForm.status) {
      toast.error('Please select a ticket status');
      return;
    }

    if (!statusForm.statusNote.trim()) {
      toast.error('Please provide a status note');
      return;
    }

    try {
      setActionLoading(true);

      await api.patch(`/admin/support/tickets/${selectedTicket._id}/status`, {
        status: statusForm.status,
        statusNote: statusForm.statusNote.trim(),
        resolutionNotes: statusForm.resolutionNotes.trim()
      });

      toast.success('Support ticket status updated successfully');
      closeStatusModal(true);
      await refreshCurrentTicketData(selectedTicket._id);
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Failed to update ticket status');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <AdminLayout>
      <div className="support-management-page">
        {/* Header area for support operations */}
        <div className="support-management-header-card">
          <div className="support-management-header-top">
            <div>
              <h1 className="support-management-title">Support Management</h1>
              <p className="support-management-subtitle">
                Manage support queue, assignments and resolution workflow with live admin controls.
              </p>
            </div>
          </div>

          <div className="support-management-stats-grid">
            {statCards.map((item) => {
              const Icon = item.icon;

              return (
                <div
                  key={item.key}
                  className={`support-management-stat-card support-management-stat-${item.theme}`}
                >
                  <div className="support-management-stat-icon">
                    <Icon />
                  </div>
                  <div>
                    <p>{item.title}</p>
                    <h3>{loadingStats ? '...' : item.value}</h3>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Filters and search */}
        <div className="support-management-toolbar">
          <form className="support-management-search-form" onSubmit={handleApplySearch}>
            <div className="support-management-search-box">
              <FaSearch className="support-management-field-icon" />
              <input
                type="text"
                placeholder="Search by ticket number, subject or description"
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
              />
            </div>

            <button type="submit" className="support-management-toolbar-button primary">
              Search
            </button>

            <button
              type="button"
              className="support-management-toolbar-button secondary"
              onClick={handleClearFilters}
              disabled={!hasActiveFilters}
            >
              Clear Filters
            </button>
          </form>

          <div className="support-management-filter-row">
            <div className="support-management-filter-group">
              <FaFilter className="support-management-field-icon" />
              <select
                value={filters.status}
                onChange={(event) => handleFilterChange('status', event.target.value)}
              >
                <option value="">All Status</option>
                <option value="open">Open</option>
                <option value="in_progress">In Progress</option>
                <option value="resolved">Resolved</option>
                <option value="closed">Closed</option>
              </select>
            </div>

            <div className="support-management-filter-group">
              <FaFilter className="support-management-field-icon" />
              <select
                value={filters.priority}
                onChange={(event) => handleFilterChange('priority', event.target.value)}
              >
                <option value="">All Priority</option>
                <option value="urgent">Urgent</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>

            <div className="support-management-filter-group">
              <FaFilter className="support-management-field-icon" />
              <select
                value={filters.assignedTo}
                onChange={(event) => handleFilterChange('assignedTo', event.target.value)}
              >
                <option value="">All Assignment</option>
                <option value="unassigned">Unassigned</option>
              </select>
            </div>

            <div className="support-management-filter-group">
              <FaFilter className="support-management-field-icon" />
              <select
                value={filters.sort}
                onChange={(event) => handleFilterChange('sort', event.target.value)}
              >
                <option value="-createdAt">Newest First</option>
                <option value="createdAt">Oldest First</option>
                <option value="-updatedAt">Recently Updated</option>
                <option value="priority">Priority A-Z</option>
                <option value="-priority">Priority Z-A</option>
                <option value="status">Status A-Z</option>
              </select>
            </div>
          </div>
        </div>

        <div className="support-management-content support-management-content-full">
          {/* Full-width ticket table */}
          <div className="support-management-list-card support-management-list-card-full">
            <div className="support-management-card-header">
              <div>
                <h3>Support Queue</h3>
                <p>
                  Page {meta.page || 1} of {meta.pages || 1} · Total {meta.total || 0}
                </p>
              </div>
            </div>

            {loadingList ? (
              <div className="support-management-loading-state">
                <Loader size="medium" text="Loading support tickets..." />
              </div>
            ) : (
              <>
                <div className="support-management-table-wrap">
                  <table className="support-management-table support-management-table-full">
                    <thead>
                      <tr>
                        <th>Ticket</th>
                        <th>Citizen</th>
                        <th>Category</th>
                        <th>Priority</th>
                        <th>Status</th>
                        <th>Assigned</th>
                        <th>Created</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {tickets.length === 0 ? (
                        <tr>
                          <td colSpan="8" className="support-management-empty-cell">
                            No support tickets found for the current filter
                          </td>
                        </tr>
                      ) : (
                        tickets.map((ticket) => (
                          <tr
                            key={ticket._id}
                            className={
                              selectedTicket?._id === ticket._id && detailsModalOpen
                                ? 'support-management-row active'
                                : 'support-management-row'
                            }
                          >
                            <td>
                              <div className="support-management-ticket-main support-management-ticket-wide">
                                <span className="support-management-ticket-number">
                                  {ticket.ticketNumber || `#${ticket._id?.slice(-6)}`}
                                </span>
                                <small>{ticket.subject || 'No subject'}</small>
                              </div>
                            </td>

                            <td>
                              <div className="support-management-ticket-main support-management-ticket-wide">
                                <span>{ticket.citizen?.fullName || 'N/A'}</span>
                                <small>{ticket.citizen?.email || ticket.citizen?.phone || 'N/A'}</small>
                              </div>
                            </td>

                            <td>{formatStatus(ticket.category || 'N/A')}</td>

                            <td>
                              <span
                                className={`support-management-priority-chip ${getPriorityClass(ticket.priority)}`}
                              >
                                {formatStatus(ticket.priority || 'low')}
                              </span>
                            </td>

                            <td>
                              <span
                                className={`support-management-status-chip ${getStatusClass(ticket.status)}`}
                              >
                                {formatStatus(ticket.status)}
                              </span>
                            </td>

                            <td>
                              <div className="support-management-ticket-main support-management-ticket-wide">
                                <span>{ticket.assignedTo?.fullName || 'Unassigned'}</span>
                                <small>{ticket.assignedTo?.role ? formatStatus(ticket.assignedTo.role) : 'No owner'}</small>
                              </div>
                            </td>

                            <td>{ticket.createdAt ? formatDateTime(ticket.createdAt) : 'N/A'}</td>

                            <td>
                              <button
                                type="button"
                                className="support-management-view-button"
                                onClick={() => openTicketDetails(ticket)}
                                title="View ticket"
                              >
                                <FaEye />
                                <span>View</span>
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                <div className="support-management-pagination">
                  <button
                    type="button"
                    className="support-management-page-nav"
                    onClick={() => handlePageChange((meta.page || 1) - 1)}
                    disabled={!meta.hasPrevPage}
                  >
                    <FaChevronLeft />
                    <span>Prev</span>
                  </button>

                  <div className="support-management-page-numbers">
                    {pageNumbers.map((pageNumber) => (
                      <button
                        key={pageNumber}
                        type="button"
                        className={
                          pageNumber === (meta.page || 1)
                            ? 'support-management-page-number active'
                            : 'support-management-page-number'
                        }
                        onClick={() => handlePageChange(pageNumber)}
                      >
                        {pageNumber}
                      </button>
                    ))}
                  </div>

                  <button
                    type="button"
                    className="support-management-page-nav"
                    onClick={() => handlePageChange((meta.page || 1) + 1)}
                    disabled={!meta.hasNextPage}
                  >
                    <span>Next</span>
                    <FaChevronRight />
                  </button>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Ticket details modal */}
        {detailsModalOpen ? (
          <div className="support-management-modal-backdrop" onClick={closeTicketDetails}>
            <div
              className="support-management-ticket-modal-card"
              onClick={(event) => event.stopPropagation()}
            >
              {loadingDetails ? (
                <div className="support-management-loading-state large">
                  <Loader size="medium" text="Loading ticket details..." />
                </div>
              ) : selectedTicket ? (
                <>
                  <div className="support-management-details-header support-management-modal-details-header">
                    <div>
                      <h2>{selectedTicket.ticketNumber || `#${selectedTicket._id?.slice(-6)}`}</h2>
                      <p>{selectedTicket.subject || 'No subject available'}</p>
                    </div>

                    <div className="support-management-details-header-actions">
                      <div className="support-management-details-badges">
                        <span
                          className={`support-management-priority-chip ${getPriorityClass(selectedTicket.priority)}`}
                        >
                          {formatStatus(selectedTicket.priority || 'low')}
                        </span>

                        <span
                          className={`support-management-status-chip ${getStatusClass(selectedTicket.status)}`}
                        >
                          {formatStatus(selectedTicket.status)}
                        </span>
                      </div>

                      <button
                        type="button"
                        className="support-management-modal-close"
                        onClick={closeTicketDetails}
                        aria-label="Close ticket details"
                      >
                        <FaTimes />
                      </button>
                    </div>
                  </div>

                  <div className="support-management-ticket-modal-body">
                    <div className="support-management-summary-grid">
                      <div className="support-management-summary-card">
                        <p>Citizen</p>
                        <h4>{selectedTicket.citizen?.fullName || 'N/A'}</h4>
                        <small>{selectedTicket.citizen?.email || selectedTicket.citizen?.phone || 'N/A'}</small>
                      </div>

                      <div className="support-management-summary-card">
                        <p>Assigned To</p>
                        <h4>{selectedTicket.assignedTo?.fullName || 'Unassigned'}</h4>
                        <small>
                          {selectedTicket.assignedTo?.role
                            ? formatStatus(selectedTicket.assignedTo.role)
                            : 'No owner yet'}
                        </small>
                      </div>
                    </div>

                    <div className="support-management-section-card">
                      <h3>Description</h3>
                      <p className="support-management-description">
                        {selectedTicket.description || 'No description provided'}
                      </p>
                    </div>

                    <div className="support-management-section-card">
                      <h3>Ticket Information</h3>

                      <div className="support-management-detail-grid">
                        <div>
                          <p>Category</p>
                          <h4>{formatStatus(selectedTicket.category || 'N/A')}</h4>
                        </div>
                        <div>
                          <p>District</p>
                          <h4>
                            {selectedTicket.district ||
                              selectedTicket.citizen?.permanentAddress?.district ||
                              selectedTicket.citizen?.presentAddress?.district ||
                              'N/A'}
                          </h4>
                        </div>
                        <div>
                          <p>Created At</p>
                          <h4>
                            {selectedTicket.createdAt
                              ? formatDateTime(selectedTicket.createdAt)
                              : 'N/A'}
                          </h4>
                        </div>
                        <div>
                          <p>Resolved At</p>
                          <h4>
                            {selectedTicket.resolvedAt
                              ? formatDateTime(selectedTicket.resolvedAt)
                              : 'Not resolved'}
                          </h4>
                        </div>
                        <div>
                          <p>Closed At</p>
                          <h4>
                            {selectedTicket.closedAt
                              ? formatDateTime(selectedTicket.closedAt)
                              : 'Not closed'}
                          </h4>
                        </div>
                      </div>
                    </div>

                    {selectedTicket.resolutionNotes ? (
                      <div className="support-management-section-card highlighted">
                        <h3>Resolution Notes</h3>
                        <p className="support-management-description">
                          {selectedTicket.resolutionNotes}
                        </p>
                      </div>
                    ) : null}

                    <div className="support-management-section-card support-management-conversation-card">
                      <h3>Response History</h3>

                      {selectedResponses.length === 0 ? (
                        <div className="support-management-history-empty">
                          No response history found yet
                        </div>
                      ) : (
                        <div className="support-management-history-list">
                          {selectedResponses.map((responseItem, index) => {
                            const responderRole =
                              responseItem.responderRole || responseItem.responder?.role || '';
                            const isCitizenMessage = responderRole === 'citizen';
                            const responderName = isCitizenMessage
                              ? responseItem.responder?.fullName ||
                                selectedTicket?.citizen?.fullName ||
                                'Citizen'
                              : responseItem.responder?.fullName ||
                                formatStatus(responderRole || 'support_staff');

                            return (
                              <div
                                key={`${responseItem.createdAt || index}-${index}`}
                                className={`support-management-history-item ${
                                  isCitizenMessage
                                    ? 'support-management-history-citizen'
                                    : 'support-management-history-staff'
                                }`}
                              >
                                <div className="support-management-history-content">
                                  <div className="support-management-history-top">
                                    <span>{responderName}</span>
                                    <small>
                                      {responseItem.createdAt
                                        ? formatDateTime(responseItem.createdAt)
                                        : 'N/A'}
                                    </small>
                                  </div>

                                  <p>{responseItem.message || 'No message available'}</p>
                                </div>
                              </div>
                            );
                          })}
                          <div ref={messagesEndRef} />
                        </div>
                      )}
                    </div>

                    {!['resolved', 'closed'].includes(selectedTicket.status) ? (
                      <form
                        className="support-management-section-card"
                        onSubmit={handleSendReply}
                      >
                        <h3>Reply to Citizen</h3>
                        <div className="support-management-modal-field">
                          <textarea
                            rows={4}
                            value={replyMessage}
                            onChange={(event) => setReplyMessage(event.target.value)}
                            placeholder="Type a clear support message..."
                          />
                        </div>
                        <div className="support-management-reply-actions">
                          <button
                            type="submit"
                            className="support-management-toolbar-button primary"
                            disabled={sendingReply || !replyMessage.trim()}
                          >
                            {sendingReply ? <FaSpinner className="spin" /> : <FaPaperPlane />}
                            <span>{sendingReply ? 'Sending...' : 'Send Reply'}</span>
                          </button>
                        </div>
                      </form>
                    ) : null}
                  </div>

                  <div className="support-management-action-row support-management-ticket-modal-actions">
                    <button
                      type="button"
                      className="support-management-action-button assign"
                      onClick={openAssignModal}
                      disabled={actionLoading}
                    >
                      <FaUserCheck />
                      <span>Assign Ticket</span>
                    </button>

                    <button
                      type="button"
                      className="support-management-action-button status"
                      onClick={openStatusModal}
                      disabled={actionLoading}
                    >
                      <FaExchangeAlt />
                      <span>Update Status</span>
                    </button>
                  </div>
                </>
              ) : (
                <div className="support-management-empty-details">
                  <FaHeadset className="support-management-empty-icon" />
                  <h3>Ticket not found</h3>
                  <p>The selected support ticket could not be loaded.</p>
                </div>
              )}
            </div>
          </div>
        ) : null}

        {/* Assignment modal */}
        {assignModalOpen ? (
          <div className="support-management-modal-backdrop" onClick={closeAssignModal}>
            <div
              className="support-management-modal-card"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="support-management-modal-header">
                <h3>Assign Support Ticket</h3>
                <p>Add a reason and assign the ticket to the right admin or support staff.</p>
              </div>

              <div className="support-management-modal-body">
                <div className="support-management-modal-field">
                  <label>Assign To *</label>
                  <select
                    value={assignForm.assignedTo}
                    onChange={(event) =>
                      setAssignForm((prev) => ({
                        ...prev,
                        assignedTo: event.target.value
                      }))
                    }
                  >
                    <option value="">Select team member</option>
                    {loadingTeam ? (
                      <option value="">Loading team...</option>
                    ) : (
                      teamMembers.map((member) => (
                        <option key={member._id} value={member._id}>
                          {member.fullName} ({formatStatus(member.role)})
                        </option>
                      ))
                    )}
                  </select>
                </div>

                <div className="support-management-modal-field">
                  <label>Assignment Reason *</label>
                  <textarea
                    rows={4}
                    value={assignForm.assignmentReason}
                    onChange={(event) =>
                      setAssignForm((prev) => ({
                        ...prev,
                        assignmentReason: event.target.value
                      }))
                    }
                    placeholder="Write why this ticket is being assigned..."
                  />
                </div>

                <div className="support-management-modal-field">
                  <label>Assignment Note</label>
                  <textarea
                    rows={3}
                    value={assignForm.assignmentNote}
                    onChange={(event) =>
                      setAssignForm((prev) => ({
                        ...prev,
                        assignmentNote: event.target.value
                      }))
                    }
                    placeholder="Optional working note for the assignee..."
                  />
                </div>
              </div>

              <div className="support-management-modal-footer">
                <button
                  type="button"
                  className="support-management-toolbar-button secondary"
                  onClick={closeAssignModal}
                  disabled={actionLoading}
                >
                  Cancel
                </button>

                <button
                  type="button"
                  className="support-management-toolbar-button primary"
                  onClick={handleAssignTicket}
                  disabled={
                    actionLoading ||
                    !assignForm.assignedTo ||
                    !assignForm.assignmentReason.trim()
                  }
                >
                  {actionLoading ? <FaSpinner className="spin" /> : null}
                  <span>Confirm Assignment</span>
                </button>
              </div>
            </div>
          </div>
        ) : null}

        {/* Status update modal */}
        {statusModalOpen ? (
          <div className="support-management-modal-backdrop" onClick={closeStatusModal}>
            <div
              className="support-management-modal-card"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="support-management-modal-header">
                <h3>Update Ticket Status</h3>
                <p>Write a clear note so the support timeline stays traceable.</p>
              </div>

              <div className="support-management-modal-body">
                <div className="support-management-modal-field">
                  <label>Status *</label>
                  <select
                    value={statusForm.status}
                    onChange={(event) =>
                      setStatusForm((prev) => ({
                        ...prev,
                        status: event.target.value
                      }))
                    }
                  >
                    <option value="open">Open</option>
                    <option value="in_progress">In Progress</option>
                    <option value="resolved">Resolved</option>
                    <option value="closed">Closed</option>
                  </select>
                </div>

                <div className="support-management-modal-field">
                  <label>Status Note *</label>
                  <textarea
                    rows={4}
                    value={statusForm.statusNote}
                    onChange={(event) =>
                      setStatusForm((prev) => ({
                        ...prev,
                        statusNote: event.target.value
                      }))
                    }
                    placeholder="Write why the ticket status is being changed..."
                  />
                </div>

                <div className="support-management-modal-field">
                  <label>Resolution Notes</label>
                  <textarea
                    rows={4}
                    value={statusForm.resolutionNotes}
                    onChange={(event) =>
                      setStatusForm((prev) => ({
                        ...prev,
                        resolutionNotes: event.target.value
                      }))
                    }
                    placeholder="Write final support resolution details if needed..."
                  />
                </div>
              </div>

              <div className="support-management-modal-footer">
                <button
                  type="button"
                  className="support-management-toolbar-button secondary"
                  onClick={closeStatusModal}
                  disabled={actionLoading}
                >
                  Cancel
                </button>

                <button
                  type="button"
                  className="support-management-toolbar-button primary"
                  onClick={handleUpdateTicketStatus}
                  disabled={actionLoading || !statusForm.statusNote.trim()}
                >
                  {actionLoading ? <FaSpinner className="spin" /> : null}
                  <span>Confirm Status Update</span>
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </AdminLayout>
  );
};

export default SupportManagement;