import React, { useEffect, useMemo, useState } from 'react';
import { toast } from 'react-toastify';
import {
  FaCircle,
  FaClock,
  FaEdit,
  FaEnvelope,
  FaMapSigns,
  FaPhoneAlt,
  FaPlus,
  FaSearch,
  FaShieldAlt,
  FaSpinner,
  FaTrashAlt,
  FaUserCheck,
  FaUserClock,
  FaUserShield,
  FaUsers
} from 'react-icons/fa';
import api from '../api/axios';
import AdminLayout from './AdminLayout';
import Loader from '../common/Loader';
import { useAuth } from '../context/AuthContext';
import { formatDateTime, formatStatus } from '../utils/helpers';
import '../styles/AdminUsers.css';

const inferMainAdmin = (user) =>
  Boolean(user?.isMainAdmin) || (user?.role === 'admin' && !user?.createdBy);

const getUsersFromResponse = (response) =>
  response?.data?.data || response?.data?.users || [];

const isRootMainAdminUser = (user) =>
  Boolean(user?.role === 'admin' && !user?.createdBy);

const getWorkingStatusText = (user) =>
  user?.liveStatus?.isLive ? 'Live Now' : 'Offline';

const getSafeCurrentRoute = (user) =>
  user?.liveStatus?.currentRoute || 'No active route';

const getLastSeenText = (user) => {
  if (user?.liveStatus?.isLive) {
    return 'Working now';
  }

  if (user?.liveStatus?.lastSeenAt) {
    return formatDateTime(user.liveStatus.lastSeenAt);
  }

  return 'No recent activity';
};

