import React, { useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'react-toastify';
import {
  FaCheck,
  FaChevronDown,
  FaCircle,
  FaEdit,
  FaEnvelope,
  FaMapSigns,
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
import { getRoleLabel, getRoleScopeText, inferMainAdmin } from '../utils/roles';
import '../styles/AdminUsers.css';



const IDENTITY_TILE_BASE_STYLE = {
  position: 'relative',
  minWidth: 0,
  minHeight: '118px',
  padding: '18px 18px 16px',
  borderRadius: '20px',
  border: '1px solid #d8e6f3',
  background: '#ffffff',
  boxShadow: '0 16px 34px rgba(15, 23, 42, 0.08)',
  overflow: 'hidden'
};

const IDENTITY_TILE_HEAD_STYLE = {
  display: 'flex',
  alignItems: 'center',
  gap: '12px',
  marginBottom: '14px'
};


const IDENTITY_TILE_COPY_STYLE = {
  minWidth: 0,
  display: 'flex',
  flexDirection: 'column',
  gap: '5px'
};

const IDENTITY_TILE_LABEL_STYLE = {
  display: 'block',
  color: '#64748b',
  fontSize: '0.78rem',
  fontWeight: 600,
  letterSpacing: '0.04em',
  lineHeight: 1.2,
  textTransform: 'uppercase'
};

const IDENTITY_TILE_VALUE_STYLE = {
  display: 'block',
  margin: 0,
  color: '#0f172a',
  fontSize: '1.12rem',
  fontWeight: 600,
  lineHeight: 1.28,
  overflowWrap: 'anywhere',
  wordBreak: 'normal'
};

const IDENTITY_TILE_HELPER_STYLE = {
  display: 'block',
  color: '#64748b',
  fontSize: '0.82rem',
  fontWeight: 600,
  lineHeight: 1.35,
  overflowWrap: 'anywhere'
};

const IDENTITY_ICON_BASE_STYLE = {
  width: '42px',
  height: '42px',
  borderRadius: '14px',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  color: '#ffffff',
  flex: '0 0 auto',
  fontSize: '1rem'
};

const IDENTITY_TILE_VARIANTS = {
  role: {
    accent: '#16a34a',
    background: 'linear-gradient(135deg, #ecfdf5 0%, #ffffff 78%)',
    borderColor: '#bbf7d0',
    label: 'Access Role',
    helper: 'Permission group'
  },
  status: {
    accent: '#2563eb',
    background: 'linear-gradient(135deg, #eff6ff 0%, #ffffff 78%)',
    borderColor: '#bfdbfe',
    label: 'Account Status',
    helper: 'Profile state'
  },
  live: {
    accent: '#059669',
    background: 'linear-gradient(135deg, #ecfdf5 0%, #ffffff 78%)',
    borderColor: '#a7f3d0',
    label: 'Working Status',
    helper: 'Current availability'
  },
  offline: {
    accent: '#64748b',
    background: 'linear-gradient(135deg, #f8fafc 0%, #ffffff 78%)',
    borderColor: '#cbd5e1',
    label: 'Working Status',
    helper: 'Current availability'
  },
  workspace: {
    accent: '#7c3aed',
    background: 'linear-gradient(135deg, #f5f3ff 0%, #ffffff 78%)',
    borderColor: '#ddd6fe',
    label: 'Workspace',
    helper: 'Operational area'
  }
};

const getIdentityTileInlineStyle = (variant) => ({
  ...IDENTITY_TILE_BASE_STYLE,
  background: variant.background,
  borderColor: variant.borderColor,
  borderTop: `5px solid ${variant.accent}`
});

const getIdentityIconInlineStyle = (variant) => ({
  ...IDENTITY_ICON_BASE_STYLE,
  background: variant.accent,
  boxShadow: `0 12px 22px ${variant.accent}33`
});


const FILTER_OPTIONS = {
  roles: [
    { value: '', label: 'All Roles' },
    { value: 'admin', label: 'Admin Officer' },
    { value: 'system_supervisor', label: 'System Supervisor' },
    { value: 'support_staff', label: 'Support Staff' }
  ],
  accountStatus: [
    { value: '', label: 'All Account Status' },
    { value: 'active', label: 'Active' },
    { value: 'blocked', label: 'Blocked' },
    { value: 'pending', label: 'Pending' }
  ],
  workingStatus: [
    { value: '', label: 'All Working Status' },
    { value: 'live', label: 'Live Now' },
    { value: 'offline', label: 'Offline' }
  ]
};

const FilterDropdown = ({ value, options, onChange, ariaLabel }) => {
  const [open, setOpen] = useState(false);
  const selectedOption =
    options.find((option) => option.value === value) || options[0];

  return (
    <div
      className={`admin-users-filter-dropdown${open ? ' open' : ''}`}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) {
          setOpen(false);
        }
      }}
    >
      <button
        type="button"
        className="admin-users-filter-trigger"
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
      >
        <span>{selectedOption.label}</span>
        <FaChevronDown className="admin-users-filter-chevron" />
      </button>

      {open ? (
        <div className="admin-users-filter-menu" role="listbox" tabIndex={-1}>
          {options.map((option) => {
            const selected = option.value === value;

            return (
              <button
                type="button"
                key={option.value || 'all'}
                className={`admin-users-filter-option${selected ? ' selected' : ''}`}
                role="option"
                aria-selected={selected}
                onMouseDown={(event) => {
                  event.preventDefault();
                  onChange(option.value);
                  setOpen(false);
                }}
              >
                <span>{option.label}</span>
                {selected ? <FaCheck /> : null}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
};

const getUsersFromResponse = (response) =>
  response?.data?.data || response?.data?.users || [];

const isRootMainAdminUser = (user) =>
  Boolean(user?.role === 'admin' && !user?.createdBy);

const getWorkingStatusText = (user) =>
  user?.liveStatus?.isLive ? 'Live Now' : 'Offline';

const getSafeCurrentRoute = (user) =>
  user?.liveStatus?.currentRoute || 'No active route';

const getFriendlyWorkspace = (user) => {
  const route = getSafeCurrentRoute(user);

  if (!route || route === 'No active route') {
    return user?.liveStatus?.isLive ? 'Admin workspace' : 'Not working right now';
  }

  const cleanRoute = String(route).split('?')[0].toLowerCase();

  if (cleanRoute.includes('dashboard')) return 'Dashboard overview';
  if (cleanRoute.includes('application-review') || cleanRoute.includes('applications')) {
    return 'Application review';
  }
  if (cleanRoute.includes('appointment')) return 'Appointment management';
  if (cleanRoute.includes('printing')) return 'Printing queue';
  if (cleanRoute.includes('delivery')) return 'Delivery control';
  if (cleanRoute.includes('support')) return 'Support tickets';
  if (cleanRoute.includes('audit')) return 'Audit logs';
  if (cleanRoute.includes('users')) return 'Internal user control';

  return 'Admin workspace';
};

const getWorkspaceLabel = (user) =>
  user?.liveStatus?.isLive ? 'Current Workspace' : 'Last Workspace';



const getRoleScope = (user) => getRoleScopeText(user);

const getCreatedByName = (user) =>
  user?.createdBy?.fullName || user?.createdBy?.name || 'System';

const getCreatedByEmail = (user) =>
  user?.createdBy?.email || 'Not recorded';

const getLastSeenText = (user) => {
  if (user?.liveStatus?.isLive) {
    return 'Working Now';
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
      getFriendlyWorkspace(user),
      getRoleScope(user)
    ]
      .filter(Boolean)
      .join(' ')
  );

const AdminUsers = () => {
  const { user } = useAuth();

  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const detailsCardRef = useRef(null);
  const [directoryPanelHeight, setDirectoryPanelHeight] = useState(null);

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
    const syncDirectoryHeight = () => {
      const detailsNode = detailsCardRef.current;
      const shouldMatchDesktop =
        typeof window !== 'undefined' && window.innerWidth > 1280;

      if (!detailsNode || !shouldMatchDesktop) {
        setDirectoryPanelHeight(null);
        return;
      }

      const measuredHeight = Math.ceil(detailsNode.getBoundingClientRect().height);
      setDirectoryPanelHeight(measuredHeight > 0 ? measuredHeight : null);
    };

    syncDirectoryHeight();

    let resizeObserver;
    if (typeof ResizeObserver !== 'undefined' && detailsCardRef.current) {
      resizeObserver = new ResizeObserver(syncDirectoryHeight);
      resizeObserver.observe(detailsCardRef.current);
    }

    if (typeof window !== 'undefined') {
      window.addEventListener('resize', syncDirectoryHeight);
    }

    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('resize', syncDirectoryHeight);
      }

      if (resizeObserver) {
        resizeObserver.disconnect();
      }
    };
  }, [selectedUser, visibleUsers.length]);

  const directoryCardStyle = directoryPanelHeight
    ? { '--admin-users-directory-height': `${directoryPanelHeight}px` }
    : undefined;

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


  const selectInternalUser = (item) => {
    setSelectedUser(item);

    if (typeof window !== 'undefined' && window.innerWidth <= 900) {
      window.setTimeout(() => {
        detailsCardRef.current?.scrollIntoView({
          behavior: 'smooth',
          block: 'start'
        });
      }, 90);
    }
  };

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

    if (isRootMainAdminUser(selectedUser)) {
      toast.info('Root admin access is protected and cannot be edited here');
      return;
    }

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

    if (isRootMainAdminUser(selectedUser)) {
      toast.info('Root admin account is protected and cannot be deactivated');
      return;
    }

    if (selectedUser?._id === user?._id) {
      toast.info('You cannot deactivate your own account from this panel');
      return;
    }

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

    if (isRootMainAdminUser(selectedUser) || selectedUser?._id === user?._id) {
      toast.error('This account is protected from deactivation');
      return;
    }

    if (!removeForm.archiveReason.trim()) {
      toast.error('Deactivation reason is required');
      return;
    }

    try {
      setRemoveLoading(true);

      await api.delete(`/admin/users/${selectedUser._id}`, {
        data: {
          archiveReason: removeForm.archiveReason.trim()
        }
      });

      toast.success('Internal user deactivated from active control');
      closeRemoveModal();
      await fetchUsers();
    } catch (error) {
      console.error('Error removing internal user:', error);
      toast.error(
        error?.response?.data?.message || 'Failed to deactivate internal user'
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
                Manage admin officers, system supervisors and support staff from one
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
                <p>Admin Roles</p>
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
            <FilterDropdown
              ariaLabel="Filter by role"
              value={roleFilter}
              options={FILTER_OPTIONS.roles}
              onChange={setRoleFilter}
            />

            <FilterDropdown
              ariaLabel="Filter by account status"
              value={statusFilter}
              options={FILTER_OPTIONS.accountStatus}
              onChange={setStatusFilter}
            />

            <FilterDropdown
              ariaLabel="Filter by working status"
              value={workingFilter}
              options={FILTER_OPTIONS.workingStatus}
              onChange={setWorkingFilter}
            />

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
          <div className="admin-users-list-card" style={directoryCardStyle}>
            <div className="admin-users-card-header">
              <div>
                <h3>Internal Team Directory</h3>
                <p>{visibleUsers.length} internal users found</p>
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
                    onClick={() => selectInternalUser(item)}
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
                        {getRoleLabel(item.role, item)}
                      </span>
                      <small className="admin-users-phone-meta" title={item.phone || 'No phone'}>
                        {`☎ Phone: ${item.phone || 'No phone'}`}
                      </small>
                    </div>

                    <div className="admin-users-list-footer">
                      <span>Last active: {getLastSeenText(item)}</span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Selected user details */}
          <div className="admin-users-details-card" ref={detailsCardRef}>
            {selectedUser ? (
              <>
                <div className="admin-users-details-header">
                  <div>
                    <h2>{selectedUser.fullName || 'Unnamed User'}</h2>
                    <p>
                      {getRoleLabel(selectedUser.role, selectedUser)} ·{' '}
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

                <div
                  className="admin-users-identity-panel polished"
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
                    gap: '14px',
                    margin: '18px 0 18px',
                    alignItems: 'stretch'
                  }}
                  aria-label="Selected internal user overview"
                >
                  <div
                    className="admin-users-identity-tile polished role"
                    style={getIdentityTileInlineStyle(IDENTITY_TILE_VARIANTS.role)}
                  >
                    <div className="admin-users-identity-tile-head" style={IDENTITY_TILE_HEAD_STYLE}>
                      <span
                        className="admin-users-identity-icon"
                        style={getIdentityIconInlineStyle(IDENTITY_TILE_VARIANTS.role)}
                        aria-hidden="true"
                      >
                        <FaUserShield />
                      </span>
                      <div className="admin-users-identity-copy" style={IDENTITY_TILE_COPY_STYLE}>
                        <span style={IDENTITY_TILE_LABEL_STYLE}>Access Role</span>
                        <strong style={IDENTITY_TILE_VALUE_STYLE}>
                          {getRoleLabel(selectedUser.role, selectedUser)}
                        </strong>
                        <small style={IDENTITY_TILE_HELPER_STYLE}>Permission group</small>
                      </div>
                    </div>
                  </div>

                  <div
                    className="admin-users-identity-tile polished status"
                    style={getIdentityTileInlineStyle(IDENTITY_TILE_VARIANTS.status)}
                  >
                    <div className="admin-users-identity-tile-head" style={IDENTITY_TILE_HEAD_STYLE}>
                      <span
                        className="admin-users-identity-icon"
                        style={getIdentityIconInlineStyle(IDENTITY_TILE_VARIANTS.status)}
                        aria-hidden="true"
                      >
                        <FaUserCheck />
                      </span>
                      <div className="admin-users-identity-copy" style={IDENTITY_TILE_COPY_STYLE}>
                        <span style={IDENTITY_TILE_LABEL_STYLE}>Account Status</span>
                        <strong style={IDENTITY_TILE_VALUE_STYLE}>
                          {formatStatus(
                            selectedUser.accountStatus || selectedUser.status || 'active'
                          )}
                        </strong>
                        <small style={IDENTITY_TILE_HELPER_STYLE}>Profile state</small>
                      </div>
                    </div>
                  </div>

                  <div
                    className={
                      selectedUser.liveStatus?.isLive
                        ? 'admin-users-identity-tile polished working live'
                        : 'admin-users-identity-tile polished working offline'
                    }
                    style={getIdentityTileInlineStyle(
                      selectedUser.liveStatus?.isLive
                        ? IDENTITY_TILE_VARIANTS.live
                        : IDENTITY_TILE_VARIANTS.offline
                    )}
                  >
                    <div className="admin-users-identity-tile-head" style={IDENTITY_TILE_HEAD_STYLE}>
                      <span
                        className="admin-users-identity-icon"
                        style={getIdentityIconInlineStyle(
                          selectedUser.liveStatus?.isLive
                            ? IDENTITY_TILE_VARIANTS.live
                            : IDENTITY_TILE_VARIANTS.offline
                        )}
                        aria-hidden="true"
                      >
                        {selectedUser.liveStatus?.isLive ? <FaCircle /> : <FaUserClock />}
                      </span>
                      <div className="admin-users-identity-copy" style={IDENTITY_TILE_COPY_STYLE}>
                        <span style={IDENTITY_TILE_LABEL_STYLE}>Working Status</span>
                        <strong style={IDENTITY_TILE_VALUE_STYLE}>
                          {getWorkingStatusText(selectedUser)}
                        </strong>
                        <small style={IDENTITY_TILE_HELPER_STYLE}>Current availability</small>
                      </div>
                    </div>
                  </div>

                  <div
                    className="admin-users-identity-tile polished workspace"
                    style={getIdentityTileInlineStyle(IDENTITY_TILE_VARIANTS.workspace)}
                  >
                    <div className="admin-users-identity-tile-head" style={IDENTITY_TILE_HEAD_STYLE}>
                      <span
                        className="admin-users-identity-icon"
                        style={getIdentityIconInlineStyle(IDENTITY_TILE_VARIANTS.workspace)}
                        aria-hidden="true"
                      >
                        <FaMapSigns />
                      </span>
                      <div className="admin-users-identity-copy" style={IDENTITY_TILE_COPY_STYLE}>
                        <span style={IDENTITY_TILE_LABEL_STYLE}>
                          {getWorkspaceLabel(selectedUser)}
                        </span>
                        <strong style={IDENTITY_TILE_VALUE_STYLE}>
                          {getFriendlyWorkspace(selectedUser)}
                        </strong>
                        <small style={IDENTITY_TILE_HELPER_STYLE}>Operational area</small>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="admin-users-section-card admin-users-profile-snapshot compact">
                  <div className="admin-users-section-title">
                    <FaUsers className="admin-users-section-icon" />
                    <h3>User Profile Summary</h3>
                  </div>

                  <div className="admin-users-access-grid compact">
                    <div className="admin-users-access-item">
                      <span>Last Seen</span>
                      <strong>{getLastSeenText(selectedUser)}</strong>
                    </div>

                    <div className="admin-users-access-item">
                      <span>Created On</span>
                      <strong>
                        {selectedUser.createdAt
                          ? formatDateTime(selectedUser.createdAt)
                          : 'Not recorded'}
                      </strong>
                    </div>

                    <div className="admin-users-access-item">
                      <span>Updated On</span>
                      <strong>
                        {selectedUser.updatedAt
                          ? formatDateTime(selectedUser.updatedAt)
                          : 'Not recorded'}
                      </strong>
                    </div>

                    <div className="admin-users-access-item">
                      <span>Created By</span>
                      <strong>{getCreatedByName(selectedUser)}</strong>
                    </div>
                  </div>
                </div>

                <div className="admin-users-section-card compact">
                  <div className="admin-users-section-title">
                    <FaMapSigns className="admin-users-section-icon" />
                    <h3>Access Responsibility</h3>
                  </div>

                  <div className="admin-users-detail-grid admin-users-responsibility-grid compact">
                    <div>
                      <p>Role Type</p>
                      <h4>{getRoleLabel(selectedUser.role, selectedUser)}</h4>
                    </div>

                    <div>
                      <p>Scope</p>
                      <h4>{getRoleScope(selectedUser)}</h4>
                    </div>

                    <div>
                      <p>Creator Email</p>
                      <h4>{getCreatedByEmail(selectedUser)}</h4>
                    </div>

                    <div>
                      <p>{getWorkspaceLabel(selectedUser)}</p>
                      <h4>{getFriendlyWorkspace(selectedUser)}</h4>
                    </div>
                  </div>

                </div>

                <div className="admin-users-section-card compact">
                  <div className="admin-users-section-title">
                    <FaEnvelope className="admin-users-section-icon" />
                    <h3>Contact Details</h3>
                  </div>

                  <div className="admin-users-detail-grid compact admin-users-contact-grid">
                    <div className="admin-users-contact-item">
                      <p>Email</p>
                      <h4 className="admin-users-contact-value">
                        {selectedUser.email || 'N/A'}
                      </h4>
                    </div>

                    <div className="admin-users-contact-item">
                      <p>Phone</p>
                      <h4 className="admin-users-contact-value phone">
                        {selectedUser.phone || 'N/A'}
                      </h4>
                    </div>
                  </div>
                </div>

                <div className="admin-users-section-card compact admin-users-controls-card">
                  <div className="admin-users-section-title">
                    <FaShieldAlt className="admin-users-section-icon" />
                    <h3>Access Management</h3>
                  </div>

                  {selectedIsRootMainAdmin ? (
                    <div className="admin-users-protected-root">
                      <div className="admin-users-protected-icon">
                        <FaShieldAlt />
                      </div>
                      <div>
                        <h4>Protected root account</h4>
                        <p>
                          This account controls the internal user tree and cannot be edited or
                          deactivated from this workspace.
                        </p>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="admin-users-control-actions">
                        <button
                          type="button"
                          className="admin-users-action-button edit"
                          onClick={openEditModal}
                        >
                          <FaEdit />
                          <span>Edit Access</span>
                        </button>

                        <button
                          type="button"
                          className="admin-users-action-button remove"
                          onClick={openRemoveModal}
                          disabled={selectedIsSelf}
                        >
                          <FaUserClock />
                          <span>Deactivate User</span>
                        </button>
                      </div>

                      {selectedIsSelf ? (
                        <div className="admin-users-inline-note compact">
                          You cannot deactivate your own account from this panel.
                        </div>
                      ) : null}
                    </>
                  )}
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
                      <option value="admin">Admin Officer</option>
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
                <h3>Edit Access Details</h3>
                <p>
                  Update profile, role and account status with a clear audit reason.
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
                      <option value="admin">Admin Officer</option>
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
                      placeholder="Write the reason for changing this user profile or access..."
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
                <h3>Deactivate Internal User</h3>
                <p>
                  This will deactivate the user from active control and keep a clear trace
                  for audit review.
                </p>
              </div>

              <div className="admin-users-modal-body">
                <div className="admin-users-danger-summary">
                  <strong>{selectedUser?.fullName}</strong>
                  <span>{selectedUser?.email}</span>
                </div>

                <div className="admin-users-modal-field">
                  <label>Deactivation Reason *</label>
                  <textarea
                    rows={5}
                    value={removeForm.archiveReason}
                    onChange={(event) =>
                      setRemoveForm({
                        archiveReason: event.target.value
                      })
                    }
                    placeholder="Write the reason for deactivating this internal user..."
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
                  <span>Confirm Deactivate</span>
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