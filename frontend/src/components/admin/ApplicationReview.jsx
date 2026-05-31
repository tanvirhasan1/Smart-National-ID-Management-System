import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import {
  FaCheckCircle,
  FaChevronDown,
  FaClipboardList,
  FaClock,
  FaFileAlt,
  FaFilter,
  FaHourglassHalf,
  FaInbox,
  FaSearch,
  FaSpinner,
  FaUser
} from 'react-icons/fa';
import api from '../api/axios';
import AdminLayout from './AdminLayout';
import Loader from '../common/Loader';
import '../styles/ApplicationReview.css';

const DEFAULT_SORT = '-createdAt';
const PAGE_LIMIT = 25;

const STATUS_OPTIONS = [
  { value: '', label: 'All Status' },
  { value: 'submitted', label: 'Submitted' },
  { value: 'under_review', label: 'Under Review' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'printed', label: 'Printed' },
  { value: 'delivered', label: 'Delivered' }
];

const TYPE_OPTIONS = [
  { value: '', label: 'All Types' },
  { value: 'new', label: 'New' },
  { value: 'correction', label: 'Correction' },
  { value: 'reissue', label: 'Reissue' }
];

const SORT_OPTIONS = [
  { value: '-createdAt', label: 'Newest First' },
  { value: 'createdAt', label: 'Oldest First' },
  { value: '-updatedAt', label: 'Recently Updated' },
  { value: 'updatedAt', label: 'Least Recently Updated' }
];


const emptyMeta = {
  totalMatching: 0,
  hasMore: false,
  nextCursor: null,
  limit: PAGE_LIMIT,
  sort: DEFAULT_SORT
};

const formatStatus = (value = '') =>
  String(value || '')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (m) => m.toUpperCase());

const formatDate = (value) => {
  if (!value) return 'N/A';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'N/A';
  return date.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });
};

