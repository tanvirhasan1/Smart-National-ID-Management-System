import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  FaHome,
  FaFileAlt,
  FaCalendarAlt,
  FaPrint,
  FaTruck,
  FaTicketAlt,
  FaHistory,
  FaSignOutAlt,
  FaBars,
  FaTimes,
  FaUserShield
} from 'react-icons/fa';
import { useAuth } from '../context/AuthContext';
import '../styles/AdminLayout.css';

const AdminLayout = ({ children }) => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/admin/login');
  };

const allMenuItems = [
  {
    path: '/admin/dashboard',
    label: 'Dashboard',
    icon: FaHome,
    roles: ['admin', 'system_supervisor', 'support_staff']
  },
  {
    path: '/admin/applications',
    label: 'Applications',
    icon: FaFileAlt,
    roles: ['admin']
  },
  {
    path: '/admin/appointments',
    label: 'Appointments',
    icon: FaCalendarAlt,
    roles: ['admin']
  },
  {
    path: '/admin/printing',
    label: 'Printing Queue',
    icon: FaPrint,
    roles: ['admin']
  },
  {
    path: '/admin/delivery',
    label: 'Delivery',
    icon: FaTruck,
    roles: ['admin']
  },
  {
    path: '/admin/support',
    label: 'Support Tickets',
    icon: FaTicketAlt,
    roles: ['admin', 'support_staff']
  },
  {
    path: '/admin/audit-logs',
    label: 'Audit Logs',
    icon: FaHistory,
    roles: ['admin', 'system_supervisor']
  }
];

const menuItems = allMenuItems.filter((item) => item.roles.includes(user?.role));

const roleLabelMap = {
  admin: 'Administrator',
  system_supervisor: 'System Supervisor',
  support_staff: 'Support Staff'
};

  return (
    <div
      className={`admin-layout-wrapper flex min-h-screen bg-[#F3F4F6] ${
        sidebarOpen ? '' : 'admin-layout-collapsed'
      }`}
    >
      <aside
        className={`admin-sidebar-panel fixed inset-y-0 left-0 z-[100] flex w-[260px] flex-col bg-[#1F2937] text-white transition-all duration-300 lg:translate-x-0 ${
          sidebarOpen ? 'lg:w-[260px]' : 'lg:w-[80px]'
        } ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'} `}
      >
        <div className="admin-sidebar-header flex items-center justify-between border-b border-[#374151] px-4 py-4">
          <Link
            to="/admin/dashboard"
            className="admin-sidebar-logo flex items-center gap-3 text-white no-underline"
            onClick={() => setMobileMenuOpen(false)}
          >
            <img
              src="https://i.ibb.co.com/PvpDHm2z/logo-white.png"
              alt="Logo"
              className="admin-sidebar-logo-image h-100 w-100 object-contain"
            />
          </Link>

          <button
            type="button"
            className="admin-sidebar-toggle hidden p-2 text-xl text-[#9CA3AF] transition hover:text-white lg:block"
            onClick={() => setSidebarOpen(!sidebarOpen)}
          >
            <FaBars />
          </button>

          <button
            type="button"
            className="admin-sidebar-close block p-2 text-xl text-[#9CA3AF] transition hover:text-white lg:hidden"
            onClick={() => setMobileMenuOpen(false)}
          >
            <FaTimes />
          </button>
        </div>

        <nav className="admin-sidebar-nav flex-1 overflow-y-auto py-4">
          <ul className="space-y-1 px-2">
            {menuItems.map((item) => {
              const isActive = location.pathname === item.path;
              const Icon = item.icon;

              return (
                <li key={item.path}>
                  <Link
                    to={item.path}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`admin-sidebar-link flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition ${
                      isActive
                        ? 'border-l-[3px] border-[#16A34A] bg-[rgba(22,163,74,0.10)] text-[#16A34A]'
                        : 'border-l-[3px] border-transparent text-[#9CA3AF] hover:bg-[#374151] hover:text-white'
                    } ${sidebarOpen ? 'justify-start' : 'justify-center lg:px-3'}`}
                  >
                    <Icon className="admin-sidebar-link-icon min-w-6 text-lg" />
                    {sidebarOpen && <span>{item.label}</span>}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="admin-sidebar-footer border-t border-[#374151] p-4">
          <button
            type="button"
            className={`admin-logout-button flex w-full items-center gap-3 rounded-xl bg-[#374151] px-4 py-3 text-sm font-medium text-white transition hover:bg-[#4B5563] ${
              sidebarOpen ? 'justify-start' : 'justify-center'
            }`}
            onClick={handleLogout}
          >
            <FaSignOutAlt className="text-base" />
            {sidebarOpen && <span>Logout</span>}
          </button>
        </div>
      </aside>

      {mobileMenuOpen && (
        <div
          className="admin-sidebar-overlay fixed inset-0 z-[90] bg-black/50 lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      <div
        className={`admin-main-wrapper flex min-h-screen flex-1 flex-col transition-all duration-300 ${
          sidebarOpen ? 'lg:ml-[260px]' : 'lg:ml-[80px]'
        }`}
      >
        <header className="admin-topbar sticky top-0 z-50 flex items-center justify-between bg-white px-4 py-3 shadow-[0_1px_3px_rgba(0,0,0,0.1)] sm:px-6">
          <button
            type="button"
            className="admin-mobile-menu-button block text-xl text-[#374151] lg:hidden"
            onClick={() => setMobileMenuOpen(true)}
          >
            <FaBars />
          </button>

          <div className="admin-topbar-spacer flex-1" />

          <div className="admin-profile-card flex items-center gap-3">
            <div className="admin-profile-avatar flex h-10 w-10 items-center justify-center rounded-full bg-[#16A34A] text-white">
              <FaUserShield />
            </div>

            <div className="admin-profile-meta hidden sm:flex sm:flex-col">
              <span className="admin-profile-name text-sm font-semibold text-[#1F2937]">
                {user?.fullName || 'Admin User'}
              </span>
              <span className="admin-profile-role text-xs text-[#6B7280]">
                {roleLabelMap[user?.role] || 'Administrator'}
              </span>
            </div>
          </div>
        </header>

        <main className="admin-content-area flex-1 p-4 sm:p-6">
          {children}
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;