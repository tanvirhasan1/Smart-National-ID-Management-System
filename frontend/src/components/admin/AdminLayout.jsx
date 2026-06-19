import React, { useEffect, useRef, useState } from 'react';
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
  FaUserShield,
  FaUserCog,
  FaChevronDown,
  FaCog,
  FaEdit
} from 'react-icons/fa';
import { useAuth } from '../context/AuthContext';
import { ADMIN_MENU_ACCESS, getRoleLabel, getRoleScopeText, inferMainAdmin } from '../utils/roles';
import '../styles/AdminLayout.css';

const AdminLayout = ({ children }) => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const profileMenuRef = useRef(null);
  const isMainAdmin = inferMainAdmin(user);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target)) {
        setProfileMenuOpen(false);
      }
    };

    const handleEscape = (event) => {
      if (event.key === 'Escape') {
        setProfileMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, []);

  useEffect(() => {
    setProfileMenuOpen(false);
  }, [location.pathname]);

  const handleLogout = () => {
    setProfileMenuOpen(false);
    logout();
    navigate('/login', { replace: true });
  };


  const allMenuItems = [
    {
      path: '/admin/dashboard',
      label: 'Dashboard',
      icon: FaHome,
      roles: ADMIN_MENU_ACCESS.dashboard
    },
    {
      path: '/admin/users',
      label: 'Users',
      icon: FaUserCog,
      roles: ADMIN_MENU_ACCESS.users,
      mainAdminOnly: true
    },
    {
      path: '/admin/applications',
      label: 'Applications',
      icon: FaFileAlt,
      roles: ADMIN_MENU_ACCESS.applications
    },
    {
      path: '/admin/corrections',
      label: 'Corrections',
      icon: FaEdit,
      roles: ADMIN_MENU_ACCESS.corrections
    },
    {
      path: '/admin/appointments',
      label: 'Appointments',
      icon: FaCalendarAlt,
      roles: ADMIN_MENU_ACCESS.appointments
    },
    {
      path: '/admin/printing',
      label: 'Printing Queue',
      icon: FaPrint,
      roles: ADMIN_MENU_ACCESS.printing
    },
    {
      path: '/admin/delivery',
      label: 'Delivery',
      icon: FaTruck,
      roles: ADMIN_MENU_ACCESS.delivery
    },
    {
      path: '/admin/support',
      label: 'Support Tickets',
      icon: FaTicketAlt,
      roles: ADMIN_MENU_ACCESS.support
    },
    {
      path: '/admin/audit-logs',
      label: 'Audit Logs',
      icon: FaHistory,
      roles: ADMIN_MENU_ACCESS.auditLogs
    }
  ];

const menuItems = allMenuItems.filter((item) => {
  const roleMatched = item.roles.includes(user?.role);

  if (!roleMatched) {
    return false;
  }

  if (item.mainAdminOnly) {
    return isMainAdmin;
  }

  return true;
});

  const roleLabel = getRoleLabel(user?.role, user);
  const roleScope = getRoleScopeText(user);
  const adminName = user?.fullName || user?.name || 'Admin User';
  const adminEmail = user?.email || 'admin@smartnid.local';
  const adminInitials = adminName
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('') || 'AD';

  return (
    <div
      className={`admin-layout-wrapper flex min-h-screen bg-[#F3F4F6] ${sidebarOpen ? 'admin-sidebar-visible' : 'admin-sidebar-hidden'
        }`}
    >
      <aside
        className={`admin-sidebar-panel fixed inset-y-0 left-0 z-[100] flex w-[232px] flex-col bg-[#1F2937] text-white transition-all duration-300 ${sidebarOpen ? 'lg:translate-x-0' : 'lg:-translate-x-full'
          } ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'} `}
      >
        <div className="admin-sidebar-header flex items-center justify-between border-b border-[#374151] px-3 py-3">
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
            aria-label="Close sidebar"
            className="admin-sidebar-toggle hidden p-2 text-lg text-[#9CA3AF] transition hover:text-white lg:inline-flex"
            onClick={() => setSidebarOpen(false)}
          >
            <FaTimes />
          </button>

          <button
            type="button"
            aria-label="Close sidebar"
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
                    title={item.label}
                    aria-label={item.label}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`admin-sidebar-link flex items-center gap-3 rounded-[10px] px-3.5 py-2.5 text-[0.86rem] font-medium transition ${isActive
                      ? 'border-l-[3px] border-[#16A34A] bg-[rgba(22,163,74,0.10)] text-[#16A34A]'
                      : 'border-l-[3px] border-transparent text-[#9CA3AF] hover:bg-[#374151] hover:text-white'
                      } justify-start`}
                  >
                    <Icon className="admin-sidebar-link-icon min-w-5 text-[1rem]" />
                    <span>{item.label}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="admin-sidebar-footer border-t border-[#374151] p-3">
          <button
            type="button"
            title="Logout"
            aria-label="Logout"
            className={`admin-logout-button flex w-full items-center gap-3 rounded-[10px] bg-[#374151] px-3.5 py-2.5 text-[0.86rem] font-medium text-white transition hover:bg-[#4B5563] justify-start`}
            onClick={handleLogout}
          >
            <FaSignOutAlt className="text-base" />
            <span>Logout</span>
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
        className={`admin-main-wrapper flex min-h-screen flex-1 flex-col transition-all duration-300 ${sidebarOpen ? 'lg:ml-[232px]' : 'lg:ml-0'
          }`}
      >
        <header className="admin-topbar sticky top-0 z-50 flex items-center justify-between bg-white px-4 py-3 shadow-[0_1px_3px_rgba(0,0,0,0.1)] sm:px-6">
          <button
            type="button"
            aria-label="Open sidebar"
            className="admin-desktop-menu-button hidden text-xl text-[#374151] lg:inline-flex"
            onClick={() => setSidebarOpen(true)}
          >
            <FaBars />
          </button>

          <button
            type="button"
            aria-label="Open sidebar"
            className="admin-mobile-menu-button block text-xl text-[#374151] lg:hidden"
            onClick={() => setMobileMenuOpen(true)}
          >
            <FaBars />
          </button>

          <div className="admin-topbar-spacer flex-1" />

          <div className="admin-profile-menu" ref={profileMenuRef}>
            <button
              type="button"
              className={`admin-profile-card flex items-center gap-3 ${profileMenuOpen ? 'is-open' : ''}`}
              title={roleScope}
              aria-haspopup="menu"
              aria-expanded={profileMenuOpen}
              onClick={() => setProfileMenuOpen((open) => !open)}
            >
              <span className="admin-profile-avatar flex h-10 w-10 items-center justify-center rounded-full bg-[#16A34A] text-white">
                <FaUserShield />
              </span>

              <span className="admin-profile-meta hidden sm:flex sm:flex-col">
                <span className="admin-profile-name text-sm font-semibold text-[#1F2937]">
                  {adminName}
                </span>
                <span className="admin-profile-role text-xs text-[#6B7280]">
                  {roleLabel}
                </span>
              </span>

              <FaChevronDown className="admin-profile-chevron hidden text-xs text-[#6B7280] sm:block" />
            </button>

            {profileMenuOpen && (
              <div className="admin-profile-dropdown" role="menu">
                <div className="admin-profile-dropdown-pointer" />

                <div className="admin-profile-dropdown-header admin-profile-dropdown-header-horizontal">
                  <div className="admin-profile-dropdown-avatar">
                    {adminInitials}
                  </div>

                  <div className="admin-profile-dropdown-details">
                    <div className="admin-profile-dropdown-name">{adminName}</div>
                    <div className="admin-profile-dropdown-email">{adminEmail}</div>
                  </div>
                </div>

                <div className="admin-profile-dropdown-list">

                  <button type="button" className="admin-profile-dropdown-item is-danger" onClick={handleLogout}>
                    <FaSignOutAlt />
                    <span>Log Out</span>
                  </button>
                </div>
              </div>
            )}
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