const formatDateTime = (value) => {
  if (!value) return 'N/A';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'N/A';
  return date.toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

const getStatusTone = (status = '') => {
  const value = String(status || '').toLowerCase();
  if (value === 'approved') return 'success';
  if (value === 'rejected') return 'danger';
  if (value === 'under_review') return 'warning';
  if (value === 'submitted') return 'info';
  return 'neutral';
};

const getApplicantName = (item) =>
  item?.fullNameEnglish || item?.applicant?.fullName || 'N/A';

const getApplicantPhone = (item) =>
  item?.phone || item?.applicant?.phone || 'N/A';

const maskPhone = (phone = '') => {
  const value = String(phone || '');
  if (value.length < 7) return value || 'N/A';
  return `${value.slice(0, 3)}••••${value.slice(-3)}`;
};

const getQueueAge = (submittedAt, createdAt) => {
  const raw = submittedAt || createdAt;
  if (!raw) return '0d';
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return '0d';
  const diff = Math.max(0, Math.floor((Date.now() - date.getTime()) / 86400000));
  return `${diff}d`;
};

const getEvidenceCount = (item) => {
  const summary = item?.documentSummary || {};
  const keys = ['photograph', 'signature', 'birthCertificate'];

  if (item?.applicationType === 'correction' || summary.correctionProof) {
    keys.push('correctionProof');
  }

  return keys.filter((key) => summary[key]).length;
};

const getEvidenceTotal = (item) =>
  item?.applicationType === 'correction' || item?.documentSummary?.correctionProof
    ? 4
    : 3;

const getDocumentVerification = (item) =>
  item?.documentVerification ||
  item?.documentSummary?.birthCertificateVerification ||
  {};

const isResubmission = (item) =>
  Boolean(
    item?.resubmissionInfo?.isResubmission ||
      item?.resubmissionInfo?.previousApplicationId
  );


function QueueDropdown({ icon: Icon = FaFilter, label, value, options, onChange }) {
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef(null);
  const selected = options.find((option) => option.value === value) || options[0];

  useEffect(() => {
    const handleClickAway = (event) => {
      if (!dropdownRef.current?.contains(event.target)) {
        setOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickAway);
    return () => document.removeEventListener('mousedown', handleClickAway);
  }, []);

  return (
    <div className={`gov-queue-dropdown ${open ? 'open' : ''}`} ref={dropdownRef}>
      <button
        type="button"
        className="gov-queue-dropdown-trigger"
        aria-label={label}
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
      >
        <span className="gov-queue-dropdown-left">
          <span className="gov-queue-dropdown-icon">
            <Icon />
          </span>
          <span>{selected.label}</span>
        </span>
        <FaChevronDown className="gov-queue-dropdown-chevron" />
      </button>

      {open ? (
        <div className="gov-queue-dropdown-menu" role="listbox" aria-label={label}>
          {options.map((option) => (
            <button
              key={option.value || 'all'}
              type="button"
              className={`gov-queue-dropdown-option ${option.value === value ? 'selected' : ''}`}
              onClick={() => {
                onChange(option.value);
                setOpen(false);
              }}
            >
              <span>{option.label}</span>
              {option.value === value ? <FaCheckCircle /> : null}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export default function ApplicationReview() {
  const [searchParams, setSearchParams] = useSearchParams();

  const [stats, setStats] = useState(null);
  const [queue, setQueue] = useState([]);
  const [queueMeta, setQueueMeta] = useState(emptyMeta);

  const [statsLoading, setStatsLoading] = useState(false);
  const [queueLoading, setQueueLoading] = useState(true);
  const [loadMoreLoading, setLoadMoreLoading] = useState(false);

  const [searchInput, setSearchInput] = useState(searchParams.get('search') || '');

  const observerRef = useRef(null);
  const loadMoreRef = useRef(null);

  const filters = useMemo(
    () => ({
      search: searchParams.get('search') || '',
      status: searchParams.get('status') || '',
      applicationType: searchParams.get('applicationType') || '',
      sort: searchParams.get('sort') || DEFAULT_SORT
    }),
    [searchParams]
  );

  const updateQuery = useCallback(
    (updates) => {
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);

        Object.entries(updates).forEach(([key, value]) => {
          if (value === null || value === undefined || value === '') {
            next.delete(key);
          } else {
            next.set(key, String(value));
          }
        });

        return next;
      });
    },
    [setSearchParams]
  );

  const fetchStats = useCallback(async () => {
    try {
      setStatsLoading(true);
      const response = await api.get('/admin/applications/stats');
      setStats(response?.data?.data || null);
    } catch (error) {
      console.error(error);
    } finally {
      setStatsLoading(false);
    }
  }, []);

  const fetchQueue = useCallback(
    async ({ reset = false, cursor = '' } = {}) => {
      try {
        if (reset) {
          setQueueLoading(true);
        } else {
          setLoadMoreLoading(true);
        }

        const params = new URLSearchParams();
        params.set('limit', String(PAGE_LIMIT));
        params.set('sort', filters.sort || DEFAULT_SORT);

        if (filters.search) params.set('search', filters.search);
        if (filters.status) params.set('status', filters.status);
        if (filters.applicationType) params.set('applicationType', filters.applicationType);
        if (!reset && cursor) params.set('cursor', cursor);

        const response = await api.get(`/admin/application-review/queue?${params.toString()}`);
        const items = response?.data?.data || [];
        const meta = response?.data?.meta || emptyMeta;

        setQueue((prev) => {
          if (reset) return items;

          const map = new Map();
          [...prev, ...items].forEach((item) => {
            if (item?._id) map.set(item._id, item);
          });
          return Array.from(map.values());
        });

        setQueueMeta(meta);
      } catch (error) {
        toast.error(error?.response?.data?.message || 'Failed to load applications');
      } finally {
        setQueueLoading(false);
        setLoadMoreLoading(false);
      }
    },
    [filters.applicationType, filters.search, filters.sort, filters.status]
  );

  useEffect(() => {
    setSearchInput(filters.search);
  }, [filters.search]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  useEffect(() => {
    fetchQueue({ reset: true });
  }, [fetchQueue]);

  const loadMore = useCallback(() => {
    if (queueLoading || loadMoreLoading) return;
    if (!queueMeta?.hasMore || !queueMeta?.nextCursor) return;
    fetchQueue({ reset: false, cursor: queueMeta.nextCursor });
  }, [fetchQueue, loadMoreLoading, queueLoading, queueMeta]);

  useEffect(() => {
    if (!loadMoreRef.current) return undefined;

    observerRef.current?.disconnect();

    observerRef.current = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          loadMore();
        }
      },
      {
        threshold: 0.1,
        rootMargin: '120px'
      }
    );

    observerRef.current.observe(loadMoreRef.current);

    return () => observerRef.current?.disconnect();
  }, [loadMore, queue.length]);

  const handleSearch = (event) => {
    event.preventDefault();
    updateQuery({
      search: searchInput.trim() || null
    });
  };

  const handleClear = () => {
    setSearchInput('');
    setQueue([]);
    setQueueMeta(emptyMeta);
    setSearchParams(new URLSearchParams());
  };

  const handleFilter = (key, value) => {
    setQueue([]);
    setQueueMeta(emptyMeta);
    updateQuery({
      [key]: value || null
    });
  };

  const statsCards = [
    {
      title: 'Total Applications',
      value: stats?.totalApplications || 0,
      tone: 'neutral',
      icon: FaClipboardList,
      caption: 'Complete queue size'
    },
    {
      title: 'Submitted',
      value: stats?.submittedApplications || 0,
      tone: 'blue',
      icon: FaInbox,
      caption: 'Newly received'
    },
    {
      title: 'Under Review',
      value: stats?.underReviewApplications || 0,
      tone: 'yellow',
      icon: FaHourglassHalf,
      caption: 'Needs officer action'
    },
    {
      title: 'Approved',
      value: stats?.approvedApplications || 0,
      tone: 'green',
      icon: FaCheckCircle,
      caption: 'Ready for next step'
    }
  ];

  return (
    <AdminLayout>
      <div className="gov-queue-page">
        <div className="gov-queue-header-card">
          <div>
            <h1>Application Queue</h1>
            <p>Review, verify and process Smart NID applications from a single administrative queue.</p>
          </div>
        </div>

        <div className="gov-queue-stats-grid">
          {statsCards.map((card) => {
            const Icon = card.icon;

            return (
              <div key={card.title} className={`gov-queue-stat-card ${card.tone}`}>
                <div className="gov-queue-stat-icon">
                  <Icon />
                </div>
                <div>
                  <p>{card.title}</p>
                  <h3>{statsLoading ? '...' : card.value}</h3>
                  <small>{card.caption}</small>
                </div>
              </div>
            );
          })}
        </div>

        <div className="gov-queue-toolbar-card">
          <form className="gov-queue-search-form" onSubmit={handleSearch}>
            <div className="gov-queue-search-box">
              <FaSearch className="gov-queue-field-icon" />
              <input
                type="text"
                placeholder="Search by application ID, name, phone, BRN or NID"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
              />
            </div>

            <button type="submit" className="gov-queue-btn primary">
              Search
            </button>

            <button type="button" className="gov-queue-btn secondary" onClick={handleClear}>
              Clear
            </button>
          </form>

          <div className="gov-queue-filter-row">
            <QueueDropdown
              label="Filter by application status"
              value={filters.status}
              options={STATUS_OPTIONS}
              onChange={(value) => handleFilter('status', value)}
            />

            <QueueDropdown
              label="Filter by application type"
              value={filters.applicationType}
              options={TYPE_OPTIONS}
              onChange={(value) => handleFilter('applicationType', value)}
            />

            <QueueDropdown
              label="Sort application queue"
              value={filters.sort}
              options={SORT_OPTIONS}
              onChange={(value) => handleFilter('sort', value)}
            />
          </div>
        </div>

        <div className="gov-queue-table-card">
          <div className="gov-queue-table-head">
            <div>
              <h3>Applications</h3>
              <p>
                {queueMeta?.hasMore ? `${queue.length}+ loaded` : `${queue.length} results`}
                {queueMeta?.totalMatching ? ` of ${queueMeta.totalMatching} matched` : ''}
              </p>
            </div>
          </div>

          {queueLoading ? (
            <div className="gov-queue-loader-wrap">
              <Loader size="medium" text="Loading applications..." />
            </div>
          ) : queue.length === 0 ? (
            <div className="gov-queue-empty-state">
              <h4>No applications found</h4>
              <p>Try changing the search or filters.</p>
            </div>
          ) : (
            <>
              <div className="gov-queue-table-wrap">
                <table className="gov-queue-table">
                  <thead>
                    <tr>
                      <th>Application</th>
                      <th>Applicant</th>
                      <th>Type</th>
                      <th>Status</th>
                      <th>Evidence</th>
                      <th>Submitted</th>
                      <th>Queue Age</th>
                      <th>Action</th>
                    </tr>
                  </thead>

                  <tbody>
                    {queue.map((item) => {
                      const evidenceCount = getEvidenceCount(item);

                      return (
                        <tr key={item._id}>
                          <td>
                            <div className="gov-queue-cell">
                              <strong>#{item.applicationId || item._id?.slice(-6)}</strong>
                              <small>{item.birthRegistrationNumber || 'No BRN'}</small>
                            </div>
                          </td>

                          <td>
                            <div className="gov-queue-cell">
                              <strong>{getApplicantName(item)}</strong>
                              <small>{maskPhone(getApplicantPhone(item))}</small>
                            </div>
                          </td>

                          <td>
                            <div className="gov-queue-pill-stack">
                              <span className="gov-pill neutral">
                                {formatStatus(item.applicationType || 'new')}
                              </span>
                              {isResubmission(item) ? (
                                <span className="gov-resubmission-flag">
                                  Resubmission
                                </span>
                              ) : null}
                            </div>
                          </td>

                          <td>
                            <span className={`gov-status ${getStatusTone(item.status)}`}>
                              {formatStatus(item.status)}
                            </span>
                          </td>

                          <td>
                            <div className="gov-queue-cell">
                              <strong>{evidenceCount}/{getEvidenceTotal(item)}</strong>
                              {getDocumentVerification(item)?.isVerified ? (
                                <small className="gov-queue-ocr-tag">Document information matched</small>
                              ) : (
                                <small>files uploaded</small>
                              )}
                            </div>
                          </td>

                          <td>
                            <div className="gov-queue-cell">
                              <strong>{formatDate(item.submittedAt || item.createdAt)}</strong>
                              <small>{formatDateTime(item.submittedAt || item.createdAt)}</small>
                            </div>
                          </td>

                          <td>
                            <span className="gov-pill neutral">
                              {getQueueAge(item.submittedAt, item.createdAt)}
                            </span>
                          </td>

                          <td>
                            <Link
                              to={`/admin/applications/review/${item._id}`}
                              className="gov-queue-review-btn"
                            >
                              Review
                            </Link>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="gov-queue-mobile-list">
                {queue.map((item) => {
                  const evidenceCount = getEvidenceCount(item);
                  const statusTone = getStatusTone(item.status);
                  const submittedAt = item.submittedAt || item.createdAt;

                  return (
                    <article key={item._id} className="gov-queue-mobile-card">
                      <div className="gov-queue-mobile-card-top">
                        <div>
                          <span className="gov-queue-mobile-label">Application</span>
                          <h4>#{item.applicationId || item._id?.slice(-6)}</h4>
                          <p>{item.birthRegistrationNumber || 'No BRN'}</p>
                          {isResubmission(item) ? (
                            <span className="gov-resubmission-flag mobile">
                              Previously rejected
                            </span>
                          ) : null}
                        </div>
                        <span className={`gov-status ${statusTone}`}>{formatStatus(item.status)}</span>
                      </div>

                      <div className="gov-queue-mobile-info-grid">
                        <div>
                          <span><FaUser /> Applicant</span>
                          <strong>{getApplicantName(item)}</strong>
                          <small>{maskPhone(getApplicantPhone(item))}</small>
                        </div>
                        <div>
                          <span><FaFileAlt /> Evidence</span>
                          <strong>{evidenceCount}/{getEvidenceTotal(item)} files</strong>
                          <small>
                            {getDocumentVerification(item)?.isVerified
                              ? 'Document information matched'
                              : formatStatus(item.applicationType || 'new')}
                          </small>
                        </div>
                        <div>
                          <span><FaClock /> Submitted</span>
                          <strong>{formatDate(submittedAt)}</strong>
                          <small>{formatDateTime(submittedAt)}</small>
                        </div>
                        <div>
                          <span><FaHourglassHalf /> Queue Age</span>
                          <strong>{getQueueAge(item.submittedAt, item.createdAt)}</strong>
                          <small>waiting time</small>
                        </div>
                      </div>

                      <Link
                        to={`/admin/applications/review/${item._id}`}
                        className="gov-queue-review-btn gov-queue-mobile-review-btn"
                      >
                        Review Application
                      </Link>
                    </article>
                  );
                })}
              </div>

              <div ref={loadMoreRef} className="gov-queue-load-anchor" />

              {loadMoreLoading ? (
                <div className="gov-queue-load-state">
                  <FaSpinner className="spin" />
                  <span>Loading more applications...</span>
                </div>
              ) : null}

              {queueMeta?.hasMore ? (
                <div className="gov-queue-load-more-wrap">
                  <button type="button" className="gov-queue-btn secondary" onClick={loadMore}>
                    Load More
                  </button>
                </div>
              ) : null}
            </>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