// Normalize any value so search stays consistent.
const normalizeText = (value) =>
  String(value ?? '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();

// Build one searchable text block for each internal user.
const buildUserSearchText = (user) =>
  normalizeText(
    [
      user?.fullName,
      user?.email,
      user?.phone,
      user?.role,
      user?.accountStatus || user?.status,
      user?.liveStatus?.isLive ? 'live now working active online' : 'offline inactive',
      user?.createdBy?.fullName,
      user?.createdBy?.email,
      getSafeCurrentRoute(user)
    ]
      .filter(Boolean)
      .join(' ')
  );

const AdminUsers = () => {
  const { user } = useAuth();

  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);

  const [loading, setLoading] = useState(true);
  const [createLoading, setCreateLoading] = useState(false);
  const [editLoading, setEditLoading] = useState(false);
  const [removeLoading, setRemoveLoading] = useState(false);

  const [searchInput, setSearchInput] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [workingFilter, setWorkingFilter] = useState('');

  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [removeModalOpen, setRemoveModalOpen] = useState(false);

  const [createForm, setCreateForm] = useState({
    fullName: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    role: 'support_staff'
  });

  const [editForm, setEditForm] = useState({
    fullName: '',
    email: '',
    phone: '',
    role: 'support_staff',
    status: 'active',
    updateReason: ''
  });

  const [removeForm, setRemoveForm] = useState({
    archiveReason: ''
  });

  const isMainAdmin = inferMainAdmin(user);

  // Load the internal user control list from backend.
  const fetchUsers = async () => {
    try {
      setLoading(true);

      const response = await api.get('/admin/users');
      const internalUsers = getUsersFromResponse(response);

      setUsers(internalUsers);

      setSelectedUser((currentSelected) => {
        if (!internalUsers.length) return null;
        if (!currentSelected) return internalUsers[0];

        const stillExists = internalUsers.find(
          (item) => item._id === currentSelected._id
        );

        return stillExists || internalUsers[0];
      });
    } catch (error) {
      console.error('Error fetching internal users:', error);
      toast.error(
        error?.response?.data?.message || 'Failed to load internal users'
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const summary = useMemo(() => {
    return {
      total: users.length,
      admins: users.filter((item) => item.role === 'admin').length,
      supervisors: users.filter((item) => item.role === 'system_supervisor')
        .length,
      supportStaff: users.filter((item) => item.role === 'support_staff').length,
      liveNow: users.filter((item) => item.liveStatus?.isLive).length,
      offline: users.filter((item) => !item.liveStatus?.isLive).length
    };
  }, [users]);

  const visibleUsers = useMemo(() => {
    const normalizedSearch = normalizeText(searchInput);
    const searchTokens = normalizedSearch.split(' ').filter(Boolean);

    return users.filter((item) => {
      const searchableText = buildUserSearchText(item);

      // Match all typed words so search feels smarter.
      const matchesSearch =
        searchTokens.length === 0 ||
        searchTokens.every((token) => searchableText.includes(token));

      const matchesRole = !roleFilter || item.role === roleFilter;

      const matchesStatus =
        !statusFilter ||
        item.accountStatus === statusFilter ||
        item.status === statusFilter;

      const matchesWorkingStatus =
        !workingFilter ||
        (workingFilter === 'live' && item.liveStatus?.isLive) ||
        (workingFilter === 'offline' && !item.liveStatus?.isLive);

      return (
        matchesSearch &&
        matchesRole &&
        matchesStatus &&
        matchesWorkingStatus
      );
    });
  }, [users, searchInput, roleFilter, statusFilter, workingFilter]);

  useEffect(() => {
    if (!visibleUsers.length) {
      setSelectedUser(null);
      return;
    }

    setSelectedUser((currentSelected) => {
      if (!currentSelected) return visibleUsers[0];

      const stillExists = visibleUsers.find(
        (item) => item._id === currentSelected._id
      );

      return stillExists || visibleUsers[0];
    });
  }, [visibleUsers]);

  const selectedIsRootMainAdmin = isRootMainAdminUser(selectedUser);
  const selectedIsSelf = selectedUser?._id === user?._id;

  const openCreateModal = () => {
    setCreateForm({
      fullName: '',
      email: '',
      phone: '',
      password: '',
      confirmPassword: '',
      role: 'support_staff'
    });

    setCreateModalOpen(true);
  };

  const closeCreateModal = () => {
    if (createLoading) return;

    setCreateModalOpen(false);
    setCreateForm({
      fullName: '',
      email: '',
      phone: '',
      password: '',
      confirmPassword: '',
      role: 'support_staff'
    });
  };

  const openEditModal = () => {
    if (!selectedUser) return;

    setEditForm({
      fullName: selectedUser.fullName || '',
      email: selectedUser.email || '',
      phone: selectedUser.phone || '',
      role: selectedUser.role || 'support_staff',
      status: selectedUser.accountStatus || selectedUser.status || 'active',
      updateReason: ''
    });

    setEditModalOpen(true);
  };

  const closeEditModal = () => {
    if (editLoading) return;

    setEditModalOpen(false);
    setEditForm({
      fullName: '',
      email: '',
      phone: '',
      role: 'support_staff',
      status: 'active',
      updateReason: ''
    });
  };

  const openRemoveModal = () => {
    if (!selectedUser) return;

    setRemoveForm({
      archiveReason: ''
    });

    setRemoveModalOpen(true);
  };

  const closeRemoveModal = () => {
    if (removeLoading) return;

    setRemoveModalOpen(false);
    setRemoveForm({
      archiveReason: ''
    });
  };

  const handleCreateUser = async () => {
    if (!createForm.fullName.trim()) {
      toast.error('Full name is required');
      return;
    }

    if (!createForm.email.trim()) {
      toast.error('Email is required');
      return;
    }

    if (!createForm.phone.trim()) {
      toast.error('Phone number is required');
      return;
    }

    if (!createForm.password) {
      toast.error('Password is required');
      return;
    }

    if (createForm.password.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }

    if (createForm.password !== createForm.confirmPassword) {
      toast.error('Password and confirm password do not match');
      return;
    }

    try {
      setCreateLoading(true);

      await api.post('/admin/users', {
        fullName: createForm.fullName.trim(),
        email: createForm.email.trim(),
        phone: createForm.phone.trim(),
        password: createForm.password,
        role: createForm.role
      });

      toast.success('Internal user created successfully');
      closeCreateModal();
      await fetchUsers();
    } catch (error) {
      console.error('Error creating internal user:', error);
      toast.error(
        error?.response?.data?.message || 'Failed to create internal user'
      );
    } finally {
      setCreateLoading(false);
    }
  };

  const handleEditUser = async () => {
    if (!selectedUser?._id) return;

    if (!editForm.fullName.trim()) {
      toast.error('Full name is required');
      return;
    }

    if (!editForm.email.trim()) {
      toast.error('Email is required');
      return;
    }

    if (!editForm.phone.trim()) {
      toast.error('Phone is required');
      return;
    }

    if (!editForm.updateReason.trim()) {
      toast.error('Update reason is required');
      return;
    }

    try {
      setEditLoading(true);

      await api.put(`/admin/users/${selectedUser._id}`, {
        fullName: editForm.fullName.trim(),
        email: editForm.email.trim(),
        phone: editForm.phone.trim(),
        role: editForm.role,
        status: editForm.status,
        updateReason: editForm.updateReason.trim()
      });

      toast.success('Internal user updated successfully');
      closeEditModal();
      await fetchUsers();
    } catch (error) {
      console.error('Error updating internal user:', error);
      toast.error(
        error?.response?.data?.message || 'Failed to update internal user'
      );
    } finally {
      setEditLoading(false);
    }
  };

  const handleRemoveUser = async () => {
    if (!selectedUser?._id) return;

    if (!removeForm.archiveReason.trim()) {
      toast.error('Remove reason is required');
      return;
    }

    try {
      setRemoveLoading(true);

      await api.delete(`/admin/users/${selectedUser._id}`, {
        data: {
          archiveReason: removeForm.archiveReason.trim()
        }
      });

      toast.success('Internal user removed from active control');
      closeRemoveModal();
      await fetchUsers();
    } catch (error) {
      console.error('Error removing internal user:', error);
      toast.error(
        error?.response?.data?.message || 'Failed to remove internal user'
      );
    } finally {
      setRemoveLoading(false);
    }
  };

  const clearFilters = () => {
    setSearchInput('');
    setRoleFilter('');
    setStatusFilter('');
    setWorkingFilter('');
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="admin-users-loading-state">
          <Loader size="large" text="Loading internal users..." />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="admin-users-page">
        {/* Header block for overall internal control */}
        <div className="admin-users-header-card">
          <div className="admin-users-header-top">
            <div>
              <h1 className="admin-users-title">Internal User Control</h1>
              <p className="admin-users-subtitle">
                Manage admins, system supervisors and support staff from one
                control-focused workspace.
              </p>
            </div>

            {isMainAdmin ? (
              <button
                type="button"
                className="admin-users-primary-button"
                onClick={openCreateModal}
              >
                <FaPlus />
                <span>Create Internal User</span>
              </button>
            ) : null}
          </div>

          <div className="admin-users-stats-grid">
            <div className="admin-users-stat-card neutral">
              <div className="admin-users-stat-icon">
                <FaUsers />
              </div>
              <div>
                <p>Total Internal Users</p>
                <h3>{summary.total}</h3>
              </div>
            </div>

            <div className="admin-users-stat-card blue">
              <div className="admin-users-stat-icon">
                <FaUserShield />
              </div>
              <div>
                <p>Admins</p>
                <h3>{summary.admins}</h3>
              </div>
            </div>

            <div className="admin-users-stat-card yellow">
              <div className="admin-users-stat-icon">
                <FaShieldAlt />
              </div>
              <div>
                <p>Supervisors</p>
                <h3>{summary.supervisors}</h3>
              </div>
            </div>

            <div className="admin-users-stat-card green">
              <div className="admin-users-stat-icon">
                <FaUserCheck />
              </div>
              <div>
                <p>Support Staff</p>
                <h3>{summary.supportStaff}</h3>
              </div>
            </div>

            <div className="admin-users-stat-card live">
              <div className="admin-users-stat-icon">
                <FaCircle />
              </div>
              <div>
                <p>Live Now</p>
                <h3>{summary.liveNow}</h3>
              </div>
            </div>

            <div className="admin-users-stat-card offline">
              <div className="admin-users-stat-icon">
                <FaUserClock />
              </div>
              <div>
                <p>Offline</p>
                <h3>{summary.offline}</h3>
              </div>
            </div>
          </div>
        </div>

        {/* Search and control filters */}
        <div className="admin-users-toolbar">
          <div className="admin-users-search-box">
            <FaSearch className="admin-users-field-icon" />
            <input
              type="text"
              placeholder="Search by name, email, phone, role or working status"
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
            />
          </div>

          <div className="admin-users-filter-row">
            <div className="admin-users-filter-group">
              <select
                value={roleFilter}
                onChange={(event) => setRoleFilter(event.target.value)}
              >
                <option value="">All Roles</option>
                <option value="admin">Admin</option>
                <option value="system_supervisor">System Supervisor</option>
                <option value="support_staff">Support Staff</option>
              </select>
            </div>

            <div className="admin-users-filter-group">
              <select
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
              >
                <option value="">All Account Status</option>
                <option value="active">Active</option>
                <option value="blocked">Blocked</option>
                <option value="pending">Pending</option>
              </select>
            </div>

            <div className="admin-users-filter-group">
              <select
                value={workingFilter}
                onChange={(event) => setWorkingFilter(event.target.value)}
              >
                <option value="">All Working Status</option>
                <option value="live">Live Now</option>
                <option value="offline">Offline</option>
              </select>
            </div>

            <button
              type="button"
              className="admin-users-secondary-button"
              onClick={clearFilters}
            >
              Clear Filters
            </button>
          </div>
        </div>

        <div className="admin-users-content">
          {/* Directory list */}
          <div className="admin-users-list-card">
            <div className="admin-users-card-header">
              <div>
                <h3>Team Directory</h3>
                <p>{visibleUsers.length} users found</p>
              </div>
            </div>

            {visibleUsers.length === 0 ? (
              <div className="admin-users-empty-state">
                <FaUserClock className="admin-users-empty-icon" />
                <h3>No internal users found</h3>
                <p>Try changing your search or filter selection.</p>
              </div>
            ) : (
              <div className="admin-users-list">
                {visibleUsers.map((item) => (
                  <button
                    key={item._id}
                    type="button"
                    className={
                      selectedUser?._id === item._id
                        ? 'admin-users-list-item active'
                        : 'admin-users-list-item'
                    }
                    onClick={() => setSelectedUser(item)}
                  >
                    <div className="admin-users-list-top">
                      <h4>{item.fullName || 'Unnamed User'}</h4>

                      <div className="admin-users-list-badges">
                        <span
                          className={
                            item.liveStatus?.isLive
                              ? 'admin-users-working-chip live'
                              : 'admin-users-working-chip offline'
                          }
                        >
                          {item.liveStatus?.isLive ? 'Live Now' : 'Offline'}
                        </span>

                        <span
                          className={`admin-users-status-chip ${
                            item.accountStatus || item.status || 'active'
                          }`}
                        >
                          {formatStatus(item.accountStatus || item.status || 'active')}
                        </span>
                      </div>
                    </div>

                    <p>{item.email || 'No email'}</p>

                    <div className="admin-users-list-meta">
                      <span className="admin-users-role-chip">
                        {formatStatus(item.role)}
                      </span>
                      <small>{item.phone || 'No phone'}</small>
                    </div>

                    <div className="admin-users-list-footer">
                      <span>Last seen: {getLastSeenText(item)}</span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Selected user details */}
          <div className="admin-users-details-card">
            {selectedUser ? (
              <>
                <div className="admin-users-details-header">
                  <div>
                    <h2>{selectedUser.fullName || 'Unnamed User'}</h2>
                    <p>
                      {formatStatus(selectedUser.role)} ·{' '}
                      {formatStatus(selectedUser.accountStatus || selectedUser.status || 'active')}
                    </p>
                  </div>

                  <div className="admin-users-details-badges">
                    <span
                      className={
                        selectedUser.liveStatus?.isLive
                          ? 'admin-users-working-chip live'
                          : 'admin-users-working-chip offline'
                      }
                    >
                      {getWorkingStatusText(selectedUser)}
                    </span>

                    <span
                      className={`admin-users-status-chip ${
                        selectedUser.accountStatus || selectedUser.status || 'active'
                      }`}
                    >
                      {formatStatus(selectedUser.accountStatus || selectedUser.status || 'active')}
                    </span>
                  </div>
                </div>

                <div className="admin-users-summary-grid">
                  <div className="admin-users-summary-card">
                    <p>Role</p>
                    <h4>{formatStatus(selectedUser.role)}</h4>
                  </div>

                  <div className="admin-users-summary-card">
                    <p>Account Status</p>
                    <h4>
                      {formatStatus(
                        selectedUser.accountStatus || selectedUser.status || 'active'
                      )}
                    </h4>
                  </div>

                  <div className="admin-users-summary-card">
                    <p>Working Status</p>
                    <h4>{getWorkingStatusText(selectedUser)}</h4>
                  </div>

                  <div className="admin-users-summary-card">
                    <p>Last Seen</p>
                    <h4>{getLastSeenText(selectedUser)}</h4>
                  </div>
                </div>

                <div className="admin-users-section-card">
                  <div className="admin-users-section-title">
                    <FaEnvelope className="admin-users-section-icon" />
                    <h3>Contact Information</h3>
                  </div>

                  <div className="admin-users-detail-grid">
                    <div>
                      <p>Email</p>
                      <h4>{selectedUser.email || 'N/A'}</h4>
                    </div>

                    <div>
                      <p>Phone</p>
                      <h4>{selectedUser.phone || 'N/A'}</h4>
                    </div>
                  </div>
                </div>

                <div className="admin-users-section-card">
                  <div className="admin-users-section-title">
                    <FaUsers className="admin-users-section-icon" />
                    <h3>Access Overview</h3>
                  </div>

                  <div className="admin-users-access-grid">
                    <div className="admin-users-access-item">
                      <span>Role Type</span>
                      <strong>{formatStatus(selectedUser.role)}</strong>
                    </div>

                    <div className="admin-users-access-item">
                      <span>Account Status</span>
                      <strong>
                        {formatStatus(
                          selectedUser.accountStatus || selectedUser.status || 'active'
                        )}
                      </strong>
                    </div>

                    <div className="admin-users-access-item">
                      <span>Working Status</span>
                      <strong>{getWorkingStatusText(selectedUser)}</strong>
                    </div>

                    <div className="admin-users-access-item">
                      <span>Current Route</span>
                      <strong>{getSafeCurrentRoute(selectedUser)}</strong>
                    </div>

                    <div className="admin-users-access-item">
                      <span>Created At</span>
                      <strong>
                        {selectedUser.createdAt
                          ? formatDateTime(selectedUser.createdAt)
                          : 'N/A'}
                      </strong>
                    </div>

                    <div className="admin-users-access-item">
                      <span>Updated At</span>
                      <strong>
                        {selectedUser.updatedAt
                          ? formatDateTime(selectedUser.updatedAt)
                          : 'N/A'}
                      </strong>
                    </div>
                  </div>
                </div>

                {selectedUser.createdBy ? (
                  <div className="admin-users-section-card">
                    <div className="admin-users-section-title">
                      <FaPhoneAlt className="admin-users-section-icon" />
                      <h3>Created By</h3>
                    </div>

                    <div className="admin-users-detail-grid">
                      <div>
                        <p>Creator Name</p>
                        <h4>{selectedUser.createdBy?.fullName || 'N/A'}</h4>
                      </div>

                      <div>
                        <p>Creator Email</p>
                        <h4>{selectedUser.createdBy?.email || 'N/A'}</h4>
                      </div>
                    </div>
                  </div>
                ) : null}

                <div className="admin-users-section-card">
                  <div className="admin-users-section-title">
                    <FaMapSigns className="admin-users-section-icon" />
                    <h3>Main Admin Controls</h3>
                  </div>

                  <div className="admin-users-control-actions">
                    <button
                      type="button"
                      className="admin-users-action-button edit"
                      onClick={openEditModal}
                      disabled={selectedIsRootMainAdmin}
                    >
                      <FaEdit />
                      <span>Edit User</span>
                    </button>

                    <button
                      type="button"
                      className="admin-users-action-button remove"
                      onClick={openRemoveModal}
                      disabled={selectedIsRootMainAdmin || selectedIsSelf}
                    >
                      <FaTrashAlt />
                      <span>Remove User</span>
                    </button>
                  </div>

                  {selectedIsRootMainAdmin ? (
                    <div className="admin-users-inline-note">
                      Root main admin account cannot be edited or removed from this panel.
                    </div>
                  ) : null}

                  {selectedIsSelf ? (
                    <div className="admin-users-inline-note">
                      You cannot remove your own account from this panel.
                    </div>
                  ) : null}
                </div>

                <div className="admin-users-note-card">
                  <p>Main admin note</p>
                  <h4>
                    Keep role creation limited, traceable and need-based so the
                    admin tree stays clean, observable and controllable.
                  </h4>
                </div>
              </>
            ) : (
              <div className="admin-users-empty-state details">
                <FaUsers className="admin-users-empty-icon" />
                <h3>Select a user</h3>
                <p>Choose an internal user from the left side to view details.</p>
              </div>
            )}
          </div>
        </div>

        {/* Create user modal */}
        {createModalOpen ? (
          <div className="admin-users-modal-backdrop" onClick={closeCreateModal}>
            <div
              className="admin-users-modal-card"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="admin-users-modal-header">
                <h3>Create Internal User</h3>
                <p>
                  Add a controlled internal account for admin, system supervisor
                  or support staff.
                </p>
              </div>

              <div className="admin-users-modal-body">
                <div className="admin-users-modal-grid">
                  <div className="admin-users-modal-field">
                    <label>Full Name *</label>
                    <input
                      type="text"
                      value={createForm.fullName}
                      onChange={(event) =>
                        setCreateForm((prev) => ({
                          ...prev,
                          fullName: event.target.value
                        }))
                      }
                      placeholder="Enter full name"
                    />
                  </div>

                  <div className="admin-users-modal-field">
                    <label>Email *</label>
                    <input
                      type="email"
                      value={createForm.email}
                      onChange={(event) =>
                        setCreateForm((prev) => ({
                          ...prev,
                          email: event.target.value
                        }))
                      }
                      placeholder="Enter email"
                    />
                  </div>

                  <div className="admin-users-modal-field">
                    <label>Phone *</label>
                    <input
                      type="text"
                      value={createForm.phone}
                      onChange={(event) =>
                        setCreateForm((prev) => ({
                          ...prev,
                          phone: event.target.value
                        }))
                      }
                      placeholder="Enter phone number"
                    />
                  </div>

                  <div className="admin-users-modal-field">
                    <label>Role *</label>
                    <select
                      value={createForm.role}
                      onChange={(event) =>
                        setCreateForm((prev) => ({
                          ...prev,
                          role: event.target.value
                        }))
                      }
                    >
                      <option value="support_staff">Support Staff</option>
                      <option value="system_supervisor">System Supervisor</option>
                      <option value="admin">Admin</option>
                    </select>
                  </div>

                  <div className="admin-users-modal-field">
                    <label>Password *</label>
                    <input
                      type="password"
                      value={createForm.password}
                      onChange={(event) =>
                        setCreateForm((prev) => ({
                          ...prev,
                          password: event.target.value
                        }))
                      }
                      placeholder="Enter password"
                    />
                  </div>

                  <div className="admin-users-modal-field">
                    <label>Confirm Password *</label>
                    <input
                      type="password"
                      value={createForm.confirmPassword}
                      onChange={(event) =>
                        setCreateForm((prev) => ({
                          ...prev,
                          confirmPassword: event.target.value
                        }))
                      }
                      placeholder="Confirm password"
                    />
                  </div>
                </div>
              </div>

              <div className="admin-users-modal-footer">
                <button
                  type="button"
                  className="admin-users-secondary-button"
                  onClick={closeCreateModal}
                  disabled={createLoading}
                >
                  Cancel
                </button>

                <button
                  type="button"
                  className="admin-users-primary-button"
                  onClick={handleCreateUser}
                  disabled={createLoading}
                >
                  {createLoading ? <FaSpinner className="spin" /> : null}
                  <span>Create User</span>
                </button>
              </div>
            </div>
          </div>
        ) : null}

        {/* Edit user modal */}
        {editModalOpen ? (
          <div className="admin-users-modal-backdrop" onClick={closeEditModal}>
            <div
              className="admin-users-modal-card"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="admin-users-modal-header">
                <h3>Edit Internal User</h3>
                <p>
                  Update user information carefully so role and accountability stay clean.
                </p>
              </div>

              <div className="admin-users-modal-body">
                <div className="admin-users-modal-grid">
                  <div className="admin-users-modal-field">
                    <label>Full Name *</label>
                    <input
                      type="text"
                      value={editForm.fullName}
                      onChange={(event) =>
                        setEditForm((prev) => ({
                          ...prev,
                          fullName: event.target.value
                        }))
                      }
                      placeholder="Enter full name"
                    />
                  </div>

                  <div className="admin-users-modal-field">
                    <label>Email *</label>
                    <input
                      type="email"
                      value={editForm.email}
                      onChange={(event) =>
                        setEditForm((prev) => ({
                          ...prev,
                          email: event.target.value
                        }))
                      }
                      placeholder="Enter email"
                    />
                  </div>

                  <div className="admin-users-modal-field">
                    <label>Phone *</label>
                    <input
                      type="text"
                      value={editForm.phone}
                      onChange={(event) =>
                        setEditForm((prev) => ({
                          ...prev,
                          phone: event.target.value
                        }))
                      }
                      placeholder="Enter phone number"
                    />
                  </div>

                  <div className="admin-users-modal-field">
                    <label>Role *</label>
                    <select
                      value={editForm.role}
                      onChange={(event) =>
                        setEditForm((prev) => ({
                          ...prev,
                          role: event.target.value
                        }))
                      }
                    >
                      <option value="support_staff">Support Staff</option>
                      <option value="system_supervisor">System Supervisor</option>
                      <option value="admin">Admin</option>
                    </select>
                  </div>

                  <div className="admin-users-modal-field">
                    <label>Account Status *</label>
                    <select
                      value={editForm.status}
                      onChange={(event) =>
                        setEditForm((prev) => ({
                          ...prev,
                          status: event.target.value
                        }))
                      }
                    >
                      <option value="active">Active</option>
                      <option value="pending">Pending</option>
                      <option value="blocked">Blocked</option>
                    </select>
                  </div>

                  <div className="admin-users-modal-field full">
                    <label>Update Reason *</label>
                    <textarea
                      rows={4}
                      value={editForm.updateReason}
                      onChange={(event) =>
                        setEditForm((prev) => ({
                          ...prev,
                          updateReason: event.target.value
                        }))
                      }
                      placeholder="Write why this internal user is being updated..."
                    />
                  </div>
                </div>
              </div>

              <div className="admin-users-modal-footer">
                <button
                  type="button"
                  className="admin-users-secondary-button"
                  onClick={closeEditModal}
                  disabled={editLoading}
                >
                  Cancel
                </button>

                <button
                  type="button"
                  className="admin-users-primary-button"
                  onClick={handleEditUser}
                  disabled={editLoading}
                >
                  {editLoading ? <FaSpinner className="spin" /> : null}
                  <span>Save Changes</span>
                </button>
              </div>
            </div>
          </div>
        ) : null}

        {/* Remove user modal */}
        {removeModalOpen ? (
          <div className="admin-users-modal-backdrop" onClick={closeRemoveModal}>
            <div
              className="admin-users-modal-card small"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="admin-users-modal-header danger">
                <h3>Remove Internal User</h3>
                <p>
                  This will remove the user from active control, block the account
                  and keep a full trace in audit records.
                </p>
              </div>

              <div className="admin-users-modal-body">
                <div className="admin-users-danger-summary">
                  <strong>{selectedUser?.fullName}</strong>
                  <span>{selectedUser?.email}</span>
                </div>

                <div className="admin-users-modal-field">
                  <label>Remove Reason *</label>
                  <textarea
                    rows={5}
                    value={removeForm.archiveReason}
                    onChange={(event) =>
                      setRemoveForm({
                        archiveReason: event.target.value
                      })
                    }
                    placeholder="Write why this user is being removed from active control..."
                  />
                </div>
              </div>

              <div className="admin-users-modal-footer">
                <button
                  type="button"
                  className="admin-users-secondary-button"
                  onClick={closeRemoveModal}
                  disabled={removeLoading}
                >
                  Cancel
                </button>

                <button
                  type="button"
                  className="admin-users-danger-button"
                  onClick={handleRemoveUser}
                  disabled={removeLoading}
                >
                  {removeLoading ? <FaSpinner className="spin" /> : null}
                  <span>Confirm Remove</span>
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </AdminLayout>
  );
};

export default AdminUsers;