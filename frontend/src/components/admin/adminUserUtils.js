import { formatDateTime, formatStatus } from '../utils/helpers';
import { getRoleLabel, getRoleScopeText } from '../utils/roles';

export const INTERNAL_USER_FILTER_OPTIONS = {
  roles: [
    { value: '', label: 'All Roles' },
    { value: 'admin', label: 'Admin Officer' },
    { value: 'system_supervisor', label: 'System Supervisor' },
    { value: 'support_staff', label: 'Support Staff' }
  ],
  accountStatus: [
    { value: '', label: 'All Account Statuses' },
    { value: 'active', label: 'Active' },
    { value: 'blocked', label: 'Blocked' },
    { value: 'pending', label: 'Pending' }
  ],
  workingStatus: [
    { value: '', label: 'All Working Statuses' },
    { value: 'live', label: 'Live Now' },
    { value: 'offline', label: 'Offline' }
  ]
};

export const EMPTY_INTERNAL_USER_FORM = {
  fullName: '',
  email: '',
  phone: '',
  password: '',
  confirmPassword: '',
  role: 'support_staff',
  status: 'active',
  scopeType: 'national',
  districts: '',
  primaryDistrict: '',
  updateReason: ''
};

export const getInternalUsersFromResponse = (response) =>
  response?.data?.data || response?.data?.users || [];

export const getInternalUserMeta = (response) => response?.data?.meta || {};

export const isRootMainAdminUser = (user) =>
  Boolean(user?.role === 'admin' && !user?.createdBy);

export const getAccountStatus = (user) =>
  user?.accountStatus || user?.status || 'active';

export const getWorkingStatusText = (user) =>
  user?.liveStatus?.isLive ? 'Live Now' : 'Offline';

export const getLastSeenText = (user) => {
  if (user?.liveStatus?.isLive) return 'Working now';
  if (user?.liveStatus?.lastSeenAt) return formatDateTime(user.liveStatus.lastSeenAt);
  return 'No recent activity';
};

export const getFriendlyWorkspace = (user) => {
  const route = String(user?.liveStatus?.currentRoute || '')
    .split('?')[0]
    .toLowerCase();

  if (!route) return user?.liveStatus?.isLive ? 'Admin workspace' : 'Not active';
  if (route.includes('dashboard')) return 'Dashboard overview';
  if (route.includes('application')) return 'Application review';
  if (route.includes('appointment')) return 'Appointment management';
  if (route.includes('printing')) return 'Printing queue';
  if (route.includes('delivery')) return 'Delivery control';
  if (route.includes('support')) return 'Support tickets';
  if (route.includes('audit')) return 'Audit logs';
  if (route.includes('users')) return 'Internal user control';
  return 'Admin workspace';
};

export const getAdminScope = (user) => {
  const scope = user?.adminScope || {};
  return {
    scopeType: scope.scopeType === 'district' ? 'district' : 'national',
    districts: Array.isArray(scope.districts) ? scope.districts : [],
    primaryDistrict: scope.primaryDistrict || ''
  };
};

export const formatAdminScope = (user) => {
  const scope = getAdminScope(user);
  if (scope.scopeType === 'national') return 'National scope';
  return scope.districts.length
    ? `District: ${scope.districts.join(', ')}`
    : 'District scope';
};

export const getCreatedByText = (user) => {
  const name = user?.createdBy?.fullName || user?.createdBy?.name;
  const email = user?.createdBy?.email;
  if (name && email) return `${name} (${email})`;
  return name || email || 'System';
};

export const getPermissionGroup = (user) => {
  const permissions = Array.isArray(user?.permissions) ? user.permissions : [];
  return permissions.length ? `${permissions.length} assigned permissions` : getRoleScopeText(user);
};

export const getRoleText = (user) => getRoleLabel(user?.role, user);

export const getStatusText = (user) => formatStatus(getAccountStatus(user));

const parseDistrictInput = (value) =>
  String(value || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);

export const buildAdminScopePayload = (form) => ({
  scopeType: form.scopeType === 'district' ? 'district' : 'national',
  districts: form.scopeType === 'district' ? parseDistrictInput(form.districts) : [],
  primaryDistrict: form.scopeType === 'district' ? form.primaryDistrict.trim() : ''
});

export const buildEditInternalUserForm = (user) => {
  const scope = getAdminScope(user);
  return {
    ...EMPTY_INTERNAL_USER_FORM,
    fullName: user?.fullName || '',
    email: user?.email || '',
    phone: user?.phone || '',
    role: user?.role || 'support_staff',
    status: getAccountStatus(user),
    scopeType: scope.scopeType,
    districts: scope.districts.join(', '),
    primaryDistrict: scope.primaryDistrict
  };
};

