const mongoose = require('mongoose');
const SupportTicket = require('../models/SupportTicket');
const User = require('../models/User');
const AdminUser = require('../models/AdminUser');
const AdminPresence = require('../models/AdminPresence');
const Center = require('../models/Center');
const Application = require('../models/Application');
const Appointment = require('../models/Appointment');
const DeliveryRequest = require('../models/DeliveryRequest');
const AuditLog = require('../models/AuditLog');
const {
  createAuditLog,
  getRequestAuditContext
} = require('../utils/auditLogger');
const { getDefaultPermissions, isMainAdminUser } = require('../utils/roles');
const { syncUserBuckets } = require('../utils/userBuckets');
const {
  isNationalScope,
  getAdminDistricts,
  combineMongoFilters,
  buildUserDistrictFilter,
  applyAdminJurisdictionFilter,
  applyAdminDistrictFilter,
  canAccessApplicationByJurisdiction,
  canAccessUserByDistrict,
  canAccessCenterByDistrict
} = require('../utils/adminScope');
const {
  LIVE_WINDOW_MINUTES,
  buildInternalPresenceMap,
  markInternalUserOffline
} = require('../utils/internalPresence');
const { isCompletedAppointment } = require('../utils/applicationLifecycle');
const {
  getOrCreateNidNumberAssignment
} = require('../services/nidNumberProvider');

// Allowed internal roles for manually created staff users.
const INTERNAL_USER_ROLES = ['admin', 'system_supervisor', 'support_staff'];
const MAX_PAGE_SIZE = 100;

const parsePositiveInteger = (value, fallback) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : fallback;
};

const getPaginationOptions = (query = {}) => {
  const page = parsePositiveInteger(query.page, 1);
  const limit = Math.min(
    parsePositiveInteger(query.limit, 20),
    MAX_PAGE_SIZE
  );
  const skip = (page - 1) * limit;

  return { page, limit, skip };
};

const buildPaginationMeta = ({ page, limit, total }) => {
  const pages = Math.max(1, Math.ceil(total / limit));

  return {
    page,
    limit,
    total,
    pages,
    totalPages: pages,
    hasPrevPage: page > 1,
    hasNextPage: page < pages
  };
};

const escapeRegex = (value = '') =>
  String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const normalizeAdminScope = (value = {}, fallback = null) => {
  const incoming = value && typeof value === 'object' ? value : {};
  const base = fallback && typeof fallback === 'object' ? fallback : {};
  const scopeType =
    (incoming.scopeType || base.scopeType) === 'district'
      ? 'district'
      : 'national';
  const rawDistricts =
    incoming.districts !== undefined ? incoming.districts : base.districts;
  const districtValues = Array.isArray(rawDistricts)
    ? rawDistricts
    : String(rawDistricts || '')
        .split(',');
  const districtMap = new Map();

  districtValues.forEach((district) => {
    const trimmed = String(district || '').trim();
    if (!trimmed) return;
    districtMap.set(trimmed.toLowerCase(), trimmed);
  });

  const primaryDistrict = String(
    incoming.primaryDistrict ?? base.primaryDistrict ?? ''
  ).trim();

  if (primaryDistrict) {
    districtMap.set(primaryDistrict.toLowerCase(), primaryDistrict);
  }

  return {
    scopeType,
    districts: scopeType === 'district' ? [...districtMap.values()] : [],
    primaryDistrict: scopeType === 'district' ? primaryDistrict : '',
    scopeUpdatedAt:
      incoming.scopeUpdatedAt || base.scopeUpdatedAt || null
  };
};

const validateAdminScope = (scope) => {
  if (scope.scopeType === 'district' && scope.districts.length === 0) {
    return 'At least one district is required for district-scoped admins';
  }

  if (
    scope.scopeType === 'district' &&
    scope.primaryDistrict &&
    !scope.districts.includes(scope.primaryDistrict)
  ) {
    return 'Primary district must be included in assigned districts';
  }

  return '';
};

const canManageInternalUsers = (user) =>
  ['admin', 'system_supervisor'].includes(user?.role) && isNationalScope(user);

const serializeAdminScope = (scope) =>
  JSON.stringify(normalizeAdminScope(scope));

const getSafeSort = (sortValue, fallback = { createdAt: -1 }, allowed = []) => {
  if (!sortValue || typeof sortValue !== 'string') {
    return fallback;
  }

  const field = sortValue.startsWith('-') ? sortValue.slice(1) : sortValue;
  const direction = sortValue.startsWith('-') ? -1 : 1;

  if (!allowed.includes(field)) {
    return fallback;
  }

  return { [field]: direction };
};

// Keep response shape clean for internal users.
const mapInternalUserResponse = (user) => ({
  _id: user._id,
  fullName: user.fullName,
  email: user.email,
  phone: user.phone,
  role: user.role,
  permissions: user.permissions || [],
  adminScope: normalizeAdminScope(user.adminScope),
  status: user.status,
  accountStatus: user.status,
  isVerified: user.isVerified,
  isArchived: Boolean(user.isArchived),
  archivedAt: user.archivedAt || null,
  archiveReason: user.archiveReason || '',
  createdBy: user.createdBy,
  createdAt: user.createdAt,
  updatedAt: user.updatedAt
});

const ensureMainAdminAccess = (req, res) => {
  if (!canManageInternalUsers(req.user)) {
    res.status(403).json({
      success: false,
      message: 'Only national-scope admin users can manage internal users'
    });
    return false;
  }

  return true;
};

const buildInternalUserSnapshot = (user) => ({
  fullName: user.fullName,
  email: user.email,
  phone: user.phone,
  role: user.role,
  adminScope: normalizeAdminScope(user.adminScope),
  status: user.status,
  isVerified: user.isVerified,
  isArchived: user.isArchived,
  archivedAt: user.archivedAt || null,
  archiveReason: user.archiveReason || ''
});

const buildInternalUserResponse = (user, presence = null) => ({
  ...mapInternalUserResponse(user),
  liveStatus: {
    isLive: Boolean(presence?.isLive),
    lastSeenAt: presence?.lastSeenAt || null,
    sessionStartedAt: presence?.sessionStartedAt || null,
    currentRoute: presence?.currentRoute || ''
  }
});

const buildApplicationAuditState = (application) => ({
  status: application.status,
  rejectionReason: application.rejectionReason || '',
  approvedAt: application.approvedAt || null,
  printedAt: application.printedAt || null,
  dispatchedAt: application.dispatchedAt || null,
  deliveredAt: application.deliveredAt || null,
  cancelledAt: application.cancelledAt || null,
  latestStatusChangedAt: application.latestStatusChangedAt || null,
  nidNumber: application.nidNumber || ''
});

const buildSupportTicketAuditState = (ticket) => ({
  status: ticket.status,
  assignedTo: ticket.assignedTo ? ticket.assignedTo.toString() : null,
  resolutionNotes: ticket.resolutionNotes || '',
  resolvedAt: ticket.resolvedAt || null,
  closedAt: ticket.closedAt || null
});

const getScopedCitizenIdsForAdmin = async (req) => {
  if (isNationalScope(req.user)) {
    return null;
  }

  const districts = getAdminDistricts(req.user);

  if (districts.length === 0) {
    return [];
  }

  const citizens = await User.find(
    combineMongoFilters(
      { role: 'citizen', isArchived: { $ne: true } },
      buildUserDistrictFilter(districts)
    )
  )
    .select('_id')
    .lean();

  return citizens.map((citizen) => citizen._id);
};

const buildScopedSupportTicketFilter = async (req, baseFilter = {}) => {
  const scopedCitizenIds = await getScopedCitizenIdsForAdmin(req);

  if (scopedCitizenIds === null) {
    return { ...baseFilter };
  }

  if (scopedCitizenIds.length === 0) {
    return combineMongoFilters(baseFilter, { _id: null });
  }

  return combineMongoFilters(baseFilter, { citizen: { $in: scopedCitizenIds } });
};

const assertSupportTicketScope = (req, ticket) => {
  const citizen = ticket?.citizen;

  if (isNationalScope(req.user)) {
    return true;
  }

  return Boolean(citizen && canAccessUserByDistrict(req, citizen));
};

const getScopedCenterIdsForAdmin = async (req) => {
  if (isNationalScope(req.user)) {
    return null;
  }

  const centers = await Center.find(applyAdminDistrictFilter(req, {}, 'district'))
    .select('_id')
    .lean();

  return centers.map((center) => center._id);
};

const buildScopedAppointmentFilter = async (req, baseFilter = {}) => {
  const scopedCenterIds = await getScopedCenterIdsForAdmin(req);

  if (scopedCenterIds === null) {
    return { ...baseFilter };
  }

  const districtFieldFilter = applyAdminDistrictFilter(req, {}, 'centerDistrict');
  const centerIdFilter = scopedCenterIds.length
    ? { center: { $in: scopedCenterIds } }
    : null;
  const accessFilter = centerIdFilter
    ? { $or: [districtFieldFilter, centerIdFilter] }
    : districtFieldFilter;

  return combineMongoFilters(baseFilter, accessFilter);
};

const appendApplicationStatusHistory = (
  application,
  req,
  { fromStatus, toStatus, reason = '', note = '' }
) => {
  if (!fromStatus || !toStatus || fromStatus === toStatus) {
    return;
  }

  const requestContext = getRequestAuditContext(req);
  const changedAt = new Date();

  application.latestStatusChangedAt = changedAt;
  application.statusHistory = Array.isArray(application.statusHistory)
    ? application.statusHistory
    : [];

  application.statusHistory.push({
    fromStatus,
    toStatus,
    reason,
    note,
    changedAt,
    changedBy: req.user?._id || null,
    changedByRole: req.user?.role || 'system',
    ipAddress: requestContext.ipAddress || '',
    userAgent: requestContext.userAgent || '',
    requestId: requestContext.requestId || ''
  });

  if (application.statusHistory.length > 300) {
    application.statusHistory = application.statusHistory.slice(-300);
  }
};

const getCompletedAppointmentMap = async (applications = []) => {
  const approvedApplicationIds = applications
    .filter((application) => application?.status === 'approved' && application?._id)
    .map((application) => application._id);

  if (approvedApplicationIds.length === 0) {
    return new Map();
  }

  const completedAppointments = await Appointment.find({
    application: { $in: approvedApplicationIds },
    status: 'completed'
  })
    .select('application status completedAt appointmentDate appointmentDateKey timeSlot centerName updatedAt createdAt')
    .lean();

  return new Map(
    completedAppointments
      .filter(isCompletedAppointment)
      .map((appointment) => [String(appointment.application), appointment])
  );
};

