import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import {
  FaChevronLeft,
  FaChevronRight,
  FaCircle,
  FaEye,
  FaPlus,
  FaSearch,
  FaShieldAlt,
  FaUserCheck,
  FaUserClock,
  FaUserShield,
  FaUsers
} from 'react-icons/fa';
import api from '../api/axios';
import AdminLayout from './AdminLayout';
import InternalUserFormModal from './InternalUserFormModal';
import { useAuth } from '../context/AuthContext';
import {
  EMPTY_INTERNAL_USER_FORM,
  INTERNAL_USER_FILTER_OPTIONS,
  buildAdminScopePayload,
  formatAdminScope,
  getInternalUserMeta,
  getInternalUsersFromResponse,
  getLastSeenText,
  getRoleText,
  getWorkingStatusText
} from './adminUserUtils';
import '../styles/AdminUsers.css';

const PAGE_SIZE = 20;

const FilterSelect = ({ label, value, options, onChange }) => (
  <label className="admin-users-filter-control">
    <span>{label}</span>
    <select value={value} onChange={(event) => onChange(event.target.value)}>
      {options.map((option) => (
        <option key={option.value || 'all'} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  </label>
);

const AdminUsers = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [users, setUsers] = useState([]);
  const [meta, setMeta] = useState({ page: 1, totalPages: 1, total: 0, stats: {} });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [role, setRole] = useState('');
  const [status, setStatus] = useState('');
  const [workingStatus, setWorkingStatus] = useState('');
  const [page, setPage] = useState(1);
  const [createOpen, setCreateOpen] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  const [createForm, setCreateForm] = useState({ ...EMPTY_INTERNAL_USER_FORM });

  const canManageInternalUsers =
    ['admin', 'system_supervisor'].includes(user?.role) &&
    user?.adminScope?.scopeType !== 'district';

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(1);
    }, 350);
    return () => window.clearTimeout(timer);
  }, [searchInput]);

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const response = await api.get('/admin/users', {
        params: {
          page,
          limit: PAGE_SIZE,
          sort: 'fullName',
          search: search || undefined,
          role: role || undefined,
          status: status || undefined,
          workingStatus: workingStatus || undefined
        }
      });
      setUsers(getInternalUsersFromResponse(response));
      setMeta(getInternalUserMeta(response));
    } catch (requestError) {
      const message = requestError?.response?.data?.message || 'Failed to load internal users';
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, [page, role, search, status, workingStatus]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const changeFilter = (setter) => (value) => {
    setter(value);
    setPage(1);
  };

  const clearFilters = () => {
    setSearchInput('');
    setSearch('');
    setRole('');
    setStatus('');
    setWorkingStatus('');
    setPage(1);
  };

  const openCreate = () => {
    setCreateForm({ ...EMPTY_INTERNAL_USER_FORM });
    setCreateOpen(true);
  };

  const handleCreate = async () => {
    if (!createForm.fullName.trim() || !createForm.email.trim() || !createForm.phone.trim()) {
      toast.error('Full name, email, and phone are required');
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
    const adminScope = buildAdminScopePayload(createForm);
    if (adminScope.scopeType === 'district' && !adminScope.districts.length) {
      toast.error('Enter at least one district for district scope');
      return;
    }

    try {
      setCreateLoading(true);
      await api.post('/admin/users', {
        fullName: createForm.fullName.trim(),
        email: createForm.email.trim(),
        phone: createForm.phone.trim(),
        password: createForm.password,
        role: createForm.role,
        adminScope
      });
      toast.success('Internal user created successfully');
      setCreateOpen(false);
      await fetchUsers();
    } catch (requestError) {
      toast.error(requestError?.response?.data?.message || 'Failed to create internal user');
    } finally {
      setCreateLoading(false);
    }
  };

  const stats = meta.stats || {};

  return (
    <AdminLayout>
      <div className="admin-users-page">
        <header className="admin-users-page-header">
          <div>
            <h1>Internal User Control</h1>
            <p>Manage internal access, responsibilities, and account availability.</p>
          </div>
          {canManageInternalUsers ? (
            <button type="button" className="admin-users-primary-button" onClick={openCreate}>
              <FaPlus />
              Create Internal User
            </button>
          ) : null}
        </header>

        <section className="admin-users-stats-grid" aria-label="Internal user summary">
          {[
            ['Total Users', stats.total ?? 0, FaUsers],
            ['Admin Roles', stats.admins ?? 0, FaUserShield],
            ['Supervisors', stats.supervisors ?? 0, FaShieldAlt],
            ['Support Staff', stats.supportStaff ?? 0, FaUserCheck],
            ['Live Now', stats.liveNow ?? 0, FaCircle],
            ['Offline', stats.offline ?? 0, FaUserClock]
          ].map(([label, value, Icon]) => (
            <div className="admin-users-stat" key={label}>
              <Icon />
              <div>
                <span>{label}</span>
                <strong>{value}</strong>
              </div>
            </div>
          ))}
        </section>

        <section className="admin-users-toolbar">
          <label className="admin-users-search">
            <FaSearch />
            <input
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              placeholder="Search name, email, phone, or role"
            />
          </label>
          <div className="admin-users-filter-row">
            <FilterSelect label="Role" value={role} options={INTERNAL_USER_FILTER_OPTIONS.roles} onChange={changeFilter(setRole)} />
            <FilterSelect label="Account" value={status} options={INTERNAL_USER_FILTER_OPTIONS.accountStatus} onChange={changeFilter(setStatus)} />
            <FilterSelect label="Working" value={workingStatus} options={INTERNAL_USER_FILTER_OPTIONS.workingStatus} onChange={changeFilter(setWorkingStatus)} />
            <button type="button" className="admin-users-secondary-button" onClick={clearFilters}>
              Clear Filters
            </button>
          </div>
        </section>

        <section className="admin-users-directory">
          <div className="admin-users-directory-header">
            <div>
              <h2>Internal Team Directory</h2>
              <p>{meta.total ?? 0} internal users found</p>
            </div>
          </div>

          {error ? <div className="admin-users-message error">{error}</div> : null}
          {loading ? <div className="admin-users-message">Loading internal users...</div> : null}
          {!loading && !error && users.length === 0 ? (
            <div className="admin-users-message">No internal users found.</div>
          ) : null}

          {!loading && users.length ? (
            <div className="admin-users-table-scroll">
              <div className="admin-users-table">
                <div className="admin-users-table-head" role="row">
                  <span>Internal User</span>
                  <span>Email</span>
                  <span>Phone</span>
                  <span>Role</span>
                  <span>Scope</span>
                  <span>Working</span>
                  <span>Last Active</span>
                  <span>Action</span>
                </div>
                {users.map((item) => (
                  <div
                    className="admin-users-table-row"
                    role="button"
                    tabIndex={0}
                    key={item._id}
                    onClick={() => navigate(`/admin/users/${item._id}`)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') navigate(`/admin/users/${item._id}`);
                    }}
                  >
                    <strong>{item.fullName || 'Unnamed User'}</strong>
                    <span>{item.email || 'Not recorded'}</span>
                    <span>{item.phone || 'Not recorded'}</span>
                    <span>{getRoleText(item)}</span>
                    <span>{formatAdminScope(item)}</span>
                    <span className={`admin-users-working-chip ${item.liveStatus?.isLive ? 'live' : 'offline'}`}>
                      {getWorkingStatusText(item)}
                    </span>
                    <span>{getLastSeenText(item)}</span>
                    <button
                      type="button"
                      className="admin-users-view-button"
                      onClick={(event) => {
                        event.stopPropagation();
                        navigate(`/admin/users/${item._id}`);
                      }}
                    >
                      <FaEye />
                      View
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          <div className="admin-users-pagination">
            <span>Page {meta.page || page} of {meta.totalPages || 1}</span>
            <div>
              <button type="button" aria-label="Previous page" disabled={(meta.page || page) <= 1 || loading} onClick={() => setPage((current) => Math.max(1, current - 1))}>
                <FaChevronLeft />
              </button>
              <button type="button" aria-label="Next page" disabled={(meta.page || page) >= (meta.totalPages || 1) || loading} onClick={() => setPage((current) => current + 1)}>
                <FaChevronRight />
              </button>
            </div>
          </div>
        </section>
      </div>

      {createOpen ? (
        <InternalUserFormModal
          mode="create"
          form={createForm}
          setForm={setCreateForm}
          loading={createLoading}
          onClose={() => !createLoading && setCreateOpen(false)}
          onSubmit={handleCreate}
        />
      ) : null}
    </AdminLayout>
  );
};

export default AdminUsers;
