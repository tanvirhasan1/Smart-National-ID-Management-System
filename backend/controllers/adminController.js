const mongoose = require('mongoose');
const SupportTicket = require('../models/SupportTicket');
const User = require('../models/User');

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

    let assigneeId = req.body.assignedTo || req.user._id;

    if (req.body.assignedTo) {
      const assignee = await User.findById(req.body.assignedTo);

      if (!assignee) {
        return res.status(404).json({
          success: false,
          message: 'Assigned admin user not found'
        });
      }

      if (!['admin', 'super_admin'].includes(assignee.role)) {
        return res.status(400).json({
          success: false,
          message: 'Ticket can only be assigned to admin or super_admin'
        });
      }
    }

    ticket.assignedTo = assigneeId;

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

module.exports = {
  getAdminDashboard,
  getAllSupportTickets,
  getSupportStats,
  assignSupportTicket,
  updateSupportTicketStatus
};