const getCompletedAppointmentApplicationIdSet = async (applications = []) =>
  new Set((await getCompletedAppointmentMap(applications)).keys());

const filterApplicationsReadyForPrinting = async (applications = []) => {
  const completedApplicationIds =
    await getCompletedAppointmentApplicationIdSet(applications);

  return applications.filter(
    (application) =>
      application?.status !== 'approved' ||
      completedApplicationIds.has(String(application._id))
  );
};

const hasCompletedBiometricAppointment = async (applicationId) => {
  const appointment = await Appointment.findOne({
    application: applicationId,
    status: 'completed'
  })
    .select('_id status')
    .lean();

  return isCompletedAppointment(appointment);
};

const buildMongoCoalesce = (...values) =>
  values.reduceRight(
    (fallback, value) => ({ $ifNull: [value, fallback] }),
    null
  );

const mapPrintingQueueApplication = (application = {}, appointment = null) => {
  const appointmentCompleted = isCompletedAppointment(appointment);
  const isReady = application.status === 'approved' && appointmentCompleted;
  const appointmentCompletedAt =
    appointmentCompleted
      ? appointment?.completedAt || appointment?.updatedAt || appointment?.createdAt || null
      : null;

  return {
    ...application,
    biometricAppointment: appointment
      ? {
          status: appointment.status,
          completedAt: appointmentCompletedAt,
          appointmentDate: appointment.appointmentDate || null,
          appointmentDateKey: appointment.appointmentDateKey || '',
          timeSlot: appointment.timeSlot || '',
          centerName: appointment.centerName || ''
        }
      : null,
    printQueueState: isReady ? 'ready' : 'completed',
    printStatus: isReady
      ? 'ready_for_print'
      : ['printed', 'dispatched', 'delivered'].includes(application.status)
        ? 'printed'
        : ['rejected', 'cancelled'].includes(application.status)
          ? application.status
          : 'not_printable',
    printReadyAt:
      appointmentCompletedAt ||
      application.approvedAt ||
      application.submittedAt ||
      application.createdAt ||
      null
  };
};

const isDeliveryPaymentComplete = (deliveryRequest = null) =>
  ['paid', 'waived'].includes(deliveryRequest?.payment?.status);

const isActiveDeliveryRequest = (application = {}, deliveryRequest = null) =>
  application.status === 'printed' &&
  Boolean(deliveryRequest?.delivery?.requested) &&
  isDeliveryPaymentComplete(deliveryRequest) &&
  !['delivered', 'cancelled'].includes(deliveryRequest?.delivery?.status);

const mapDeliveryQueueApplication = (application = {}, deliveryRequest = null) => {
  const deliveryRequestedAt = deliveryRequest?.delivery?.requestedAt || null;
  const paymentCompletedAt = deliveryRequest?.payment?.completedAt || null;
  const activeDeliveryRequest = isActiveDeliveryRequest(application, deliveryRequest);

  return {
    ...application,
    deliveryQueueState: activeDeliveryRequest ? 'active' : 'completed',
    deliveryQueueAt:
      paymentCompletedAt ||
      deliveryRequestedAt ||
      application.printedAt ||
      application.updatedAt ||
      application.createdAt ||
      null,
    deliveryInfo: deliveryRequest
      ? {
          requestId: deliveryRequest._id,
          requested: Boolean(deliveryRequest.delivery?.requested),
          requestedAt: deliveryRequestedAt,
          status: deliveryRequest.delivery?.status || 'not_requested',
          dispatchedAt: deliveryRequest.delivery?.dispatchedAt || null,
          deliveredAt: deliveryRequest.delivery?.deliveredAt || null,
          address: deliveryRequest.delivery?.address || '',
          contactPhone: deliveryRequest.delivery?.contactPhone || '',
          note: deliveryRequest.delivery?.note || '',
          paymentStatus: deliveryRequest.payment?.status || 'pending',
          paymentMethod: deliveryRequest.payment?.method || '',
          paymentCompletedAt,
          transactionId: deliveryRequest.payment?.transactionId || '',
          amount: deliveryRequest.payment?.amount || 0,
          currency: deliveryRequest.payment?.currency || 'BDT',
          history: deliveryRequest.history || []
        }
      : null,
    deliveryStatus:
      application.status === 'delivered' || application.status === 'cancelled'
        ? application.status
        : deliveryRequest?.delivery?.status || application.status || 'not_requested'
  };
};

