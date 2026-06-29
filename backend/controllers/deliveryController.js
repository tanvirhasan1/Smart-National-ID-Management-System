const mongoose = require('mongoose');
const { randomUUID } = require('crypto');
const Application = require('../models/Application');
const DeliveryRequest = require('../models/DeliveryRequest');
const { createAuditLog } = require('../utils/auditLogger');

const DELIVERY_FEE_AMOUNT = 80;

const PAYMENT_METHODS = new Set([
  'bkash',
  'nagad',
  'rocket',
  'card',
  'mock',
  'cash_on_delivery'
]);

const normalizePaymentMethod = (value) => {
  const method = String(value || 'bkash').trim().toLowerCase();
  return PAYMENT_METHODS.has(method) ? method : 'bkash';
};

const buildAddressText = (address = {}) =>
  [
    address.villageOrArea,
    address.unionOrWard,
    address.upazila,
    address.district,
    address.division,
    address.postalCode
  ]
    .filter(Boolean)
    .map((part) => String(part).trim())
    .filter(Boolean)
    .join(', ');

const generateTransactionId = () =>
  `DLV-${Date.now()}-${randomUUID().split('-')[0].toUpperCase()}`;

const mapDeliveryRequestToDeliveryInfo = (deliveryRequest) => {
  if (!deliveryRequest) {
    return {
      requested: false,
      requestedAt: null,
      deliveryFee: DELIVERY_FEE_AMOUNT,
      paymentStatus: 'pending',
      paymentMethod: 'bkash',
      transactionId: '',
      paymentCompletedAt: null,
      deliveryAddress: '',
      contactPhone: '',
      note: '',
      deliveryStatus: 'not_requested',
      history: []
    };
  }

  return {
    requested: Boolean(deliveryRequest.delivery?.requested),
    requestedAt: deliveryRequest.delivery?.requestedAt || null,
    deliveryFee: deliveryRequest.payment?.amount || DELIVERY_FEE_AMOUNT,
    paymentStatus: deliveryRequest.payment?.status || 'pending',
    paymentMethod: deliveryRequest.payment?.method || 'bkash',
    transactionId: deliveryRequest.payment?.transactionId || '',
    paymentCompletedAt: deliveryRequest.payment?.completedAt || null,
    deliveryAddress: deliveryRequest.delivery?.address || '',
    contactPhone: deliveryRequest.delivery?.contactPhone || '',
    note: deliveryRequest.delivery?.note || '',
    deliveryStatus: deliveryRequest.delivery?.status || 'not_requested',
    history: deliveryRequest.history || []
  };
};

const completeDeliveryPayment = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid application id'
      });
    }

    const application = await Application.findOne({
      _id: req.params.id,
      applicant: req.user._id
    }).lean();

    if (!application) {
      return res.status(404).json({
        success: false,
        message: 'Application not found'
      });
    }

    if (application.status !== 'printed') {
      return res.status(400).json({
        success: false,
        message: 'Delivery payment is available only after the card is printed'
      });
    }

    const existingRequest = await DeliveryRequest.findOne({
      application: application._id,
      citizen: req.user._id
    });

    if (existingRequest && ['paid', 'waived'].includes(existingRequest.payment?.status)) {
      return res.status(200).json({
        success: true,
        code: 'DELIVERY_ALREADY_REQUESTED',
        message: 'Delivery request has already been submitted',
        application: {
          ...application,
          deliveryInfo: mapDeliveryRequestToDeliveryInfo(existingRequest)
        },
        deliveryRequest: existingRequest
      });
    }

    const paymentMethod = normalizePaymentMethod(req.body.paymentMethod);

    const deliveryAddress = String(
      req.body.deliveryAddress ||
        existingRequest?.delivery?.address ||
        buildAddressText(application.permanentAddress) ||
        buildAddressText(application.presentAddress) ||
        ''
    ).trim();

    const contactPhone = String(
      req.body.contactPhone ||
        existingRequest?.delivery?.contactPhone ||
        application.phone ||
        ''
    ).trim();

    const note = String(req.body.note || '').trim();

    const transactionId =
      String(req.body.transactionId || '').trim() || generateTransactionId();

    if (!deliveryAddress) {
      return res.status(400).json({
        success: false,
        message: 'Delivery address is required'
      });
    }

    if (!contactPhone) {
      return res.status(400).json({
        success: false,
        message: 'Contact phone is required'
      });
    }

    const now = new Date();

    const deliveryRequest = await DeliveryRequest.findOneAndUpdate(
      {
        application: application._id,
        citizen: req.user._id
      },
      {
        $setOnInsert: {
          application: application._id,
          applicationId: application.applicationId,
          citizen: req.user._id
        },
        $set: {
          'payment.amount': DELIVERY_FEE_AMOUNT,
          'payment.currency': 'BDT',
          'payment.status': 'paid',
          'payment.method': paymentMethod,
          'payment.transactionId': transactionId,
          'payment.completedAt': now,

          'delivery.requested': true,
          'delivery.status': 'requested',
          'delivery.requestedAt': now,
          'delivery.address': deliveryAddress,
          'delivery.contactPhone': contactPhone,
          'delivery.note': note
        },
        $push: {
          history: {
            $each: [
              {
                action: 'payment_completed',
                actor: req.user._id,
                actorRole: req.user.role,
                note: `Mock delivery payment completed by ${paymentMethod}`,
                occurredAt: now
              },
              {
                action: 'delivery_requested',
                actor: req.user._id,
                actorRole: req.user.role,
                note: note || 'Citizen requested delivery after payment',
                occurredAt: now
              }
            ]
          }
        }
      },
      {
        new: true,
        upsert: true,
        runValidators: true,
        setDefaultsOnInsert: true
      }
    );

    await createAuditLog({
      actor: req.user._id,
      actorRole: req.user.role,
      action: 'DELIVERY_PAYMENT_COMPLETED',
      entityType: 'DeliveryRequest',
      entityId: deliveryRequest._id,
      message: `Citizen completed mock delivery payment for ${application.applicationId}`,
      sourceModule: 'applications',
      meta: {
        application: application._id,
        applicationId: application.applicationId,
        deliveryRequest: deliveryRequest._id,
        deliveryFee: DELIVERY_FEE_AMOUNT,
        paymentMethod,
        transactionId,
        deliveryAddress,
        contactPhone
      }
    });

    return res.status(200).json({
      success: true,
      message: 'Delivery payment completed and delivery request submitted',
      application: {
        ...application,
        deliveryInfo: mapDeliveryRequestToDeliveryInfo(deliveryRequest)
      },
      deliveryRequest
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

module.exports = {
  completeDeliveryPayment
};