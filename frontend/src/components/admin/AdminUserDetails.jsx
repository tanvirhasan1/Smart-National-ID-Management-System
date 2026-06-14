import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import {
  FaArrowLeft,
  FaEdit,
  FaEnvelope,
  FaMapSigns,
  FaShieldAlt,
  FaUserClock
} from 'react-icons/fa';
import api from '../api/axios';
import AdminLayout from './AdminLayout';
import DeactivateInternalUserModal from './DeactivateInternalUserModal';
import InternalUserFormModal from './InternalUserFormModal';
import { useAuth } from '../context/AuthContext';
import { formatDateTime } from '../utils/helpers';
import {
  buildAdminScopePayload,
  buildEditInternalUserForm,
  formatAdminScope,
  getAccountStatus,
  getCreatedByText,
  getFriendlyWorkspace,
  getPermissionGroup,
  getRoleText,
  getStatusText,
  getWorkingStatusText,
  isRootMainAdminUser
} from './adminUserUtils';
import '../styles/AdminUsers.css';

const DetailList = ({ items }) => (
  <dl className="admin-users-detail-list">
    {items.map(({ label, value }) => (
      <div key={label}>
        <dt>{label}</dt>
        <dd>{value || 'Not recorded'}</dd>
      </div>
    ))}
  </dl>
);

const AdminUserDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();
  const [internalUser, setInternalUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editOpen, setEditOpen] = useState(false);
  const [editLoading, setEditLoading] = useState(false);
  const [editForm, setEditForm] = useState(null);
  const [deactivateOpen, setDeactivateOpen] = useState(false);
  const [deactivateLoading, setDeactivateLoading] = useState(false);
  const [deactivateReason, setDeactivateReason] = useState('');

  const fetchUser = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const response = await api.get(`/admin/users/${id}`);
      setInternalUser(response?.data?.data || null);
    } catch (requestError) {
      setError(requestError?.response?.data?.message || 'Failed to load internal user');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  const rootProtected = isRootMainAdminUser(internalUser);
  const isSelf = internalUser?._id === currentUser?._id;
  const isNationalManager =
    ['admin', 'system_supervisor'].includes(currentUser?.role) &&
    currentUser?.adminScope?.scopeType !== 'district';
  const canDeactivate = currentUser?.role === 'admin' && isNationalManager && !isSelf && !rootProtected;

  const openEdit = () => {
    if (rootProtected) {
      toast.info('Root admin access is protected and cannot be edited here');
      return;
    }
    setEditForm(buildEditInternalUserForm(internalUser));
    setEditOpen(true);
  };

  const handleEdit = async () => {
    if (!editForm.fullName.trim() || !editForm.email.trim() || !editForm.phone.trim()) {
      toast.error('Full name, email, and phone are required');
      return;
    }
    if (!editForm.updateReason.trim()) {
      toast.error('Update reason is required');
      return;
    }
    const adminScope = buildAdminScopePayload(editForm);
    if (adminScope.scopeType === 'district' && !adminScope.districts.length) {
      toast.error('Enter at least one district for district scope');
      return;
    }

    try {
      setEditLoading(true);
      await api.put(`/admin/users/${id}`, {
        fullName: editForm.fullName.trim(),
        email: editForm.email.trim(),
        phone: editForm.phone.trim(),
        role: editForm.role,
        status: editForm.status,
        adminScope,
        updateReason: editForm.updateReason.trim()
      });
      toast.success('Internal user updated successfully');
      setEditOpen(false);
      await fetchUser();
    } catch (requestError) {
      toast.error(requestError?.response?.data?.message || 'Failed to update internal user');
    } finally {
      setEditLoading(false);
    }
  };

  const handleDeactivate = async () => {
    if (!deactivateReason.trim()) {
      toast.error('Deactivation reason is required');
      return;
    }
    try {
      setDeactivateLoading(true);
      await api.delete(`/admin/users/${id}`, {
        data: { archiveReason: deactivateReason.trim() }
      });
      toast.success('Internal user deactivated from active control');
      navigate('/admin/users');
    } catch (requestError) {
      toast.error(requestError?.response?.data?.message || 'Failed to deactivate internal user');
    } finally {
      setDeactivateLoading(false);
    }
  };

  if (loading) {
    return <AdminLayout><div className="admin-users-message standalone">Loading internal user...</div></AdminLayout>;
  }

  if (error || !internalUser) {
    return (
      <AdminLayout>
        <div className="admin-users-details-page">
          <button type="button" className="admin-users-back-button" onClick={() => navigate('/admin/users')}>
            <FaArrowLeft /> Back to Users
          </button>
          <div className="admin-users-message error standalone">{error || 'Internal user not found'}</div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="admin-users-details-page">
        <button type="button" className="admin-users-back-button" onClick={() => navigate('/admin/users')}>
          <FaArrowLeft /> Back to Users
        </button>

        <header className="admin-users-details-header">
          <div>
            <h1>{internalUser.fullName || 'Unnamed User'}</h1>
            <p>{getRoleText(internalUser)}</p>
          </div>
          <div className="admin-users-header-badges">
            <span className={`admin-users-status-chip ${getAccountStatus(internalUser)}`}>
              {getStatusText(internalUser)}
            </span>
            <span className={`admin-users-working-chip ${internalUser.liveStatus?.isLive ? 'live' : 'offline'}`}>
              {getWorkingStatusText(internalUser)}
            </span>
          </div>
        </header>

        <section className="admin-users-summary-strip" aria-label="Internal user summary">
          {[
            ['Access Role', getRoleText(internalUser)],
            ['Account Status', getStatusText(internalUser)],
            ['Working Status', getWorkingStatusText(internalUser)],
            ['Current Workspace', getFriendlyWorkspace(internalUser)]
          ].map(([label, value]) => (
            <div key={label}>
              <span>{label}</span>
              <strong>{value}</strong>
            </div>
          ))}
        </section>

        <div className="admin-users-details-grid">
          <section className="admin-users-section">
            <div className="admin-users-section-title"><FaUserClock /><h2>User Profile</h2></div>
            <DetailList items={[
              { label: 'Full Name', value: internalUser.fullName },
              { label: 'Email', value: internalUser.email },
              { label: 'Phone', value: internalUser.phone },
              { label: 'Created On', value: formatDateTime(internalUser.createdAt) },
              { label: 'Updated On', value: formatDateTime(internalUser.updatedAt) },
              { label: 'Created By', value: getCreatedByText(internalUser) }
            ]} />
          </section>

          <section className="admin-users-section">
            <div className="admin-users-section-title"><FaMapSigns /><h2>Access Responsibility</h2></div>
            <DetailList items={[
              { label: 'Role Type', value: getRoleText(internalUser) },
              { label: 'Scope', value: formatAdminScope(internalUser) },
              { label: 'Permission Group', value: getPermissionGroup(internalUser) },
              { label: 'Primary District', value: internalUser.adminScope?.primaryDistrict }
            ]} />
          </section>

          <section className="admin-users-section">
            <div className="admin-users-section-title"><FaEnvelope /><h2>Contact Details</h2></div>
            <DetailList items={[
              { label: 'Email', value: internalUser.email },
              { label: 'Phone', value: internalUser.phone }
            ]} />
          </section>

          <section className="admin-users-section">
            <div className="admin-users-section-title"><FaShieldAlt /><h2>Access Management</h2></div>
            {rootProtected ? (
              <div className="admin-users-protected-notice">
                <FaShieldAlt />
                <div>
                  <strong>Protected root account</strong>
                  <p>This account controls the internal user tree and cannot be edited or deactivated here.</p>
                </div>
              </div>
            ) : !isNationalManager ? (
              <div className="admin-users-inline-note">National-scope access is required to manage internal users.</div>
            ) : (
              <>
                <div className="admin-users-management-actions">
                  <button type="button" className="admin-users-primary-button" onClick={openEdit}>
                    <FaEdit /> Edit Access
                  </button>
                  <button type="button" className="admin-users-danger-button" disabled={!canDeactivate} onClick={() => {
                    setDeactivateReason('');
                    setDeactivateOpen(true);
                  }}>
                    <FaUserClock /> Deactivate User
                  </button>
                </div>
                {isSelf ? <div className="admin-users-inline-note">You cannot deactivate your own account.</div> : null}
              </>
            )}
          </section>
        </div>
      </div>

      {editOpen && editForm ? (
        <InternalUserFormModal
          mode="edit"
          form={editForm}
          setForm={setEditForm}
          loading={editLoading}
          onClose={() => !editLoading && setEditOpen(false)}
          onSubmit={handleEdit}
        />
      ) : null}
      {deactivateOpen ? (
        <DeactivateInternalUserModal
          user={internalUser}
          reason={deactivateReason}
          setReason={setDeactivateReason}
          loading={deactivateLoading}
          onClose={() => !deactivateLoading && setDeactivateOpen(false)}
          onSubmit={handleDeactivate}
        />
      ) : null}
    </AdminLayout>
  );
};

export default AdminUserDetails;
