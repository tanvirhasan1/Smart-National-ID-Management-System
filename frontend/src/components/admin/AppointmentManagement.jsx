/// Appointment Management Page Start
import React, { useEffect, useMemo, useState } from 'react';
import { toast } from 'react-toastify';
import {
  FaCalendarAlt,
  FaSearch,
  FaFilter,
  FaPlus,
  FaTimes,
  FaSpinner,
  FaClock,
  FaCheck,
  FaEye,
  FaBuilding,
  FaUserCheck,
  FaBan,
  FaRedo,
  FaEdit,
  FaTrash,
  FaMapMarkerAlt,
  FaInfoCircle
} from 'react-icons/fa';
import api from '../api/axios';
import AdminLayout from './AdminLayout';
import Loader from '../common/Loader';
import {
  formatDate,
  formatDateTime,
  formatStatus,
  getStatusColor
} from '../utils/helpers';
import '../styles/AppointmentManagement.css';

const initialCenterForm = {
  name: '',
  district: '',
  address: '',
  contactNumber: '',
  officeHours: '',
  dailyCapacity: 100,
  isActive: true
};

const AppointmentManagement = () => {
  // Main page state
  const [activeTab, setActiveTab] = useState('appointments');
  const [appointments, setAppointments] = useState([]);
  const [centers, setCenters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  // Filters
  const [selectedCenterDistrict, setSelectedCenterDistrict] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Modal and details state
  const [showCenterModal, setShowCenterModal] = useState(false);
  const [showAppointmentModal, setShowAppointmentModal] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState(null);
  const [editingCenter, setEditingCenter] = useState(null);

  // Center form
  const [centerForm, setCenterForm] = useState(initialCenterForm);

  // Stats
  const [stats, setStats] = useState({
    totalAppointments: 0,
    bookedAppointments: 0,
    completedAppointments: 0,
    cancelledAppointments: 0
  });

  // Load current tab data
  useEffect(() => {
    fetchData();
  }, [activeTab, selectedCenterDistrict, statusFilter]);

  const fetchData = async () => {
    try {
      setLoading(true);

      if (activeTab === 'appointments') {
        await Promise.all([fetchAppointments(), fetchCenters(), fetchStats()]);
      } else {
        await fetchCenters();
      }
    } catch (error) {
      console.error('Error fetching appointment management data:', error);
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const fetchAppointments = async () => {
    try {
      const queryParams = new URLSearchParams();

      if (selectedCenterDistrict) {
        queryParams.set('centerDistrict', selectedCenterDistrict);
      }

      if (statusFilter) {
        queryParams.set('status', statusFilter);
      }

      const queryString = queryParams.toString();
      const url = queryString
        ? `/appointments/admin?${queryString}`
        : '/appointments/admin';

      const response = await api.get(url);
      setAppointments(response?.data?.appointments || []);
    } catch (error) {
      console.error('Error fetching appointments:', error);
      toast.error(
        error?.response?.data?.message || 'Failed to load appointments'
      );
    }
  };

  const fetchCenters = async () => {
    try {
      const response = await api.get('/admin/centers');
      setCenters(response?.data?.centers || []);
    } catch (error) {
      console.error('Error fetching centers:', error);
      toast.error(error?.response?.data?.message || 'Failed to load centers');
    }
  };

  const fetchStats = async () => {
    try {
      const response = await api.get('/appointments/admin/stats');
      setStats(
        response?.data?.data || {
          totalAppointments: 0,
          bookedAppointments: 0,
          completedAppointments: 0,
          cancelledAppointments: 0
        }
      );
    } catch (error) {
      console.error('Error fetching appointment stats:', error);
    }
  };

  // Load single appointment details
  const handleViewAppointment = async (appointmentId) => {
    try {
      setActionLoading(true);

      const response = await api.get(`/appointments/admin/${appointmentId}`);
      setSelectedAppointment(response?.data?.appointment || null);
      setShowAppointmentModal(true);
    } catch (error) {
      toast.error(
        error?.response?.data?.message || 'Failed to load appointment details'
      );
    } finally {
      setActionLoading(false);
    }
  };

  const handleAppointmentStatusUpdate = async (appointmentId, status) => {
    try {
      setActionLoading(true);

      await api.patch(`/appointments/admin/${appointmentId}/status`, { status });

      toast.success(`Appointment ${formatStatus(status)} successfully`);

      await fetchAppointments();
      await fetchStats();

      if (selectedAppointment?._id === appointmentId) {
        await handleViewAppointment(appointmentId);
      }
    } catch (error) {
      toast.error(
        error?.response?.data?.message || 'Failed to update appointment status'
      );
    } finally {
      setActionLoading(false);
    }
  };

  const resetCenterForm = () => {
    setCenterForm(initialCenterForm);
    setEditingCenter(null);
  };

  const openCreateCenterModal = () => {
    resetCenterForm();
    setShowCenterModal(true);
  };

  const openEditCenterModal = (center) => {
    setEditingCenter(center);
    setCenterForm({
      name: center.name || '',
      district: center.district || '',
      address: center.address || '',
      contactNumber: center.contactNumber || '',
      officeHours: center.officeHours || '',
      dailyCapacity: center.dailyCapacity || 100,
      isActive: center.isActive ?? true
    });
    setShowCenterModal(true);
  };

  const handleCenterFormChange = (event) => {
    const { name, value, type, checked } = event.target;

    setCenterForm((prev) => ({
      ...prev,
      [name]:
        type === 'checkbox'
          ? checked
          : name === 'dailyCapacity'
          ? Number(value)
          : value
    }));
  };

  const handleSaveCenter = async (event) => {
    event.preventDefault();

    try {
      setActionLoading(true);

      const payload = {
        name: centerForm.name,
        district: centerForm.district,
        address: centerForm.address,
        contactNumber: centerForm.contactNumber,
        officeHours: centerForm.officeHours,
        dailyCapacity: centerForm.dailyCapacity
      };

      if (editingCenter?._id) {
        await api.put(`/admin/centers/${editingCenter._id}`, payload);
        toast.success('Center updated successfully');
      } else {
        await api.post('/admin/centers', payload);
        toast.success('Center created successfully');
      }

      setShowCenterModal(false);
      resetCenterForm();
      await fetchCenters();
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Failed to save center');
    } finally {
      setActionLoading(false);
    }
  };

  const handleToggleCenterStatus = async (centerId) => {
    try {
      setActionLoading(true);

      await api.patch(`/admin/centers/${centerId}/toggle-status`);
      toast.success('Center status updated successfully');

      await fetchCenters();
    } catch (error) {
      toast.error(
        error?.response?.data?.message || 'Failed to update center status'
      );
    } finally {
      setActionLoading(false);
    }
  };

  const clearFilters = () => {
    setSearchQuery('');
    setSelectedCenterDistrict('');
    setStatusFilter('');
  };

  const filteredAppointments = useMemo(() => {
    return appointments.filter((appointment) => {
      const applicationId = appointment.application?.applicationId || '';
      const applicantName = appointment.applicant?.fullName || '';
      const applicantPhone = appointment.applicant?.phone || '';
      const centerName = appointment.centerName || '';
      const query = searchQuery.toLowerCase();

      return (
        applicationId.toLowerCase().includes(query) ||
        applicantName.toLowerCase().includes(query) ||
        applicantPhone.toLowerCase().includes(query) ||
        centerName.toLowerCase().includes(query)
      );
    });
  }, [appointments, searchQuery]);

  const districtOptions = useMemo(() => {
    return [...new Set(centers.map((center) => center.district).filter(Boolean))];
  }, [centers]);

  const statCards = [
    {
      key: 'total',
      title: 'Total Appointments',
      value: stats.totalAppointments || 0,
      helpText: 'All created appointments',
      icon: FaCalendarAlt,
      cardClass: 'appointment-stat-total'
    },
    {
      key: 'booked',
      title: 'Booked',
      value: stats.bookedAppointments || 0,
      helpText: 'Waiting for visit',
      icon: FaClock,
      cardClass: 'appointment-stat-booked'
    },
    {
      key: 'completed',
      title: 'Completed',
      value: stats.completedAppointments || 0,
      helpText: 'Biometric done',
      icon: FaUserCheck,
      cardClass: 'appointment-stat-completed'
    },
    {
      key: 'cancelled',
      title: 'Cancelled',
      value: stats.cancelledAppointments || 0,
      helpText: 'Cancelled records',
      icon: FaBan,
      cardClass: 'appointment-stat-cancelled'
    }
  ];

  if (loading) {
    return (
      <AdminLayout>
        <div className="appointment-management-loading-wrapper flex min-h-[60vh] items-center justify-center">
          <Loader size="large" text="Loading appointment management..." />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="appointment-management-page-wrapper">
        {/* Header section */}
        <div className="appointment-management-hero-panel mb-8 rounded-[28px] bg-white p-6 shadow-[0_6px_18px_rgba(15,23,42,0.06)] sm:p-7">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="appointment-management-hero-content">
              <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-[#F0FDF4] px-4 py-2 text-sm font-medium text-[#16A34A]">
                <FaCalendarAlt />
                <span>Appointment Control Panel</span>
              </div>

              <h1 className="appointment-management-title mb-2 text-[2rem] font-bold text-[#1F2937]">
                Appointment Management
              </h1>
              <p className="appointment-management-subtitle max-w-[680px] text-[15px] leading-7 text-[#6B7280]">
                Manage citizen appointments and appointment centers without changing
                your current workflow.
              </p>
            </div>

            <div className="appointment-management-hero-actions flex flex-wrap gap-3">
              {activeTab === 'centers' && (
                <button
                  type="button"
                  className="inline-flex items-center gap-2 rounded-xl border border-[#D1D5DB] bg-white px-5 py-3 text-sm font-medium text-[#374151] transition hover:bg-[#F9FAFB]"
                  onClick={openCreateCenterModal}
                >
                  <FaPlus />
                  <span>Create Center</span>
                </button>
              )}

              <button
                type="button"
                className="appointment-management-refresh-button inline-flex items-center gap-2 rounded-xl bg-[#16A34A] px-5 py-3 text-sm font-medium text-white transition hover:bg-[#15803D]"
                onClick={fetchData}
              >
                <FaRedo />
                <span>Refresh</span>
              </button>
            </div>
          </div>

          {activeTab === 'appointments' && (
            <div className="appointment-management-stats-grid mt-7 grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
              {statCards.map((card) => {
                const Icon = card.icon;

                return (
                  <div
                    key={card.key}
                    className="appointment-management-stat-card rounded-2xl border border-[#EEF2F7] bg-[#FBFCFE] p-5 transition hover:-translate-y-[2px] hover:shadow-[0_8px_18px_rgba(15,23,42,0.05)]"
                  >
                    <div className="mb-4 flex items-start justify-between gap-4">
                      <div>
                        <p className="mb-2 text-sm font-medium text-[#6B7280]">
                          {card.title}
                        </p>
                        <h3 className="text-[2.1rem] font-bold leading-none text-[#1F2937]">
                          {card.value}
                        </h3>
                      </div>

                      <div
                        className={`appointment-management-stat-icon ${card.cardClass} flex h-[54px] w-[54px] items-center justify-center rounded-2xl text-xl text-white`}
                      >
                        <Icon />
                      </div>
                    </div>

                    <p className="text-xs text-[#94A3B8]">{card.helpText}</p>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Tabs */}
        <div className="appointment-management-tab-bar mb-6 flex flex-wrap gap-3">
          <button
            type="button"
            className={`rounded-2xl px-5 py-3 text-sm font-medium transition ${
              activeTab === 'appointments'
                ? 'bg-[#16A34A] text-white shadow-[0_8px_18px_rgba(22,163,74,0.18)]'
                : 'bg-white text-[#374151] shadow-[0_3px_10px_rgba(15,23,42,0.05)]'
            }`}
            onClick={() => setActiveTab('appointments')}
          >
            Appointments
          </button>

          <button
            type="button"
            className={`rounded-2xl px-5 py-3 text-sm font-medium transition ${
              activeTab === 'centers'
                ? 'bg-[#16A34A] text-white shadow-[0_8px_18px_rgba(22,163,74,0.18)]'
                : 'bg-white text-[#374151] shadow-[0_3px_10px_rgba(15,23,42,0.05)]'
            }`}
            onClick={() => setActiveTab('centers')}
          >
            Centers
          </button>
        </div>

        {activeTab === 'appointments' ? (
          <>
            {/* Filters */}
            <div className="appointment-management-filters-panel mb-6 rounded-2xl bg-white p-4 shadow-[0_4px_12px_rgba(15,23,42,0.04)]">
              <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                <div className="flex flex-1 flex-col gap-4 lg:flex-row">
                  <div className="appointment-management-search-box flex items-center gap-3 rounded-xl border border-[#E5E7EB] bg-[#FAFBFC] px-4 py-3 lg:min-w-[340px]">
                    <FaSearch className="text-[#9CA3AF]" />
                    <input
                      type="text"
                      placeholder="Search by application, applicant or center"
                      value={searchQuery}
                      onChange={(event) => setSearchQuery(event.target.value)}
                      className="w-full border-none bg-transparent text-sm text-[#1F2937] outline-none"
                    />
                  </div>

                  <div className="flex flex-col gap-4 sm:flex-row">
                    <div className="appointment-management-filter-group flex items-center gap-3 rounded-xl border border-[#E5E7EB] bg-[#FAFBFC] px-4 py-3">
                      <FaFilter className="text-[#6B7280]" />
                      <select
                        value={selectedCenterDistrict}
                        onChange={(event) => setSelectedCenterDistrict(event.target.value)}
                        className="border-none bg-transparent text-sm text-[#374151] outline-none"
                      >
                        <option value="">All Districts</option>
                        {districtOptions.map((district) => (
                          <option key={district} value={district}>
                            {district}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="appointment-management-filter-group flex items-center gap-3 rounded-xl border border-[#E5E7EB] bg-[#FAFBFC] px-4 py-3">
                      <FaFilter className="text-[#6B7280]" />
                      <select
                        value={statusFilter}
                        onChange={(event) => setStatusFilter(event.target.value)}
                        className="border-none bg-transparent text-sm text-[#374151] outline-none"
                      >
                        <option value="">All Status</option>
                        <option value="booked">Booked</option>
                        <option value="completed">Completed</option>
                        <option value="cancelled">Cancelled</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  {(searchQuery || selectedCenterDistrict || statusFilter) && (
                    <button
                      type="button"
                      className="inline-flex items-center gap-2 rounded-xl border border-[#D1D5DB] bg-white px-4 py-3 text-sm font-medium text-[#374151] transition hover:bg-[#F9FAFB]"
                      onClick={clearFilters}
                    >
                      <FaTimes />
                      <span>Clear Filters</span>
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Appointment table */}
            <div className="appointment-management-table-card overflow-hidden rounded-[26px] bg-white shadow-[0_6px_18px_rgba(15,23,42,0.06)]">
              <div className="flex flex-col gap-3 border-b border-[#EEF2F7] px-5 py-5 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-[#1F2937]">
                    Appointments ({filteredAppointments.length})
                  </h3>
                  <p className="mt-1 text-sm text-[#6B7280]">
                    Review and manage all citizen appointment records.
                  </p>
                </div>
              </div>

              {filteredAppointments.length === 0 ? (
                <div className="appointment-management-empty-state flex min-h-[300px] flex-col items-center justify-center px-6 py-12 text-center">
                  <div className="mb-5 flex h-20 w-20 items-center justify-center rounded-full bg-[#F0FDF4] text-4xl text-[#16A34A]">
                    <FaCalendarAlt />
                  </div>
                  <h3 className="mb-2 text-xl font-semibold text-[#1F2937]">
                    No appointments found
                  </h3>
                  <p className="max-w-[460px] text-sm leading-7 text-[#6B7280]">
                    There are no appointments matching the current filters. Try a
                    different district, status, or search keyword.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full border-collapse">
                    <thead className="bg-[#F8FAFC]">
                      <tr>
                        <th className="px-4 py-4 text-left text-xs font-semibold uppercase tracking-wide text-[#64748B]">
                          Application
                        </th>
                        <th className="px-4 py-4 text-left text-xs font-semibold uppercase tracking-wide text-[#64748B]">
                          Applicant
                        </th>
                        <th className="px-4 py-4 text-left text-xs font-semibold uppercase tracking-wide text-[#64748B]">
                          Center
                        </th>
                        <th className="px-4 py-4 text-left text-xs font-semibold uppercase tracking-wide text-[#64748B]">
                          Date & Slot
                        </th>
                        <th className="px-4 py-4 text-left text-xs font-semibold uppercase tracking-wide text-[#64748B]">
                          Status
                        </th>
                        <th className="px-4 py-4 text-left text-xs font-semibold uppercase tracking-wide text-[#64748B]">
                          Action
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredAppointments.map((appointment) => (
                        <tr
                          key={appointment._id}
                          className="border-t border-[#F1F5F9] transition hover:bg-[#FAFCFF]"
                        >
                          <td className="px-4 py-4">
                            <div className="flex flex-col">
                              <span className="text-sm font-semibold text-[#16A34A]">
                                #{appointment.application?.applicationId || 'N/A'}
                              </span>
                              <span className="text-xs text-[#94A3B8]">
                                {appointment.application?.applicationType
                                  ? formatStatus(appointment.application.applicationType)
                                  : 'N/A'}
                              </span>
                            </div>
                          </td>

                          <td className="px-4 py-4">
                            <div className="flex flex-col">
                              <span className="text-sm font-medium text-[#1F2937]">
                                {appointment.applicant?.fullName || 'N/A'}
                              </span>
                              <span className="text-xs text-[#6B7280]">
                                {appointment.applicant?.phone || 'N/A'}
                              </span>
                            </div>
                          </td>

                          <td className="px-4 py-4">
                            <div className="flex flex-col">
                              <span className="text-sm font-medium text-[#1F2937]">
                                {appointment.centerName || 'N/A'}
                              </span>
                              <span className="text-xs text-[#6B7280]">
                                {appointment.centerDistrict || 'N/A'}
                              </span>
                            </div>
                          </td>

                          <td className="px-4 py-4">
                            <div className="flex flex-col">
                              <span className="text-sm font-medium text-[#1F2937]">
                                {appointment.appointmentDate
                                  ? formatDate(appointment.appointmentDate)
                                  : 'N/A'}
                              </span>
                              <span className="text-xs text-[#6B7280]">
                                {appointment.timeSlot || 'N/A'}
                              </span>
                            </div>
                          </td>

                          <td className="px-4 py-4">
                            <span className={`badge badge-${getStatusColor(appointment.status)}`}>
                              {formatStatus(appointment.status)}
                            </span>
                          </td>

                          <td className="px-4 py-4">
                            <div className="flex gap-2">
                              <button
                                type="button"
                                className="inline-flex items-center justify-center rounded-xl border border-[#D1D5DB] bg-white p-2.5 text-[#374151] transition hover:bg-[#F9FAFB]"
                                onClick={() => handleViewAppointment(appointment._id)}
                                title="View details"
                              >
                                <FaEye />
                              </button>

                              {appointment.status === 'booked' && (
                                <>
                                  <button
                                    type="button"
                                    className="inline-flex items-center justify-center rounded-xl bg-[#16A34A] p-2.5 text-white transition hover:bg-[#15803D]"
                                    onClick={() =>
                                      handleAppointmentStatusUpdate(
                                        appointment._id,
                                        'completed'
                                      )
                                    }
                                    disabled={actionLoading}
                                    title="Mark completed"
                                  >
                                    <FaUserCheck />
                                  </button>

                                  <button
                                    type="button"
                                    className="inline-flex items-center justify-center rounded-xl bg-red-600 p-2.5 text-white transition hover:bg-red-700"
                                    onClick={() =>
                                      handleAppointmentStatusUpdate(
                                        appointment._id,
                                        'cancelled'
                                      )
                                    }
                                    disabled={actionLoading}
                                    title="Cancel appointment"
                                  >
                                    <FaBan />
                                  </button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        ) : (
          <>
            {/* Centers grid */}
            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
              {centers.length === 0 ? (
                <div className="md:col-span-2 xl:col-span-3">
                  <div className="appointment-management-empty-state flex min-h-[280px] flex-col items-center justify-center rounded-[26px] bg-white px-6 py-12 text-center shadow-[0_6px_18px_rgba(15,23,42,0.06)]">
                    <div className="mb-5 flex h-20 w-20 items-center justify-center rounded-full bg-[#F0FDF4] text-4xl text-[#16A34A]">
                      <FaBuilding />
                    </div>
                    <h3 className="mb-2 text-xl font-semibold text-[#1F2937]">
                      No centers found
                    </h3>
                    <p className="max-w-[460px] text-sm leading-7 text-[#6B7280]">
                      Create your first appointment center to start scheduling
                      citizen visits.
                    </p>
                  </div>
                </div>
              ) : (
                centers.map((center) => (
                  <div
                    key={center._id}
                    className="appointment-management-center-card rounded-[26px] bg-white p-5 shadow-[0_6px_18px_rgba(15,23,42,0.06)] transition hover:-translate-y-[2px] hover:shadow-[0_10px_22px_rgba(15,23,42,0.08)]"
                  >
                    <div className="mb-4 flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#F0FDF4] text-xl text-[#16A34A]">
                          <FaBuilding />
                        </div>
                        <div>
                          <h4 className="text-lg font-semibold text-[#1F2937]">
                            {center.name}
                          </h4>
                          <p className="text-sm text-[#6B7280]">{center.district}</p>
                        </div>
                      </div>

                      <span
                        className={`rounded-full px-3 py-1 text-xs font-medium ${
                          center.isActive
                            ? 'bg-[#F0FDF4] text-[#16A34A]'
                            : 'bg-red-50 text-red-600'
                        }`}
                      >
                        {center.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </div>

                    <div className="space-y-3 text-sm">
                      <div className="flex items-start gap-2 text-[#6B7280]">
                        <FaMapMarkerAlt className="mt-1 text-[#16A34A]" />
                        <span>{center.address || 'N/A'}</span>
                      </div>

                      <div className="flex items-center gap-2 text-[#6B7280]">
                        <FaInfoCircle className="text-[#16A34A]" />
                        <span>Contact: {center.contactNumber || 'N/A'}</span>
                      </div>

                      <div className="flex items-center gap-2 text-[#6B7280]">
                        <FaClock className="text-[#16A34A]" />
                        <span>Office Hours: {center.officeHours || 'N/A'}</span>
                      </div>

                      <div className="rounded-xl bg-[#F8FAFC] px-4 py-3">
                        <p className="text-xs text-[#94A3B8]">Daily Capacity</p>
                        <p className="mt-1 text-lg font-semibold text-[#1F2937]">
                          {center.dailyCapacity || 'N/A'}
                        </p>
                      </div>
                    </div>

                    <div className="mt-5 flex gap-3">
                      <button
                        type="button"
                        className="inline-flex items-center gap-2 rounded-xl border border-[#D1D5DB] bg-white px-4 py-2.5 text-sm font-medium text-[#374151] transition hover:bg-[#F9FAFB]"
                        onClick={() => openEditCenterModal(center)}
                      >
                        <FaEdit />
                        <span>Edit</span>
                      </button>

                      <button
                        type="button"
                        className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium text-white transition ${
                          center.isActive
                            ? 'bg-red-600 hover:bg-red-700'
                            : 'bg-[#16A34A] hover:bg-[#15803D]'
                        }`}
                        onClick={() => handleToggleCenterStatus(center._id)}
                      >
                        {center.isActive ? <FaTrash /> : <FaCheck />}
                        <span>{center.isActive ? 'Deactivate' : 'Activate'}</span>
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </>
        )}

        {/* Appointment details modal */}
        {showAppointmentModal && selectedAppointment && (
          <div
            className="fixed inset-0 z-[120] flex items-center justify-center bg-black/50 px-4 py-6"
            onClick={() => setShowAppointmentModal(false)}
          >
            <div
              className="w-full max-w-[760px] rounded-[28px] bg-white shadow-[0_18px_40px_rgba(0,0,0,0.16)]"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="flex items-center justify-between border-b border-[#E5E7EB] px-6 py-5">
                <div>
                  <h3 className="text-xl font-semibold text-[#1F2937]">
                    Appointment Details
                  </h3>
                  <p className="mt-1 text-sm text-[#6B7280]">
                    Review full appointment information.
                  </p>
                </div>

                <button
                  type="button"
                  className="rounded-xl p-2 text-[#6B7280] transition hover:bg-[#F3F4F6] hover:text-[#111827]"
                  onClick={() => setShowAppointmentModal(false)}
                >
                  <FaTimes />
                </button>
              </div>

              <div className="space-y-5 px-6 py-6">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="rounded-xl bg-[#F9FAFB] p-4">
                    <p className="mb-1 text-sm text-[#6B7280]">Application ID</p>
                    <p className="font-semibold text-[#1F2937]">
                      {selectedAppointment.application?.applicationId || 'N/A'}
                    </p>
                  </div>
                  <div className="rounded-xl bg-[#F9FAFB] p-4">
                    <p className="mb-1 text-sm text-[#6B7280]">Status</p>
                    <span className={`badge badge-${getStatusColor(selectedAppointment.status)}`}>
                      {formatStatus(selectedAppointment.status)}
                    </span>
                  </div>
                  <div className="rounded-xl bg-[#F9FAFB] p-4">
                    <p className="mb-1 text-sm text-[#6B7280]">Applicant</p>
                    <p className="font-semibold text-[#1F2937]">
                      {selectedAppointment.applicant?.fullName || 'N/A'}
                    </p>
                  </div>
                  <div className="rounded-xl bg-[#F9FAFB] p-4">
                    <p className="mb-1 text-sm text-[#6B7280]">Phone</p>
                    <p className="font-semibold text-[#1F2937]">
                      {selectedAppointment.applicant?.phone || 'N/A'}
                    </p>
                  </div>
                  <div className="rounded-xl bg-[#F9FAFB] p-4">
                    <p className="mb-1 text-sm text-[#6B7280]">Center</p>
                    <p className="font-semibold text-[#1F2937]">
                      {selectedAppointment.centerName || 'N/A'}
                    </p>
                  </div>
                  <div className="rounded-xl bg-[#F9FAFB] p-4">
                    <p className="mb-1 text-sm text-[#6B7280]">District</p>
                    <p className="font-semibold text-[#1F2937]">
                      {selectedAppointment.centerDistrict || 'N/A'}
                    </p>
                  </div>
                  <div className="rounded-xl bg-[#F9FAFB] p-4">
                    <p className="mb-1 text-sm text-[#6B7280]">Appointment Date</p>
                    <p className="font-semibold text-[#1F2937]">
                      {selectedAppointment.appointmentDate
                        ? formatDate(selectedAppointment.appointmentDate)
                        : 'N/A'}
                    </p>
                  </div>
                  <div className="rounded-xl bg-[#F9FAFB] p-4">
                    <p className="mb-1 text-sm text-[#6B7280]">Time Slot</p>
                    <p className="font-semibold text-[#1F2937]">
                      {selectedAppointment.timeSlot || 'N/A'}
                    </p>
                  </div>
                </div>

                {selectedAppointment.notes && (
                  <div className="rounded-xl bg-[#F9FAFB] p-4">
                    <p className="mb-1 text-sm text-[#6B7280]">Notes</p>
                    <p className="font-semibold text-[#1F2937]">
                      {selectedAppointment.notes}
                    </p>
                  </div>
                )}

                <div className="rounded-xl bg-[#F9FAFB] p-4">
                  <p className="mb-1 text-sm text-[#6B7280]">Created At</p>
                  <p className="font-semibold text-[#1F2937]">
                    {selectedAppointment.createdAt
                      ? formatDateTime(selectedAppointment.createdAt)
                      : 'N/A'}
                  </p>
                </div>
              </div>

              <div className="flex justify-end border-t border-[#E5E7EB] px-6 py-5">
                <button
                  type="button"
                  className="inline-flex items-center justify-center rounded-xl border border-[#D1D5DB] bg-white px-5 py-3 text-sm font-medium text-[#374151] transition hover:bg-[#F9FAFB]"
                  onClick={() => setShowAppointmentModal(false)}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Center form modal */}
        {showCenterModal && (
          <div
            className="fixed inset-0 z-[120] flex items-center justify-center bg-black/50 px-4 py-6"
            onClick={() => setShowCenterModal(false)}
          >
            <div
              className="w-full max-w-[620px] rounded-[28px] bg-white shadow-[0_18px_40px_rgba(0,0,0,0.16)]"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="flex items-center justify-between border-b border-[#E5E7EB] px-6 py-5">
                <div>
                  <h3 className="text-xl font-semibold text-[#1F2937]">
                    {editingCenter ? 'Edit Center' : 'Create Center'}
                  </h3>
                  <p className="mt-1 text-sm text-[#6B7280]">
                    {editingCenter
                      ? 'Update center information.'
                      : 'Add a new appointment center.'}
                  </p>
                </div>

                <button
                  type="button"
                  className="rounded-xl p-2 text-[#6B7280] transition hover:bg-[#F3F4F6] hover:text-[#111827]"
                  onClick={() => {
                    setShowCenterModal(false);
                    resetCenterForm();
                  }}
                >
                  <FaTimes />
                </button>
              </div>

              <form onSubmit={handleSaveCenter}>
                <div className="grid gap-5 px-6 py-6 md:grid-cols-2">
                  <div className="md:col-span-2">
                    <label className="mb-2 block text-sm font-medium text-[#374151]">
                      Center Name *
                    </label>
                    <input
                      type="text"
                      name="name"
                      value={centerForm.name}
                      onChange={handleCenterFormChange}
                      className="w-full rounded-xl border border-[#D1D5DB] bg-white px-4 py-3 text-[15px] text-[#111827] outline-none transition focus:border-[#16A34A] focus:ring-4 focus:ring-[#16A34A]/10"
                      required
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium text-[#374151]">
                      District *
                    </label>
                    <input
                      type="text"
                      name="district"
                      value={centerForm.district}
                      onChange={handleCenterFormChange}
                      className="w-full rounded-xl border border-[#D1D5DB] bg-white px-4 py-3 text-[15px] text-[#111827] outline-none transition focus:border-[#16A34A] focus:ring-4 focus:ring-[#16A34A]/10"
                      required
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium text-[#374151]">
                      Daily Capacity
                    </label>
                    <input
                      type="number"
                      name="dailyCapacity"
                      value={centerForm.dailyCapacity}
                      onChange={handleCenterFormChange}
                      className="w-full rounded-xl border border-[#D1D5DB] bg-white px-4 py-3 text-[15px] text-[#111827] outline-none transition focus:border-[#16A34A] focus:ring-4 focus:ring-[#16A34A]/10"
                      min="1"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="mb-2 block text-sm font-medium text-[#374151]">
                      Address *
                    </label>
                    <textarea
                      rows={3}
                      name="address"
                      value={centerForm.address}
                      onChange={handleCenterFormChange}
                      className="w-full rounded-xl border border-[#D1D5DB] bg-white px-4 py-3 text-[15px] text-[#111827] outline-none transition focus:border-[#16A34A] focus:ring-4 focus:ring-[#16A34A]/10"
                      required
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium text-[#374151]">
                      Contact Number
                    </label>
                    <input
                      type="text"
                      name="contactNumber"
                      value={centerForm.contactNumber}
                      onChange={handleCenterFormChange}
                      className="w-full rounded-xl border border-[#D1D5DB] bg-white px-4 py-3 text-[15px] text-[#111827] outline-none transition focus:border-[#16A34A] focus:ring-4 focus:ring-[#16A34A]/10"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium text-[#374151]">
                      Office Hours
                    </label>
                    <input
                      type="text"
                      name="officeHours"
                      value={centerForm.officeHours}
                      onChange={handleCenterFormChange}
                      placeholder="9 AM - 5 PM"
                      className="w-full rounded-xl border border-[#D1D5DB] bg-white px-4 py-3 text-[15px] text-[#111827] outline-none transition focus:border-[#16A34A] focus:ring-4 focus:ring-[#16A34A]/10"
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-3 border-t border-[#E5E7EB] px-6 py-5 sm:flex-row sm:justify-end">
                  <button
                    type="button"
                    className="inline-flex items-center justify-center rounded-xl border border-[#D1D5DB] bg-white px-5 py-3 text-sm font-medium text-[#374151] transition hover:bg-[#F9FAFB]"
                    onClick={() => {
                      setShowCenterModal(false);
                      resetCenterForm();
                    }}
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#16A34A] px-5 py-3 text-sm font-medium text-white transition hover:bg-[#15803D] disabled:cursor-not-allowed disabled:opacity-60"
                    disabled={actionLoading}
                  >
                    {actionLoading ? <FaSpinner className="animate-spin" /> : <FaCheck />}
                    <span>{editingCenter ? 'Update Center' : 'Create Center'}</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default AppointmentManagement;
// Appointment Management Page End