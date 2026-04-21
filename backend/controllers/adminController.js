const mongoose = require('mongoose');
const SupportTicket = require('../models/SupportTicket');
const User = require('../models/User');
const AdminUser = require('../models/AdminUser');
const Center = require('../models/Center');
const Application = require('../models/Application');
const Appointment = require('../models/Appointment');
const AuditLog = require('../models/AuditLog');
const {
  createAuditLog,
  getRequestAuditContext
} = require('../utils/auditLogger');
const { getDefaultPermissions, isMainAdminUser } = require('../utils/roles');
const { syncUserBuckets } = require('../utils/userBuckets');

// Allowed internal roles for manually created staff users.
const INTERNAL_USER_ROLES = ['admin', 'system_supervisor', 'support_staff'];

// Keep response shape clean for internal users.
const mapInternalUserResponse = (user) => ({
  _id: user._id,
  fullName: user.fullName,
  email: user.email,
  phone: user.phone,
  role: user.role,
  permissions: user.permissions || [],
  status: user.status,
  isVerified: user.isVerified,
  createdBy: user.createdBy,
  createdAt: user.createdAt,
  updatedAt: user.updatedAt
});

// Only the first admin account should manage internal users.
const ensureMainAdminAccess = (req, res) => {
  if (!isMainAdminUser(req.user)) {
    res.status(403).json({
      success: false,
      message: 'Only main admin can manage internal users'
    });
    return false;
  }

  return true;
};

const buildApplicationAuditState = (application) => ({
  status: application.status,
  rejectionReason: application.rejectionReason || '',
  approvedAt: application.approvedAt || null,
  printedAt: application.printedAt || null,
  dispatchedAt: application.dispatchedAt || null,
  deliveredAt: application.deliveredAt || null,
  cancelledAt: application.cancelledAt || null,
  latestStatusChangedAt: application.latestStatusChangedAt || null
});

