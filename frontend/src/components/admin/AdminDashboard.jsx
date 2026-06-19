import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  FaBuilding,
  FaCalendarAlt,
  FaChartBar,
  FaCheckCircle,
  FaClock,
  FaExclamationTriangle,
  FaFileAlt,
  FaHistory,
  FaPrint,
  FaSyncAlt,
  FaTicketAlt,
  FaTimesCircle,
  FaTruck,
  FaUserShield,
  FaUsers
} from 'react-icons/fa';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';
import AdminLayout from './AdminLayout';
import Loader from '../common/Loader';
import { formatDate, formatDateTime, formatStatus } from '../utils/helpers';
import { inferMainAdmin } from '../utils/roles';
import '../styles/AdminDashboard.css';


const buildFallbackAccess = (user) => {
  const viewerRole = user?.role || 'admin';
  const isMainAdmin = inferMainAdmin(user);

  return {
    viewerRole,
    isMainAdmin,
    canManageUsers: viewerRole === 'admin' && isMainAdmin,
    canManageApplications: viewerRole === 'admin',
    canManageAppointments: viewerRole === 'admin',
    canManagePrinting: viewerRole === 'admin',
    canManageDelivery: viewerRole === 'admin',
    canManageSupport: ['admin', 'support_staff'].includes(viewerRole),
    canViewAudit: ['admin', 'system_supervisor'].includes(viewerRole),
    canViewAnalytics: ['admin', 'system_supervisor'].includes(viewerRole)
  };
};

