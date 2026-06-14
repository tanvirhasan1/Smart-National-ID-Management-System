import React from 'react';
import { FaSpinner, FaTimes } from 'react-icons/fa';

const DeactivateInternalUserModal = ({
  user,
  reason,
  setReason,
  loading,
  onClose,
  onSubmit
}) => (
  <div className="admin-users-modal-backdrop" onClick={onClose}>
    <div className="admin-users-modal-card small" onClick={(event) => event.stopPropagation()}>
      <div className="admin-users-modal-header danger">
        <div>
          <h3>Deactivate Internal User</h3>
          <p>The account will be removed from active control while retaining its audit trail.</p>
        </div>
        <button type="button" className="admin-users-icon-button" onClick={onClose} aria-label="Close">
          <FaTimes />
        </button>
      </div>
      <div className="admin-users-modal-body">
        <div className="admin-users-danger-summary">
          <strong>{user?.fullName}</strong>
          <span>{user?.email}</span>
        </div>
        <label className="admin-users-modal-field">
          <span>Deactivation Reason *</span>
          <textarea rows={4} value={reason} onChange={(event) => setReason(event.target.value)} />
        </label>
      </div>
      <div className="admin-users-modal-footer">
        <button type="button" className="admin-users-secondary-button" onClick={onClose} disabled={loading}>
          Cancel
        </button>
        <button type="button" className="admin-users-danger-button" onClick={onSubmit} disabled={loading}>
          {loading ? <FaSpinner className="spin" /> : null}
          Confirm Deactivate
        </button>
      </div>
    </div>
  </div>
);

export default DeactivateInternalUserModal;
