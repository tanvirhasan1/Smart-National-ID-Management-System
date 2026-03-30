const mongoose = require('mongoose');
const Appointment = require('../models/Appointment');
const Application = require('../models/Application');

const bookAppointment = async (req, res) => {
  try {
    const {
      applicationId,
      appointmentDate,
      timeSlot,
      centerName,
      centerDistrict,
      notes
    } = req.body;

    if (!applicationId || !appointmentDate || !timeSlot || !centerName) {
      return res.status(400).json({
        success: false,
        message: 'Application, appointment date, time slot and center name are required'
      });
    }

    if (!mongoose.Types.ObjectId.isValid(applicationId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid application id'
      });
    }

    const application = await Application.findOne({
      _id: applicationId,
      applicant: req.user._id
    });

    if (!application) {
      return res.status(404).json({
        success: false,
        message: 'Application not found'
      });
    }

    if (application.status !== 'approved') {
      return res.status(400).json({
        success: false,
        message: 'Appointment can only be booked for approved applications'
      });
    }

    const existingAppointment = await Appointment.findOne({
      application: applicationId,
      status: { $in: ['booked', 'completed'] }
    });

    if (existingAppointment) {
      return res.status(400).json({
        success: false,
        message: 'An appointment already exists for this application'
      });
    }

    const appointment = await Appointment.create({
      application: application._id,
      applicant: req.user._id,
      appointmentDate,
      timeSlot,
      centerName,
      centerDistrict,
      notes
    });

    res.status(201).json({
      success: true,
      message: 'Appointment booked successfully',
      appointment
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

const getMyAppointments = async (req, res) => {
  try {
    const appointments = await Appointment.find({
      applicant: req.user._id
    })
      .populate(
        'application',
        'applicationId fullNameEnglish applicationType status'
      )
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: appointments.length,
      appointments
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

module.exports = {
  bookAppointment,
  getMyAppointments
};