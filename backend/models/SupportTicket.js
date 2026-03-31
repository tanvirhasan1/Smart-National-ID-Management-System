const mongoose = require('mongoose');

const responseSchema = new mongoose.Schema(
  {
    message: {
      type: String,
      required: [true, 'Response message is required'],
      trim: true
    },
    responder: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    responderRole: {
      type: String,
      enum: ['citizen', 'admin', 'super_admin'],
      required: true
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  },
  { _id: false }
);

const supportTicketSchema = new mongoose.Schema(
  {
    citizen: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    ticketNumber: {
      type: String,
      unique: true,
      trim: true
    },
    subject: {
      type: String,
      required: [true, 'Subject is required'],
      trim: true
    },
    category: {
      type: String,
      enum: ['application_issue', 'appointment', 'payment', 'delivery', 'technical', 'other'],
      required: [true, 'Category is required']
    },
    priority: {
      type: String,
      enum: ['low', 'medium', 'high', 'urgent'],
      default: 'medium'
    },
    description: {
      type: String,
      required: [true, 'Description is required'],
      trim: true
    },
    status: {
      type: String,
      enum: ['open', 'in_progress', 'resolved', 'closed'],
      default: 'open'
    },
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    resolutionNotes: {
      type: String,
      trim: true,
      default: ''
    },
    responses: {
      type: [responseSchema],
      default: []
    },
    resolvedAt: Date,
    closedAt: Date
  },
  {
    timestamps: true
  }
);

module.exports =
  mongoose.models.SupportTicket ||
  mongoose.model('SupportTicket', supportTicketSchema);