const getAdminDashboard = async (req, res) => {
  try {
    res.status(200).json({
      success: true,
      message: 'Welcome to admin dashboard',
      admin: req.user
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

const getAdminDashboardSummary = async (req, res) => {
  try {
    const now = new Date();
    const startOfToday = new Date(now);
    startOfToday.setHours(0, 0, 0, 0);

    const last24HoursStart = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const isMainAdmin = isMainAdminUser(req.user);
    const viewerRole = req.user?.role || 'admin';
    const canManageUsers = canManageInternalUsers(req.user);
    const appScopeFilter = (extra = {}) =>
      applyAdminJurisdictionFilter(req, extra);
    const appointmentBaseScopeFilter = await buildScopedAppointmentFilter(req);
    const appointmentScopeFilter = (extra = {}) =>
      combineMongoFilters(appointmentBaseScopeFilter, extra);
    const centerScopeFilter = (extra = {}) =>
      applyAdminDistrictFilter(req, extra, 'district');
    const supportScopeFilter = await buildScopedSupportTicketFilter(req);

    const activeUserFilter = { isArchived: { $ne: true } };
    const districtScopedCitizenFilter = isNationalScope(req.user)
      ? activeUserFilter
      : combineMongoFilters(
          { ...activeUserFilter, role: 'citizen' },
          buildUserDistrictFilter(getAdminDistricts(req.user))
        );

    const access = {
      viewerRole,
      isMainAdmin,
      canManageUsers,
      canManageApplications: viewerRole === 'admin',
      canManageAppointments: viewerRole === 'admin',
      canManagePrinting: viewerRole === 'admin',
      canManageDelivery: viewerRole === 'admin',
      canManageSupport: ['admin', 'support_staff'].includes(viewerRole),
      canViewAudit: ['admin', 'system_supervisor'].includes(viewerRole),
      canViewAnalytics: ['admin', 'system_supervisor'].includes(viewerRole)
    };

    const [
      totalApplications,
      submittedApplications,
      underReviewApplications,
      approvedApplications,
      rejectedApplications,
      printedApplications,
      deliveredApplications,
      cancelledApplications,
      newApplicationsToday,
      rejectedToday,

      totalAppointments,
      bookedAppointments,
      completedAppointments,
      cancelledAppointments,
      todayAppointments,

      totalSupportTickets,
      openSupportTickets,
      inProgressSupportTickets,
      resolvedSupportTickets,
      closedSupportTickets,
      urgentSupportTickets,
      highPrioritySupportTickets,
      unassignedSupportTickets,
      newTicketsToday,

      totalCenters,
      activeCenters,
      inactiveCenters,

      totalUsers,
      totalCitizens,
      totalInternalUsers,
      totalAdmins,
      totalSupervisors,
      totalSupportStaff,
      blockedUsers,
      pendingUsers,

      auditLogsLast24Hours
    ] = await Promise.all([
      Application.countDocuments(appScopeFilter()),
      Application.countDocuments(appScopeFilter({ status: 'submitted' })),
      Application.countDocuments(appScopeFilter({ status: 'under_review' })),
      Application.countDocuments(appScopeFilter({ status: 'approved' })),
      Application.countDocuments(appScopeFilter({ status: 'rejected' })),
      Application.countDocuments(appScopeFilter({ status: 'printed' })),
      Application.countDocuments(appScopeFilter({ status: 'delivered' })),
      Application.countDocuments(appScopeFilter({ status: 'cancelled' })),
      Application.countDocuments(appScopeFilter({ createdAt: { $gte: startOfToday } })),
      Application.countDocuments(appScopeFilter({
        status: 'rejected',
        updatedAt: { $gte: startOfToday }
      })),

      Appointment.countDocuments(appointmentScopeFilter()),
      Appointment.countDocuments(appointmentScopeFilter({ status: 'booked' })),
      Appointment.countDocuments(appointmentScopeFilter({ status: 'completed' })),
      Appointment.countDocuments(appointmentScopeFilter({ status: 'cancelled' })),
      Appointment.countDocuments(appointmentScopeFilter({
        appointmentDate: { $gte: startOfToday }
      })),

      SupportTicket.countDocuments(supportScopeFilter),
      SupportTicket.countDocuments(combineMongoFilters(supportScopeFilter, { status: 'open' })),
      SupportTicket.countDocuments(combineMongoFilters(supportScopeFilter, { status: 'in_progress' })),
      SupportTicket.countDocuments(combineMongoFilters(supportScopeFilter, { status: 'resolved' })),
      SupportTicket.countDocuments(combineMongoFilters(supportScopeFilter, { status: 'closed' })),
      SupportTicket.countDocuments(combineMongoFilters(supportScopeFilter, { priority: 'urgent' })),
      SupportTicket.countDocuments(combineMongoFilters(supportScopeFilter, { priority: 'high' })),
      SupportTicket.countDocuments(combineMongoFilters(supportScopeFilter, { assignedTo: null })),
      SupportTicket.countDocuments(combineMongoFilters(supportScopeFilter, { createdAt: { $gte: startOfToday } })),

      Center.countDocuments(centerScopeFilter()),
      Center.countDocuments(centerScopeFilter({ isActive: true })),
      Center.countDocuments(centerScopeFilter({ isActive: false })),

      User.countDocuments(districtScopedCitizenFilter),
      User.countDocuments(combineMongoFilters(districtScopedCitizenFilter, { role: 'citizen' })),
      User.countDocuments({ ...activeUserFilter, role: { $in: INTERNAL_USER_ROLES } }),
      User.countDocuments({ ...activeUserFilter, role: 'admin' }),
      User.countDocuments({ ...activeUserFilter, role: 'system_supervisor' }),
      User.countDocuments({ ...activeUserFilter, role: 'support_staff' }),
      User.countDocuments({ ...activeUserFilter, status: 'blocked' }),
      User.countDocuments({ ...activeUserFilter, status: 'pending' }),

      AuditLog.countDocuments({ createdAt: { $gte: last24HoursStart } })
    ]);

    const approvedForPrintApplications = await Application.find(
      appScopeFilter({ status: 'approved' })
    )
      .select('_id status')
      .lean();
    const approvedForPrintCount =
      (await getCompletedAppointmentApplicationIdSet(approvedForPrintApplications)).size;

    const reviewQueue = submittedApplications + underReviewApplications;
    const printingQueue = approvedForPrintCount;
    const deliveryQueue = printedApplications;

    let roleFocus;

    if (viewerRole === 'support_staff') {
      roleFocus = {
        primaryModule: 'support',
        headline: 'Support operations',
        priorityItems: [
          { key: 'open_tickets', label: 'Open tickets', value: openSupportTickets },
          { key: 'in_progress_tickets', label: 'In progress', value: inProgressSupportTickets },
          { key: 'urgent_tickets', label: 'Urgent tickets', value: urgentSupportTickets },
          { key: 'unassigned_tickets', label: 'Unassigned tickets', value: unassignedSupportTickets }
        ]
      };
    } else if (viewerRole === 'system_supervisor') {
      roleFocus = {
        primaryModule: 'supervision',
        headline: 'System supervision',
        priorityItems: [
          { key: 'review_queue', label: 'Review queue', value: reviewQueue },
          { key: 'delivery_queue', label: 'Delivery queue', value: deliveryQueue },
          { key: 'urgent_tickets', label: 'Urgent tickets', value: urgentSupportTickets },
          { key: 'audit_last_24h', label: 'Audit events (24h)', value: auditLogsLast24Hours }
        ]
      };
    } else {
      roleFocus = {
        primaryModule: isMainAdmin ? 'main_admin' : 'admin_operations',
        headline: isMainAdmin ? 'Main admin control' : 'Admin operations',
        priorityItems: [
          { key: 'review_queue', label: 'Review queue', value: reviewQueue },
          { key: 'printing_queue', label: 'Printing queue', value: printingQueue },
          { key: 'delivery_queue', label: 'Delivery queue', value: deliveryQueue },
          { key: 'open_tickets', label: 'Open tickets', value: openSupportTickets }
        ]
      };
    }

    const responseData = {
      meta: {
        generatedAt: now.toISOString(),
        lastUpdatedAt: now.toISOString()
      },
      access,
      roleFocus,

      applications: {
        total: totalApplications,
        submitted: submittedApplications,
        underReview: underReviewApplications,
        approved: approvedApplications,
        rejected: rejectedApplications,
        printed: printedApplications,
        delivered: deliveredApplications,
        cancelled: cancelledApplications,
        newToday: newApplicationsToday,
        rejectedToday
      },

      appointments: {
        total: totalAppointments,
        booked: bookedAppointments,
        completed: completedAppointments,
        cancelled: cancelledAppointments,
        today: todayAppointments
      },

      supportTickets: {
        total: totalSupportTickets,
        open: openSupportTickets,
        inProgress: inProgressSupportTickets,
        resolved: resolvedSupportTickets,
        closed: closedSupportTickets,
        highPriority: highPrioritySupportTickets,
        urgent: urgentSupportTickets,
        unassigned: unassignedSupportTickets,
        newToday: newTicketsToday
      },

      centers: {
        total: totalCenters,
        active: activeCenters,
        inactive: inactiveCenters
      },

      queues: {
        review: reviewQueue,
        printing: printingQueue,
        delivery: deliveryQueue
      },

      alerts: {
        urgentSupportTickets,
        unassignedSupportTickets,
        applicationsRejectedToday: rejectedToday,
        applicationsSubmittedToday: newApplicationsToday,
        appointmentsToday: todayAppointments
      }
    };

    if (access.canManageUsers || access.canViewAnalytics) {
      responseData.users = {
        total: totalUsers,
        citizens: totalCitizens,
        internal: totalInternalUsers,
        admins: totalAdmins,
        systemSupervisors: totalSupervisors,
        supportStaff: totalSupportStaff,
        blocked: blockedUsers,
        pending: pendingUsers
      };
    }

    if (access.canViewAudit) {
      responseData.governance = {
        auditLogsLast24Hours
      };
    }

    return res.status(200).json({
      success: true,
      data: responseData
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

const getInternalUsers = async (req, res) => {
  try {
    if (!ensureMainAdminAccess(req, res)) {
      return;
    }

    const { page, limit, skip } = getPaginationOptions(req.query);
    const sort = getSafeSort(req.query.sort, { createdAt: -1 }, [
      'createdAt',
      'updatedAt',
      'fullName',
      'email',
      'role',
      'status'
    ]);

    const filter = {
      role: { $in: INTERNAL_USER_ROLES },
      isArchived: { $ne: true }
    };
    const liveCutoff = new Date(
      Date.now() - LIVE_WINDOW_MINUTES * 60 * 1000
    );
    const liveUserIds = await AdminPresence.distinct('userId', {
      isOnline: true,
      lastSeenAt: { $gte: liveCutoff }
    });

    if (INTERNAL_USER_ROLES.includes(req.query.role)) {
      filter.role = req.query.role;
    }

    if (['active', 'blocked', 'pending'].includes(req.query.status)) {
      filter.status = req.query.status;
    }

    if (req.query.workingStatus === 'live') {
      filter._id = { $in: liveUserIds };
    } else if (req.query.workingStatus === 'offline') {
      filter._id = { $nin: liveUserIds };
    }

    if (req.query.search) {
      const regex = new RegExp(escapeRegex(req.query.search), 'i');
      filter.$or = [
        { fullName: regex },
        { email: regex },
        { phone: regex },
        { role: regex }
      ];
    }

    const baseInternalFilter = {
      role: { $in: INTERNAL_USER_ROLES },
      isArchived: { $ne: true }
    };
    const [
      total,
      users,
      totalInternalUsers,
      totalAdmins,
      totalSupervisors,
      totalSupportStaff,
      liveNow
    ] = await Promise.all([
      User.countDocuments(filter),
      User.find(filter)
        .select('-password')
        .populate('createdBy', 'fullName email')
        .sort(sort)
        .skip(skip)
        .limit(limit),
      User.countDocuments(baseInternalFilter),
      User.countDocuments({ ...baseInternalFilter, role: 'admin' }),
      User.countDocuments({ ...baseInternalFilter, role: 'system_supervisor' }),
      User.countDocuments({ ...baseInternalFilter, role: 'support_staff' }),
      User.countDocuments({
        ...baseInternalFilter,
        _id: { $in: liveUserIds }
      })
    ]);

    const presenceMap = await buildInternalPresenceMap(users.map((user) => user._id));

    const mappedUsers = users.map((user) =>
      buildInternalUserResponse(user, presenceMap[user._id.toString()])
    );

    res.status(200).json({
      success: true,
      count: mappedUsers.length,
      data: mappedUsers,
      users: mappedUsers,
      meta: {
        ...buildPaginationMeta({ page, limit, total }),
        stats: {
          total: totalInternalUsers,
          admins: totalAdmins,
          supervisors: totalSupervisors,
          supportStaff: totalSupportStaff,
          liveNow,
          offline: Math.max(0, totalInternalUsers - liveNow)
        }
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

const getInternalUserDetails = async (req, res) => {
  try {
    if (!ensureMainAdminAccess(req, res)) {
      return;
    }

    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid internal user id'
      });
    }

    const internalUser = await User.findById(req.params.id)
      .select('-password')
      .populate('createdBy', 'fullName email');

    if (
      !internalUser ||
      !INTERNAL_USER_ROLES.includes(internalUser.role) ||
      internalUser.isArchived
    ) {
      return res.status(404).json({
        success: false,
        message: 'Internal user not found'
      });
    }

    const presenceMap = await buildInternalPresenceMap([internalUser._id]);

    return res.status(200).json({
      success: true,
      data: buildInternalUserResponse(
        internalUser,
        presenceMap[internalUser._id.toString()]
      )
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

const createInternalUser = async (req, res) => {
  try {
    if (!ensureMainAdminAccess(req, res)) {
      return;
    }

    const fullName = String(req.body.fullName || '').trim();
    const email = String(req.body.email || '').trim().toLowerCase();
    const phone = String(req.body.phone || '').trim();
    const password = String(req.body.password || '');
    const role = String(req.body.role || '').trim();
    const adminScope = normalizeAdminScope(req.body.adminScope);
    const adminScopeError = validateAdminScope(adminScope);

    if (!fullName || !email || !phone || !password || !role) {
      return res.status(400).json({
        success: false,
        message: 'Full name, email, phone, password and role are required'
      });
    }

    if (!INTERNAL_USER_ROLES.includes(role)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid internal user role'
      });
    }

    if (adminScopeError) {
      return res.status(400).json({
        success: false,
        message: adminScopeError
      });
    }

    if (adminScope.scopeType === 'national' && !isNationalScope(req.user)) {
      return res.status(403).json({
        success: false,
        message: 'Only national-scope admins can create national-scope users'
      });
    }

    if (password.length < 8) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 8 characters'
      });
    }

    const existingEmail = await User.findOne({ email });
    if (existingEmail) {
      return res.status(400).json({
        success: false,
        message: 'Email already in use'
      });
    }

    const existingPhone = await User.findOne({ phone });
    if (existingPhone) {
      return res.status(400).json({
        success: false,
        message: 'Phone already in use'
      });
    }

    const user = await User.create({
      fullName,
      email,
      phone,
      password,
      role,
      permissions: getDefaultPermissions(role),
      adminScope: {
        ...adminScope,
        scopeUpdatedAt: new Date()
      },
      isVerified: true,
      status: 'active',
      createdBy: req.user._id,
      isArchived: false,
      archivedAt: null,
      archivedBy: null,
      archiveReason: ''
    });

    await syncUserBuckets(user);

    await createAuditLog({
      actor: req.user._id,
      actorRole: req.user.role,
      action: 'CREATE_INTERNAL_USER',
      entityType: 'User',
      entityId: user._id,
      message: `Created internal user ${user.fullName}`,
      meta: {
        reason: 'Internal user created by national-scope admin',
        before: null,
        after: buildInternalUserSnapshot(user),
        createdUserRole: user.role,
        createdUserEmail: user.email,
        adminScope: normalizeAdminScope(user.adminScope)
      }
    });

    const bucketUser = await AdminUser.findOne({ userId: user._id });

    res.status(201).json({
      success: true,
      message: 'Internal user created successfully',
      data: {
        ...buildInternalUserResponse(user, null),
        bucketId: bucketUser ? bucketUser._id : null
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

const updateInternalUser = async (req, res) => {
  try {
    if (!ensureMainAdminAccess(req, res)) {
      return;
    }

    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid internal user id'
      });
    }

    const targetUser = await User.findById(req.params.id)
      .select('-password')
      .populate('createdBy', 'fullName email');

    if (!targetUser || !INTERNAL_USER_ROLES.includes(targetUser.role) || targetUser.isArchived) {
      return res.status(404).json({
        success: false,
        message: 'Internal user not found'
      });
    }

    // Never let this panel edit the root main admin account.
    if (isMainAdminUser(targetUser)) {
      return res.status(403).json({
        success: false,
        message: 'Main admin account cannot be edited from this panel'
      });
    }

    const fullName =
      req.body.fullName !== undefined
        ? String(req.body.fullName || '').trim()
        : targetUser.fullName;

    const email =
      req.body.email !== undefined
        ? String(req.body.email || '').trim().toLowerCase()
        : targetUser.email;

    const phone =
      req.body.phone !== undefined
        ? String(req.body.phone || '').trim()
        : targetUser.phone;

    const role =
      req.body.role !== undefined
        ? String(req.body.role || '').trim()
        : targetUser.role;

    const status =
      req.body.status !== undefined
        ? String(req.body.status || '').trim()
        : targetUser.status;
    const adminScope = normalizeAdminScope(
      req.body.adminScope,
      targetUser.adminScope
    );
    const adminScopeError = validateAdminScope(adminScope);

    const updateReason = String(
      req.body.updateReason || 'Internal user updated by national-scope admin'
    ).trim();

    if (!fullName || !email || !phone || !role || !status) {
      return res.status(400).json({
        success: false,
        message: 'Full name, email, phone, role and status are required'
      });
    }

    if (!INTERNAL_USER_ROLES.includes(role)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid internal user role'
      });
    }

    if (!['active', 'blocked', 'pending'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid account status'
      });
    }

    if (adminScopeError) {
      return res.status(400).json({
        success: false,
        message: adminScopeError
      });
    }

    if (adminScope.scopeType === 'national' && !isNationalScope(req.user)) {
      return res.status(403).json({
        success: false,
        message: 'Only national-scope admins can assign national scope'
      });
    }

    const existingEmailUser = await User.findOne({
      email,
      _id: { $ne: targetUser._id }
    });

    if (existingEmailUser) {
      return res.status(400).json({
        success: false,
        message: 'Email already in use'
      });
    }

    const existingPhoneUser = await User.findOne({
      phone,
      _id: { $ne: targetUser._id }
    });

    if (existingPhoneUser) {
      return res.status(400).json({
        success: false,
        message: 'Phone already in use'
      });
    }

    const before = buildInternalUserSnapshot(targetUser);

    targetUser.fullName = fullName;
    targetUser.email = email;
    targetUser.phone = phone;
    targetUser.role = role;
    targetUser.status = status;
    const beforeScope = normalizeAdminScope(before.adminScope);
    const nextScope = {
      ...adminScope,
      scopeUpdatedAt:
        serializeAdminScope(beforeScope) === serializeAdminScope(adminScope)
          ? beforeScope.scopeUpdatedAt
          : new Date()
    };
    targetUser.adminScope = nextScope;

    // Reset permissions when role changes so access stays clean.
    if (before.role !== role) {
      targetUser.permissions = getDefaultPermissions(role);
    }

    const updatedUser = await targetUser.save();
    await syncUserBuckets(updatedUser);

    // Keep live presence in sync when the user gets blocked or role changes.
    if (status === 'blocked') {
      await markInternalUserOffline({
        user: updatedUser,
        req,
        source: 'blocked'
      });
    } else {
      await AdminPresence.findOneAndUpdate(
        { userId: updatedUser._id },
        {
          $set: {
            role: updatedUser.role
          }
        }
      );
    }

    const presenceMap = await buildInternalPresenceMap([updatedUser._id]);

    await createAuditLog({
      actor: req.user._id,
      actorRole: req.user.role,
      action: 'UPDATE_INTERNAL_USER',
      entityType: 'User',
      entityId: updatedUser._id,
      message: `Updated internal user ${updatedUser.fullName}`,
      meta: {
        reason: updateReason,
        before,
        after: buildInternalUserSnapshot(updatedUser)
      }
    });

    if (serializeAdminScope(beforeScope) !== serializeAdminScope(nextScope)) {
      await createAuditLog({
        actor: req.user._id,
        actorRole: req.user.role,
        action: 'ADMIN_SCOPE_UPDATED',
        entityType: 'User',
        entityId: updatedUser._id,
        message: `Updated admin scope for ${updatedUser.fullName}`,
        meta: {
          reason: updateReason,
          before: beforeScope,
          after: normalizeAdminScope(updatedUser.adminScope)
        }
      });
    }

    res.status(200).json({
      success: true,
      message: 'Internal user updated successfully',
      data: buildInternalUserResponse(
        updatedUser,
        presenceMap[updatedUser._id.toString()]
      )
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

const archiveInternalUser = async (req, res) => {
  try {
    if (!ensureMainAdminAccess(req, res)) {
      return;
    }

    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid internal user id'
      });
    }

    const targetUser = await User.findById(req.params.id).select('-password');

    if (!targetUser || !INTERNAL_USER_ROLES.includes(targetUser.role) || targetUser.isArchived) {
      return res.status(404).json({
        success: false,
        message: 'Internal user not found'
      });
    }

    // Main admin should never remove self from the system.
    if (req.user._id.toString() === targetUser._id.toString()) {
      return res.status(400).json({
        success: false,
        message: 'You cannot remove your own account from this panel'
      });
    }

    // Never allow deleting the root main admin account.
    if (isMainAdminUser(targetUser)) {
      return res.status(403).json({
        success: false,
        message: 'Main admin account cannot be removed'
      });
    }

    const archiveReason = String(
      req.body.archiveReason || req.body.reason || ''
    ).trim();

    if (!archiveReason) {
      return res.status(400).json({
        success: false,
        message: 'Archive reason is required'
      });
    }

    const before = buildInternalUserSnapshot(targetUser);

    targetUser.isArchived = true;
    targetUser.archivedAt = new Date();
    targetUser.archivedBy = req.user._id;
    targetUser.archiveReason = archiveReason;
    targetUser.status = 'blocked';

    await targetUser.save();

    await AdminUser.deleteOne({ userId: targetUser._id });

    await markInternalUserOffline({
      user: targetUser,
      req,
      source: 'archived'
    });

    await createAuditLog({
      actor: req.user._id,
      actorRole: req.user.role,
      action: 'ARCHIVE_INTERNAL_USER',
      entityType: 'User',
      entityId: targetUser._id,
      message: `Archived internal user ${targetUser.fullName}`,
      meta: {
        reason: archiveReason,
        before,
        after: buildInternalUserSnapshot(targetUser)
      }
    });

    res.status(200).json({
      success: true,
      message: 'Internal user removed from active control successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

const getAllSupportTickets = async (req, res) => {
  try {
    const { page, limit, skip } = getPaginationOptions(req.query);
    const sort = getSafeSort(req.query.sort, { createdAt: -1 }, [
      'createdAt',
      'updatedAt',
      'priority',
      'status',
      'resolvedAt',
      'closedAt'
    ]);

    const filter = {};
    const { status, priority, category, assignedTo } = req.query;

    if (status) filter.status = status;
    if (priority) filter.priority = priority;
    if (category) filter.category = category;

    if (assignedTo === 'unassigned') {
      filter.assignedTo = null;
    } else if (assignedTo) {
      filter.assignedTo = assignedTo;
    }

    if (req.query.search) {
      const regex = new RegExp(escapeRegex(req.query.search), 'i');
      filter.$or = [
        { ticketNumber: regex },
        { subject: regex },
        { description: regex }
      ];
    }

    const scopedFilter = await buildScopedSupportTicketFilter(req, filter);

    const [tickets, total] = await Promise.all([
      SupportTicket.find(scopedFilter)
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .populate('citizen', 'fullName email phone role presentAddress permanentAddress')
        .populate('assignedTo', 'fullName email role adminScope'),
      SupportTicket.countDocuments(scopedFilter)
    ]);

    res.status(200).json({
      success: true,
      count: tickets.length,
      data: tickets,
      tickets,
      meta: buildPaginationMeta({ page, limit, total })
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

const getSupportStats = async (req, res) => {
  try {
    const scopedFilter = await buildScopedSupportTicketFilter(req);
    const [
      totalTickets,
      openTickets,
      inProgressTickets,
      resolvedTickets,
      closedTickets,
      highPriorityTickets,
      urgentTickets,
      unassignedTickets
    ] = await Promise.all([
      SupportTicket.countDocuments(scopedFilter),
      SupportTicket.countDocuments(combineMongoFilters(scopedFilter, { status: 'open' })),
      SupportTicket.countDocuments(combineMongoFilters(scopedFilter, { status: 'in_progress' })),
      SupportTicket.countDocuments(combineMongoFilters(scopedFilter, { status: 'resolved' })),
      SupportTicket.countDocuments(combineMongoFilters(scopedFilter, { status: 'closed' })),
      SupportTicket.countDocuments(combineMongoFilters(scopedFilter, { priority: 'high' })),
      SupportTicket.countDocuments(combineMongoFilters(scopedFilter, { priority: 'urgent' })),
      SupportTicket.countDocuments(combineMongoFilters(scopedFilter, { assignedTo: null }))
    ]);

    res.status(200).json({
      success: true,
      data: {
        totalTickets,
        openTickets,
        inProgressTickets,
        resolvedTickets,
        closedTickets,
        highPriorityTickets,
        urgentTickets,
        unassignedTickets
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

const assignSupportTicket = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid ticket id'
      });
    }

    const ticket = await SupportTicket.findById(req.params.id).populate(
      'citizen',
      'fullName email phone role presentAddress permanentAddress'
    );

    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: 'Support ticket not found'
      });
    }

    if (!assertSupportTicketScope(req, ticket)) {
      return res.status(403).json({
        success: false,
        message: 'You do not have access to this support ticket district'
      });
    }

    const beforeState = buildSupportTicketAuditState(ticket);
    const requestContext = getRequestAuditContext(req);
    const assignmentReason = String(req.body.assignmentReason || '').trim();
    const assignmentNote = String(req.body.assignmentNote || '').trim();

    let assigneeId = req.body.assignedTo || req.user._id;

    if (req.body.assignedTo) {
      const assignee = await User.findById(req.body.assignedTo);

      if (!assignee) {
        return res.status(404).json({
          success: false,
          message: 'Assigned admin user not found'
        });
      }

      if (!['admin', 'support_staff'].includes(assignee.role)) {
        return res.status(400).json({
          success: false,
          message: 'Ticket can only be assigned to admin or support staff'
        });
      }

      if (assignee.isArchived || assignee.status === 'blocked') {
        return res.status(400).json({
          success: false,
          message: 'Cannot assign ticket to inactive internal user'
        });
      }

      if (!canAccessUserByDistrict(assignee, ticket.citizen)) {
        return res.status(400).json({
          success: false,
          message: 'Selected assignee does not have access to this ticket district'
        });
      }
    }

    ticket.assignedTo = assigneeId;

    if (ticket.status === 'open') {
      ticket.status = 'in_progress';
    }

    await ticket.save();

    const afterState = buildSupportTicketAuditState(ticket);

    await createAuditLog({
      actor: req.user._id,
      actorRole: req.user.role,
      action: 'ASSIGN_SUPPORT_TICKET',
      entityType: 'SupportTicket',
      entityId: ticket._id,
      message: `Assigned support ticket ${ticket.ticketNumber || ''}`.trim(),
      reason: assignmentReason || 'Support ticket assignment updated',
      severity: ticket.priority === 'urgent' ? 'warning' : 'info',
      sourceModule: 'admin.support',
      requestContext,
      beforeState,
      afterState,
      meta: {
        assignedTo: assigneeId.toString(),
        assignmentNote
      }
    });

    const updatedTicket = await SupportTicket.findById(ticket._id)
      .populate('citizen', 'fullName email phone role presentAddress permanentAddress')
      .populate('assignedTo', 'fullName email role adminScope');

    res.status(200).json({
      success: true,
      message: 'Support ticket assigned successfully',
      data: updatedTicket
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

const updateSupportTicketStatus = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid ticket id'
      });
    }

    const { status, resolutionNotes } = req.body;
    const statusNote = String(req.body.statusNote || '').trim();
    const allowedStatuses = ['open', 'in_progress', 'resolved', 'closed'];

    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid support ticket status'
      });
    }

    const ticket = await SupportTicket.findById(req.params.id).populate(
      'citizen',
      'fullName email phone role presentAddress permanentAddress'
    );

    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: 'Support ticket not found'
      });
    }

    if (!assertSupportTicketScope(req, ticket)) {
      return res.status(403).json({
        success: false,
        message: 'You do not have access to this support ticket district'
      });
    }

    const previousStatus = ticket.status;
    const beforeState = buildSupportTicketAuditState(ticket);
    const requestContext = getRequestAuditContext(req);

    ticket.status = status;

    if (resolutionNotes !== undefined) {
      ticket.resolutionNotes = resolutionNotes;
    }

    if (status === 'resolved' && !ticket.resolvedAt) {
      ticket.resolvedAt = new Date();
    }

    if (status === 'closed' && !ticket.closedAt) {
      ticket.closedAt = new Date();
    }

    await ticket.save();

    const afterState = buildSupportTicketAuditState(ticket);

    await createAuditLog({
      actor: req.user._id,
      actorRole: req.user.role,
      action: 'UPDATE_SUPPORT_TICKET_STATUS',
      entityType: 'SupportTicket',
      entityId: ticket._id,
      message: `Updated support ticket status from ${previousStatus} to ${status}`,
      reason:
        statusNote ||
        resolutionNotes ||
        `Support ticket moved from ${previousStatus} to ${status}`,
      severity:
        ticket.priority === 'urgent' || status === 'closed' ? 'warning' : 'info',
      sourceModule: 'admin.support',
      requestContext,
      beforeState,
      afterState,
      meta: {
        status,
        previousStatus,
        resolutionNotes: resolutionNotes || '',
        statusNote
      }
    });

    const updatedTicket = await SupportTicket.findById(ticket._id)
      .populate('citizen', 'fullName email phone role presentAddress permanentAddress')
      .populate('assignedTo', 'fullName email role adminScope')
      .populate('responses.responder', 'fullName email role');

    res.status(200).json({
      success: true,
      message: 'Support ticket status updated successfully',
      data: updatedTicket
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

const createCenter = async (req, res) => {
  try {
    const {
      name,
      district,
      address,
      contactNumber,
      officeHours,
      dailyCapacity
    } = req.body;

    // Check required fields first.
    if (!name || !district || !address) {
      return res.status(400).json({
        success: false,
        message: 'Name, district and address are required'
      });
    }

    if (!canAccessCenterByDistrict(req, { district })) {
      return res.status(403).json({
        success: false,
        message: 'You do not have access to create a center in this district'
      });
    }

    // Stop duplicate center creation.
    const existingCenter = await Center.findOne({
      name: name.trim(),
      district: district.trim()
    });

    if (existingCenter) {
      return res.status(400).json({
        success: false,
        message: 'Center already exists in this district'
      });
    }

    const center = await Center.create({
      name,
      district,
      address,
      contactNumber,
      officeHours,
      dailyCapacity
    });

    await createAuditLog({
      actor: req.user._id,
      actorRole: req.user.role,
      action: 'CREATE_CENTER',
      entityType: 'Center',
      entityId: center._id,
      message: `Created center ${center.name}`,
      meta: {
        district: center.district
      }
    });

    res.status(201).json({
      success: true,
      message: 'Center created successfully',
      center
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

const getAllCenters = async (req, res) => {
  try {
    const { page, limit, skip } = getPaginationOptions(req.query);
    const sort = getSafeSort(req.query.sort, { createdAt: -1 }, [
      'createdAt',
      'updatedAt',
      'name',
      'district',
      'dailyCapacity',
      'isActive'
    ]);

    const filter = {};

    if (req.query.isActive !== undefined) {
      filter.isActive = req.query.isActive === 'true';
    }

    if (req.query.district) {
      filter.district = req.query.district;
    }

    if (req.query.search) {
      const regex = new RegExp(escapeRegex(req.query.search), 'i');
      filter.$or = [
        { name: regex },
        { district: regex },
        { address: regex },
        { contactNumber: regex }
      ];
    }

    const scopedFilter = applyAdminDistrictFilter(req, filter, 'district');

    const [centers, total] = await Promise.all([
      Center.find(scopedFilter)
        .sort(sort)
        .skip(skip)
        .limit(limit),
      Center.countDocuments(scopedFilter)
    ]);

    res.status(200).json({
      success: true,
      count: centers.length,
      centers,
      data: centers,
      meta: buildPaginationMeta({ page, limit, total })
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

const getSingleCenter = async (req, res) => {
  try {
    // Validate center id before query.
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid center id'
      });
    }

    const center = await Center.findById(req.params.id);

    if (!center) {
      return res.status(404).json({
        success: false,
        message: 'Center not found'
      });
    }

    if (!canAccessCenterByDistrict(req, center)) {
      return res.status(403).json({
        success: false,
        message: 'You do not have access to this center district'
      });
    }

    res.status(200).json({
      success: true,
      center
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

const updateCenter = async (req, res) => {
  try {
    // Validate center id before update.
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid center id'
      });
    }

    const center = await Center.findById(req.params.id);

    if (!center) {
      return res.status(404).json({
        success: false,
        message: 'Center not found'
      });
    }

    if (!canAccessCenterByDistrict(req, center)) {
      return res.status(403).json({
        success: false,
        message: 'You do not have access to this center district'
      });
    }

    const {
      name,
      district,
      address,
      contactNumber,
      officeHours,
      dailyCapacity
    } = req.body;

    if (district !== undefined && !canAccessCenterByDistrict(req, { district })) {
      return res.status(403).json({
        success: false,
        message: 'You do not have access to move this center to that district'
      });
    }

    if (name !== undefined) center.name = name;
    if (district !== undefined) center.district = district;
    if (address !== undefined) center.address = address;
    if (contactNumber !== undefined) center.contactNumber = contactNumber;
    if (officeHours !== undefined) center.officeHours = officeHours;
    if (dailyCapacity !== undefined) center.dailyCapacity = dailyCapacity;

    const updatedCenter = await center.save();

    await createAuditLog({
      actor: req.user._id,
      actorRole: req.user.role,
      action: 'UPDATE_CENTER',
      entityType: 'Center',
      entityId: updatedCenter._id,
      message: `Updated center ${updatedCenter.name}`,
      meta: {
        district: updatedCenter.district
      }
    });

    res.status(200).json({
      success: true,
      message: 'Center updated successfully',
      center: updatedCenter
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

const toggleCenterStatus = async (req, res) => {
  try {
    // Validate center id before status toggle.
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid center id'
      });
    }

    const center = await Center.findById(req.params.id);

    if (!center) {
      return res.status(404).json({
        success: false,
        message: 'Center not found'
      });
    }

    if (!canAccessCenterByDistrict(req, center)) {
      return res.status(403).json({
        success: false,
        message: 'You do not have access to this center district'
      });
    }

    center.isActive = !center.isActive;
    await center.save();

    await createAuditLog({
      actor: req.user._id,
      actorRole: req.user.role,
      action: 'TOGGLE_CENTER_STATUS',
      entityType: 'Center',
      entityId: center._id,
      message: `Center status changed to ${center.isActive ? 'active' : 'inactive'}`,
      meta: {
        isActive: center.isActive
      }
    });

    res.status(200).json({
      success: true,
      message: `Center is now ${center.isActive ? 'active' : 'inactive'}`,
      center
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

const getPrintingQueue = async (req, res) => {
  try {
    const { page, limit, skip } = getPaginationOptions(req.query);
    const filter = {};

    if (req.query.status === 'printed') {
      filter.status = { $in: ['printed', 'dispatched', 'delivered'] };
    } else if (req.query.status) {
      filter.status = req.query.status;
    } else {
      filter.status = { $in: ['approved', 'printed', 'dispatched', 'delivered'] };
    }

    if (req.query.applicationType) {
      filter.applicationType = req.query.applicationType;
    }

    if (req.query.search) {
      const regex = new RegExp(escapeRegex(req.query.search), 'i');
      filter.$or = [
        { applicationId: regex },
        { fullNameEnglish: regex },
        { fullNameBangla: regex },
        { phone: regex },
        { email: regex },
        { birthRegistrationNumber: regex },
        { existingNidNumber: regex },
        { nidNumber: regex }
      ];
    }

    const scopedFilter = applyAdminJurisdictionFilter(req, filter);
    const activeQueueDate = buildMongoCoalesce(
      { $arrayElemAt: ['$completedAppointments.completedAt', 0] },
      '$approvedAt',
      '$submittedAt',
      '$createdAt'
    );
    const completedQueueDate = buildMongoCoalesce(
      '$printedAt',
      '$dispatchedAt',
      '$deliveredAt',
      '$latestStatusChangedAt',
      '$updatedAt',
      '$createdAt'
    );

    const [result = {}] = await Application.aggregate([
      { $match: scopedFilter },
      {
        $lookup: {
          from: Appointment.collection.name,
          let: { applicationId: '$_id' },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ['$application', '$$applicationId'] },
                    { $eq: ['$status', 'completed'] }
                  ]
                }
              }
            },
            { $sort: { completedAt: 1, updatedAt: 1, createdAt: 1, _id: 1 } },
            { $limit: 1 },
            {
              $project: {
                status: 1,
                completedAt: 1,
                appointmentDate: 1,
                appointmentDateKey: 1,
                timeSlot: 1,
                centerName: 1,
                updatedAt: 1,
                createdAt: 1
              }
            }
          ],
          as: 'completedAppointments'
        }
      },
      {
        $match: {
          $or: [
            { status: { $ne: 'approved' } },
            { 'completedAppointments.0': { $exists: true } }
          ]
        }
      },
      {
        $addFields: {
          queueGroup: { $cond: [{ $eq: ['$status', 'approved'] }, 0, 1] },
          queueDate: {
            $cond: [
              { $eq: ['$status', 'approved'] },
              activeQueueDate,
              completedQueueDate
            ]
          }
        }
      },
      { $sort: { queueGroup: 1, queueDate: 1, applicationId: 1, _id: 1 } },
      {
        $facet: {
          rows: [{ $skip: skip }, { $limit: limit }],
          total: [{ $count: 'value' }]
        }
      }
    ]);

    const populatedRows = await Application.populate(result.rows || [], {
      path: 'applicant',
      select: 'fullName email phone role'
    });
    const queueApplications = populatedRows.map((row) => {
      const {
        completedAppointments = [],
        queueGroup,
        queueDate,
        ...application
      } = row;

      return mapPrintingQueueApplication(
        application,
        completedAppointments[0] || null
      );
    });
    const total = result.total?.[0]?.value || 0;

    res.status(200).json({
      success: true,
      count: queueApplications.length,
      applications: queueApplications,
      data: queueApplications,
      meta: buildPaginationMeta({ page, limit, total })
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

const getPrintingQueueDetails = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid application id'
      });
    }

    const application = await Application.findById(req.params.id)
      .populate('applicant', 'fullName email phone role')
      .lean();

    if (!application) {
      return res.status(404).json({
        success: false,
        message: 'Application not found'
      });
    }

    if (!canAccessApplicationByJurisdiction(req, application)) {
      return res.status(403).json({
        success: false,
        message: 'You do not have access to this application jurisdiction'
      });
    }

    const appointment = await Appointment.findOne({
      application: application._id
    })
      .sort({ completedAt: -1, updatedAt: -1, createdAt: -1, _id: -1 })
      .select('status completedAt appointmentDate appointmentDateKey timeSlot centerName updatedAt createdAt')
      .lean();
    const queueApplication = mapPrintingQueueApplication(application, appointment);

    res.status(200).json({
      success: true,
      application: queueApplication,
      data: queueApplication
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

const markApplicationAsPrinted = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid application id'
      });
    }

    const application = await Application.findById(req.params.id);

    if (!application) {
      return res.status(404).json({
        success: false,
        message: 'Application not found'
      });
    }

    if (!canAccessApplicationByJurisdiction(req, application)) {
      return res.status(403).json({
        success: false,
        message: 'You do not have access to this application jurisdiction'
      });
    }

    if (application.status !== 'approved') {
      return res.status(400).json({
        success: false,
        message: 'Only approved applications can be marked as printed'
      });
    }

    const appointmentCompleted = await hasCompletedBiometricAppointment(application._id);

    if (!appointmentCompleted) {
      return res.status(400).json({
        success: false,
        code: 'BIOMETRIC_APPOINTMENT_NOT_COMPLETED',
        message: 'Application can be printed only after the biometric appointment is completed.'
      });
    }

    const previousStatus = application.status;
    const beforeState = buildApplicationAuditState(application);
    const requestContext = getRequestAuditContext(req);
    const printNote = String(req.body.printNote || '').trim();
    const batchReference = String(req.body.batchReference || '').trim();
    const assignmentResult = await getOrCreateNidNumberAssignment(application, {
      metadata: {
        source: 'admin.printing',
        action: 'mark_printed',
        assignedBy: req.user?._id || null
      }
    });

    application.status = 'printed';
    application.printedAt = new Date();

    appendApplicationStatusHistory(application, req, {
      fromStatus: previousStatus,
      toStatus: 'printed',
      reason: printNote || batchReference || 'Application marked as printed',
      note: printNote || batchReference
    });

    const updatedApplication = await application.save();
    const afterState = buildApplicationAuditState(updatedApplication);

    try {
      await createAuditLog({
        actor: req.user._id,
        actorRole: req.user.role,
        action: 'MARK_APPLICATION_PRINTED',
        entityType: 'Application',
        entityId: updatedApplication._id,
        message: `Marked application ${updatedApplication.applicationId} as printed`,
        reason: printNote || batchReference || 'Application marked as printed',
        severity: 'info',
        sourceModule: 'admin.printing',
        requestContext,
        beforeState,
        afterState,
        meta: {
          status: updatedApplication.status,
          nidNumber: updatedApplication.nidNumber,
          nidNumberProvider: assignmentResult.provider,
          printNote,
          batchReference
        }
      });
    } catch (auditError) {
      console.error('Failed to create printing audit log:', auditError);
    }

    res.status(200).json({
      success: true,
      message: 'Application marked as printed successfully',
      application: updatedApplication,
      nidNumber: updatedApplication.nidNumber,
      nidNumberAssignment: {
        nidNumber: assignmentResult.nidNumber,
        provider: assignmentResult.provider,
        created: assignmentResult.created,
        assignedAt: assignmentResult.assignment.assignedAt
      }
    });
  } catch (error) {
    res.status(error?.code === 'NID_NUMBER_ASSIGNMENT_FAILED' ? 409 : 500).json({
      success: false,
      message: error.message
    });
  }
};

const getDeliveryQueue = async (req, res) => {
  try {
    const { page, limit, skip } = getPaginationOptions(req.query);
    const filter = {};

    if (req.query.status) {
      filter.status = req.query.status;
    } else {
      filter.status = { $in: ['printed', 'delivered', 'cancelled'] };
    }

    if (req.query.applicationType) {
      filter.applicationType = req.query.applicationType;
    }

    if (req.query.search) {
      const regex = new RegExp(escapeRegex(req.query.search), 'i');
      filter.$or = [
        { applicationId: regex },
        { fullNameEnglish: regex },
        { fullNameBangla: regex },
        { phone: regex },
        { email: regex },
        { birthRegistrationNumber: regex },
        { existingNidNumber: regex },
        { nidNumber: regex }
      ];
    }

    const scopedFilter = applyAdminJurisdictionFilter(req, filter);
    const activeDeliveryExpression = {
      $and: [
        { $eq: ['$status', 'printed'] },
        { $eq: ['$deliveryRequest.delivery.requested', true] },
        { $in: ['$deliveryRequest.payment.status', ['paid', 'waived']] },
        {
          $not: [
            {
              $in: [
                '$deliveryRequest.delivery.status',
                ['delivered', 'cancelled']
              ]
            }
          ]
        }
      ]
    };
    const activeQueueDate = buildMongoCoalesce(
      '$deliveryRequest.payment.completedAt',
      '$deliveryRequest.delivery.requestedAt',
      '$printedAt',
      '$updatedAt',
      '$createdAt'
    );
    const completedQueueDate = buildMongoCoalesce(
      '$deliveredAt',
      '$printedAt',
      '$updatedAt',
      '$createdAt'
    );

    const [result = {}] = await Application.aggregate([
      { $match: scopedFilter },
      {
        $lookup: {
          from: DeliveryRequest.collection.name,
          localField: '_id',
          foreignField: 'application',
          as: 'deliveryRequests'
        }
      },
      {
        $addFields: {
          deliveryRequest: { $arrayElemAt: ['$deliveryRequests', 0] }
        }
      },
      {
        $addFields: {
          activeDeliveryRequest: activeDeliveryExpression
        }
      },
      {
        $match: {
          $expr: {
            $or: [
              { $ne: ['$status', 'printed'] },
              { $eq: ['$activeDeliveryRequest', true] }
            ]
          }
        }
      },
      {
        $addFields: {
          queueGroup: { $cond: ['$activeDeliveryRequest', 0, 1] },
          queueDate: {
            $cond: [
              '$activeDeliveryRequest',
              activeQueueDate,
              completedQueueDate
            ]
          }
        }
      },
      { $sort: { queueGroup: 1, queueDate: 1, applicationId: 1, _id: 1 } },
      {
        $facet: {
          rows: [{ $skip: skip }, { $limit: limit }],
          total: [{ $count: 'value' }]
        }
      }
    ]);

    const populatedRows = await Application.populate(result.rows || [], {
      path: 'applicant',
      select: 'fullName email phone role'
    });
    const pagedApplications = populatedRows.map((row) => {
      const {
        deliveryRequests,
        deliveryRequest,
        activeDeliveryRequest,
        queueGroup,
        queueDate,
        ...application
      } = row;

      return mapDeliveryQueueApplication(application, deliveryRequest || null);
    });
    const total = result.total?.[0]?.value || 0;

    res.status(200).json({
      success: true,
      count: pagedApplications.length,
      applications: pagedApplications,
      data: pagedApplications,
      meta: buildPaginationMeta({ page, limit, total })
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

const getDeliveryQueueDetails = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid application id'
      });
    }

    const application = await Application.findById(req.params.id)
      .populate('applicant', 'fullName email phone role')
      .lean();

    if (!application) {
      return res.status(404).json({
        success: false,
        message: 'Application not found'
      });
    }

    if (!canAccessApplicationByJurisdiction(req, application)) {
      return res.status(403).json({
        success: false,
        message: 'You do not have access to this application jurisdiction'
      });
    }

    const deliveryRequest = await DeliveryRequest.findOne({
      application: application._id
    }).lean();
    const queueApplication = mapDeliveryQueueApplication(
      application,
      deliveryRequest
    );

    res.status(200).json({
      success: true,
      application: queueApplication,
      data: queueApplication
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

const markApplicationAsDelivered = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid application id'
      });
    }

    const application = await Application.findById(req.params.id);

    if (!application) {
      return res.status(404).json({
        success: false,
        message: 'Application not found'
      });
    }

    if (!canAccessApplicationByJurisdiction(req, application)) {
      return res.status(403).json({
        success: false,
        message: 'You do not have access to this application jurisdiction'
      });
    }

    if (application.status !== 'printed') {
      return res.status(400).json({
        success: false,
        message: 'Only printed applications can be marked as delivered'
      });
    }

    const previousStatus = application.status;
    const beforeState = buildApplicationAuditState(application);
    const requestContext = getRequestAuditContext(req);
    const deliveryNote = String(req.body.deliveryNote || '').trim();
    const deliveryReference = String(req.body.deliveryReference || '').trim();

    application.status = 'delivered';
    application.deliveredAt = new Date();

    appendApplicationStatusHistory(application, req, {
      fromStatus: previousStatus,
      toStatus: 'delivered',
      reason:
        deliveryNote || deliveryReference || 'Application marked as delivered',
      note: deliveryNote || deliveryReference
    });

    const updatedApplication = await application.save();
    const afterState = buildApplicationAuditState(updatedApplication);

    await createAuditLog({
      actor: req.user._id,
      actorRole: req.user.role,
      action: 'MARK_APPLICATION_DELIVERED',
      entityType: 'Application',
      entityId: updatedApplication._id,
      message: `Marked application ${updatedApplication.applicationId} as delivered`,
      reason:
        deliveryNote || deliveryReference || 'Application marked as delivered',
      severity: 'info',
      sourceModule: 'admin.delivery',
      requestContext,
      beforeState,
      afterState,
      meta: {
        status: updatedApplication.status,
        deliveryNote,
        deliveryReference
      }
    });

    res.status(200).json({
      success: true,
      message: 'Application marked as delivered successfully',
      application: updatedApplication
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

const getAllApplicationsForAdmin = async (req, res) => {
  try {
    const { page, limit, skip } = getPaginationOptions(req.query);
    const sort = getSafeSort(req.query.sort, { createdAt: -1 }, [
      'createdAt',
      'updatedAt',
      'submittedAt',
      'approvedAt',
      'printedAt',
      'deliveredAt',
      'status',
      'applicationType'
    ]);

    const filter = {};

    if (req.query.status) {
      filter.status = req.query.status;
    }

    if (req.query.applicationType) {
      filter.applicationType = req.query.applicationType;
    }

    if (req.query.search) {
      const regex = new RegExp(escapeRegex(req.query.search), 'i');
      filter.$or = [
        { applicationId: regex },
        { fullNameEnglish: regex },
        { fullNameBangla: regex },
        { phone: regex },
        { email: regex },
        { birthRegistrationNumber: regex },
        { existingNidNumber: regex }
      ];
    }

    const scopedFilter = applyAdminJurisdictionFilter(req, filter);

    const [applications, total] = await Promise.all([
      Application.find(scopedFilter)
        .populate('applicant', 'fullName email phone role')
        .sort(sort)
        .skip(skip)
        .limit(limit),
      Application.countDocuments(scopedFilter)
    ]);

    res.status(200).json({
      success: true,
      count: applications.length,
      applications,
      data: applications,
      meta: buildPaginationMeta({ page, limit, total })
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

const getSingleApplicationForAdmin = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid application id'
      });
    }

    const application = await Application.findById(req.params.id)
      .populate('applicant', 'fullName email phone role status');

    if (!application) {
      return res.status(404).json({
        success: false,
        message: 'Application not found'
      });
    }

    if (!canAccessApplicationByJurisdiction(req, application)) {
      return res.status(403).json({
        success: false,
        message: 'You do not have access to this application jurisdiction'
      });
    }

    res.status(200).json({
      success: true,
      application
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

const reviewApplicationByAdmin = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid application id'
      });
    }

    const { status, rejectionReason } = req.body;
    const decisionNote = String(req.body.decisionNote || '').trim();
    const allowedStatuses = ['under_review', 'approved', 'rejected'];

    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid application review status'
      });
    }

    const application = await Application.findById(req.params.id);

    if (!application) {
      return res.status(404).json({
        success: false,
        message: 'Application not found'
      });
    }

    if (!canAccessApplicationByJurisdiction(req, application)) {
      return res.status(403).json({
        success: false,
        message: 'You do not have access to this application jurisdiction'
      });
    }

    if (status === 'rejected' && !rejectionReason) {
      return res.status(400).json({
        success: false,
        message: 'Rejection reason is required'
      });
    }

    const transitionMap = {
      submitted: ['under_review', 'approved', 'rejected'],
      under_review: ['approved', 'rejected'],
      rejected: ['under_review'],
      approved: [],
      printed: [],
      dispatched: [],
      delivered: [],
      cancelled: [],
      draft: []
    };

    const previousStatus = application.status;

    if (previousStatus === status) {
      return res.status(400).json({
        success: false,
        message: `Application is already in '${status}' status`
      });
    }

    const allowedNextStatuses = transitionMap[previousStatus] || [];

    if (!allowedNextStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Cannot move application from '${previousStatus}' to '${status}'`
      });
    }

    const beforeState = buildApplicationAuditState(application);
    const requestContext = getRequestAuditContext(req);

    application.status = status;

    if (status === 'approved') {
      application.approvedAt = new Date();
      application.rejectionReason = '';
      // TODO: Apply approved correction changes to a stable issued-NID profile model when that model exists.
    }

    if (status === 'rejected') {
      application.rejectionReason = rejectionReason;
    }

    if (status === 'under_review') {
      application.rejectionReason = '';
    }

    appendApplicationStatusHistory(application, req, {
      fromStatus: previousStatus,
      toStatus: status,
      reason:
        rejectionReason ||
        decisionNote ||
        (status === 'approved'
          ? 'Application approved. Biometric appointment is required.'
          : `Application review moved to ${status}`),
      note: decisionNote
    });

    const updatedApplication = await application.save();
    const afterState = buildApplicationAuditState(updatedApplication);

    await createAuditLog({
      actor: req.user._id,
      actorRole: req.user.role,
      action: 'REVIEW_APPLICATION',
      entityType: 'Application',
      entityId: updatedApplication._id,
      message: `Updated application ${updatedApplication.applicationId} from ${previousStatus} to ${status}`,
      reason:
        rejectionReason ||
        decisionNote ||
        `Review status changed to ${status}`,
      severity: status === 'rejected' ? 'warning' : 'info',
      sourceModule: 'admin.applications',
      requestContext,
      beforeState,
      afterState,
      meta: {
        status,
        previousStatus,
        rejectionReason: rejectionReason || '',
        decisionNote
      }
    });

    res.status(200).json({
      success: true,
      message: `Application updated to '${status}'`,
      application: updatedApplication
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

const getApplicationStatsForAdmin = async (req, res) => {
  try {
    const scopeFilter = (extra = {}) =>
      applyAdminJurisdictionFilter(req, extra);

    const [
      totalApplications,
      submittedApplications,
      underReviewApplications,
      approvedApplications,
      rejectedApplications,
      printedApplications,
      deliveredApplications,
      cancelledApplications
    ] = await Promise.all([
      Application.countDocuments(scopeFilter()),
      Application.countDocuments(scopeFilter({ status: 'submitted' })),
      Application.countDocuments(scopeFilter({ status: 'under_review' })),
      Application.countDocuments(scopeFilter({ status: 'approved' })),
      Application.countDocuments(scopeFilter({ status: 'rejected' })),
      Application.countDocuments(scopeFilter({ status: 'printed' })),
      Application.countDocuments(scopeFilter({ status: 'delivered' })),
      Application.countDocuments(scopeFilter({ status: 'cancelled' }))
    ]);

    res.status(200).json({
      success: true,
      data: {
        totalApplications,
        submittedApplications,
        underReviewApplications,
        approvedApplications,
        rejectedApplications,
        printedApplications,
        deliveredApplications,
        cancelledApplications
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

const bulkMarkApplicationsAsPrinted = async (req, res) => {
  try {
    const { applicationIds } = req.body;
    const actionNote = String(req.body.actionNote || '').trim();
    const batchReference = String(req.body.batchReference || '').trim();
    const requestContext = getRequestAuditContext(req);

    if (!Array.isArray(applicationIds) || applicationIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'applicationIds must be a non-empty array'
      });
    }

    const validIds = applicationIds.filter((id) =>
      mongoose.Types.ObjectId.isValid(id)
    );

    if (validIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No valid application ids found'
      });
    }

    const applications = await Application.find({
      _id: { $in: validIds }
    });
    const inaccessibleApplication = applications.find(
      (application) => !canAccessApplicationByJurisdiction(req, application)
    );

    if (inaccessibleApplication) {
      return res.status(403).json({
        success: false,
        message: 'You do not have access to one or more application jurisdictions'
      });
    }

    const completedApplicationIds =
      await getCompletedAppointmentApplicationIdSet(applications);

    let updatedCount = 0;
    const assignedNidNumbers = [];
    const skipped = [];

    for (const application of applications) {
      if (application.status !== 'approved') {
        skipped.push({
          id: application._id,
          applicationId: application.applicationId,
          reason: `Status is '${application.status}'`
        });
        continue;
      }

      if (!completedApplicationIds.has(String(application._id))) {
        skipped.push({
          id: application._id,
          applicationId: application.applicationId,
          reason: 'Biometric appointment is not completed'
        });
        continue;
      }

      const previousStatus = application.status;
      const beforeState = buildApplicationAuditState(application);
      let assignmentResult;

      try {
        assignmentResult = await getOrCreateNidNumberAssignment(application, {
          metadata: {
            source: 'admin.printing',
            action: 'bulk_mark_printed',
            assignedBy: req.user?._id || null
          }
        });

        application.status = 'printed';
        application.printedAt = new Date();

        appendApplicationStatusHistory(application, req, {
          fromStatus: previousStatus,
          toStatus: 'printed',
          reason:
            actionNote || batchReference || 'Application marked as printed in bulk',
          note: actionNote || batchReference
        });

        await application.save();
      } catch (error) {
        skipped.push({
          id: application._id,
          applicationId: application.applicationId,
          reason: error.message || 'NID number assignment or print update failed'
        });
        continue;
      }

      updatedCount += 1;
      assignedNidNumbers.push({
        id: application._id,
        applicationId: application.applicationId,
        nidNumber: application.nidNumber,
        provider: assignmentResult.provider,
        created: assignmentResult.created
      });

      const afterState = buildApplicationAuditState(application);

      try {
        await createAuditLog({
          actor: req.user._id,
          actorRole: req.user.role,
          action: 'BULK_MARK_APPLICATION_PRINTED',
          entityType: 'Application',
          entityId: application._id,
          message: `Marked application ${application.applicationId} as printed`,
          reason:
            actionNote || batchReference || 'Bulk print action completed',
          severity: 'info',
          sourceModule: 'admin.printing',
          requestContext,
          beforeState,
          afterState,
          meta: {
            status: application.status,
            nidNumber: application.nidNumber,
            nidNumberProvider: assignmentResult.provider,
            actionNote,
            batchReference
          }
        });
      } catch (auditError) {
        console.error('Failed to create bulk printing audit log:', auditError);
      }
    }

    res.status(200).json({
      success: true,
      message: 'Bulk print action completed',
      totalRequested: applicationIds.length,
      processed: applications.length,
      updatedCount,
      assignedNidNumbers,
      skipped
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

const bulkMarkApplicationsAsDelivered = async (req, res) => {
  try {
    const { applicationIds } = req.body;
    const actionNote = String(req.body.actionNote || '').trim();
    const deliveryReference = String(req.body.deliveryReference || '').trim();
    const requestContext = getRequestAuditContext(req);

    if (!Array.isArray(applicationIds) || applicationIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'applicationIds must be a non-empty array'
      });
    }

    const validIds = applicationIds.filter((id) =>
      mongoose.Types.ObjectId.isValid(id)
    );

    if (validIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No valid application ids found'
      });
    }

    const applications = await Application.find({
      _id: { $in: validIds }
    });
    const inaccessibleApplication = applications.find(
      (application) => !canAccessApplicationByJurisdiction(req, application)
    );

    if (inaccessibleApplication) {
      return res.status(403).json({
        success: false,
        message: 'You do not have access to one or more application jurisdictions'
      });
    }

    let updatedCount = 0;
    const skipped = [];

    for (const application of applications) {
      if (application.status !== 'printed') {
        skipped.push({
          id: application._id,
          applicationId: application.applicationId,
          reason: `Status is '${application.status}'`
        });
        continue;
      }

      const previousStatus = application.status;
      const beforeState = buildApplicationAuditState(application);

      application.status = 'delivered';
      application.deliveredAt = new Date();

      appendApplicationStatusHistory(application, req, {
        fromStatus: previousStatus,
        toStatus: 'delivered',
        reason:
          actionNote ||
          deliveryReference ||
          'Application marked as delivered in bulk',
        note: actionNote || deliveryReference
      });

      await application.save();
      updatedCount += 1;

      const afterState = buildApplicationAuditState(application);

      await createAuditLog({
        actor: req.user._id,
        actorRole: req.user.role,
        action: 'BULK_MARK_APPLICATION_DELIVERED',
        entityType: 'Application',
        entityId: application._id,
        message: `Marked application ${application.applicationId} as delivered`,
        reason:
          actionNote || deliveryReference || 'Bulk delivery action completed',
        severity: 'info',
        sourceModule: 'admin.delivery',
        requestContext,
        beforeState,
        afterState,
        meta: {
          status: application.status,
          actionNote,
          deliveryReference
        }
      });
    }

    res.status(200).json({
      success: true,
      message: 'Bulk delivery action completed',
      totalRequested: applicationIds.length,
      processed: applications.length,
      updatedCount,
      skipped
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

const getRecentAuditLogs = async (req, res) => {
  try {
    const { page, limit, skip } = getPaginationOptions(req.query);
    const sort = getSafeSort(req.query.sort, { createdAt: -1 }, [
      'createdAt',
      'action',
      'entityType',
      'actorRole',
      'severity',
      'sourceModule'
    ]);

    const filter = {};

    if (req.query.entityType) {
      filter.entityType = req.query.entityType;
    }

    if (req.query.actorRole) {
      filter.actorRole = req.query.actorRole;
    }

    if (req.query.action) {
      filter.action = req.query.action;
    }

    if (req.query.severity) {
      filter.severity = req.query.severity;
    }

    if (req.query.sourceModule) {
      filter.sourceModule = req.query.sourceModule;
    }

    if (req.query.search) {
      const regex = new RegExp(escapeRegex(req.query.search), 'i');
      filter.$or = [
        { action: regex },
        { message: regex },
        { reason: regex },
        { sourceModule: regex }
      ];
    }

    const [logs, total] = await Promise.all([
      AuditLog.find(filter)
        .populate('actor', 'fullName email role')
        .sort(sort)
        .skip(skip)
        .limit(limit),
      AuditLog.countDocuments(filter)
    ]);

    res.status(200).json({
      success: true,
      count: logs.length,
      logs,
      data: logs,
      meta: buildPaginationMeta({ page, limit, total })
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

const getPrintingStats = async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const scopeFilter = (extra = {}) =>
      applyAdminJurisdictionFilter(req, extra);

    const approvedApplications = await Application.find(scopeFilter({ status: 'approved' }))
      .select('_id status')
      .lean();
    const approvedForPrint =
      (await getCompletedAppointmentApplicationIdSet(approvedApplications)).size;

    const [printedCount, printedToday] = await Promise.all([
      Application.countDocuments(
        scopeFilter({ status: { $in: ['printed', 'dispatched', 'delivered'] } })
      ),
      Application.countDocuments(scopeFilter({
        printedAt: { $gte: today }
      }))
    ]);

    res.status(200).json({
      success: true,
      data: {
        approvedForPrint,
        printedCount,
        printedToday
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

const getDeliveryStats = async (req, res) => {
  try {
    const scopeFilter = (extra = {}) =>
      applyAdminJurisdictionFilter(req, extra);

    const printedApplications = await Application.find(scopeFilter({ status: 'printed' }))
      .select('_id status')
      .lean();
    const readyDeliveryRequests = printedApplications.length
      ? await DeliveryRequest.find({
          application: { $in: printedApplications.map((application) => application._id) },
          'delivery.requested': true,
          'delivery.status': { $nin: ['delivered', 'cancelled'] },
          'payment.status': { $in: ['paid', 'waived'] }
        })
          .select('application payment delivery')
          .lean()
      : [];
    const activeDeliveryRequests = readyDeliveryRequests.filter((deliveryRequest) =>
      isActiveDeliveryRequest({ status: 'printed' }, deliveryRequest)
    ).length;

    const [deliveredCount, cancelledCount] = await Promise.all([
      Application.countDocuments(scopeFilter({ status: 'delivered' })),
      Application.countDocuments(scopeFilter({ status: 'cancelled' }))
    ]);

    res.status(200).json({
      success: true,
      data: {
        activeDeliveryRequests,
        deliveredCount,
        cancelledCount
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

const getAuditStats = async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [
      totalLogs,
      todayLogs,
      supportLogs,
      centerLogs,
      applicationLogs
    ] = await Promise.all([
      AuditLog.countDocuments(),
      AuditLog.countDocuments({ createdAt: { $gte: today } }),
      AuditLog.countDocuments({ entityType: 'SupportTicket' }),
      AuditLog.countDocuments({ entityType: 'Center' }),
      AuditLog.countDocuments({ entityType: 'Application' })
    ]);

    res.status(200).json({
      success: true,
      data: {
        totalLogs,
        todayLogs,
        supportLogs,
        centerLogs,
        applicationLogs
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

const exportPrintingReport = async (req, res) => {
  try {
    const filter = {};

    if (req.query.status) {
      filter.status = req.query.status;
    } else {
      filter.status = { $in: ['approved', 'printed', 'delivered'] };
    }

    const scopedFilter = applyAdminJurisdictionFilter(req, filter);

    const applications = await Application.find(scopedFilter)
      .populate('applicant', 'fullName email phone')
      .sort({ createdAt: -1 });
    const reportApplications = await filterApplicationsReadyForPrinting(applications);

    const rows = reportApplications.map((item) => ({
      applicationId: item.applicationId,
      applicantName: item.fullNameEnglish,
      userName: item.applicant?.fullName || '',
      userEmail: item.applicant?.email || '',
      userPhone: item.applicant?.phone || '',
      applicationType: item.applicationType,
      status: item.status,
      approvedAt: item.approvedAt || null,
      printedAt: item.printedAt || null,
      deliveredAt: item.deliveredAt || null,
      createdAt: item.createdAt
    }));

    res.status(200).json({
      success: true,
      count: rows.length,
      rows
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

const exportDeliveryReport = async (req, res) => {
  try {
    const filter = {};

    if (req.query.status) {
      filter.status = req.query.status;
    } else {
      filter.status = { $in: ['printed', 'delivered', 'cancelled'] };
    }

    const scopedFilter = applyAdminJurisdictionFilter(req, filter);

    const applications = await Application.find(scopedFilter)
      .populate('applicant', 'fullName email phone')
      .sort({ createdAt: -1 });

    const rows = applications.map((item) => ({
      applicationId: item.applicationId,
      applicantName: item.fullNameEnglish,
      userName: item.applicant?.fullName || '',
      userEmail: item.applicant?.email || '',
      userPhone: item.applicant?.phone || '',
      status: item.status,
      printedAt: item.printedAt || null,
      deliveredAt: item.deliveredAt || null,
      cancelledAt: item.cancelledAt || null,
      createdAt: item.createdAt
    }));

    res.status(200).json({
      success: true,
      count: rows.length,
      rows
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

const exportAuditReport = async (req, res) => {
  try {
    const filter = {};

    if (req.query.entityType) {
      filter.entityType = req.query.entityType;
    }

    if (req.query.action) {
      filter.action = req.query.action;
    }

    const logs = await AuditLog.find(filter)
      .populate('actor', 'fullName email role')
      .sort({ createdAt: -1 });

    const rows = logs.map((log) => ({
      action: log.action,
      entityType: log.entityType,
      entityId: log.entityId,
      actorName: log.actor?.fullName || '',
      actorEmail: log.actor?.email || '',
      actorRole: log.actorRole,
      message: log.message || '',
      createdAt: log.createdAt
    }));

    res.status(200).json({
      success: true,
      count: rows.length,
      rows
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

module.exports = {
  getAdminDashboard,
  getAdminDashboardSummary,
  getInternalUsers,
  getInternalUserDetails,
  createInternalUser,
  updateInternalUser,
  archiveInternalUser,
  getAllSupportTickets,
  getSupportStats,
  assignSupportTicket,
  updateSupportTicketStatus,
  createCenter,
  getAllCenters,
  getSingleCenter,
  updateCenter,
  toggleCenterStatus,
  getPrintingQueue,
  getPrintingQueueDetails,
  markApplicationAsPrinted,
  getDeliveryQueue,
  getDeliveryQueueDetails,
  markApplicationAsDelivered,
  getRecentAuditLogs,
  getPrintingStats,
  getDeliveryStats,
  getAuditStats,
  bulkMarkApplicationsAsPrinted,
  bulkMarkApplicationsAsDelivered,
  getAllApplicationsForAdmin,
  getSingleApplicationForAdmin,
  reviewApplicationByAdmin,
  getApplicationStatsForAdmin,
  exportPrintingReport,
  exportDeliveryReport,
  exportAuditReport
};