const buildSupportTicketAuditState = (ticket) => ({
  status: ticket.status,
  assignedTo: ticket.assignedTo ? ticket.assignedTo.toString() : null,
  resolutionNotes: ticket.resolutionNotes || '',
  resolvedAt: ticket.resolvedAt || null,
  closedAt: ticket.closedAt || null
});

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

    const access = {
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
      Application.countDocuments(),
      Application.countDocuments({ status: 'submitted' }),
      Application.countDocuments({ status: 'under_review' }),
      Application.countDocuments({ status: 'approved' }),
      Application.countDocuments({ status: 'rejected' }),
      Application.countDocuments({ status: 'printed' }),
      Application.countDocuments({ status: 'delivered' }),
      Application.countDocuments({ status: 'cancelled' }),
      Application.countDocuments({ createdAt: { $gte: startOfToday } }),
      Application.countDocuments({
        status: 'rejected',
        updatedAt: { $gte: startOfToday }
      }),

      Appointment.countDocuments(),
      Appointment.countDocuments({ status: 'booked' }),
      Appointment.countDocuments({ status: 'completed' }),
      Appointment.countDocuments({ status: 'cancelled' }),
      Appointment.countDocuments({
        appointmentDate: { $gte: startOfToday }
      }),

      SupportTicket.countDocuments(),
      SupportTicket.countDocuments({ status: 'open' }),
      SupportTicket.countDocuments({ status: 'in_progress' }),
      SupportTicket.countDocuments({ status: 'resolved' }),
      SupportTicket.countDocuments({ status: 'closed' }),
      SupportTicket.countDocuments({ priority: 'urgent' }),
      SupportTicket.countDocuments({ priority: 'high' }),
      SupportTicket.countDocuments({ assignedTo: null }),
      SupportTicket.countDocuments({ createdAt: { $gte: startOfToday } }),

      Center.countDocuments(),
      Center.countDocuments({ isActive: true }),
      Center.countDocuments({ isActive: false }),

      User.countDocuments(),
      User.countDocuments({ role: 'citizen' }),
      User.countDocuments({ role: { $in: INTERNAL_USER_ROLES } }),
      User.countDocuments({ role: 'admin' }),
      User.countDocuments({ role: 'system_supervisor' }),
      User.countDocuments({ role: 'support_staff' }),
      User.countDocuments({ status: 'blocked' }),
      User.countDocuments({ status: 'pending' }),

      AuditLog.countDocuments({ createdAt: { $gte: last24HoursStart } })
    ]);

    const reviewQueue = submittedApplications + underReviewApplications;
    const printingQueue = approvedApplications;
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

    const users = await User.find({
      role: { $in: INTERNAL_USER_ROLES }
    })
      .select('-password')
      .populate('createdBy', 'fullName email')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: users.length,
      data: users.map(mapInternalUserResponse)
    });
  } catch (error) {
    res.status(500).json({
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
      isVerified: true,
      status: 'active',
      createdBy: req.user._id
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
        createdUserRole: user.role,
        createdUserEmail: user.email
      }
    });

    const bucketUser = await AdminUser.findOne({ userId: user._id });

    res.status(201).json({
      success: true,
      message: 'Internal user created successfully',
      data: {
        ...mapInternalUserResponse(user),
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

const getAllSupportTickets = async (req, res) => {
  try {
    const filter = {};
    const { status, priority, category } = req.query;

    if (status) filter.status = status;
    if (priority) filter.priority = priority;
    if (category) filter.category = category;

    const tickets = await SupportTicket.find(filter)
      .sort({ createdAt: -1 })
      .populate('citizen', 'fullName email phone role')
      .populate('assignedTo', 'fullName email role');

    res.status(200).json({
      success: true,
      count: tickets.length,
      data: tickets
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
      SupportTicket.countDocuments(),
      SupportTicket.countDocuments({ status: 'open' }),
      SupportTicket.countDocuments({ status: 'in_progress' }),
      SupportTicket.countDocuments({ status: 'resolved' }),
      SupportTicket.countDocuments({ status: 'closed' }),
      SupportTicket.countDocuments({ priority: 'high' }),
      SupportTicket.countDocuments({ priority: 'urgent' }),
      SupportTicket.countDocuments({ assignedTo: null })
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

    const ticket = await SupportTicket.findById(req.params.id);

    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: 'Support ticket not found'
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
      .populate('citizen', 'fullName email phone role')
      .populate('assignedTo', 'fullName email role');

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

    const ticket = await SupportTicket.findById(req.params.id);

    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: 'Support ticket not found'
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
      .populate('citizen', 'fullName email phone role')
      .populate('assignedTo', 'fullName email role')
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
    const filter = {};

    if (req.query.isActive !== undefined) {
      filter.isActive = req.query.isActive === 'true';
    }

    if (req.query.district) {
      filter.district = req.query.district;
    }

    const centers = await Center.find(filter).sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: centers.length,
      centers
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

    const {
      name,
      district,
      address,
      contactNumber,
      officeHours,
      dailyCapacity
    } = req.body;

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
    const filter = {};

    if (req.query.status) {
      filter.status = req.query.status;
    } else {
      filter.status = { $in: ['approved', 'printed'] };
    }

    const applications = await Application.find(filter)
      .populate('applicant', 'fullName email phone role')
      .sort({ approvedAt: 1, createdAt: 1 });

    res.status(200).json({
      success: true,
      count: applications.length,
      applications
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

    if (application.status !== 'approved') {
      return res.status(400).json({
        success: false,
        message: 'Only approved applications can be marked as printed'
      });
    }

    const previousStatus = application.status;
    const beforeState = buildApplicationAuditState(application);
    const requestContext = getRequestAuditContext(req);
    const printNote = String(req.body.printNote || '').trim();
    const batchReference = String(req.body.batchReference || '').trim();

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
        printNote,
        batchReference
      }
    });

    res.status(200).json({
      success: true,
      message: 'Application marked as printed successfully',
      application: updatedApplication
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

const getDeliveryQueue = async (req, res) => {
  try {
    const filter = {};

    if (req.query.status) {
      filter.status = req.query.status;
    } else {
      filter.status = { $in: ['printed', 'delivered'] };
    }

    const applications = await Application.find(filter)
      .populate('applicant', 'fullName email phone role')
      .sort({ printedAt: 1, createdAt: 1 });

    res.status(200).json({
      success: true,
      count: applications.length,
      applications
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
    const filter = {};

    if (req.query.status) {
      filter.status = req.query.status;
    }

    if (req.query.applicationType) {
      filter.applicationType = req.query.applicationType;
    }

    const applications = await Application.find(filter)
      .populate('applicant', 'fullName email phone role')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: applications.length,
      applications
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
    // Validate application id before query.
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
        `Application review moved to ${status}`,
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
      Application.countDocuments(),
      Application.countDocuments({ status: 'submitted' }),
      Application.countDocuments({ status: 'under_review' }),
      Application.countDocuments({ status: 'approved' }),
      Application.countDocuments({ status: 'rejected' }),
      Application.countDocuments({ status: 'printed' }),
      Application.countDocuments({ status: 'delivered' }),
      Application.countDocuments({ status: 'cancelled' })
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

    let updatedCount = 0;
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

      const previousStatus = application.status;
      const beforeState = buildApplicationAuditState(application);

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
      updatedCount += 1;

      const afterState = buildApplicationAuditState(application);

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
          actionNote,
          batchReference
        }
      });
    }

    res.status(200).json({
      success: true,
      message: 'Bulk print action completed',
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
    const limit = Number(req.query.limit) || 20;

    const logs = await AuditLog.find()
      .populate('actor', 'fullName email role')
      .sort({ createdAt: -1 })
      .limit(limit);

    res.status(200).json({
      success: true,
      count: logs.length,
      logs
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

    const [
      approvedForPrint,
      printedCount,
      deliveredAfterPrint,
      printedToday
    ] = await Promise.all([
      Application.countDocuments({ status: 'approved' }),
      Application.countDocuments({ status: 'printed' }),
      Application.countDocuments({ status: 'delivered' }),
      Application.countDocuments({
        printedAt: { $gte: today }
      })
    ]);

    res.status(200).json({
      success: true,
      data: {
        approvedForPrint,
        printedCount,
        deliveredAfterPrint,
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
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [
      readyForDelivery,
      deliveredCount,
      deliveredToday,
      cancelledCount
    ] = await Promise.all([
      Application.countDocuments({ status: 'printed' }),
      Application.countDocuments({ status: 'delivered' }),
      Application.countDocuments({
        deliveredAt: { $gte: today }
      }),
      Application.countDocuments({ status: 'cancelled' })
    ]);

    res.status(200).json({
      success: true,
      data: {
        readyForDelivery,
        deliveredCount,
        deliveredToday,
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

    const applications = await Application.find(filter)
      .populate('applicant', 'fullName email phone')
      .sort({ createdAt: -1 });

    const rows = applications.map((item) => ({
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

    const applications = await Application.find(filter)
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
  createInternalUser,
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
  markApplicationAsPrinted,
  getDeliveryQueue,
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