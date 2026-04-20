import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';
import {
  FaUsers,
  FaFileAlt,
  FaCheckCircle,
  FaClock,
  FaTimesCircle,
  FaPrint,
  FaTruck,
  FaTicketAlt,
  FaCalendarAlt,
  FaChartLine,
  FaArrowUp,
  FaArrowDown
} from 'react-icons/fa';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar
} from 'recharts';
import api from '../api/axios';
import AdminLayout from './AdminLayout';
import Loader from '../common/Loader';
import { formatDate } from '../utils/helpers';
import '../styles/AdminDashboard.css';

// Convert backend summary response into a flat object for easier UI use.
const flattenDashboardStats = (summaryData = {}) => ({
  totalApplications: summaryData?.applications?.total || 0,
  submitted: summaryData?.applications?.submitted || 0,
  underReview: summaryData?.applications?.underReview || 0,
  approved: summaryData?.applications?.approved || 0,
  rejected: summaryData?.applications?.rejected || 0,

  totalAppointments: summaryData?.appointments?.total || 0,
  bookedAppointments: summaryData?.appointments?.booked || 0,
  completedAppointments: summaryData?.appointments?.completed || 0,
  cancelledAppointments: summaryData?.appointments?.cancelled || 0,

  totalSupportTickets: summaryData?.supportTickets?.total || 0,
  openTickets: summaryData?.supportTickets?.open || 0,
  inProgressTickets: summaryData?.supportTickets?.inProgress || 0,
  resolvedTickets: summaryData?.supportTickets?.resolved || 0,

  totalCenters: summaryData?.centers?.total || 0,
  activeCenters: summaryData?.centers?.active || 0,
  inactiveCenters: summaryData?.centers?.inactive || 0,

  totalUsers: summaryData?.users?.total || 0,

  // Derived shortcut values for dashboard cards
  pending: summaryData?.applications?.submitted || 0,
  printing: summaryData?.applications?.approved || 0,
  dispatched: summaryData?.appointments?.completed || 0
});

