import React, { useEffect, useMemo, useState } from 'react';
import {
  FaChevronLeft,
  FaChevronRight,
  FaExclamationTriangle,
  FaEye,
  FaFilter,
  FaHistory,
  FaSearch,
  FaTimes,
  FaUserShield
} from 'react-icons/fa';
import api from '../api/axios';
import AdminLayout from './AdminLayout';
import Loader from '../common/Loader';
import { formatDateTime, formatStatus } from '../utils/helpers';
import '../styles/AuditLogs.css';

const PAGE_SIZE = 12;

const getLogsFromResponse = (response) =>
  response?.data?.data || response?.data?.logs || [];

const normalizeText = (value) =>
  String(value ?? '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();

const buildLogSearchText = (log) =>
  normalizeText(
    [
      log?.action,
      log?.message,
      log?.reason,
      log?.entityType,
      log?.sourceModule,
      log?.actorRole,
      log?.actor?.fullName,
      log?.actor?.email,
      log?.requestId,
      log?.ipAddress,
      ...(Array.isArray(log?.changedFields) ? log.changedFields : [])
    ]
      .filter(Boolean)
      .join(' ')
  );

const getSeverityClass = (severity) => {
  const value = String(severity || 'info').toLowerCase();

  if (value === 'critical') return 'critical';
  if (value === 'warning') return 'warning';
  return 'info';
};

const prettyJson = (value) => {
  if (!value) return 'No data';
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return 'Unable to render data';
  }
};

const getEffectiveBeforeState = (log = {}) =>
  log.beforeState ?? log.meta?.before ?? null;

const getEffectiveAfterState = (log = {}) =>
  log.afterState ?? log.meta?.after ?? null;

const getEffectiveReason = (log = {}) =>
  log.reason || log.meta?.reason || 'No reason provided';

const deriveChangedFields = (beforeState, afterState) => {
  if (
    !beforeState ||
    !afterState ||
    typeof beforeState !== 'object' ||
    typeof afterState !== 'object'
  ) {
    return [];
  }

  return Array.from(
    new Set([...Object.keys(beforeState), ...Object.keys(afterState)])
  ).filter(
    (field) =>
      JSON.stringify(beforeState[field]) !== JSON.stringify(afterState[field])
  );
};

const getEffectiveChangedFields = (log, beforeState, afterState) =>
  Array.isArray(log?.changedFields) && log.changedFields.length > 0
    ? log.changedFields
    : deriveChangedFields(beforeState, afterState);

const formatAuditField = (field) =>
  formatStatus(String(field || '').replace(/([a-z0-9])([A-Z])/g, '$1_$2'));

const formatAuditValue = (value, field = '') => {
  if (value === undefined || value === null || value === '') return 'Not set';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (typeof value === 'object') return prettyJson(value);

  const textValue = String(value);
  const looksLikeDateField = /(at|date|time)$/i.test(String(field || ''));
  const parsedDate = looksLikeDateField ? new Date(textValue) : null;

  if (parsedDate && !Number.isNaN(parsedDate.getTime())) {
    return formatDateTime(parsedDate);
  }

  return textValue;
};

const formatIpAddress = (value) => {
  const ipAddress = String(value || '').trim();

  if (!ipAddress) return 'N/A';
  if (ipAddress === '::1' || ipAddress === '0:0:0:0:0:0:0:1') {
    return '127.0.0.1 (Localhost)';
  }
  if (ipAddress.toLowerCase().startsWith('::ffff:')) {
    return ipAddress.slice(7);
  }

  return ipAddress;
};

const getTechnicalMeta = (log = {}) => {
  const meta = log.meta && typeof log.meta === 'object' ? { ...log.meta } : {};
  delete meta.before;
  delete meta.after;
  delete meta.reason;
  return meta;
};

const ENTITY_FILTER_OPTIONS = [
  { value: '', label: 'All Entities' },
  { value: 'User', label: 'User' },
  { value: 'Application', label: 'Application' },
  { value: 'SupportTicket', label: 'Support Ticket' },
  { value: 'Center', label: 'Center' },
  { value: 'Appointment', label: 'Appointment' },
  { value: 'DeliveryRequest', label: 'Delivery Request' },
  { value: 'CorrectionApplication', label: 'Correction' }
];

const ACTOR_ROLE_FILTER_OPTIONS = [
  { value: '', label: 'All Actor Roles' },
  { value: 'admin', label: 'Admin' },
  { value: 'super_admin', label: 'Super Admin' },
  { value: 'system_supervisor', label: 'System Supervisor' },
  { value: 'support_staff', label: 'Support Staff' },
  { value: 'citizen', label: 'Citizen' }
];

