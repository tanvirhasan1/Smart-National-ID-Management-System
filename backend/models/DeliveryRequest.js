const mongoose = require('mongoose');

const deliveryHistorySchema = new mongoose.Schema(
  {
    action: {
      type: String,
      enum: [
        'payment_completed',
        'payment_failed',
        'delivery_requested',
        'dispatch_started',
        'delivered',
        'cancelled',
        'waived'
      ],
      required: true
    },
    actor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    actorRole: {
      type: String,
      enum: ['citizen', 'admin', 'system_supervisor', 'support_staff', 'system'],
      default: 'citizen'
    },
    note: {
      type: String,
      trim: true,
      default: ''
    },
    occurredAt: {
      type: Date,
      default: Date.now
    }
  },
  { _id: false }
);

const deliveryRequestSchema = new mongoose.Schema(
  {
    application: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Application',
      required: true,
      unique: true
    },
    applicationId: {
      type: String,
      required: true,
      trim: true
    },
    citizen: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },

    payment: {
      amount: {
        type: Number,
        default: 80
      },
      currency: {
        type: String,
        default: 'BDT',
        trim: true
      },
      status: {
        type: String,
        enum: ['pending', 'paid', 'failed', 'waived'],
        default: 'pending'
      },
      method: {
        type: String,
        enum: ['bkash', 'nagad', 'rocket', 'card', 'mock', 'cash_on_delivery'],
        default: 'bkash'
      },
      transactionId: {
        type: String,
        trim: true,
        default: ''
      },
      completedAt: {
        type: Date,
        default: null
      }
    },

    delivery: {
      requested: {
        type: Boolean,
        default: false
      },
      status: {
        type: String,
        enum: ['not_requested', 'requested', 'processing', 'dispatched', 'delivered', 'cancelled'],
        default: 'not_requested'
      },
      requestedAt: {
        type: Date,
        default: null
      },
      dispatchedAt: {
        type: Date,
        default: null
      },
      deliveredAt: {
        type: Date,
        default: null
      },
      address: {
        type: String,
        trim: true,
        default: ''
      },
      contactPhone: {
        type: String,
        trim: true,
        default: ''
      },
      note: {
        type: String,
        trim: true,
        default: ''
      }
    },

    history: {
      type: [deliveryHistorySchema],
      default: []
    }
  },
  {
    timestamps: true,
    collection: 'delivery_requests'
  }
);

deliveryRequestSchema.index({ application: 1 });
deliveryRequestSchema.index({ citizen: 1, createdAt: -1 });
deliveryRequestSchema.index({ applicationId: 1 });
deliveryRequestSchema.index({ 'payment.status': 1, createdAt: -1 });
deliveryRequestSchema.index({ 'delivery.status': 1, createdAt: -1 });

module.exports =
  mongoose.models.DeliveryRequest ||
  mongoose.model('DeliveryRequest', deliveryRequestSchema);