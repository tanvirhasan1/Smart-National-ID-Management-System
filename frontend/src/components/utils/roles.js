export const USER_ROLES = Object.freeze({
  CITIZEN: 'citizen',
  ADMIN: 'admin',
  SYSTEM_SUPERVISOR: 'system_supervisor',
  SUPPORT_STAFF: 'support_staff'
});

export const INTERNAL_USER_ROLES = Object.freeze([
  USER_ROLES.ADMIN,
  USER_ROLES.SYSTEM_SUPERVISOR,
  USER_ROLES.SUPPORT_STAFF
]);

export const ROLE_LABELS = Object.freeze({
  [USER_ROLES.CITIZEN]: 'Citizen',
  [USER_ROLES.ADMIN]: 'Admin Officer',
  [USER_ROLES.SYSTEM_SUPERVISOR]: 'System Supervisor',
  [USER_ROLES.SUPPORT_STAFF]: 'Support Staff'
});

export const MAIN_ADMIN_LABEL = 'Super Admin';

export const inferMainAdmin = (user) =>
  Boolean(user?.isMainAdmin) ||
  (user?.role === USER_ROLES.ADMIN && !user?.createdBy);

export const isInternalUserRole = (role) => INTERNAL_USER_ROLES.includes(role);

export const getRoleLabel = (role, user = null) => {
  if (role === USER_ROLES.ADMIN && inferMainAdmin(user)) {
    return MAIN_ADMIN_LABEL;
  }

  return ROLE_LABELS[role] || 'User';
};

export const getRoleHomePath = (role) =>
  isInternalUserRole(role) ? '/admin/dashboard' : '/dashboard';

export const ROLE_SCOPE_TEXT = Object.freeze({
  [USER_ROLES.ADMIN]: 'Application review, appointments, printing, delivery, support, audit and reports',
  [USER_ROLES.SYSTEM_SUPERVISOR]: 'Read-only monitoring, analytics, audit logs and operational reports',
  [USER_ROLES.SUPPORT_STAFF]: 'Citizen support desk, ticket replies and limited application-status lookup',
  [USER_ROLES.CITIZEN]: 'NID application, appointment booking, status tracking, digital NID and support tickets'
});

export const getRoleScopeText = (user) => {
  if (user?.role === USER_ROLES.ADMIN && inferMainAdmin(user)) {
    return 'Full internal control, user management, role assignment and system oversight';
  }

  return ROLE_SCOPE_TEXT[user?.role] || 'Limited access';
};

export const ADMIN_MENU_ACCESS = Object.freeze({
  dashboard: [USER_ROLES.ADMIN, USER_ROLES.SYSTEM_SUPERVISOR, USER_ROLES.SUPPORT_STAFF],
  users: [USER_ROLES.ADMIN],
  applications: [USER_ROLES.ADMIN],
  corrections: [USER_ROLES.ADMIN],
  appointments: [USER_ROLES.ADMIN],
  printing: [USER_ROLES.ADMIN],
  delivery: [USER_ROLES.ADMIN],
  support: [USER_ROLES.ADMIN, USER_ROLES.SUPPORT_STAFF],
  auditLogs: [USER_ROLES.ADMIN, USER_ROLES.SYSTEM_SUPERVISOR]
});
