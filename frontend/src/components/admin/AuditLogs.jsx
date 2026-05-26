import React, { useEffect, useMemo, useState } from 'react';
import {
  FaChevronDown,
  FaExclamationTriangle,
  FaFilter,
  FaHistory,
  FaSearch,
  FaUserShield
} from 'react-icons/fa';
import api from '../api/axios';
import AdminLayout from './AdminLayout';
import Loader from '../common/Loader';
import { formatDateTime, formatStatus } from '../utils/helpers';
import '../styles/AuditLogs.css';

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


const ENTITY_FILTER_OPTIONS = [
  { value: '', label: 'All Entities' },
  { value: 'User', label: 'User' },
  { value: 'Application', label: 'Application' },
  { value: 'SupportTicket', label: 'Support Ticket' },
  { value: 'Center', label: 'Center' }
];

const ACTOR_ROLE_FILTER_OPTIONS = [
  { value: '', label: 'All Actor Roles' },
  { value: 'admin', label: 'Admin' },
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
  { value: 'applications', label: 'Applications' }
];

const AuditFilterSelect = ({ label, value, options, onChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const selectedOption = options.find((option) => option.value === value) || options[0];

  const handleSelect = (nextValue) => {
    onChange(nextValue);
    setIsOpen(false);
  };

  return (
    <div
      className={`audit-logs-filter-select${isOpen ? ' open' : ''}`}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) {
          setIsOpen(false);
        }
      }}
    >
      <button
        type="button"
        className="audit-logs-filter-trigger"
        onClick={() => setIsOpen((current) => !current)}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-label={label}
      >
        <span className="audit-logs-filter-leading-icon" aria-hidden="true">
          <FaFilter />
        </span>
        <span className="audit-logs-filter-value">{selectedOption.label}</span>
        <FaChevronDown className="audit-logs-filter-chevron" aria-hidden="true" />
      </button>

      {isOpen && (
        <div className="audit-logs-filter-menu" role="listbox" aria-label={label}>
          {options.map((option) => {
            const isSelected = option.value === value;

            return (
              <button
                key={`${label}-${option.value || 'all'}`}
                type="button"
                className={`audit-logs-filter-option${isSelected ? ' selected' : ''}`}
                role="option"
                aria-selected={isSelected}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => handleSelect(option.value)}
              >
                <span>{option.label}</span>
                {isSelected && <span className="audit-logs-filter-check">✓</span>}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

const AuditLogs = () => {
  const [logs, setLogs] = useState([]);
  const [selectedLog, setSelectedLog] = useState(null);
  const [loading, setLoading] = useState(true);

  const [searchInput, setSearchInput] = useState('');
  const [entityFilter, setEntityFilter] = useState('');
  const [actorRoleFilter, setActorRoleFilter] = useState('');
  const [severityFilter, setSeverityFilter] = useState('');
  const [sourceFilter, setSourceFilter] = useState('');

  // Load recent audit logs for trace-first admin monitoring.
  const fetchLogs = async () => {
    try {
      setLoading(true);

      const response = await api.get('/admin/audit/recent?limit=300&sort=-createdAt');
      const rows = getLogsFromResponse(response);

      setLogs(rows);

      setSelectedLog((currentSelected) => {
        if (!rows.length) return null;
        if (!currentSelected) return rows[0];

        const stillExists = rows.find((item) => item._id === currentSelected._id);
        return stillExists || rows[0];
      });
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

  useEffect(() => {
    if (!visibleLogs.length) {
      setSelectedLog(null);
      return;
    }

    setSelectedLog((currentSelected) => {
      if (!currentSelected) return visibleLogs[0];

      const stillExists = visibleLogs.find((item) => item._id === currentSelected._id);
      return stillExists || visibleLogs[0];
    });
  }, [visibleLogs]);

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
        <div className="audit-logs-loading-state">
          <Loader size="large" text="Loading audit logs..." />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="audit-logs-page">
        {/* Audit overview header */}
        <div className="audit-logs-header-card">
          <div className="audit-logs-header-top">
            <div>
              <h1 className="audit-logs-title">Audit Logs</h1>
              <p className="audit-logs-subtitle">
                Review admin actions, user changes and system trace history from one governance workspace.
              </p>
            </div>
          </div>

          <div className="audit-logs-stats-grid">
            <div className="audit-logs-stat-card neutral">
              <div className="audit-logs-stat-icon">
                <FaHistory />
              </div>
              <div>
                <p>Total Logs</p>
                <h3>{summary.total}</h3>
              </div>
            </div>

            <div className="audit-logs-stat-card blue">
              <div className="audit-logs-stat-icon">
                <FaHistory />
              </div>
              <div>
                <p>Info</p>
                <h3>{summary.info}</h3>
              </div>
            </div>

            <div className="audit-logs-stat-card yellow">
              <div className="audit-logs-stat-icon">
                <FaExclamationTriangle />
              </div>
              <div>
                <p>Warning</p>
                <h3>{summary.warning}</h3>
              </div>
            </div>

            <div className="audit-logs-stat-card red">
              <div className="audit-logs-stat-icon">
                <FaExclamationTriangle />
              </div>
              <div>
                <p>Critical</p>
                <h3>{summary.critical}</h3>
              </div>
            </div>

            <div className="audit-logs-stat-card green">
              <div className="audit-logs-stat-icon">
                <FaUserShield />
              </div>
              <div>
                <p>User Logs</p>
                <h3>{summary.userLogs}</h3>
              </div>
            </div>

            <div className="audit-logs-stat-card purple">
              <div className="audit-logs-stat-icon">
                <FaHistory />
              </div>
              <div>
                <p>Application Logs</p>
                <h3>{summary.applicationLogs}</h3>
              </div>
            </div>
          </div>
        </div>

        {/* Search and filter controls */}
        <div className="audit-logs-toolbar">
          <div className="audit-logs-search-box">
            <FaSearch className="audit-logs-field-icon" />
            <input
              type="text"
              placeholder="Search by action, actor, reason, source, entity or changed field"
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
            />
          </div>

          <div className="audit-logs-filter-row">
            <AuditFilterSelect
              label="Filter by entity"
              value={entityFilter}
              options={ENTITY_FILTER_OPTIONS}
              onChange={setEntityFilter}
            />

            <AuditFilterSelect
              label="Filter by actor role"
              value={actorRoleFilter}
              options={ACTOR_ROLE_FILTER_OPTIONS}
              onChange={setActorRoleFilter}
            />

            <AuditFilterSelect
              label="Filter by severity"
              value={severityFilter}
              options={SEVERITY_FILTER_OPTIONS}
              onChange={setSeverityFilter}
            />

            <AuditFilterSelect
              label="Filter by source"
              value={sourceFilter}
              options={SOURCE_FILTER_OPTIONS}
              onChange={setSourceFilter}
            />

            <button
              type="button"
              className="audit-logs-secondary-button"
              onClick={clearFilters}
            >
              Clear Filters
            </button>
          </div>
        </div>

        <div className="audit-logs-content">
          {/* Log list */}
          <div className="audit-logs-list-card">
            <div className="audit-logs-card-header">
              <div>
                <h3>Trace Timeline</h3>
                <p>{visibleLogs.length} logs found</p>
              </div>
            </div>

            {visibleLogs.length === 0 ? (
              <div className="audit-logs-empty-state">
                <FaHistory className="audit-logs-empty-icon" />
                <h3>No logs found</h3>
                <p>Try changing your search or filter selection.</p>
              </div>
            ) : (
              <div className="audit-logs-list">
                {visibleLogs.map((item) => (
                  <button
                    key={item._id}
                    type="button"
                    className={
                      selectedLog?._id === item._id
                        ? 'audit-logs-list-item active'
                        : 'audit-logs-list-item'
                    }
                    onClick={() => setSelectedLog(item)}
                  >
                    <div className="audit-logs-list-top">
                      <h4>{item.action || 'Unknown Action'}</h4>

                      <span
                        className={`audit-logs-severity-chip ${getSeverityClass(
                          item.severity
                        )}`}
                      >
                        {formatStatus(item.severity || 'info')}
                      </span>
                    </div>

                    <p>{item.message || 'No message available'}</p>

                    <div className="audit-logs-list-meta">
                      <span className="audit-logs-entity-chip">
                        {formatStatus(item.entityType || 'Unknown')}
                      </span>
                      <small>{formatDateTime(item.createdAt)}</small>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Selected log details */}
          <div className="audit-logs-details-card">
            {selectedLog ? (
              <>
                <div className="audit-logs-details-header">
                  <div>
                    <h2>{selectedLog.action || 'Unknown Action'}</h2>
                    <p>{selectedLog.message || 'No message available'}</p>
                  </div>

                  <span
                    className={`audit-logs-severity-chip ${getSeverityClass(
                      selectedLog.severity
                    )}`}
                  >
                    {formatStatus(selectedLog.severity || 'info')}
                  </span>
                </div>

                <div className="audit-logs-summary-grid">
                  <div className="audit-logs-summary-card">
                    <p>Entity</p>
                    <h4>{formatStatus(selectedLog.entityType || 'N/A')}</h4>
                  </div>

                  <div className="audit-logs-summary-card">
                    <p>Actor Role</p>
                    <h4>{formatStatus(selectedLog.actorRole || 'N/A')}</h4>
                  </div>

                  <div className="audit-logs-summary-card">
                    <p>Source Module</p>
                    <h4>{selectedLog.sourceModule || 'N/A'}</h4>
                  </div>

                  <div className="audit-logs-summary-card">
                    <p>Created At</p>
                    <h4>{selectedLog.createdAt ? formatDateTime(selectedLog.createdAt) : 'N/A'}</h4>
                  </div>
                </div>

                <div className="audit-logs-section-card">
                  <div className="audit-logs-section-title">
                    <FaUserShield className="audit-logs-section-icon" />
                    <h3>Actor Information</h3>
                  </div>

                  <div className="audit-logs-detail-grid">
                    <div>
                      <p>Actor Name</p>
                      <h4>{selectedLog.actor?.fullName || 'N/A'}</h4>
                    </div>

                    <div>
                      <p>Actor Email</p>
                      <h4>{selectedLog.actor?.email || 'N/A'}</h4>
                    </div>

                    <div>
                      <p>Actor Role</p>
                      <h4>{formatStatus(selectedLog.actorRole || 'N/A')}</h4>
                    </div>

                    <div>
                      <p>Entity ID</p>
                      <h4>{selectedLog.entityId || 'N/A'}</h4>
                    </div>
                  </div>
                </div>

                <div className="audit-logs-section-card">
                  <div className="audit-logs-section-title">
                    <FaHistory className="audit-logs-section-icon" />
                    <h3>Trace Details</h3>
                  </div>

                  <div className="audit-logs-detail-grid">
                    <div>
                      <p>Reason</p>
                      <h4>{selectedLog.reason || 'No reason provided'}</h4>
                    </div>

                    <div>
                      <p>Request ID</p>
                      <h4>{selectedLog.requestId || 'N/A'}</h4>
                    </div>

                    <div>
                      <p>IP Address</p>
                      <h4>{selectedLog.ipAddress || 'N/A'}</h4>
                    </div>

                    <div>
                      <p>User Agent</p>
                      <h4>{selectedLog.userAgent || 'N/A'}</h4>
                    </div>
                  </div>
                </div>

                <div className="audit-logs-section-card">
                  <div className="audit-logs-section-title">
                    <FaHistory className="audit-logs-section-icon" />
                    <h3>Changed Fields</h3>
                  </div>

                  {Array.isArray(selectedLog.changedFields) && selectedLog.changedFields.length > 0 ? (
                    <div className="audit-logs-chip-list">
                      {selectedLog.changedFields.map((field) => (
                        <span key={field} className="audit-logs-field-chip">
                          {field}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <div className="audit-logs-empty-inline">
                      No changed fields recorded
                    </div>
                  )}
                </div>

                <div className="audit-logs-json-grid">
                  <div className="audit-logs-json-card">
                    <h3>Before State</h3>
                    <pre>{prettyJson(selectedLog.beforeState)}</pre>
                  </div>

                  <div className="audit-logs-json-card">
                    <h3>After State</h3>
                    <pre>{prettyJson(selectedLog.afterState)}</pre>
                  </div>
                </div>

                <div className="audit-logs-json-card single">
                  <h3>Meta</h3>
                  <pre>{prettyJson(selectedLog.meta)}</pre>
                </div>
              </>
            ) : (
              <div className="audit-logs-empty-state details">
                <FaHistory className="audit-logs-empty-icon" />
                <h3>Select a log</h3>
                <p>Choose an audit log from the left side to view full details.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default AuditLogs;