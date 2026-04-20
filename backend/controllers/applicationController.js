const User = require('../models/User');
const mongoose = require('mongoose');
const { randomUUID } = require('crypto');
const { validationResult } = require('express-validator');
const Application = require('../models/Application');
const { createAuditLog } = require('../utils/auditLogger');

const ACTIVE_APPLICATION_STATUSES = [
  'draft',
  'submitted',
  'under_review',
  'approved',
  'printed',
  'dispatched'
];

const generateApplicationId = () => {
  const shortId = randomUUID().split('-')[0].toUpperCase();
  return `APP-${Date.now()}-${shortId}`;
};

const appendStatusHistory = ({
  application,
  fromStatus,
  toStatus,
  changedBy,
  actorRole,
  note
}) => {
  application.statusHistory.push({
    fromStatus: fromStatus || null,
    toStatus,
    changedBy: changedBy || null,
    actorRole: actorRole || 'system',
    note: note || '',
    changedAt: new Date()
  });

  application.lastStatusChangedAt = new Date();
};

const buildChangedFields = (application, payload, allowedFields) => {
  const changedFields = [];

  allowedFields.forEach((field) => {
    if (payload[field] === undefined) {
      return;
    }

    const currentValue = JSON.stringify(application[field] ?? null);
    const incomingValue = JSON.stringify(payload[field] ?? null);

    if (currentValue !== incomingValue) {
      application[field] = payload[field];
      changedFields.push(field);
    }
  });

  return changedFields;
};

const createApplication = async (req, res) => {
  try {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const existingActiveApplication = await Application.findOne({
      applicant: req.user._id,
      status: { $in: ACTIVE_APPLICATION_STATUSES }
    }).select('_id applicationId status');

    if (existingActiveApplication) {
      return res.status(409).json({
        success: false,
        message:
          'You already have an active application. Please complete, cancel, or wait for the current one before creating another application.',
        activeApplication: existingActiveApplication
      });
    }

    const {
      applicationType,
      fullNameEnglish,
      fullNameBangla,
      fatherName,
      motherName,
      spouseName,
      dateOfBirth,
      gender,
      bloodGroup,
      maritalStatus,
      birthRegistrationNumber,
      existingNidNumber,
      phone,
      email,
      occupation,
      presentAddress,
      permanentAddress,
      documents
    } = req.body;

    const application = await Application.create({
      applicant: req.user._id,
      applicationId: generateApplicationId(),
      applicationType,
      fullNameEnglish,
      fullNameBangla,
      fatherName,
      motherName,
      spouseName,
      dateOfBirth,
      gender,
      bloodGroup,
      maritalStatus,
      birthRegistrationNumber,
      existingNidNumber,
      phone,
      email,
      occupation,
      presentAddress,
      permanentAddress,
      documents,
      status: 'submitted',
      submittedAt: new Date(),
      lastStatusChangedAt: new Date(),
      statusHistory: [
        {
          fromStatus: null,
          toStatus: 'submitted',
          changedBy: req.user._id,
          actorRole: req.user.role,
          note: 'Application submitted by citizen',
          changedAt: new Date()
        }
      ]
    });

    await createAuditLog({
      actor: req.user._id,
      actorRole: req.user.role,
      action: 'application_created',
      entityType: 'Application',
      entityId: application._id,
      message: `Citizen submitted application ${application.applicationId}`,
      meta: {
        applicationId: application.applicationId,
        applicationType: application.applicationType,
        status: application.status
      }
    });

    res.status(201).json({
      success: true,
      message: 'Application submitted successfully',
      application
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

const getMyApplications = async (req, res) => {
  try {
    const applications = await Application.find({ applicant: req.user._id })
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

const getSingleApplication = async (req, res) => {
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
    });

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

const updateApplication = async (req, res) => {
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
    });

    if (!application) {
      return res.status(404).json({
        success: false,
        message: 'Application not found'
      });
    }

    if (
      ['approved', 'rejected', 'printed', 'dispatched', 'delivered', 'cancelled'].includes(
        application.status
      )
    ) {
      return res.status(400).json({
        success: false,
        message: `Application cannot be updated when status is '${application.status}'`
      });
    }

    const allowedFields = [
      'applicationType',
      'fullNameEnglish',
      'fullNameBangla',
      'fatherName',
      'motherName',
      'spouseName',
      'dateOfBirth',
      'gender',
      'bloodGroup',
      'maritalStatus',
      'birthRegistrationNumber',
      'existingNidNumber',
      'phone',
      'email',
      'occupation',
      'presentAddress',
      'permanentAddress',
      'documents'
    ];

    const changedFields = buildChangedFields(application, req.body, allowedFields);

    if (changedFields.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No valid application changes were provided'
      });
    }

    const updatedApplication = await application.save();

    await createAuditLog({
      actor: req.user._id,
      actorRole: req.user.role,
      action: 'application_updated',
      entityType: 'Application',
      entityId: updatedApplication._id,
      message: `Citizen updated application ${updatedApplication.applicationId}`,
      meta: {
        applicationId: updatedApplication.applicationId,
        changedFields
      }
    });

    res.status(200).json({
      success: true,
      message: 'Application updated successfully',
      application: updatedApplication,
      changedFields
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

const cancelApplication = async (req, res) => {
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
    });

    if (!application) {
      return res.status(404).json({
        success: false,
        message: 'Application not found'
      });
    }

    if (
      ['approved', 'printed', 'dispatched', 'delivered', 'cancelled'].includes(
        application.status
      )
    ) {
      return res.status(400).json({
        success: false,
        message: `Application cannot be cancelled when status is '${application.status}'`
      });
    }

    const previousStatus = application.status;

    application.status = 'cancelled';
    application.cancelledAt = new Date();

    appendStatusHistory({
      application,
      fromStatus: previousStatus,
      toStatus: 'cancelled',
      changedBy: req.user._id,
      actorRole: req.user.role,
      note: 'Application cancelled by citizen'
    });

    const cancelledApplication = await application.save();

    await createAuditLog({
      actor: req.user._id,
      actorRole: req.user.role,
      action: 'application_cancelled',
      entityType: 'Application',
      entityId: cancelledApplication._id,
      message: `Citizen cancelled application ${cancelledApplication.applicationId}`,
      meta: {
        applicationId: cancelledApplication.applicationId,
        fromStatus: previousStatus,
        toStatus: 'cancelled'
      }
    });

    res.status(200).json({
      success: true,
      message: 'Application cancelled successfully',
      application: cancelledApplication
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
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid application id'
      });
    }

    const application = await Application.findById(req.params.id)
      .populate('applicant', 'fullName email phone role isVerified status createdAt');

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

    const allowedStatuses = ['under_review', 'approved', 'rejected'];

    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid review status'
      });
    }

    const application = await Application.findById(req.params.id);

    if (!application) {
      return res.status(404).json({
        success: false,
        message: 'Application not found'
      });
    }

    if (['cancelled', 'printed', 'dispatched', 'delivered'].includes(application.status)) {
      return res.status(400).json({
        success: false,
        message: `Application cannot be reviewed when status is '${application.status}'`
      });
    }

    const previousStatus = application.status;
    application.status = status;

    if (status === 'approved') {
      application.approvedAt = new Date();
      application.rejectionReason = '';
    }

    if (status === 'rejected') {
      if (!rejectionReason || !rejectionReason.trim()) {
        return res.status(400).json({
          success: false,
          message: 'Rejection reason is required when rejecting an application'
        });
      }

      application.rejectionReason = rejectionReason.trim();
      application.approvedAt = null;
    }

    if (status === 'under_review') {
      application.rejectionReason = '';
      application.approvedAt = null;
    }

    appendStatusHistory({
      application,
      fromStatus: previousStatus,
      toStatus: status,
      changedBy: req.user._id,
      actorRole: req.user.role,
      note:
        status === 'rejected'
          ? `Application rejected: ${application.rejectionReason}`
          : `Application moved to ${status} by admin`
    });

    const reviewedApplication = await application.save();

    await createAuditLog({
      actor: req.user._id,
      actorRole: req.user.role,
      action: 'application_reviewed',
      entityType: 'Application',
      entityId: reviewedApplication._id,
      message: `Admin changed application ${reviewedApplication.applicationId} from ${previousStatus} to ${status}`,
      meta: {
        applicationId: reviewedApplication.applicationId,
        fromStatus: previousStatus,
        toStatus: status,
        rejectionReason: reviewedApplication.rejectionReason || ''
      }
    });

    res.status(200).json({
      success: true,
      message: `Application ${status} successfully`,
      application: reviewedApplication
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

const getAdminDashboardStats = async (req, res) => {
  try {
    const [
      totalApplications,
      submittedCount,
      underReviewCount,
      approvedCount,
      rejectedCount,
      cancelledCount,
      printedCount,
      dispatchedCount,
      deliveredCount,
      newCount,
      correctionCount,
      reissueCount,
      recentApplications
    ] = await Promise.all([
      Application.countDocuments(),
      Application.countDocuments({ status: 'submitted' }),
      Application.countDocuments({ status: 'under_review' }),
      Application.countDocuments({ status: 'approved' }),
      Application.countDocuments({ status: 'rejected' }),
      Application.countDocuments({ status: 'cancelled' }),
      Application.countDocuments({ status: 'printed' }),
      Application.countDocuments({ status: 'dispatched' }),
      Application.countDocuments({ status: 'delivered' }),
      Application.countDocuments({ applicationType: 'new' }),
      Application.countDocuments({ applicationType: 'correction' }),
      Application.countDocuments({ applicationType: 'reissue' }),
      Application.find()
        .populate('applicant', 'fullName email phone role')
        .sort({ createdAt: -1 })
        .limit(5)
    ]);

    res.status(200).json({
      success: true,
      stats: {
        totalApplications,
        byStatus: {
          submitted: submittedCount,
          under_review: underReviewCount,
          approved: approvedCount,
          rejected: rejectedCount,
          cancelled: cancelledCount,
          printed: printedCount,
          dispatched: dispatchedCount,
          delivered: deliveredCount
        },
        byType: {
          new: newCount,
          correction: correctionCount,
          reissue: reissueCount
        }
      },
      recentApplications
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

const getApplicationPrefill = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).lean();

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    let birthCertificate = null;

    if (user.birthRegNumber) {
      const db = mongoose.connection.db;
      const collection = db.collection('birthcertificates');

      birthCertificate = await collection.findOne({
        $or: [
          { birthRegNumber: user.birthRegNumber },
          { birthRegistrationNumber: user.birthRegNumber }
        ]
      });
    }

    const prefill = {
      fullNameEnglish: birthCertificate?.fullName || user.fullName || '',
      fullNameBangla: birthCertificate?.fullNameBangla || user.fullNameBangla || '',
      fatherName: birthCertificate?.fatherName || '',
      motherName: birthCertificate?.motherName || '',
      placeOfBirth: birthCertificate?.placeOfBirth || user.placeOfBirth || '',
      dateOfBirth: birthCertificate?.dateOfBirth
        ? new Date(birthCertificate.dateOfBirth).toISOString().split('T')[0]
        : user.dateOfBirth
          ? new Date(user.dateOfBirth).toISOString().split('T')[0]
          : '',
      gender: birthCertificate?.gender || user.gender || '',
      birthRegistrationNumber:
        birthCertificate?.birthRegNumber ||
        birthCertificate?.birthRegistrationNumber ||
        user.birthRegNumber ||
        '',
      phone: user.phone || '',
      email: user.email || '',
      presentAddress: {
        division: user.presentAddress?.division || '',
        district: user.presentAddress?.district || '',
        upazila: user.presentAddress?.upazila || '',
        unionOrWard: user.presentAddress?.union || '',
        villageOrArea: user.presentAddress?.village || '',
        postOffice: '',
        postalCode: user.presentAddress?.postCode || ''
      },
      permanentAddress: {
        division: user.permanentAddress?.division || '',
        district: user.permanentAddress?.district || '',
        upazila: user.permanentAddress?.upazila || '',
        unionOrWard: user.permanentAddress?.union || '',
        villageOrArea: user.permanentAddress?.village || '',
        postOffice: '',
        postalCode: user.permanentAddress?.postCode || ''
      }
    };

    return res.status(200).json({
      success: true,
      prefill
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

module.exports = {
  createApplication,
  getMyApplications,
  getSingleApplication,
  updateApplication,
  cancelApplication,
  getAllApplicationsForAdmin,
  getSingleApplicationForAdmin,
  reviewApplicationByAdmin,
  getAdminDashboardStats,
  getApplicationPrefill
};