const SEVERITY_FILTER_OPTIONS = [
  { value: '', label: 'All Severity' },
  { value: 'info', label: 'Info' },
  { value: 'warning', label: 'Warning' },
  { value: 'critical', label: 'Critical' }
];

const SOURCE_FILTER_OPTIONS = [
  { value: '', label: 'All Sources' },
  { value: 'admin', label: 'Admin' },
  { value: 'admin.applications', label: 'Admin Applications' },
  { value: 'admin.delivery', label: 'Admin Delivery' },
  { value: 'admin.printing', label: 'Admin Printing' },
  { value: 'admin.support', label: 'Admin Support' },
  { value: 'support', label: 'Support' },
  { value: 'applications', label: 'Applications' },
  { value: 'appointments', label: 'Appointments' }
];

const SelectFilter = ({ label, value, options, onChange }) => (
  <label className="audit-logs-filter-control">
    <span>{label}</span>
    <select value={value} onChange={(event) => onChange(event.target.value)}>
      {options.map((option) => (
        <option key={`${label}-${option.value || 'all'}`} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  </label>
);

const getActorName = (log) =>
  log?.actor?.fullName ||
  log?.actorName ||
  formatStatus(log?.actorRole || '') ||
  'Unknown Actor';

const getActorEmail = (log) => log?.actor?.email || log?.actorEmail || 'No email';

const getEntityLabel = (log) => formatStatus(log?.entityType || 'Unknown');

const getSourceLabel = (log) =>
  String(log?.sourceModule || 'N/A')
    .split('.')
    .map((part) => formatStatus(part))
    .join(' / ');

const AuditDetailModal = ({ log, onClose }) => {
  if (!log) return null;

  const beforeState = getEffectiveBeforeState(log);
  const afterState = getEffectiveAfterState(log);
  const changedFields = getEffectiveChangedFields(log, beforeState, afterState);
  const technicalMeta = getTechnicalMeta(log);
  const hasTechnicalMeta = Object.keys(technicalMeta).length > 0;

  return (
    <div className="audit-logs-modal-backdrop" role="presentation" onMouseDown={onClose}>
      <div
        className="audit-logs-modal-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="audit-log-details-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="audit-logs-modal-header">
          <div>
            <h2 id="audit-log-details-title">{log.action || 'Unknown Action'}</h2>
            <p>{log.message || 'No message available'}</p>
          </div>
          <button
            type="button"
            className="audit-logs-icon-button"
            onClick={onClose}
            aria-label="Close audit log details"
          >
            <FaTimes />
          </button>
        </div>

        <div className="audit-logs-modal-summary">
          <div>
            <span>Severity</span>
            <strong className={`audit-logs-severity-chip ${getSeverityClass(log.severity)}`}>
              {formatStatus(log.severity || 'info')}
            </strong>
          </div>
          <div>
            <span>Entity</span>
            <strong>{getEntityLabel(log)}</strong>
          </div>
          <div>
            <span>Source</span>
            <strong>{getSourceLabel(log)}</strong>
          </div>
          <div>
            <span>Created At</span>
            <strong>{log.createdAt ? formatDateTime(log.createdAt) : 'N/A'}</strong>
          </div>
        </div>

        <div className="audit-logs-details-grid">
          <section className="audit-logs-section">
            <div className="audit-logs-section-title">
              <FaUserShield />
              <h3>Actor Information</h3>
            </div>
            <dl className="audit-logs-detail-list">
              <div>
                <dt>Actor Name</dt>
                <dd>{getActorName(log)}</dd>
              </div>
              <div>
                <dt>Actor Email</dt>
                <dd>{getActorEmail(log)}</dd>
              </div>
              <div>
                <dt>Actor Role</dt>
                <dd>{formatStatus(log.actorRole || 'N/A')}</dd>
              </div>
              <div>
                <dt>Entity ID</dt>
                <dd>{log.entityId || 'N/A'}</dd>
              </div>
              <div>
                <dt>District</dt>
                <dd>{log.district || 'National / Not specified'}</dd>
              </div>
            </dl>
          </section>

          <section className="audit-logs-section">
            <div className="audit-logs-section-title">
              <FaHistory />
              <h3>Trace Details</h3>
            </div>
            <dl className="audit-logs-detail-list">
              <div>
                <dt>Reason</dt>
                <dd>{getEffectiveReason(log)}</dd>
              </div>
              <div>
                <dt>Request ID</dt>
                <dd>{log.requestId || 'N/A'}</dd>
              </div>
              <div>
                <dt>IP Address</dt>
                <dd>{formatIpAddress(log.ipAddress)}</dd>
              </div>
              <div>
                <dt>User Agent</dt>
                <dd>{log.userAgent || 'N/A'}</dd>
              </div>
            </dl>
          </section>
        </div>

        <section className="audit-logs-section">
          <div className="audit-logs-section-title">
            <FaHistory />
            <h3>Changed Fields</h3>
          </div>
          {changedFields.length > 0 ? (
            <div className="audit-logs-change-list">
              <div className="audit-logs-change-head">
                <span>Field</span>
                <span>Before</span>
                <span>After</span>
              </div>
              {changedFields.map((field) => (
                <div key={field} className="audit-logs-change-row">
                  <strong>{formatAuditField(field)}</strong>
                  <span>{formatAuditValue(beforeState?.[field], field)}</span>
                  <span>{formatAuditValue(afterState?.[field], field)}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="audit-logs-empty-inline">No changed fields recorded.</p>
          )}
        </section>

        <div className="audit-logs-json-grid">
          <section className="audit-logs-json-card">
            <h3>Before State</h3>
            <pre>{prettyJson(beforeState)}</pre>
          </section>
          <section className="audit-logs-json-card">
            <h3>After State</h3>
            <pre>{prettyJson(afterState)}</pre>
          </section>
        </div>

        {hasTechnicalMeta ? (
          <details className="audit-logs-json-card single audit-logs-technical-details">
            <summary>Technical Metadata</summary>
            <pre>{prettyJson(technicalMeta)}</pre>
          </details>
        ) : null}
      </div>
    </div>
  );
};

const AuditLogs = () => {
  const [logs, setLogs] = useState([]);
  const [selectedLog, setSelectedLog] = useState(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);

  const [searchInput, setSearchInput] = useState('');
  const [entityFilter, setEntityFilter] = useState('');
  const [actorRoleFilter, setActorRoleFilter] = useState('');
  const [severityFilter, setSeverityFilter] = useState('');
  const [sourceFilter, setSourceFilter] = useState('');

  const fetchLogs = async () => {
    try {
      setLoading(true);

      const response = await api.get('/admin/audit/recent?limit=300&sort=-createdAt');
      setLogs(getLogsFromResponse(response));
    } catch (error) {
      console.error('Error fetching audit logs:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const summary = useMemo(() => {
    return {
      total: logs.length,
      info: logs.filter((item) => item.severity === 'info').length,
      warning: logs.filter((item) => item.severity === 'warning').length,
      critical: logs.filter((item) => item.severity === 'critical').length,
      applicationLogs: logs.filter((item) => item.entityType === 'Application').length,
      userLogs: logs.filter((item) => item.entityType === 'User').length
    };
  }, [logs]);

  const visibleLogs = useMemo(() => {
    const normalizedSearch = normalizeText(searchInput);
    const searchTokens = normalizedSearch.split(' ').filter(Boolean);

    return logs.filter((item) => {
      const searchableText = buildLogSearchText(item);

      const matchesSearch =
        searchTokens.length === 0 ||
        searchTokens.every((token) => searchableText.includes(token));

      const matchesEntity = !entityFilter || item.entityType === entityFilter;
      const matchesActorRole = !actorRoleFilter || item.actorRole === actorRoleFilter;
      const matchesSeverity = !severityFilter || item.severity === severityFilter;
      const matchesSource = !sourceFilter || item.sourceModule === sourceFilter;

      return (
        matchesSearch &&
        matchesEntity &&
        matchesActorRole &&
        matchesSeverity &&
        matchesSource
      );
    });
  }, [logs, searchInput, entityFilter, actorRoleFilter, severityFilter, sourceFilter]);

  const totalPages = Math.max(1, Math.ceil(visibleLogs.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageLogs = visibleLogs.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  const hasActiveFilters = Boolean(
    searchInput || entityFilter || actorRoleFilter || severityFilter || sourceFilter
  );

  useEffect(() => {
    setPage(1);
  }, [searchInput, entityFilter, actorRoleFilter, severityFilter, sourceFilter]);

  const clearFilters = () => {
    setSearchInput('');
    setEntityFilter('');
    setActorRoleFilter('');
    setSeverityFilter('');
    setSourceFilter('');
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="audit-logs-message standalone">
          <Loader size="large" text="Loading audit logs..." />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="audit-logs-page">
        <div className="audit-logs-page-header">
          <div>
            <h1>Audit Logs</h1>
            <p>Review admin actions, user changes and system trace history.</p>
          </div>
        </div>

        <div className="audit-logs-stats-grid">
          <div className="audit-logs-stat">
            <FaHistory />
            <div>
              <span>Total Logs</span>
              <strong>{summary.total}</strong>
            </div>
          </div>
          <div className="audit-logs-stat">
            <FaHistory />
            <div>
              <span>Info</span>
              <strong>{summary.info}</strong>
            </div>
          </div>
          <div className="audit-logs-stat">
            <FaExclamationTriangle />
            <div>
              <span>Warning</span>
              <strong>{summary.warning}</strong>
            </div>
          </div>
          <div className="audit-logs-stat">
            <FaExclamationTriangle />
            <div>
              <span>Critical</span>
              <strong>{summary.critical}</strong>
            </div>
          </div>
          <div className="audit-logs-stat">
            <FaUserShield />
            <div>
              <span>User Logs</span>
              <strong>{summary.userLogs}</strong>
            </div>
          </div>
          <div className="audit-logs-stat">
            <FaHistory />
            <div>
              <span>Application Logs</span>
              <strong>{summary.applicationLogs}</strong>
            </div>
          </div>
        </div>

        <div className="audit-logs-toolbar">
          <div className="audit-logs-search">
            <FaSearch />
            <input
              type="text"
              placeholder="Search action, actor, reason, source, entity or changed field"
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
            />
          </div>

          <div className="audit-logs-filter-row">
            <SelectFilter
              label="Entity"
              value={entityFilter}
              options={ENTITY_FILTER_OPTIONS}
              onChange={setEntityFilter}
            />
            <SelectFilter
              label="Actor Role"
              value={actorRoleFilter}
              options={ACTOR_ROLE_FILTER_OPTIONS}
              onChange={setActorRoleFilter}
            />
            <SelectFilter
              label="Severity"
              value={severityFilter}
              options={SEVERITY_FILTER_OPTIONS}
              onChange={setSeverityFilter}
            />
            <SelectFilter
              label="Source"
              value={sourceFilter}
              options={SOURCE_FILTER_OPTIONS}
              onChange={setSourceFilter}
            />
            <button
              type="button"
              className="audit-logs-secondary-button"
              onClick={clearFilters}
              disabled={!hasActiveFilters}
            >
              Clear Filters
            </button>
          </div>
        </div>

        <section className="audit-logs-directory">
          <div className="audit-logs-directory-header">
            <h2>Audit Log Records</h2>
            <p>{visibleLogs.length} logs found</p>
          </div>

          {visibleLogs.length === 0 ? (
            <div className="audit-logs-message">
              No audit logs found. Try changing your search or filters.
            </div>
          ) : (
            <>
              <div className="audit-logs-table-scroll">
                <div className="audit-logs-table">
                  <div className="audit-logs-table-head">
                    <span>Action</span>
                    <span>Actor</span>
                    <span>Entity</span>
                    <span>Severity</span>
                    <span>Source</span>
                    <span>Created At</span>
                    <span>Action</span>
                  </div>

                  {pageLogs.map((item) => (
                    <div
                      key={item._id}
                      className="audit-logs-table-row"
                      role="button"
                      tabIndex={0}
                      onClick={() => setSelectedLog(item)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault();
                          setSelectedLog(item);
                        }
                      }}
                    >
                      <strong title={item.message || item.action || 'Unknown Action'}>
                        {item.action || 'Unknown Action'}
                        <small>{item.message || 'No message available'}</small>
                      </strong>
                      <span title={getActorEmail(item)}>
                        <b>{getActorName(item)}</b>
                        <small>{getActorEmail(item)}</small>
                      </span>
                      <span>{getEntityLabel(item)}</span>
                      <span>
                        <em className={`audit-logs-severity-chip ${getSeverityClass(item.severity)}`}>
                          {formatStatus(item.severity || 'info')}
                        </em>
                      </span>
                      <span title={item.sourceModule || 'N/A'}>{getSourceLabel(item)}</span>
                      <span>{item.createdAt ? formatDateTime(item.createdAt) : 'N/A'}</span>
                      <span>
                        <button
                          type="button"
                          className="audit-logs-view-button"
                          onClick={(event) => {
                            event.stopPropagation();
                            setSelectedLog(item);
                          }}
                        >
                          <FaEye />
                          View
                        </button>
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="audit-logs-pagination">
                <span>
                  Page {currentPage} of {totalPages} · Showing {pageLogs.length} of {visibleLogs.length}
                </span>
                <div>
                  <button
                    type="button"
                    onClick={() => setPage((value) => Math.max(1, value - 1))}
                    disabled={currentPage <= 1}
                    aria-label="Previous page"
                  >
                    <FaChevronLeft />
                  </button>
                  <button
                    type="button"
                    onClick={() => setPage((value) => Math.min(totalPages, value + 1))}
                    disabled={currentPage >= totalPages}
                    aria-label="Next page"
                  >
                    <FaChevronRight />
                  </button>
                </div>
              </div>
            </>
          )}
        </section>
      </div>

      <AuditDetailModal log={selectedLog} onClose={() => setSelectedLog(null)} />
    </AdminLayout>
  );
};

export default AuditLogs;
