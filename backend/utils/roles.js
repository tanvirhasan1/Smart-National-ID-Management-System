// Role setup for internal access control.
// super_admin is kept commented for future use.
// For now, admin holds the highest level permissions.

const FULL_ADMIN_ROLES = ['admin'];
// const FULL_ADMIN_ROLES = ['admin', 'super_admin'];

const INTERNAL_USER_ROLES = [
  'admin',
  // 'super_admin',
  'system_supervisor',
  'support_staff'
];

const ROLE_PERMISSIONS = {
  citizen: [
    'profile:read',
    'profile:update',
    'applications:create',
    'applications:read:own',
    'appointments:create',
    'appointments:read:own',
    'support:create',
    'support:read:own',
    'support:reply:own'
  ],

  // Admin currently has full system access.
  // Later, if you enable super_admin, reduce admin permissions as needed.
  admin: ['*'],

  // super_admin: ['*'],

  system_supervisor: [
    'dashboard:read',
    'analytics:read',
    'audit:read',
    'applications:read',
    'appointments:read',
    'support:read',
    'centers:read',
    'reports:export',
    'system:observe'
  ],

  support_staff: [
    'dashboard:read',
    'support:read',
    'support:assign',
    'support:update_status',
    'support:reply',
    'support:history:read'
  ]
};

const getDefaultPermissions = (role) => {
  if (!role) {
    return [];
  }

  return ROLE_PERMISSIONS[role] ? [...ROLE_PERMISSIONS[role]] : [];
};

const isFullAdminRole = (role) => FULL_ADMIN_ROLES.includes(role);
const isInternalUserRole = (role) => INTERNAL_USER_ROLES.includes(role);
const isMainAdminUser = (user) =>
  Boolean(user) && isFullAdminRole(user.role) && !user.createdBy;

module.exports = {
  FULL_ADMIN_ROLES,
  INTERNAL_USER_ROLES,
  ROLE_PERMISSIONS,
  getDefaultPermissions,
  isFullAdminRole,
  isInternalUserRole,
  isMainAdminUser
};