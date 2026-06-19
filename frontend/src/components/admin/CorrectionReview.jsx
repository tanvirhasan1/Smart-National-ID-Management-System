import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import {
  FaCheckCircle,
  FaClipboardList,
  FaExchangeAlt,
  FaEye,
  FaHourglassHalf,
  FaInbox,
  FaSearch,
  FaTimesCircle
} from 'react-icons/fa';
import api from '../api/axios';
import AdminLayout from './AdminLayout';
import Loader from '../common/Loader';
import '../styles/CorrectionReview.css';

const STATUS_OPTIONS = [
  { value: '', label: 'All Statuses' },
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

const getApplicantName = (item) => {
  const requestedData = item?.requestedData || {};
  const applicant = item?.applicant || {};

  return (
    requestedData.fullNameEnglish ||
    requestedData.fullNameBangla ||
    applicant.fullName ||
    applicant.name ||
    applicant.email ||
    'Unknown Citizen'
  );
};

const getApplicantContact = (item) => {
  const requestedData = item?.requestedData || {};
  const applicant = item?.applicant || {};

  return requestedData.phone || applicant.phone || applicant.email || 'No contact data';
};

const getVerificationImageCount = (item) =>
  Array.isArray(item?.documents?.verificationDocuments)
    ? item.documents.verificationDocuments.length
    : 0;

const getChangeLabel = (item) => {
  const changedFields = item?.changedFields || [];
  if (!changedFields.length) return 'No field listed';
  if (changedFields.length === 1) return changedFields[0]?.label || '1 field changed';
  return `${changedFields[0]?.label || 'Field'} + ${changedFields.length - 1} more`;
};

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

  const clearFilters = () => {
    setSearchInput('');
    setSearchParams(new URLSearchParams());
  };

  const statsCards = [
    {
      title: 'Total Corrections',
      value: stats?.totalCorrections || 0,
      icon: FaClipboardList,
      caption: 'All correction requests'
    },
    {
      title: 'Submitted',
      value: stats?.submittedCorrections || 0,
      icon: FaInbox,
      caption: 'New requests'
    },
    {
      title: 'Under Review',
      value: stats?.underReviewCorrections || 0,
      icon: FaHourglassHalf,
      caption: 'Needs admin decision'
    },
    {
      title: 'Approved',
      value: stats?.approvedCorrections || 0,
      icon: FaCheckCircle,
      caption: 'Applied to NID data'
    },
    {
      title: 'Rejected',
      value: stats?.rejectedCorrections || 0,
      icon: FaTimesCircle,
      caption: 'Closed requests'
    }
  ];

  return (
    <AdminLayout>
      <div className="admin-corrections-page">
        <div className="admin-corrections-page-header">
          <div>
            <h1>Correction Requests</h1>
            <p>Review citizen correction requests with clear old vs new information comparison.</p>
          </div>
        </div>

        <div className="admin-corrections-stats-grid">
          {statsCards.map((card) => {
            const Icon = card.icon;
            return (
              <div key={card.title} className="admin-corrections-stat">
                <Icon />
                <div>
                  <span>{card.title}</span>
                  <strong>{card.value}</strong>
                  <small>{card.caption}</small>
                </div>
              </div>
            );
          })}
        </div>

        <form className="admin-corrections-toolbar" onSubmit={handleSearch}>
          <label className="admin-corrections-search" aria-label="Search corrections">
            <FaSearch />
            <input
              type="text"
              placeholder="Search by correction ID, application, NID, name, phone or BRN"
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
            />
          </label>

          <div className="admin-corrections-filter-row">
            <label className="admin-corrections-filter-control">
              Status
              <select
                value={filters.status}
                onChange={(event) => updateQuery({ status: event.target.value })}
              >
                {STATUS_OPTIONS.map((option) => (
                  <option key={option.value || 'all'} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <button type="submit" className="admin-corrections-primary-button">
              Search
            </button>
            <button type="button" className="admin-corrections-secondary-button" onClick={clearFilters}>
              Clear Filters
            </button>
          </div>
        </form>

        <section className="admin-corrections-directory">
          <div className="admin-corrections-directory-header">
            <h2>Correction Queue</h2>
            <p>{queue.length} correction requests loaded</p>
          </div>

          {loading ? (
            <div className="admin-corrections-message">
              <Loader size="medium" text="Loading corrections..." />
            </div>
          ) : queue.length === 0 ? (
            <div className="admin-corrections-message">
              <div>
                <strong>No correction requests found</strong>
                <p>Try changing the search or status filter.</p>
              </div>
            </div>
          ) : (
            <div className="admin-corrections-table-scroll">
              <div className="admin-corrections-table" role="table" aria-label="Correction requests">
                <div className="admin-corrections-table-head" role="row">
                  <span>Correction</span>
                  <span>Applicant</span>
                  <span>Status</span>
                  <span>Changes</span>
                  <span>Proof</span>
                  <span>Submitted</span>
                  <span>Action</span>
                </div>

                {queue.map((item) => (
                  <div className="admin-corrections-table-row" role="row" key={item._id}>
                    <div className="admin-corrections-primary-cell">
                      <strong>#{item.correctionId}</strong>
                      <span>Base: {item.baseApplicationId || 'N/A'}</span>
                    </div>

                    <div className="admin-corrections-primary-cell">
                      <strong>{getApplicantName(item)}</strong>
                      <span>{getApplicantContact(item)}</span>
                    </div>

                    <span className={`admin-corrections-status-chip ${getStatusTone(item.status)}`}>
                      {formatStatus(item.status)}
                    </span>

                    <div className="admin-corrections-primary-cell compact">
                      <strong><FaExchangeAlt /> {item.changedFields?.length || 0} fields</strong>
                      <span>{getChangeLabel(item)}</span>
                    </div>

                    <div className="admin-corrections-primary-cell compact">
                      <strong>{getVerificationImageCount(item)}/3 proof files</strong>
                      <span>
                        {item.photoChangeRequested
                          ? item.documents?.photograph
                            ? 'Photo change included'
                            : 'Photo requested'
                          : 'No photo change'}
                      </span>
                    </div>

                    <span>{formatDateTime(item.submittedAt || item.createdAt)}</span>

                    <Link to={`/admin/corrections/review/${item._id}`} className="admin-corrections-view-button">
                      <FaEye /> Review
                    </Link>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>
      </div>
    </AdminLayout>
  );
}