const normalizeSummaryData = (summaryData = {}, user = null) => {
  const access = summaryData?.access || buildFallbackAccess(user);

  const applications = {
    total: summaryData?.applications?.total || 0,
    submitted: summaryData?.applications?.submitted || 0,
    underReview: summaryData?.applications?.underReview || 0,
    approved: summaryData?.applications?.approved || 0,
    rejected: summaryData?.applications?.rejected || 0,
    printed: summaryData?.applications?.printed || 0,
    delivered: summaryData?.applications?.delivered || 0,
    cancelled: summaryData?.applications?.cancelled || 0,
    newToday: summaryData?.applications?.newToday || 0,
    rejectedToday: summaryData?.applications?.rejectedToday || 0
  };

  const appointments = {
    total: summaryData?.appointments?.total || 0,
    booked: summaryData?.appointments?.booked || 0,
    completed: summaryData?.appointments?.completed || 0,
    cancelled: summaryData?.appointments?.cancelled || 0,
    today: summaryData?.appointments?.today || 0
  };

  const supportTickets = {
    total: summaryData?.supportTickets?.total || 0,
    open: summaryData?.supportTickets?.open || 0,
    inProgress: summaryData?.supportTickets?.inProgress || 0,
    resolved: summaryData?.supportTickets?.resolved || 0,
    closed: summaryData?.supportTickets?.closed || 0,
    highPriority: summaryData?.supportTickets?.highPriority || 0,
    urgent: summaryData?.supportTickets?.urgent || 0,
    unassigned: summaryData?.supportTickets?.unassigned || 0,
    newToday: summaryData?.supportTickets?.newToday || 0
  };

  const centers = {
    total: summaryData?.centers?.total || 0,
    active: summaryData?.centers?.active || 0,
    inactive: summaryData?.centers?.inactive || 0
  };

  const users = {
    total: summaryData?.users?.total || 0,
    citizens: summaryData?.users?.citizens || 0,
    internal: summaryData?.users?.internal || 0,
    admins: summaryData?.users?.admins || 0,
    systemSupervisors: summaryData?.users?.systemSupervisors || 0,
    supportStaff: summaryData?.users?.supportStaff || 0,
    blocked: summaryData?.users?.blocked || 0,
    pending: summaryData?.users?.pending || 0
  };

  const queues = {
    review:
      summaryData?.queues?.review ??
      (applications.submitted + applications.underReview),
    printing: summaryData?.queues?.printing ?? applications.approved,
    delivery: summaryData?.queues?.delivery ?? applications.printed
  };

  const alerts = {
    urgentSupportTickets:
      summaryData?.alerts?.urgentSupportTickets || supportTickets.urgent || 0,
    unassignedSupportTickets:
      summaryData?.alerts?.unassignedSupportTickets ||
      supportTickets.unassigned ||
      0,
    applicationsRejectedToday:
      summaryData?.alerts?.applicationsRejectedToday ||
      applications.rejectedToday ||
      0,
    applicationsSubmittedToday:
      summaryData?.alerts?.applicationsSubmittedToday ||
      applications.newToday ||
      0,
    appointmentsToday:
      summaryData?.alerts?.appointmentsToday || appointments.today || 0
  };

  const governance = {
    auditLogsLast24Hours: summaryData?.governance?.auditLogsLast24Hours || 0
  };

  const roleFocus =
    summaryData?.roleFocus ||
    (() => {
      if (access.viewerRole === 'support_staff') {
        return {
          primaryModule: 'support',
          headline: 'Support operations',
          priorityItems: [
            {
              key: 'open_tickets',
              label: 'Open tickets',
              value: supportTickets.open
            },
            {
              key: 'in_progress_tickets',
              label: 'In progress tickets',
              value: supportTickets.inProgress
            },
            {
              key: 'urgent_tickets',
              label: 'Urgent tickets',
              value: supportTickets.urgent
            },
            {
              key: 'unassigned_tickets',
              label: 'Unassigned tickets',
              value: supportTickets.unassigned
            }
          ]
        };
      }

      if (access.viewerRole === 'system_supervisor') {
        return {
          primaryModule: 'supervision',
          headline: 'System supervision',
          priorityItems: [
            { key: 'review_queue', label: 'Review queue', value: queues.review },
            {
              key: 'delivery_queue',
              label: 'Delivery queue',
              value: queues.delivery
            },
            {
              key: 'urgent_tickets',
              label: 'Urgent tickets',
              value: supportTickets.urgent
            },
            {
              key: 'audit_last_24h',
              label: 'Audit events (24h)',
              value: governance.auditLogsLast24Hours
            }
          ]
        };
      }

      return {
        primaryModule: access.isMainAdmin ? 'main_admin' : 'admin_operations',
        headline: access.isMainAdmin
          ? 'Super admin control'
          : 'Admin operations',
        priorityItems: [
          { key: 'review_queue', label: 'Review queue', value: queues.review },
          {
            key: 'printing_queue',
            label: 'Printing queue',
            value: queues.printing
          },
          {
            key: 'delivery_queue',
            label: 'Delivery queue',
            value: queues.delivery
          },
          {
            key: 'open_tickets',
            label: 'Open tickets',
            value: supportTickets.open
          }
        ]
      };
    })();

  const meta = {
    generatedAt:
      summaryData?.meta?.generatedAt || new Date().toISOString(),
    lastUpdatedAt:
      summaryData?.meta?.lastUpdatedAt ||
      summaryData?.meta?.generatedAt ||
      new Date().toISOString()
  };

  return {
    access,
    applications,
    appointments,
    supportTickets,
    centers,
    users,
    queues,
    alerts,
    governance,
    roleFocus,
    meta
  };
};

const getDashboardTitle = (role, isMainAdmin) => {
  if (role === 'support_staff') return 'Support Dashboard';
  if (role === 'system_supervisor') return 'Supervisor Dashboard';
  if (role === 'admin' && isMainAdmin) return 'Super Admin Dashboard';
  return 'Admin Dashboard';
};

const getDashboardSubtitle = (summary) => {
  const role = summary?.access?.viewerRole;

  if (role === 'support_staff') {
    return 'Live support desk overview for citizen tickets and response workload';
  }

  if (role === 'system_supervisor') {
    return 'Read-only supervision overview for operations, queues and audit activity';
  }

  if (summary?.access?.isMainAdmin) {
    return 'Full operational overview for Smart NID administration';
  }

  return 'Live operational overview for Smart NID administration';
};

const getDashboardRoleLabel = (summary) => {
  if (summary?.access?.viewerRole === 'admin' && summary?.access?.isMainAdmin) {
    return 'Super Admin';
  }

  return formatStatus(summary?.access?.viewerRole || 'admin');
};

const getApplicantName = (application = {}) => {
  const candidates = [
    application.fullNameEnglish,
    application.fullNameBangla,
    application.applicant?.fullName,
    application.applicant?.email,
    application.email,
    application.phone
  ];

  const value = candidates.find((item) => String(item || '').trim());

  return value ? String(value).trim() : 'Unknown Citizen';
};

