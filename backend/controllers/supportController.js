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

module.exports = {
  createSupportTicket,
  getMySupportTickets
};