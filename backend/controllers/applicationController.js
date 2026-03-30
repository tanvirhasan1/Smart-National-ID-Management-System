const mongoose = require('mongoose');
const { validationResult } = require('express-validator');
const Application = require('../models/Application');

const generateApplicationId = () => {
  return `APP-${Date.now()}`;
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
      submittedAt: new Date()
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
      ['approved', 'rejected', 'printed', 'delivered', 'cancelled'].includes(
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
      'documents',
      'rejectionReason'
    ];

    allowedFields.forEach((field) => {
      if (req.body[field] !== undefined) {
        application[field] = req.body[field];
      }
    });

    const updatedApplication = await application.save();

    res.status(200).json({
      success: true,
      message: 'Application updated successfully',
      application: updatedApplication
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

    if (['approved', 'printed', 'delivered', 'cancelled'].includes(application.status)) {
      return res.status(400).json({
        success: false,
        message: `Application cannot be cancelled when status is '${application.status}'`
      });
    }

    application.status = 'cancelled';
    application.cancelledAt = new Date();

    const cancelledApplication = await application.save();

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

    if (['cancelled', 'printed', 'delivered'].includes(application.status)) {
      return res.status(400).json({
        success: false,
        message: `Application cannot be reviewed when status is '${application.status}'`
      });
    }

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

      application.rejectionReason = rejectionReason;
      application.approvedAt = undefined;
    }

    if (status === 'under_review') {
      application.rejectionReason = '';
      application.approvedAt = undefined;
    }

    const reviewedApplication = await application.save();

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

module.exports = {
  createApplication,
  getMyApplications,
  getSingleApplication,
  updateApplication,
  cancelApplication,
  getAllApplicationsForAdmin,
  getSingleApplicationForAdmin,
  reviewApplicationByAdmin,
  getAdminDashboardStats
};