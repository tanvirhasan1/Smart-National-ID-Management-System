const User = require('../models/User');
const Application = require('../models/Application');
const Appointment = require('../models/Appointment');
const SupportTicket = require('../models/SupportTicket');

const getUserProfile = async (req, res) => {
  try {
    res.status(200).json({
      success: true,
      message: 'User profile fetched successfully',
      user: req.user
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

const updateUserProfile = async (req, res) => {
  try {
    const { fullName, email, phone, password } = req.body;

    // Find current user
    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Check duplicate email
    if (email && email !== user.email) {
      const existingUser = await User.findOne({ email });

      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: 'Email already in use'
        });
      }
    }

    // Update basic fields
    if (fullName !== undefined) user.fullName = fullName;
    if (email !== undefined) user.email = email;
    if (phone !== undefined) user.phone = phone;

    // Update password only if provided
    if (password) {
      user.password = password;
    }

    const updatedUser = await user.save();

    res.status(200).json({
      success: true,
      message: 'User profile updated successfully',
      user: {
        _id: updatedUser._id,
        fullName: updatedUser.fullName,
        email: updatedUser.email,
        phone: updatedUser.phone,
        role: updatedUser.role,
        isVerified: updatedUser.isVerified,
        status: updatedUser.status,
        createdAt: updatedUser.createdAt,
        updatedAt: updatedUser.updatedAt
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

const getCitizenDashboardSummary = async (req, res) => {
  try {
    // Count user data
    const [
      totalApplications,
      submittedApplications,
      approvedApplications,
      rejectedApplications,
      printedApplications,
      deliveredApplications,
      totalAppointments,
      bookedAppointments,
      completedAppointments,
      totalSupportTickets,
      openSupportTickets,
      resolvedSupportTickets,
      latestApplication,
      latestAppointment,
      latestSupportTicket
    ] = await Promise.all([
      Application.countDocuments({ applicant: req.user._id }),
      Application.countDocuments({
        applicant: req.user._id,
        status: 'submitted'
      }),
      Application.countDocuments({
        applicant: req.user._id,
        status: 'approved'
      }),
      Application.countDocuments({
        applicant: req.user._id,
        status: 'rejected'
      }),
      Application.countDocuments({
        applicant: req.user._id,
        status: 'printed'
      }),
      Application.countDocuments({
        applicant: req.user._id,
        status: 'delivered'
      }),
      Appointment.countDocuments({ applicant: req.user._id }),
      Appointment.countDocuments({
        applicant: req.user._id,
        status: 'booked'
      }),
      Appointment.countDocuments({
        applicant: req.user._id,
        status: 'completed'
      }),
      SupportTicket.countDocuments({ citizen: req.user._id }),
      SupportTicket.countDocuments({
        citizen: req.user._id,
        status: 'open'
      }),
      SupportTicket.countDocuments({
        citizen: req.user._id,
        status: 'resolved'
      }),
      Application.findOne({ applicant: req.user._id }).sort({ createdAt: -1 }),
      Appointment.findOne({ applicant: req.user._id })
        .populate('application', 'applicationId fullNameEnglish status')
        .sort({ createdAt: -1 }),
      SupportTicket.findOne({ citizen: req.user._id }).sort({ createdAt: -1 })
    ]);

    res.status(200).json({
      success: true,
      data: {
        applications: {
          total: totalApplications,
          submitted: submittedApplications,
          approved: approvedApplications,
          rejected: rejectedApplications,
          printed: printedApplications,
          delivered: deliveredApplications
        },
        appointments: {
          total: totalAppointments,
          booked: bookedAppointments,
          completed: completedAppointments
        },
        supportTickets: {
          total: totalSupportTickets,
          open: openSupportTickets,
          resolved: resolvedSupportTickets
        },
        latest: {
          application: latestApplication,
          appointment: latestAppointment,
          supportTicket: latestSupportTicket
        }
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

module.exports = {
  getUserProfile,
  updateUserProfile,
  getCitizenDashboardSummary
};