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

module.exports = {
  createApplication
};