const getApplicationReference = (application = {}) =>
  application.applicationNumber ||
  application.applicationId ||
  (application._id ? `#${application._id.slice(-6)}` : 'Application');

const getSnapshotItems = (summary) => {
  const items = [
    {
      key: 'today-applications',
      label: 'New applications today',
      value: summary.applications.newToday
    },
    {
      key: 'today-appointments',
      label: 'Appointments today',
      value: summary.appointments.today
    },
    {
      key: 'open-tickets',
      label: 'Open support tickets',
      value: summary.supportTickets.open
    },
    {
      key: 'active-centers',
      label: 'Active centers',
      value: `${summary.centers.active}/${summary.centers.total}`
    }
  ];

  if (summary.access.canManageUsers) {
    items.push({
      key: 'internal-users',
      label: 'Internal users',
      value: summary.users.internal
    });
  }

  if (summary.access.canViewAudit) {
    items.push({
      key: 'audit-24h',
      label: 'Audit events last 24h',
      value: summary.governance.auditLogsLast24Hours
    });
  }

  return items;
};

const getPrimaryCards = (summary) => {
  const { access, applications, supportTickets, queues, users, governance, centers, alerts } =
    summary;

  if (access.viewerRole === 'support_staff') {
    return [
      {
        key: 'open',
        title: 'Open Tickets',
        value: supportTickets.open,
        subtitle: `${supportTickets.newToday} new today`,
        icon: FaTicketAlt,
        theme: 'orange',
        to: '/admin/support'
      },
      {
        key: 'progress',
        title: 'In Progress',
        value: supportTickets.inProgress,
        subtitle: 'Actively handled tickets',
        icon: FaClock,
        theme: 'blue',
        to: '/admin/support'
      },
      {
        key: 'urgent',
        title: 'Urgent Tickets',
        value: supportTickets.urgent,
        subtitle: 'Need immediate attention',
        icon: FaExclamationTriangle,
        theme: 'red',
        to: '/admin/support'
      },
      {
        key: 'unassigned',
        title: 'Unassigned Tickets',
        value: supportTickets.unassigned,
        subtitle: 'Assign these first',
        icon: FaUserShield,
        theme: 'yellow',
        to: '/admin/support'
      },
      {
        key: 'resolved',
        title: 'Resolved Tickets',
        value: supportTickets.resolved,
        subtitle: 'Resolved cases',
        icon: FaCheckCircle,
        theme: 'green',
        to: '/admin/support'
      },
      {
        key: 'high',
        title: 'High Priority',
        value: supportTickets.highPriority,
        subtitle: 'High-risk requests',
        icon: FaHistory,
        theme: 'purple',
        to: '/admin/support'
      }
    ];
  }

  if (access.viewerRole === 'system_supervisor') {
    return [
      {
        key: 'review',
        title: 'Review Queue',
        value: queues.review,
        subtitle: `${alerts.applicationsSubmittedToday} submitted today`,
        icon: FaFileAlt,
        theme: 'yellow',
        to: null
      },
      {
        key: 'delivery',
        title: 'Delivery Queue',
        value: queues.delivery,
        subtitle: 'Printed cards awaiting movement',
        icon: FaTruck,
        theme: 'indigo',
        to: null
      },
      {
        key: 'audit',
        title: 'Audit Events',
        value: governance.auditLogsLast24Hours,
        subtitle: 'Last 24 hours',
        icon: FaHistory,
        theme: 'teal',
        to: '/admin/audit-logs'
      },
      {
        key: 'rejected',
        title: 'Rejected Today',
        value: alerts.applicationsRejectedToday,
        subtitle: 'Track unusual spikes',
        icon: FaTimesCircle,
        theme: 'red',
        to: null
      },
      {
        key: 'urgent',
        title: 'Urgent Tickets',
        value: alerts.urgentSupportTickets,
        subtitle: 'Support escalation signal',
        icon: FaTicketAlt,
        theme: 'orange',
        to: '/admin/audit-logs'
      },
      {
        key: 'centers',
        title: 'Active Centers',
        value: centers.active,
        subtitle: `${centers.inactive} inactive`,
        icon: FaBuilding,
        theme: 'green',
        to: null
      }
    ];
  }

  return [
    {
      key: 'review',
      title: 'Pending Review',
      value: applications.submitted,
      subtitle: `${queues.review} in total review queue`,
      icon: FaClock,
      theme: 'yellow',
      to: '/admin/applications?status=submitted'
    },
    {
      key: 'underReview',
      title: 'Under Review',
      value: applications.underReview,
      subtitle: 'Applications being processed',
      icon: FaFileAlt,
      theme: 'blue',
      to: '/admin/applications?status=under_review'
    },
    {
      key: 'printing',
      title: 'Printing Queue',
      value: queues.printing,
      subtitle: 'Approved cards ready next',
      icon: FaPrint,
      theme: 'purple',
      to: '/admin/printing'
    },
    {
      key: 'delivery',
      title: 'Delivery Queue',
      value: queues.delivery,
      subtitle: 'Printed cards awaiting dispatch',
      icon: FaTruck,
      theme: 'indigo',
      to: '/admin/delivery'
    },
    {
      key: 'tickets',
      title: 'Open Tickets',
      value: supportTickets.open,
      subtitle: `${supportTickets.unassigned} unassigned`,
      icon: FaTicketAlt,
      theme: 'orange',
      to: '/admin/support'
    },
    {
      key: 'users',
      title: access.canManageUsers ? 'Registered Users' : 'Audit Events',
      value: access.canManageUsers ? users.total : governance.auditLogsLast24Hours,
      subtitle: access.canManageUsers
        ? `${users.internal} internal users`
        : 'Last 24 hours',
      icon: access.canManageUsers ? FaUsers : FaHistory,
      theme: access.canManageUsers ? 'teal' : 'green',
      to: access.canManageUsers ? '/admin/users' : '/admin/audit-logs'
    }
  ];
};

