import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import {
  FaCheckCircle,
  FaClipboardList,
  FaExchangeAlt,
  FaHourglassHalf,
  FaInbox,
  FaSearch,
  FaTimesCircle
} from 'react-icons/fa';
import api from '../api/axios';
import AdminLayout from './AdminLayout';
import Loader from '../common/Loader';
import '../styles/ApplicationReview.css';

const STATUS_OPTIONS = [
  { value: '', label: 'All Status' },
  { value: 'submitted', label: 'Submitted' },
  { value: 'under_review', label: 'Under Review' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' }
];

const formatStatus = (value = '') =>
  String(value || '')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (match) => match.toUpperCase());

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
  if (status === 'approved') return 'success';
  if (status === 'rejected') return 'danger';
  if (status === 'under_review') return 'warning';
  if (status === 'submitted') return 'info';
  return 'neutral';
};

const getApplicantName = (item) =>
  item?.requestedData?.fullNameEnglish || item?.applicant?.fullName || 'N/A';

const getVerificationImageCount = (item) =>
  Array.isArray(item?.documents?.verificationDocuments)
    ? item.documents.verificationDocuments.length
    : 0;

export default function CorrectionReview() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [stats, setStats] = useState(null);
  const [queue, setQueue] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchInput, setSearchInput] = useState(searchParams.get('search') || '');

  const filters = useMemo(
    () => ({
      search: searchParams.get('search') || '',
      status: searchParams.get('status') || ''
    }),
    [searchParams]
  );

  const updateQuery = useCallback(
    (updates) => {
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        Object.entries(updates).forEach(([key, value]) => {
          if (!value) next.delete(key);
          else next.set(key, value);
        });
        return next;
      });
    },
    [setSearchParams]
  );

  const fetchStats = useCallback(async () => {
    try {
      const response = await api.get('/admin/corrections/stats');
      setStats(response?.data?.data || null);
    } catch (error) {
      console.error(error);
    }
  }, []);

  const fetchQueue = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({ limit: '100' });
      if (filters.search) params.set('search', filters.search);
      if (filters.status) params.set('status', filters.status);

      const response = await api.get(`/admin/corrections/queue?${params.toString()}`);
      setQueue(response?.data?.data || []);
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Failed to load correction queue');
    } finally {
      setLoading(false);
    }
  }, [filters.search, filters.status]);

  useEffect(() => {
    setSearchInput(filters.search);
  }, [filters.search]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  useEffect(() => {
    fetchQueue();
  }, [fetchQueue]);

  const handleSearch = (event) => {
    event.preventDefault();
    updateQuery({ search: searchInput.trim() });
  };

  const statsCards = [
    {
      title: 'Total Corrections',
      value: stats?.totalCorrections || 0,
      tone: 'neutral',
      icon: FaClipboardList,
      caption: 'All correction requests'
    },
    {
      title: 'Submitted',
      value: stats?.submittedCorrections || 0,
      tone: 'blue',
      icon: FaInbox,
      caption: 'New requests'
    },
    {
      title: 'Under Review',
      value: stats?.underReviewCorrections || 0,
      tone: 'yellow',
      icon: FaHourglassHalf,
      caption: 'Needs admin decision'
    },
    {
      title: 'Approved',
      value: stats?.approvedCorrections || 0,
      tone: 'green',
      icon: FaCheckCircle,
      caption: 'Applied to NID data'
    }
  ];

  return (
    <AdminLayout>
      <div className="gov-queue-page">
        <div className="gov-queue-header-card">
          <div>
            <h1>Correction Requests</h1>
            <p>Review citizen correction requests with clear old vs new information comparison.</p>
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
                  <h3>{card.value}</h3>
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
                placeholder="Search by correction ID, base application, NID, name, phone or BRN"
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
              />
            </div>

            <button type="submit" className="gov-queue-btn primary">Search</button>
            <button
              type="button"
              className="gov-queue-btn secondary"
              onClick={() => setSearchParams(new URLSearchParams())}
            >
              Clear
            </button>
          </form>

          <div className="gov-queue-filter-row">
            {STATUS_OPTIONS.map((option) => (
              <button
                key={option.value || 'all'}
                type="button"
                className={`gov-queue-btn ${filters.status === option.value ? 'primary' : 'secondary'}`}
                onClick={() => updateQuery({ status: option.value })}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        <div className="gov-queue-table-card">
          <div className="gov-queue-table-head">
            <div>
              <h3>Corrections</h3>
              <p>{queue.length} requests loaded</p>
            </div>
          </div>

          {loading ? (
            <div className="gov-queue-loader-wrap">
              <Loader size="medium" text="Loading corrections..." />
            </div>
          ) : queue.length === 0 ? (
            <div className="gov-queue-empty-state">
              <h4>No correction requests found</h4>
              <p>Try changing the search or status filter.</p>
            </div>
          ) : (
            <div className="gov-queue-table-wrap">
              <table className="gov-queue-table">
                <thead>
                  <tr>
                    <th>Correction</th>
                    <th>Applicant</th>
                    <th>Status</th>
                    <th>Changes</th>
                    <th>Proof</th>
                    <th>Submitted</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {queue.map((item) => (
                    <tr key={item._id}>
                      <td>
                        <div className="gov-queue-cell">
                          <strong>#{item.correctionId}</strong>
                          <small>Base: {item.baseApplicationId || 'N/A'}</small>
                        </div>
                      </td>
                      <td>
                        <div className="gov-queue-cell">
                          <strong>{getApplicantName(item)}</strong>
                          <small>{item.requestedData?.phone || item.applicant?.phone || 'N/A'}</small>
                        </div>
                      </td>
                      <td>
                        <span className={`gov-status ${getStatusTone(item.status)}`}>
                          {formatStatus(item.status)}
                        </span>
                      </td>
                      <td>
                        <div className="gov-queue-cell">
                          <strong><FaExchangeAlt /> {item.changedFields?.length || 0} fields</strong>
                          <small>{item.changedFields?.[0]?.label || 'No field'} changed</small>
                        </div>
                      </td>
                      <td>
                        <div className="gov-queue-cell">
                          <strong>{getVerificationImageCount(item)}/4 docs</strong>
                          <small>
                            {item.photoChangeRequested
                              ? item.documents?.photograph
                                ? 'Photo change included'
                                : 'Photo requested, pending upload'
                              : 'No photo change'}
                          </small>
                        </div>
                      </td>
                      <td>{formatDateTime(item.submittedAt || item.createdAt)}</td>
                      <td>
                        <Link to={`/admin/corrections/review/${item._id}`} className="gov-queue-review-btn">
                          Review
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
