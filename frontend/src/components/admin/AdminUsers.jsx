import React, { useEffect, useMemo, useState } from 'react';
import { toast } from 'react-toastify';
import {
  FaCheckCircle,
  FaEnvelope,
  FaFilter,
  FaPhoneAlt,
  FaPlus,
  FaSearch,
  FaShieldAlt,
  FaSpinner,
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

const AdminUsers = () => {
  const { user } = useAuth();

  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);

  const [loading, setLoading] = useState(true);
  const [createLoading, setCreateLoading] = useState(false);

  const [searchInput, setSearchInput] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [createForm, setCreateForm] = useState({
    fullName: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    role: 'support_staff'
  });

  const isMainAdmin = inferMainAdmin(user);

  // Load internal users for the control panel view.
  const fetchUsers = async () => {
    try {
      setLoading(true);

      const response = await api.get('/admin/users?limit=300&sort=-createdAt');
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
      active: users.filter((item) => item.status !== 'blocked').length,
      blocked: users.filter((item) => item.status === 'blocked').length
    };
  }, [users]);

  const visibleUsers = useMemo(() => {
    return users.filter((item) => {
      const searchValue = searchInput.trim().toLowerCase();

      const matchesSearch =
        !searchValue ||
        item.fullName?.toLowerCase().includes(searchValue) ||
        item.email?.toLowerCase().includes(searchValue) ||
        item.phone?.toLowerCase().includes(searchValue);

      const matchesRole = !roleFilter || item.role === roleFilter;
      const matchesStatus = !statusFilter || item.status === statusFilter;

      return matchesSearch && matchesRole && matchesStatus;
    });
  }, [users, searchInput, roleFilter, statusFilter]);

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

    if (createForm.password.length < 6) {
      toast.error('Password must be at least 6 characters');
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

  const clearFilters = () => {
    setSearchInput('');
    setRoleFilter('');
    setStatusFilter('');
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
        {/* Page header and control summary */}
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
          </div>
        </div>

        {/* Search and quick filters */}
        <div className="admin-users-toolbar">
          <div className="admin-users-search-box">
            <FaSearch className="admin-users-field-icon" />
            <input
              type="text"
              placeholder="Search by name, email or phone"
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
            />
          </div>

          <div className="admin-users-filter-row">
            <div className="admin-users-filter-group">
              <FaFilter className="admin-users-field-icon" />
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
              <FaFilter className="admin-users-field-icon" />
              <select
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
              >
                <option value="">All Status</option>
                <option value="active">Active</option>
                <option value="pending">Pending</option>
                <option value="blocked">Blocked</option>
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
          {/* User list side */}
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
                      <span
                        className={`admin-users-status-chip ${item.status || 'active'}`}
                      >
                        {formatStatus(item.status || 'active')}
                      </span>
                    </div>

                    <p>{item.email || 'No email'}</p>

                    <div className="admin-users-list-meta">
                      <span className="admin-users-role-chip">
                        {formatStatus(item.role)}
                      </span>
                      <small>{item.phone || 'No phone'}</small>
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
                      {formatStatus(selectedUser.status || 'active')}
                    </p>
                  </div>

                  <span
                    className={`admin-users-status-chip ${selectedUser.status || 'active'}`}
                  >
                    {formatStatus(selectedUser.status || 'active')}
                  </span>
                </div>

                <div className="admin-users-summary-grid">
                  <div className="admin-users-summary-card">
                    <p>Role</p>
                    <h4>{formatStatus(selectedUser.role)}</h4>
                  </div>

                  <div className="admin-users-summary-card">
                    <p>Status</p>
                    <h4>{formatStatus(selectedUser.status || 'active')}</h4>
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
                      <strong>{formatStatus(selectedUser.status || 'active')}</strong>
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

                <div className="admin-users-note-card">
                  <p>Main admin note</p>
                  <h4>
                    Keep role creation limited, traceable and need-based so the
                    admin tree stays clean and controllable.
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
      </div>
    </AdminLayout>
  );
};

export default AdminUsers;