const getQuickActions = (summary) => {
  const { access, applications, supportTickets, queues, governance, users } =
    summary;

  const items = [];

  if (access.canManageApplications) {
    items.push({
      key: 'applications',
      title: 'Review Applications',
      description: `${applications.submitted} pending review`,
      to: '/admin/applications?status=submitted',
      icon: FaFileAlt,
      theme: 'blue'
    });
  }

  if (access.canManageAppointments) {
    items.push({
      key: 'appointments',
      title: 'Manage Appointments',
      description: 'View today’s booking flow',
      to: '/admin/appointments',
      icon: FaCalendarAlt,
      theme: 'green'
    });
  }

  if (access.canManagePrinting) {
    items.push({
      key: 'printing',
      title: 'Printing Queue',
      description: `${queues.printing} cards waiting`,
      to: '/admin/printing',
      icon: FaPrint,
      theme: 'purple'
    });
  }

  if (access.canManageDelivery) {
    items.push({
      key: 'delivery',
      title: 'Delivery Control',
      description: `${queues.delivery} pending dispatch`,
      to: '/admin/delivery',
      icon: FaTruck,
      theme: 'indigo'
    });
  }

  if (access.canManageSupport) {
    items.push({
      key: 'support',
      title: 'Support Tickets',
      description: `${supportTickets.open} open · ${supportTickets.unassigned} unassigned`,
      to: '/admin/support',
      icon: FaTicketAlt,
      theme: 'orange'
    });
  }

  if (access.canManageUsers) {
    items.push({
      key: 'users',
      title: 'Internal Users',
      description: `${users.internal} staff accounts`,
      to: '/admin/users',
      icon: FaUsers,
      theme: 'teal'
    });
  }

  if (access.canViewAudit) {
    items.push({
      key: 'audit',
      title: 'Audit Logs',
      description: `${governance.auditLogsLast24Hours} events in last 24h`,
      to: '/admin/audit-logs',
      icon: FaHistory,
      theme: 'red'
    });
  }

  return items;
};

const getDistributionConfig = (summary) => {
  if (summary.access.viewerRole === 'support_staff') {
    return {
      title: 'Ticket Status Distribution',
      data: [
        { name: 'Open', value: summary.supportTickets.open, color: '#F97316' },
        {
          name: 'In Progress',
          value: summary.supportTickets.inProgress,
          color: '#3B82F6'
        },
        {
          name: 'Resolved',
          value: summary.supportTickets.resolved,
          color: '#10B981'
        },
        { name: 'Closed', value: summary.supportTickets.closed, color: '#64748B' }
      ]
    };
  }

  return {
    title: 'Application Status Distribution',
    data: [
      { name: 'Submitted', value: summary.applications.submitted, color: '#3B82F6' },
      {
        name: 'Under Review',
        value: summary.applications.underReview,
        color: '#F59E0B'
      },
      { name: 'Approved', value: summary.applications.approved, color: '#10B981' },
      { name: 'Rejected', value: summary.applications.rejected, color: '#EF4444' }
    ]
  };
};

