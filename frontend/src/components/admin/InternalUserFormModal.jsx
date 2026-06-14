import React from 'react';
import { FaSpinner, FaTimes } from 'react-icons/fa';

const Field = ({ label, children, full = false }) => (
  <label className={`admin-users-modal-field${full ? ' full' : ''}`}>
    <span>{label}</span>
    {children}
  </label>
);

const InternalUserFormModal = ({
  mode,
  form,
  setForm,
  loading,
  onClose,
  onSubmit
}) => {
  const isCreate = mode === 'create';
  const update = (field) => (event) =>
    setForm((current) => ({ ...current, [field]: event.target.value }));

  return (
    <div className="admin-users-modal-backdrop" onClick={onClose}>
      <div className="admin-users-modal-card" onClick={(event) => event.stopPropagation()}>
        <div className="admin-users-modal-header">
          <div>
            <h3>{isCreate ? 'Create Internal User' : 'Edit Access Details'}</h3>
            <p>
              {isCreate
                ? 'Add a controlled internal account.'
                : 'Update profile, role, scope, and account status.'}
            </p>
          </div>
          <button type="button" className="admin-users-icon-button" onClick={onClose} aria-label="Close">
            <FaTimes />
          </button>
        </div>

        <div className="admin-users-modal-body">
          <div className="admin-users-modal-grid">
            <Field label="Full Name *">
              <input value={form.fullName} onChange={update('fullName')} />
            </Field>
            <Field label="Email *">
              <input type="email" value={form.email} onChange={update('email')} />
            </Field>
            <Field label="Phone *">
              <input value={form.phone} onChange={update('phone')} />
            </Field>
            <Field label="Role *">
              <select value={form.role} onChange={update('role')}>
                <option value="support_staff">Support Staff</option>
                <option value="system_supervisor">System Supervisor</option>
                <option value="admin">Admin Officer</option>
              </select>
            </Field>
            {!isCreate ? (
              <Field label="Account Status *">
                <select value={form.status} onChange={update('status')}>
                  <option value="active">Active</option>
                  <option value="pending">Pending</option>
                  <option value="blocked">Blocked</option>
                </select>
              </Field>
            ) : null}
            <Field label="Scope Type *">
              <select value={form.scopeType} onChange={update('scopeType')}>
                <option value="national">National</option>
                <option value="district">District</option>
              </select>
            </Field>
            {form.scopeType === 'district' ? (
              <>
                <Field label="Districts *">
                  <input value={form.districts} onChange={update('districts')} placeholder="Dhaka, Chattogram" />
                </Field>
                <Field label="Primary District">
                  <input value={form.primaryDistrict} onChange={update('primaryDistrict')} />
                </Field>
              </>
            ) : null}
            {isCreate ? (
              <>
                <Field label="Password *">
                  <input type="password" value={form.password} onChange={update('password')} />
                </Field>
                <Field label="Confirm Password *">
                  <input type="password" value={form.confirmPassword} onChange={update('confirmPassword')} />
                </Field>
              </>
            ) : (
              <Field label="Update Reason *" full>
                <textarea rows={3} value={form.updateReason} onChange={update('updateReason')} />
              </Field>
            )}
          </div>
        </div>

        <div className="admin-users-modal-footer">
          <button type="button" className="admin-users-secondary-button" onClick={onClose} disabled={loading}>
            Cancel
          </button>
          <button type="button" className="admin-users-primary-button" onClick={onSubmit} disabled={loading}>
            {loading ? <FaSpinner className="spin" /> : null}
            {isCreate ? 'Create User' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default InternalUserFormModal;

