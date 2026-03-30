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
      ['approved', 'rejected', 'printed', 'delivered'].includes(application.status)
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

module.exports = {
  createApplication,
  getMyApplications,
  getSingleApplication,
  updateApplication
};