const AdminDashboard = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [recentApplications, setRecentApplications] = useState([]);
  const [loading, setLoading] = useState(true);

  // Load dashboard summary.
  // Only full admin loads recent applications list.
  const fetchDashboardData = async () => {
    try {
      setLoading(true);

      const statsResponse = await api.get('/admin/dashboard/summary');
      const summaryData = statsResponse.data?.data || {};
      const flatStats = flattenDashboardStats(summaryData);

      setStats(flatStats);

      if (user?.role === 'admin') {
        const appsResponse = await api.get('/admin/applications?limit=5&sort=-createdAt');
        setRecentApplications(appsResponse.data?.data || []);
      } else {
        setRecentApplications([]);
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.role) {
      fetchDashboardData();
    }
  }, [user?.role]);

  // Current backend summary endpoint does not return monthly trend data.
  // Keep this chart as placeholder until a dedicated trend API is added.
  const applicationTrendData = [
    { name: 'Jan', applications: 120, approved: 100 },
    { name: 'Feb', applications: 150, approved: 130 },
    { name: 'Mar', applications: 180, approved: 160 },
    { name: 'Apr', applications: 200, approved: 175 },
    { name: 'May', applications: 250, approved: 220 },
    { name: 'Jun', applications: 280, approved: 250 }
  ];

  // Pie chart uses live backend summary data.
  const statusDistribution = [
    { name: 'Submitted', value: stats?.submitted || 0, color: '#3B82F6' },
    { name: 'Under Review', value: stats?.underReview || 0, color: '#F59E0B' },
    { name: 'Approved', value: stats?.approved || 0, color: '#10B981' },
    { name: 'Rejected', value: stats?.rejected || 0, color: '#EF4444' }
  ];

  // Bar chart uses live backend summary data.
  const servicePerformanceData = [
    { name: 'Applications', total: stats?.totalApplications || 0 },
    { name: 'Approved', total: stats?.approved || 0 },
    { name: 'Appointments', total: stats?.totalAppointments || 0 },
    { name: 'Tickets', total: stats?.totalSupportTickets || 0 },
    { name: 'Centers', total: stats?.totalCenters || 0 }
  ];

  if (loading) {
    return (
      <AdminLayout>
        <div className="admin-loading">
          <Loader size="large" text="Loading dashboard..." />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="admin-dashboard">
        {/* Page Header */}
        <div className="page-header">
          <div className="header-content">
            <h1>Dashboard</h1>
            <p>Overview of Smart NID Management System</p>
          </div>
          <div className="header-actions">
            <span className="last-updated">Last updated: {formatDate(new Date())}</span>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-icon bg-blue">
              <FaFileAlt />
            </div>
            <div className="stat-content">
              <span className="stat-value">{stats?.totalApplications || 0}</span>
              <span className="stat-label">Total Applications</span>
            </div>
            <div className="stat-trend up">
              <FaArrowUp /> 12%
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon bg-yellow">
              <FaClock />
            </div>
            <div className="stat-content">
              <span className="stat-value">{stats?.pending || 0}</span>
              <span className="stat-label">Pending Review</span>
            </div>
            <div className="stat-trend down">
              <FaArrowDown /> 5%
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon bg-green">
              <FaCheckCircle />
            </div>
            <div className="stat-content">
              <span className="stat-value">{stats?.approved || 0}</span>
              <span className="stat-label">Approved</span>
            </div>
            <div className="stat-trend up">
              <FaArrowUp /> 18%
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon bg-red">
              <FaTimesCircle />
            </div>
            <div className="stat-content">
              <span className="stat-value">{stats?.rejected || 0}</span>
              <span className="stat-label">Rejected</span>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon bg-purple">
              <FaPrint />
            </div>
            <div className="stat-content">
              <span className="stat-value">{stats?.printing || 0}</span>
              <span className="stat-label">In Printing</span>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon bg-indigo">
              <FaTruck />
            </div>
            <div className="stat-content">
              <span className="stat-value">{stats?.dispatched || 0}</span>
              <span className="stat-label">Dispatched</span>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon bg-teal">
              <FaUsers />
            </div>
            <div className="stat-content">
              <span className="stat-value">{stats?.totalUsers || 0}</span>
              <span className="stat-label">Registered Users</span>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon bg-orange">
              <FaTicketAlt />
            </div>
            <div className="stat-content">
              <span className="stat-value">{stats?.openTickets || 0}</span>
              <span className="stat-label">Open Tickets</span>
            </div>
          </div>
        </div>

        {/* Charts Section */}
        <div className="charts-section">
          {/* Trend chart is currently placeholder data until backend provides monthly history */}
          <div className="chart-card">
            <div className="chart-header">
              <h3>
                <FaChartLine /> Application Trends
              </h3>
              <select className="chart-filter">
                <option value="6months">Last 6 Months</option>
                <option value="year">This Year</option>
                <option value="all">All Time</option>
              </select>
            </div>
            <div className="chart-body">
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={applicationTrendData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                  <XAxis dataKey="name" stroke="#6B7280" />
                  <YAxis stroke="#6B7280" />
                  <Tooltip />
                  <Line
                    type="monotone"
                    dataKey="applications"
                    stroke="#3B82F6"
                    strokeWidth={2}
                    dot={{ fill: '#3B82F6' }}
                  />
                  <Line
                    type="monotone"
                    dataKey="approved"
                    stroke="#10B981"
                    strokeWidth={2}
                    dot={{ fill: '#10B981' }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Pie chart from backend summary */}
          <div className="chart-card">
            <div className="chart-header">
              <h3>Status Distribution</h3>
            </div>
            <div className="chart-body">
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={statusDistribution}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {statusDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>

              <div className="chart-legend">
                {statusDistribution.map((item, index) => (
                  <div key={index} className="legend-item">
                    <span
                      className="legend-color"
                      style={{ backgroundColor: item.color }}
                    ></span>
                    <span className="legend-label">{item.name}</span>
                    <span className="legend-value">{item.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Bar chart from backend summary */}
          <div className="chart-card">
            <div className="chart-header">
              <h3>Service Performance</h3>
            </div>
            <div className="chart-body">
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={servicePerformanceData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                  <XAxis dataKey="name" stroke="#6B7280" />
                  <YAxis stroke="#6B7280" />
                  <Tooltip />
                  <Bar dataKey="total" fill="#8B5CF6" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Recent Applications & Quick Actions */}
        <div className="dashboard-grid">
          {/* Only admin will usually see real recent applications data */}
          <div className="dashboard-card">
            <div className="card-header">
              <h3>Recent Applications</h3>
              <Link to="/admin/applications" className="view-all">
                View All →
              </Link>
            </div>
            <div className="card-body">
              {recentApplications.length === 0 ? (
                <div className="empty-state">
                  <p>No recent applications</p>
                </div>
              ) : (
                <table className="mini-table">
                  <thead>
                    <tr>
                      <th>Application #</th>
                      <th>Name</th>
                      <th>Status</th>
                      <th>Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentApplications.map((app) => (
                      <tr key={app._id}>
                        <td>
                          <Link to={`/admin/applications?id=${app._id}`}>
                            #{app.applicationNumber}
                          </Link>
                        </td>
                        <td>{app.userId?.fullName || 'N/A'}</td>
                        <td>
                          <span className={`status-badge ${app.status}`}>
                            {app.status.replace('_', ' ')}
                          </span>
                        </td>
                        <td>{formatDate(app.createdAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="dashboard-card">
            <div className="card-header">
              <h3>Quick Actions</h3>
            </div>
            <div className="card-body">
              <div className="quick-actions">
                <Link to="/admin/applications?status=submitted" className="quick-action">
                  <div className="action-icon bg-blue">
                    <FaFileAlt />
                  </div>
                  <div className="action-info">
                    <h4>Review Applications</h4>
                    <p>{stats?.submitted || 0} pending</p>
                  </div>
                </Link>

                <Link to="/admin/appointments" className="quick-action">
                  <div className="action-icon bg-green">
                    <FaCalendarAlt />
                  </div>
                  <div className="action-info">
                    <h4>Manage Appointments</h4>
                    <p>Today's schedule</p>
                  </div>
                </Link>

                <Link to="/admin/printing" className="quick-action">
                  <div className="action-icon bg-purple">
                    <FaPrint />
                  </div>
                  <div className="action-info">
                    <h4>Printing Queue</h4>
                    <p>{stats?.printing || 0} cards ready</p>
                  </div>
                </Link>

                <Link to="/admin/support" className="quick-action">
                  <div className="action-icon bg-orange">
                    <FaTicketAlt />
                  </div>
                  <div className="action-info">
                    <h4>Support Tickets</h4>
                    <p>{stats?.openTickets || 0} open</p>
                  </div>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminDashboard;