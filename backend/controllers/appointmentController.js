const mongoose = require('mongoose');
const Appointment = require('../models/Appointment');
const Application = require('../models/Application');
const Center = require('../models/Center');

const getAvailableCenters = async (req, res) => {
  try {
    const filter = { isActive: true };

    // Filter by district
    if (req.query.district) {
      filter.district = req.query.district;
    }

    const centers = await Center.find(filter)
      .select('name district address contactNumber officeHours dailyCapacity')
      .sort({ name: 1 });

    res.status(200).json({
      success: true,
      count: centers.length,
      centers
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

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

    // Check required fields
    if (!applicationId || !appointmentDate || !timeSlot || !centerName) {
      return res.status(400).json({
        success: false,
        message: 'Application, appointment date, time slot and center name are required'
      });
    }

    // Check application id
    if (!mongoose.Types.ObjectId.isValid(applicationId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid application id'
      });
    }

    // Find user application
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

    // Only approved application can book
    if (application.status !== 'approved') {
      return res.status(400).json({
        success: false,
        message: 'Appointment can only be booked for approved applications'
      });
    }

    // Stop duplicate appointment
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

const getAllAppointmentsForAdmin = async (req, res) => {
  try {
    const filter = {};

    // Filter by status
    if (req.query.status) {
      filter.status = req.query.status;
    }

    // Filter by district
    if (req.query.centerDistrict) {
      filter.centerDistrict = req.query.centerDistrict;
    }

    const appointments = await Appointment.find(filter)
      .populate('applicant', 'fullName email phone role')
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

const getSingleAppointmentForAdmin = async (req, res) => {
  try {
    // Check appointment id
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid appointment id'
      });
    }

    const appointment = await Appointment.findById(req.params.id)
      .populate('applicant', 'fullName email phone role status')
      .populate(
        'application',
        'applicationId fullNameEnglish fullNameBangla applicationType status phone email'
      );

    if (!appointment) {
      return res.status(404).json({
        success: false,
        message: 'Appointment not found'
      });
    }

    res.status(200).json({
      success: true,
      appointment
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

const getAppointmentStatsForAdmin = async (req, res) => {
  try {
    // Count appointment status
    const [
      totalAppointments,
      bookedAppointments,
      completedAppointments,
      cancelledAppointments
    ] = await Promise.all([
      Appointment.countDocuments(),
      Appointment.countDocuments({ status: 'booked' }),
      Appointment.countDocuments({ status: 'completed' }),
      Appointment.countDocuments({ status: 'cancelled' })
    ]);

    res.status(200).json({
      success: true,
      data: {
        totalAppointments,
        bookedAppointments,
        completedAppointments,
        cancelledAppointments
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

const updateAppointmentStatusByAdmin = async (req, res) => {
  try {
    // Check appointment id
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid appointment id'
      });
    }

    const { status } = req.body;
    const allowedStatuses = ['booked', 'completed', 'cancelled'];

    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid appointment status'
      });
    }

    const appointment = await Appointment.findById(req.params.id);

    if (!appointment) {
      return res.status(404).json({
        success: false,
        message: 'Appointment not found'
      });
    }

    // Lock final status
    if (
      ['completed', 'cancelled'].includes(appointment.status) &&
      appointment.status !== status
    ) {
      return res.status(400).json({
        success: false,
        message: `Appointment cannot be changed when status is '${appointment.status}'`
      });
    }

    appointment.status = status;
    const updatedAppointment = await appointment.save();

    res.status(200).json({
      success: true,
      message: `Appointment status updated to '${status}'`,
      appointment: updatedAppointment
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

module.exports = {
  getAvailableCenters,
  bookAppointment,
  getMyAppointments,
  getAllAppointmentsForAdmin,
  getSingleAppointmentForAdmin,
  getAppointmentStatsForAdmin,
  updateAppointmentStatusByAdmin
};