const getOperationalLoadData = (summary) => {
  if (summary.access.viewerRole === 'support_staff') {
    return [
      { name: 'Open', total: summary.supportTickets.open },
      { name: 'In Progress', total: summary.supportTickets.inProgress },
      { name: 'Urgent', total: summary.supportTickets.urgent },
      { name: 'Unassigned', total: summary.supportTickets.unassigned },
      { name: 'Resolved', total: summary.supportTickets.resolved }
    ];
  }

  return [
    { name: 'Review', total: summary.queues.review },
    { name: 'Printing', total: summary.queues.printing },
    { name: 'Delivery', total: summary.queues.delivery },
    { name: 'Tickets', total: summary.supportTickets.open },
    { name: 'Today', total: summary.appointments.today }
  ];
};

const getPriorityAlerts = (summary) => {
  const { access, alerts } = summary;
  const alertItems = [];

  if (access.canManageApplications) {
    alertItems.push({
      key: 'submittedToday',
      label: 'Submitted today',
      value: alerts.applicationsSubmittedToday,
      to: '/admin/applications'
    });

    alertItems.push({
      key: 'rejectedToday',
      label: 'Rejected today',
      value: alerts.applicationsRejectedToday,
      to: '/admin/applications?status=rejected'
    });
  }

  if (access.canManageSupport) {
    alertItems.push({
      key: 'urgentTickets',
      label: 'Urgent tickets',
      value: alerts.urgentSupportTickets,
      to: '/admin/support'
    });

    alertItems.push({
      key: 'unassignedTickets',
      label: 'Unassigned tickets',
      value: alerts.unassignedSupportTickets,
      to: '/admin/support'
    });
  }

  if (access.canManageAppointments) {
    alertItems.push({
      key: 'appointmentsToday',
      label: 'Appointments today',
      value: alerts.appointmentsToday,
      to: '/admin/appointments'
    });
  }

  return alertItems.filter((item) => item.value > 0);
};

const DashboardStatCard = ({ item }) => {
  const Icon = item.icon;

  const content = (
    <>
      <div className={`dashboard-stat-icon dashboard-theme-${item.theme}`}>
        <Icon />
      </div>

      <div className="dashboard-stat-content">
        <span className="dashboard-stat-value">{item.value}</span>
        <span className="dashboard-stat-title">{item.title}</span>
        <span className="dashboard-stat-subtitle">{item.subtitle}</span>
      </div>
    </>
  );

  if (item.to) {
    return (
      <Link to={item.to} className="dashboard-stat-card dashboard-stat-link">
        {content}
      </Link>
    );
  }

  return <div className="dashboard-stat-card">{content}</div>;
};

