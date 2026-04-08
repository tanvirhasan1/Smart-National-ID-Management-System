const mongoose = require('mongoose');
const { validationResult } = require('express-validator');
const SupportTicket = require('../models/SupportTicket');

const generateTicketNumber = () => {
  const random = Math.floor(1000 + Math.random() * 9000);
  return `TKT-${Date.now()}-${random}`;
};

const createSupportTicket = async (req, res) => {
  try {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const { subject, category, priority, description } = req.body;

    const ticket = await SupportTicket.create({
      citizen: req.user._id,
      ticketNumber: generateTicketNumber(),
      subject,
      category,
      priority: priority || 'medium',
      description,
      status: 'open'
    });

    res.status(201).json({
      success: true,
      message: 'Support ticket created successfully',
      data: ticket
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

const getMySupportTickets = async (req, res) => {
  try {
    const tickets = await SupportTicket.find({ citizen: req.user._id })
      .sort({ createdAt: -1 })
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

const getSingleSupportTicket = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid ticket id'
      });
    }

    const ticket = await SupportTicket.findById(req.params.id)
      .populate('citizen', 'fullName email phone role')
      .populate('assignedTo', 'fullName email role')
      .populate('responses.responder', 'fullName email role');

    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: 'Support ticket not found'
      });
    }

    if (
      req.user.role === 'citizen' &&
      ticket.citizen._id.toString() !== req.user._id.toString()
    ) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view this ticket'
      });
    }

    res.status(200).json({
      success: true,
      data: ticket
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

const respondToSupportTicket = async (req, res) => {
  try {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid ticket id'
      });
    }

    const { message } = req.body;

    const ticket = await SupportTicket.findById(req.params.id);

    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: 'Support ticket not found'
      });
    }

    if (
      req.user.role === 'citizen' &&
      ticket.citizen.toString() !== req.user._id.toString()
    ) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to respond to this ticket'
      });
    }

    if (ticket.status === 'closed') {
      return res.status(400).json({
        success: false,
        message: 'Closed tickets cannot receive new responses'
      });
    }

    ticket.responses.push({
      message,
      responder: req.user._id,
      responderRole: req.user.role
    });

    if (['admin', 'support_staff'].includes(req.user.role)) {
      if (ticket.status === 'open') {
        ticket.status = 'in_progress';
      }

      if (!ticket.assignedTo) {
        ticket.assignedTo = req.user._id;
      }
    }

    await ticket.save();

    const updatedTicket = await SupportTicket.findById(ticket._id)
      .populate('citizen', 'fullName email phone role')
      .populate('assignedTo', 'fullName email role')
      .populate('responses.responder', 'fullName email role');

    res.status(200).json({
      success: true,
      message: 'Response added successfully',
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
  createSupportTicket,
  getMySupportTickets,
  getSingleSupportTicket,
  respondToSupportTicket
};