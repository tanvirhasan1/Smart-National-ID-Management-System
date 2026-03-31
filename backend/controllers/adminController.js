const mongoose = require('mongoose');
const SupportTicket = require('../models/SupportTicket');
const User = require('../models/User');
const Center = require('../models/Center');
const Application = require('../models/Application');
const Appointment = require('../models/Appointment');

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
    // Count main dashboard data
    const [
      totalApplications,
      submittedApplications,
      underReviewApplications,
      approvedApplications,
      rejectedApplications,
      totalAppointments,
      bookedAppointments,
      completedAppointments,
      cancelledAppointments,
      totalSupportTickets,
      openSupportTickets,
      inProgressSupportTickets,
      resolvedSupportTickets,
      totalCenters,
      activeCenters,
      inactiveCenters
    ] = await Promise.all([
      Application.countDocuments(),
      Application.countDocuments({ status: 'submitted' }),
      Application.countDocuments({ status: 'under_review' }),
      Application.countDocuments({ status: 'approved' }),
      Application.countDocuments({ status: 'rejected' }),
      Appointment.countDocuments(),
      Appointment.countDocuments({ status: 'booked' }),
      Appointment.countDocuments({ status: 'completed' }),
      Appointment.countDocuments({ status: 'cancelled' }),
      SupportTicket.countDocuments(),
      SupportTicket.countDocuments({ status: 'open' }),
      SupportTicket.countDocuments({ status: 'in_progress' }),
      SupportTicket.countDocuments({ status: 'resolved' }),
      Center.countDocuments(),
      Center.countDocuments({ isActive: true }),
      Center.countDocuments({ isActive: false })
    ]);

    res.status(200).json({
      success: true,
      data: {
        applications: {
          total: totalApplications,
          submitted: submittedApplications,
          underReview: underReviewApplications,
          approved: approvedApplications,
          rejected: rejectedApplications
        },
        appointments: {
          total: totalAppointments,
          booked: bookedAppointments,
          completed: completedAppointments,
          cancelled: cancelledAppointments
        },
        supportTickets: {
          total: totalSupportTickets,
          open: openSupportTickets,
          inProgress: inProgressSupportTickets,
          resolved: resolvedSupportTickets
        },
        centers: {
          total: totalCenters,
          active: activeCenters,
          inactive: inactiveCenters
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
    // Check ticket id
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

    let assigneeId = req.body.assignedTo || req.user._id;

    if (req.body.assignedTo) {
      const assignee = await User.findById(req.body.assignedTo);

      if (!assignee) {
        return res.status(404).json({
          success: false,
          message: 'Assigned admin user not found'
        });
      }

      // Only admin can be assigned
      if (!['admin', 'super_admin'].includes(assignee.role)) {
        return res.status(400).json({
          success: false,
          message: 'Ticket can only be assigned to admin or super_admin'
        });
      }
    }

    ticket.assignedTo = assigneeId;

    // Move open ticket to in progress
    if (ticket.status === 'open') {
      ticket.status = 'in_progress';
    }

    await ticket.save();

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
    // Check ticket id
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid ticket id'
      });
    }

    const { status, resolutionNotes } = req.body;
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

    ticket.status = status;

    if (resolutionNotes !== undefined) {
      ticket.resolutionNotes = resolutionNotes;
    }

    if (status === 'resolved' && !ticket.resolvedAt) {
      ticket.resolvedAt = new Date();
    }

    if (status === 'closed') {
      ticket.closedAt = new Date();
    }

    await ticket.save();

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

    // Check required fields
    if (!name || !district || !address) {
      return res.status(400).json({
        success: false,
        message: 'Name, district and address are required'
      });
    }

    // Stop duplicate center
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

    // Filter by active status
    if (req.query.isActive !== undefined) {
      filter.isActive = req.query.isActive === 'true';
    }

    // Filter by district
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
    // Check center id
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
    // Check center id
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

    // Update fields
    if (name !== undefined) center.name = name;
    if (district !== undefined) center.district = district;
    if (address !== undefined) center.address = address;
    if (contactNumber !== undefined) center.contactNumber = contactNumber;
    if (officeHours !== undefined) center.officeHours = officeHours;
    if (dailyCapacity !== undefined) center.dailyCapacity = dailyCapacity;

    const updatedCenter = await center.save();

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
    // Check center id
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

    // Toggle status
    center.isActive = !center.isActive;
    await center.save();

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

module.exports = {
  getAdminDashboard,
  getAdminDashboardSummary,
  getAllSupportTickets,
  getSupportStats,
  assignSupportTicket,
  updateSupportTicketStatus,
  createCenter,
  getAllCenters,
  getSingleCenter,
  updateCenter,
  toggleCenterStatus
};