const AdminDashboard = () => {
  const { user } = useAuth();

  const [summaryData, setSummaryData] = useState(null);
  const [recentApplications, setRecentApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const summary = useMemo(
    () => normalizeSummaryData(summaryData || {}, user),
    [summaryData, user]
  );

  const primaryCards = useMemo(() => getPrimaryCards(summary), [summary]);
  const quickActions = useMemo(() => getQuickActions(summary), [summary]);
  const distributionConfig = useMemo(
    () => getDistributionConfig(summary),
    [summary]
  );
  const operationalLoadData = useMemo(
    () => getOperationalLoadData(summary),
    [summary]
  );
  const priorityAlerts = useMemo(() => getPriorityAlerts(summary), [summary]);

  const fetchDashboardData = async (silent = false) => {
    try {
      if (silent) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setError('');

      const summaryResponse = await api.get('/admin/dashboard/summary');
      setSummaryData(summaryResponse.data?.data || {});

      if (user?.role === 'admin') {
        try {
          const appsResponse = await api.get(
            '/admin/applications?limit=5&sort=-createdAt'
          );
          setRecentApplications(appsResponse.data?.data || []);
        } catch (appsError) {
          console.error('Error fetching recent applications:', appsError);
          setRecentApplications([]);
        }
      } else {
        setRecentApplications([]);
      }
    } catch (fetchError) {
      console.error('Error fetching dashboard data:', fetchError);
      setError(
        fetchError?.response?.data?.message ||
          'Unable to load dashboard data right now.'
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (user?.role) {
      fetchDashboardData();
    }
  }, [user?.role]);

  if (loading) {
    return (
      <AdminLayout>
        <div className="admin-dashboard-loading">
          <Loader size="large" text="Loading dashboard..." />
        </div>
      </AdminLayout>
    );
  }

  const dashboardTitle = getDashboardTitle(
    summary.access.viewerRole,
    summary.access.isMainAdmin
  );

  const showRecentApplications = summary.access.canManageApplications;

  return (
    <AdminLayout>
      <div className="admin-dashboard-page">
        <div className="dashboard-page-header">
          <div className="dashboard-page-header-left">
            <div className="dashboard-page-title-row">
              <h1>{dashboardTitle}</h1>
              <span className="dashboard-role-badge">
                {getDashboardRoleLabel(summary)}
              </span>
            </div>

            <p className="dashboard-page-subtitle">
              {getDashboardSubtitle(summary)}
            </p>
          </div>

          <div className="dashboard-page-header-right">
            <span className="dashboard-last-updated">
              Last updated: {formatDateTime(summary.meta.lastUpdatedAt)}
            </span>

            <button
              type="button"
              className="dashboard-refresh-button"
              onClick={() => fetchDashboardData(true)}
              disabled={refreshing}
            >
              <FaSyncAlt className={refreshing ? 'spin' : ''} />
              {refreshing ? 'Refreshing...' : 'Refresh'}
            </button>
          </div>
        </div>

        {error ? (
          <div className="dashboard-error-box">
            <FaExclamationTriangle />
            <span>{error}</span>
          </div>
        ) : null}

        <div className="dashboard-priority-strip">
          <div className="dashboard-priority-strip-header">
            <FaExclamationTriangle />
            <span>Action Required</span>
          </div>

          <div className="dashboard-priority-chip-list">
            {priorityAlerts.length === 0 ? (
              <span className="dashboard-priority-empty">
                No urgent alert right now
              </span>
            ) : (
              priorityAlerts.map((item) => (
                <Link
                  key={item.key}
                  to={item.to}
                  className="dashboard-priority-chip"
                >
                  <span className="dashboard-priority-chip-label">
                    {item.label}
                  </span>
                  <span className="dashboard-priority-chip-value">
                    {item.value}
                  </span>
                </Link>
              ))
            )}
          </div>
        </div>

        <div className="dashboard-stat-grid">
          {primaryCards.map((item) => (
            <DashboardStatCard key={item.key} item={item} />
          ))}
        </div>

        <div className="dashboard-chart-grid">
          <div className="dashboard-panel-card dashboard-analytics-card dashboard-distribution-card">
            <div className="dashboard-panel-header">
              <h3>{distributionConfig.title}</h3>
              <span className="dashboard-panel-meta">
                Live summary breakdown
              </span>
            </div>

            <div className="dashboard-panel-body dashboard-analytics-body">
              {distributionConfig.data.every((item) => item.value === 0) ? (
                <div className="dashboard-no-data">
                  No distribution data available yet
                </div>
              ) : (
                <div className="dashboard-distribution-layout">
                  <div className="dashboard-chart-wrap dashboard-distribution-chart">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={distributionConfig.data}
                          cx="50%"
                          cy="50%"
                          innerRadius="45%"
                          outerRadius="68%"
                          paddingAngle={4}
                          dataKey="value"
                        >
                          {distributionConfig.data.map((entry) => (
                            <Cell
                              key={entry.name}
                              fill={entry.color}
                            />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>

                  <div className="dashboard-legend-list dashboard-distribution-legend">
                    {distributionConfig.data.map((item) => (
                      <div key={item.name} className="dashboard-legend-item">
                        <span
                          className="dashboard-legend-color"
                          style={{ backgroundColor: item.color }}
                        />
                        <span className="dashboard-legend-label">
                          {item.name}
                        </span>
                        <span className="dashboard-legend-value">
                          {item.value}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="dashboard-panel-card dashboard-analytics-card dashboard-load-card">
            <div className="dashboard-panel-header">
              <h3>Operational Load</h3>
              <span className="dashboard-panel-meta">
                Queue and workload snapshot
              </span>
            </div>

            <div className="dashboard-panel-body dashboard-analytics-body dashboard-load-body">
              {operationalLoadData.every((item) => item.total === 0) ? (
                <div className="dashboard-no-data">
                  No operational load data available yet
                </div>
              ) : (
                <div className="dashboard-chart-wrap dashboard-operational-chart">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={operationalLoadData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                      <XAxis dataKey="name" stroke="#6B7280" />
                      <YAxis stroke="#6B7280" allowDecimals={false} />
                      <Tooltip />
                      <Bar dataKey="total" fill="#16A34A" radius={[8, 8, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="dashboard-bottom-stack">
          <div className="dashboard-panel-card dashboard-recent-panel">
            <div className="dashboard-panel-header">
              <h3>
                {showRecentApplications
                  ? 'Recent Applications'
                  : 'Role Priority Items'}
              </h3>

              {showRecentApplications ? (
                <Link to="/admin/applications" className="dashboard-view-link">
                  View all
                </Link>
              ) : null}
            </div>

            <div className="dashboard-panel-body">
              {showRecentApplications ? (
                recentApplications.length === 0 ? (
                  <div className="dashboard-no-data dashboard-no-data-compact">
                    No recent applications found in the latest load
                  </div>
                ) : (
                  <div className="dashboard-table-wrap">
                    <table className="dashboard-mini-table">
                      <thead>
                        <tr>
                          <th>Application</th>
                          <th>Applicant</th>
                          <th>Status</th>
                          <th>Date</th>
                        </tr>
                      </thead>
                      <tbody>
                        {recentApplications.map((app) => (
                          <tr key={app._id}>
                            <td>
                              <Link
                                to={`/admin/applications/review/${app._id}`}
                                className="dashboard-table-link"
                              >
                                {getApplicationReference(app)}
                              </Link>
                            </td>
                            <td>{getApplicantName(app)}</td>
                            <td>
                              <span className={`dashboard-status-badge ${app.status}`}>
                                {formatStatus(app.status)}
                              </span>
                            </td>
                            <td>{formatDate(app.createdAt)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )
              ) : (
                <div className="dashboard-focus-list dashboard-focus-grid">
                  {summary.roleFocus.priorityItems?.length ? (
                    summary.roleFocus.priorityItems.map((item) => (
                      <div key={item.key} className="dashboard-focus-item">
                        <div>
                          <h4>{item.label}</h4>
                          <p>Operational priority item</p>
                        </div>
                        <span>{item.value}</span>
                      </div>
                    ))
                  ) : (
                    <div className="dashboard-no-data dashboard-no-data-compact">
                      No role priority items available yet
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="dashboard-action-snapshot-grid">
            <div className="dashboard-panel-card dashboard-quick-panel">
              <div className="dashboard-panel-header">
                <h3>Quick Actions</h3>
                <span className="dashboard-panel-meta">Jump to common admin tasks</span>
              </div>

              <div className="dashboard-panel-body">
                <div className="dashboard-quick-action-grid">
                  {quickActions.map((action) => {
                    const Icon = action.icon;

                    return (
                      <Link
                        key={action.key}
                        to={action.to}
                        className="dashboard-quick-action-card"
                      >
                        <div
                          className={`dashboard-quick-action-icon dashboard-theme-${action.theme}`}
                        >
                          <Icon />
                        </div>

                        <div className="dashboard-quick-action-text">
                          <h4>{action.title}</h4>
                          <p>{action.description}</p>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="dashboard-panel-card dashboard-snapshot-panel">
              <div className="dashboard-panel-header">
                <h3>Today’s Snapshot</h3>
                <span className="dashboard-panel-meta">Useful operational numbers</span>
              </div>

              <div className="dashboard-panel-body">
                <div className="dashboard-snapshot-list dashboard-snapshot-grid">
                  {getSnapshotItems(summary).map((item) => (
                    <div key={item.key} className="dashboard-snapshot-item">
                      <span>{item.label}</span>
                      <strong>{item.value}</strong>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminDashboard;