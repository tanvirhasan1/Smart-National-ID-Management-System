const User = require('../models/User');
const mongoose = require('mongoose');
const { randomUUID } = require('crypto');
const { validationResult } = require('express-validator');
const Application = require('../models/Application');
const { createAuditLog } = require('../utils/auditLogger');
const uploadApplicationDocumentToCloudinary = require('../utils/uploadApplicationDocumentToCloudinary');

const generateApplicationId = () => {
  const shortId = randomUUID().split('-')[0].toUpperCase();
  return `APP-${Date.now()}-${shortId}`;
};

const citizenDocumentFieldMap = {
  photograph: 'photo',
  signature: 'signature',
  birthCertificate: 'birthCertificate'
};

const pushApplicationStatusHistory = ({
  application,
  fromStatus,
  toStatus,
  note = '',
  changedBy = null,
  changedByRole = 'system'
}) => {
  const currentHistory = Array.isArray(application.statusHistory)
    ? [...application.statusHistory]
    : [];

  currentHistory.push({
    fromStatus,
    toStatus,
    note,
    changedAt: new Date(),
    changedBy,
    changedByRole
  });

  application.statusHistory = currentHistory;
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

    const submittedAt = new Date();

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
      documents: {
        birthCertificate: documents?.birthCertificate || '',
        fatherNid: documents?.fatherNid || '',
        motherNid: documents?.motherNid || '',
        utilityBill: documents?.utilityBill || '',
        passport: documents?.passport || '',
        photo: documents?.photo || '',
        signature: documents?.signature || ''
      },
      status: 'submitted',
      submittedAt,
      statusHistory: [
        {
          fromStatus: 'draft',
          toStatus: 'submitted',
          note: 'Application submitted by citizen',
          changedAt: submittedAt,
          changedBy: req.user._id,
          changedByRole: req.user.role
        }
      ]
    });

    await createAuditLog({
      actor: req.user._id,
      actorRole: req.user.role,
      action: 'APPLICATION_CREATED',
      entityType: 'Application',
      entityId: application._id,
      message: `Citizen submitted application ${application.applicationId}`,
      meta: {
        applicationId: application.applicationId,
        applicationType: application.applicationType
      }
    });

    return res.status(201).json({
      success: true,
      message: 'Application submitted successfully',
      application
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

const uploadApplicationDocument = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid application id'
      });
    }

    const { documentType } = req.params;

    if (!citizenDocumentFieldMap[documentType]) {
      return res.status(400).json({
        success: false,
        message: 'Invalid document type'
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Document file is required'
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
        message: `Documents cannot be updated when status is '${application.status}'`
      });
    }

    const uploadResult = await uploadApplicationDocumentToCloudinary({
      fileBuffer: req.file.buffer,
      applicationId: application.applicationId,
      citizenId: req.user._id,
      documentType
    });

    const existingDocument = application.documentAssets?.[documentType] || {};
    const existingHistory = Array.isArray(existingDocument.history)
      ? [...existingDocument.history]
      : [];

    const historyAction =
      existingDocument?.cloudinary?.publicId ? 'replaced' : 'uploaded';

    application.set(
      `documents.${citizenDocumentFieldMap[documentType]}`,
      req.file.originalname
    );

    application.set(`documentAssets.${documentType}`, {
      status: 'uploaded',
      cloudinary: {
        assetId: uploadResult.assetId,
        publicId: uploadResult.publicId,
        version: uploadResult.version,
        secureUrl: uploadResult.secureUrl,
        resourceType: uploadResult.resourceType,
        format: uploadResult.format,
        bytes: uploadResult.bytes,
        width: uploadResult.width,
        height: uploadResult.height,
        originalFilename: uploadResult.originalFilename || req.file.originalname,
        folder: uploadResult.folder,
        etag: uploadResult.etag,
        createdAt: uploadResult.createdAt
      },
      uploadedAt: new Date(),
      uploadedBy: req.user._id,
      verifiedAt: null,
      verifiedBy: null,
      rejectionReason: '',
      history: [
        ...existingHistory,
        {
          action: historyAction,
          actor: req.user._id,
          actorRole: req.user.role,
          note:
            historyAction === 'uploaded'
              ? `${documentType} uploaded by citizen`
              : `${documentType} replaced by citizen`,
          publicId: uploadResult.publicId,
          secureUrl: uploadResult.secureUrl,
          occurredAt: new Date()
        }
      ]
    });

    const updatedApplication = await application.save();

    await createAuditLog({
      actor: req.user._id,
      actorRole: req.user.role,
      action:
        historyAction === 'uploaded'
          ? 'APPLICATION_DOCUMENT_UPLOADED'
          : 'APPLICATION_DOCUMENT_REPLACED',
      entityType: 'Application',
      entityId: updatedApplication._id,
      message: `${documentType} ${historyAction} for ${updatedApplication.applicationId}`,
      meta: {
        applicationId: updatedApplication.applicationId,
        documentType,
        publicId: uploadResult.publicId,
        secureUrl: uploadResult.secureUrl,
        bytes: uploadResult.bytes,
        format: uploadResult.format
      }
    });

    return res.status(200).json({
      success: true,
      message:
        historyAction === 'uploaded'
          ? 'Document uploaded successfully'
          : 'Document replaced successfully',
      data: {
        applicationId: updatedApplication.applicationId,
        documentType,
        document: updatedApplication.documentAssets[documentType]
      }
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

const getMyApplications = async (req, res) => {
  try {
    const applications = await Application.find({ applicant: req.user._id }).sort({
      createdAt: -1
    });

    return res.status(200).json({
      success: true,
      count: applications.length,
      applications
    });
  } catch (error) {
    return res.status(500).json({
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

    return res.status(200).json({
      success: true,
      application
    });
  } catch (error) {
    return res.status(500).json({
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
      action: 'APPLICATION_UPDATED',
      entityType: 'Application',
      entityId: updatedApplication._id,
      message: `Citizen updated application ${updatedApplication.applicationId}`,
      meta: {
        applicationId: updatedApplication.applicationId,
        changedFields
      }
    });

    return res.status(200).json({
      success: true,
      message: 'Application updated successfully',
      application: updatedApplication,
      changedFields
    });
  } catch (error) {
    return res.status(500).json({
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

    pushApplicationStatusHistory({
      application,
      fromStatus: previousStatus,
      toStatus: 'cancelled',
      note: 'Application cancelled by citizen',
      changedBy: req.user._id,
      changedByRole: req.user.role
    });

    const cancelledApplication = await application.save();

    await createAuditLog({
      actor: req.user._id,
      actorRole: req.user.role,
      action: 'APPLICATION_CANCELLED',
      entityType: 'Application',
      entityId: cancelledApplication._id,
      message: `Citizen cancelled application ${cancelledApplication.applicationId}`,
      meta: {
        applicationId: cancelledApplication.applicationId,
        fromStatus: previousStatus,
        toStatus: 'cancelled'
      }
    });

    return res.status(200).json({
      success: true,
      message: 'Application cancelled successfully',
      application: cancelledApplication
    });
  } catch (error) {
    return res.status(500).json({
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

    return res.status(200).json({
      success: true,
      count: applications.length,
      applications
    });
  } catch (error) {
    return res.status(500).json({
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

    const application = await Application.findById(req.params.id).populate(
      'applicant',
      'fullName email phone role isVerified status createdAt'
    );

    if (!application) {
      return res.status(404).json({
        success: false,
        message: 'Application not found'
      });
    }

    return res.status(200).json({
      success: true,
      application
    });
  } catch (error) {
    return res.status(500).json({
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

    pushApplicationStatusHistory({
      application,
      fromStatus: previousStatus,
      toStatus: status,
      note:
        status === 'rejected'
          ? `Application rejected: ${application.rejectionReason}`
          : `Application moved to ${status} by admin`,
      changedBy: req.user._id,
      changedByRole: req.user.role
    });

    const reviewedApplication = await application.save();

    await createAuditLog({
      actor: req.user._id,
      actorRole: req.user.role,
      action: 'APPLICATION_REVIEW_UPDATED',
      entityType: 'Application',
      entityId: reviewedApplication._id,
      message: `Application ${reviewedApplication.applicationId} moved to ${status}`,
      meta: {
        applicationId: reviewedApplication.applicationId,
        fromStatus: previousStatus,
        toStatus: status,
        rejectionReason: status === 'rejected' ? application.rejectionReason : ''
      }
    });

    return res.status(200).json({
      success: true,
      message: `Application ${status} successfully`,
      application: reviewedApplication
    });
  } catch (error) {
    return res.status(500).json({
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

    return res.status(200).json({
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
    return res.status(500).json({
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
  uploadApplicationDocument,
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