import React, { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { FaSpinner, FaUserCog, FaUsers } from 'react-icons/fa';
import api from '../api/axios';
import AdminLayout from './AdminLayout';
import { useAuth } from '../context/AuthContext';

const defaultForm = {
  fullName: '',
  email: '',
  phone: '',
  password: '',
  role: 'support_staff'
};

const roleOptions = [
  { value: 'admin', label: 'Admin' },
  { value: 'system_supervisor', label: 'System Supervisor' },
  { value: 'support_staff', label: 'Support Staff' }
];

const roleBadgeMap = {
  admin: 'bg-red-100 text-red-700',
  system_supervisor: 'bg-blue-100 text-blue-700',
  support_staff: 'bg-amber-100 text-amber-700'
};

const AdminUsers = () => {
  const { user } = useAuth();
  const [users, setUsers] = useState([]);
  const [formData, setFormData] = useState(defaultForm);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await api.get('/admin/users');
      setUsers(response.data?.data || []);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.isMainAdmin) {
      fetchUsers();
    } else {
      setLoading(false);
    }
  }, [user?.isMainAdmin]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (
      !formData.fullName.trim() ||
      !formData.email.trim() ||
      !formData.phone.trim() ||
      !formData.password.trim()
    ) {
      toast.error('All fields are required');
      return;
    }

    if (formData.password.trim().length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await api.post('/admin/users', {
        fullName: formData.fullName.trim(),
        email: formData.email.trim(),
        phone: formData.phone.trim(),
        password: formData.password,
        role: formData.role
      });

      const createdUser = response.data?.data;
      if (createdUser) {
        setUsers((prev) => [createdUser, ...prev]);
      }

      setFormData(defaultForm);
      toast.success(response.data?.message || 'Internal user created successfully');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to create user');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!user?.isMainAdmin) {
    return (
      <AdminLayout>
        <div className="rounded-2xl bg-white p-8 shadow-[0_10px_30px_rgba(0,0,0,0.08)]">
          <div className="flex items-center gap-3 text-[#1F2937]">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-100 text-red-600">
              <FaUserCog />
            </div>
            <div>
              <h1 className="text-xl font-bold">Users Management</h1>
              <p className="text-sm text-[#6B7280]">
                Only the main admin can access this page.
              </p>
            </div>
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="rounded-2xl bg-white p-6 shadow-[0_10px_30px_rgba(0,0,0,0.08)]">
          <div className="mb-6 flex items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-[#1F2937]">Users Management</h1>
              <p className="mt-1 text-sm text-[#6B7280]">
                Create and manage internal system users.
              </p>
            </div>
            <div className="rounded-full bg-[#DCFCE7] px-4 py-2 text-sm font-medium text-[#166534]">
              Main Admin Access
            </div>
          </div>

          <form onSubmit={handleSubmit} className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-medium text-[#374151]">
                Full Name
              </label>
              <input
                type="text"
                name="fullName"
                value={formData.fullName}
                onChange={handleChange}
                placeholder="Enter full name"
                className="w-full rounded-lg border border-[#D1D5DB] px-4 py-3 outline-none transition focus:border-[#16A34A] focus:ring-4 focus:ring-[#16A34A]/10"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-[#374151]">
                Email
              </label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="Enter email address"
                className="w-full rounded-lg border border-[#D1D5DB] px-4 py-3 outline-none transition focus:border-[#16A34A] focus:ring-4 focus:ring-[#16A34A]/10"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-[#374151]">
                Phone
              </label>
              <input
                type="text"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                placeholder="Enter phone number"
                className="w-full rounded-lg border border-[#D1D5DB] px-4 py-3 outline-none transition focus:border-[#16A34A] focus:ring-4 focus:ring-[#16A34A]/10"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-[#374151]">
                Role
              </label>
              <select
                name="role"
                value={formData.role}
                onChange={handleChange}
                className="w-full rounded-lg border border-[#D1D5DB] px-4 py-3 outline-none transition focus:border-[#16A34A] focus:ring-4 focus:ring-[#16A34A]/10"
              >
                {roleOptions.map((role) => (
                  <option key={role.value} value={role.value}>
                    {role.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="mb-2 block text-sm font-medium text-[#374151]">
                Temporary Password
              </label>
              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="Enter temporary password"
                className="w-full rounded-lg border border-[#D1D5DB] px-4 py-3 outline-none transition focus:border-[#16A34A] focus:ring-4 focus:ring-[#16A34A]/10"
              />
            </div>

            <div className="md:col-span-2">
              <button
                type="submit"
                disabled={isSubmitting}
                className="inline-flex items-center gap-2 rounded-lg bg-[#16A34A] px-5 py-3 text-sm font-medium text-white transition hover:bg-[#15803D] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSubmitting ? (
                  <>
                    <FaSpinner className="animate-spin" />
                    <span>Creating...</span>
                  </>
                ) : (
                  <>
                    <FaUserCog />
                    <span>Create User</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        <div className="rounded-2xl bg-white p-6 shadow-[0_10px_30px_rgba(0,0,0,0.08)]">
          <div className="mb-5 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#ECFDF5] text-[#16A34A]">
              <FaUsers />
            </div>
            <div>
              <h2 className="text-lg font-bold text-[#1F2937]">Internal Users</h2>
              <p className="text-sm text-[#6B7280]">
                Admin, system supervisor and support staff accounts.
              </p>
            </div>
          </div>

          {loading ? (
            <div className="flex items-center gap-3 rounded-xl bg-[#F9FAFB] px-4 py-6 text-[#6B7280]">
              <FaSpinner className="animate-spin" />
              <span>Loading users...</span>
            </div>
          ) : users.length === 0 ? (
            <div className="rounded-xl border border-dashed border-[#D1D5DB] px-4 py-8 text-center text-[#6B7280]">
              No internal users found.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full border-separate border-spacing-y-3">
                <thead>
                  <tr className="text-left text-sm text-[#6B7280]">
                    <th className="px-3">Name</th>
                    <th className="px-3">Email</th>
                    <th className="px-3">Phone</th>
                    <th className="px-3">Role</th>
                    <th className="px-3">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((item) => (
                    <tr key={item._id} className="bg-[#F9FAFB] text-sm text-[#1F2937]">
                      <td className="rounded-l-xl px-3 py-4 font-medium">{item.fullName}</td>
                      <td className="px-3 py-4">{item.email}</td>
                      <td className="px-3 py-4">{item.phone}</td>
                      <td className="px-3 py-4">
                        <span
                          className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                            roleBadgeMap[item.role] || 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {item.role}
                        </span>
                      </td>
                      <td className="rounded-r-xl px-3 py-4">
                        <span className="inline-flex rounded-full bg-[#DCFCE7] px-3 py-1 text-xs font-semibold text-[#166534]">
                          {item.status}
                        </span>
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
};

export default AdminUsers;