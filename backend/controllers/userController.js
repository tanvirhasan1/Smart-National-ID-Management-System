const mongoose = require('mongoose');
const User = require('../models/User');
const Application = require('../models/Application');
const Appointment = require('../models/Appointment');
const SupportTicket = require('../models/SupportTicket');
const { syncUserBuckets } = require('../utils/userBuckets');


const isFilled = (value) => value !== undefined && value !== null && String(value).trim() !== '';

const firstFilled = (...values) => {
  for (const value of values) {
    if (isFilled(value)) {
      return value;
    }
  }
  return '';
};

const addressHasData = (address = {}) => {
  if (!address) return false;
  if (typeof address === 'string') return address.trim() !== '';
  return Object.values(address).some((value) => isFilled(value));
};

const normalizeAddressFromBirthCertificate = (address = {}) => {
  if (!address || typeof address !== 'object') {
    return {};
  }

  return {
    division: firstFilled(address.division),
    district: firstFilled(address.district),
    upazila: firstFilled(address.upazila, address.thana),
    union: firstFilled(address.union, address.unionOrWard, address.ward),
    village: firstFilled(address.village, address.villageOrArea, address.addressLine),
    postCode: firstFilled(address.postCode, address.postalCode)
  };
};

const mergeAddress = (userAddress = {}, birthAddress = {}) => {
  const normalizedBirthAddress = normalizeAddressFromBirthCertificate(birthAddress);

  if (addressHasData(userAddress)) {
    return {
      ...normalizedBirthAddress,
      ...(typeof userAddress === 'object' ? userAddress : {})
    };
  }

  return normalizedBirthAddress;
};

const findLinkedBirthCertificate = async (user = {}) => {
  const birthRegNumber = String(
    user.birthRegNumber || user.birthRegistrationNumber || ''
  ).trim();

  const linkedUserId = user._id ? String(user._id) : '';
  const lookupConditions = [];

  if (birthRegNumber) {
    lookupConditions.push(
      { birthRegNumber },
      { birthRegistrationNumber: birthRegNumber }
    );
  }

  if (linkedUserId) {
    lookupConditions.push({ linkedUserId: user._id }, { linkedUserId });
  }

  if (!lookupConditions.length) {
    return null;
  }

  try {
    return await mongoose.connection.db
      .collection('birthcertificates')
      .findOne({ $or: lookupConditions });
  } catch (error) {
    // Profile should still load even if the external birth certificate seed collection is unavailable.
    return null;
  }
};

const buildProfileResponse = async (userDoc) => {
  const user = userDoc?.toObject ? userDoc.toObject() : { ...(userDoc || {}) };
  const birthCertificate = await findLinkedBirthCertificate(user);

  if (!birthCertificate) {
    return user;
  }

  const birthRegistrationNumber = firstFilled(
    birthCertificate.birthRegNumber,
    birthCertificate.birthRegistrationNumber,
    user.birthRegNumber,
    user.birthRegistrationNumber
  );

  return {
    ...user,
    fullName: firstFilled(user.fullName, birthCertificate.fullName),
    fullNameBangla: firstFilled(user.fullNameBangla, birthCertificate.fullNameBangla),
    birthRegNumber: birthRegistrationNumber,
    birthRegistrationNumber,
    fatherName: firstFilled(birthCertificate.fatherName, user.fatherName),
    motherName: firstFilled(birthCertificate.motherName, user.motherName),
    dateOfBirth: firstFilled(user.dateOfBirth, birthCertificate.dateOfBirth),
    gender: firstFilled(user.gender, birthCertificate.gender),
    placeOfBirth: firstFilled(user.placeOfBirth, birthCertificate.placeOfBirth),
    presentAddress: mergeAddress(user.presentAddress, birthCertificate.presentAddress),
    permanentAddress: mergeAddress(user.permanentAddress, birthCertificate.permanentAddress),
    officialSource: {
      birthCertificateLinked: true,
      birthCertificateId: birthCertificate._id
    }
  };
};

const getUserProfile = async (req, res) => {
  try {
    const user = await buildProfileResponse(req.user);

    res.status(200).json({
      success: true,
      message: 'User profile fetched successfully',
      user
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
      const existingUser = await User.findOne({
        email,
        _id: { $ne: user._id }
      });

      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: 'Email already in use'
        });
      }
    }

    // Check duplicate phone
    if (phone && phone !== user.phone) {
      const existingPhoneUser = await User.findOne({
        phone,
        _id: { $ne: user._id }
      });

      if (existingPhoneUser) {
        return res.status(400).json({
          success: false,
          message: 'Phone already in use'
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
    await syncUserBuckets(updatedUser);

    const profileResponse = await buildProfileResponse(updatedUser);

    res.status(200).json({
      success: true,
      message: 'User profile updated successfully',
      user: profileResponse
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