const crypto = require('crypto');
const { validationResult } = require('express-validator');
const User = require('../models/User');
const PendingRegistration = require('../models/PendingRegistration');
const PasswordResetRequest = require('../models/PasswordResetRequest');
const sendVerificationCode = require('../utils/sendVerificationCode');
const sendPasswordResetCode = require('../utils/sendPasswordResetCode');
const { findBirthCertificateRecord } = require('../utils/birthCertificateLookup');
const {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
  getRefreshCookieOptions
} = require('../utils/token');
const { getDefaultPermissions, isMainAdminUser } = require('../utils/roles');
const { syncUserBuckets } = require('../utils/userBuckets');

const generateOtp = () => Math.floor(100000 + Math.random() * 900000).toString();
const generateSecureToken = () => crypto.randomBytes(32).toString('hex');

const buildUserResponse = (user) => ({
  id: user._id,
  _id: user._id,
  fullName: user.fullName,
  fullNameBangla: user.fullNameBangla,
  birthRegNumber: user.birthRegNumber,
  dateOfBirth: user.dateOfBirth,
  gender: user.gender,
  placeOfBirth: user.placeOfBirth,
  email: user.email,
  phone: user.phone,
  role: user.role,
  permissions: user.permissions,
  isVerified: user.isVerified,
  status: user.status,
  presentAddress: user.presentAddress,
  permanentAddress: user.permanentAddress,
  isMainAdmin: isMainAdminUser(user)
});

const sendAuthResponse = (res, user, message, statusCode = 200) => {
  const accessToken = generateAccessToken(user);
  const refreshToken = generateRefreshToken(user);

  res.cookie('refreshToken', refreshToken, getRefreshCookieOptions());

  return res.status(statusCode).json({
    success: true,
    message,
    accessToken,
    token: accessToken,
    user: buildUserResponse(user)
  });
};

const getValidationErrors = (req) => {
  const errors = validationResult(req);

  if (errors.isEmpty()) {
    return null;
  }

  return errors.array();
};

const normalizeEmail = (value = '') => String(value).trim().toLowerCase();
const normalizePhone = (value = '') => String(value).trim();

const buildDuplicateMessage = (field) => {
  if (field === 'email') {
    return 'এই ইমেইল দিয়ে আগেই অ্যাকাউন্ট খোলা হয়েছে';
  }

  if (field === 'phone') {
    return 'এই মোবাইল নম্বর দিয়ে আগেই অ্যাকাউন্ট খোলা হয়েছে';
  }

  return 'এই তথ্য দিয়ে আগেই অ্যাকাউন্ট খোলা হয়েছে';
};

const registerUser = async (req, res) => {
  try {
    const errors = getValidationErrors(req);

    if (errors) {
      return res.status(400).json({
        success: false,
        errors
      });
    }

    const fullName = String(req.body.fullName || '').trim();
    const fullNameBangla = String(req.body.fullNameBangla || '').trim();
    const birthRegNumber = String(req.body.birthRegNumber || '').trim();
    const dateOfBirth = req.body.dateOfBirth;
    const gender = req.body.gender;
    const placeOfBirth = String(req.body.placeOfBirth || '').trim();
    const email = normalizeEmail(req.body.email);
    const phone = normalizePhone(req.body.mobile || req.body.phone);
    const password = req.body.password;
    const presentAddress = req.body.presentAddress || {};
    const permanentAddress = req.body.permanentAddress || {};

    const birthCertificateMatch = await findBirthCertificateRecord({
      birthRegNumber,
      fullName,
      fullNameBangla,
      dateOfBirth
    });

    if (!birthCertificateMatch) {
      return res.status(400).json({
        success: false,
        message: 'জন্মসনদের সাথে দেওয়া তথ্যের মিল নেই'
      });
    }

    const existingEmailUser = await User.findOne({ email });
    if (existingEmailUser) {
      return res.status(400).json({
        success: false,
        message: buildDuplicateMessage('email')
      });
    }

    const existingPhoneUser = await User.findOne({ phone });
    if (existingPhoneUser) {
      return res.status(400).json({
        success: false,
        message: buildDuplicateMessage('phone')
      });
    }

    await PendingRegistration.deleteMany({
      $or: [{ email }, { phone }]
    });

    const otpCode = generateOtp();
    const verificationToken = generateSecureToken();

    await PendingRegistration.create({
      fullName,
      fullNameBangla,
      birthRegNumber,
      dateOfBirth,
      gender,
      placeOfBirth,
      email,
      phone,
      password,
      presentAddress,
      permanentAddress,
      otpCode,
      otpExpires: new Date(Date.now() + 5 * 60 * 1000),
      verificationToken,
      expiresAt: new Date(Date.now() + 30 * 60 * 1000)
    });

    await sendVerificationCode({
      email,
      fullName,
      code: otpCode
    });

    return res.status(201).json({
      success: true,
      message: 'রেজিস্ট্রেশন সফল হয়েছে। যাচাইকরণ কোড তোমার ইমেইলে পাঠানো হয়েছে।',
      verificationToken,
      recipientEmail: email
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

const verifyOTP = async (req, res) => {
  try {
    const { otp, verificationToken } = req.body;

    if (!otp || !verificationToken) {
      return res.status(400).json({
        success: false,
        message: 'কোড এবং যাচাইকরণ টোকেন প্রয়োজন'
      });
    }

    const pendingRegistration = await PendingRegistration.findOne({ verificationToken });

    if (!pendingRegistration) {
      return res.status(400).json({
        success: false,
        message: 'যাচাইকরণ সেশন পাওয়া যায়নি। আবার রেজিস্টার করো।'
      });
    }

    if (pendingRegistration.otpExpires < new Date()) {
      return res.status(400).json({
        success: false,
        message: 'কোডের সময় শেষ হয়ে গেছে। আবার কোড পাঠাও।'
      });
    }

    if (pendingRegistration.otpCode !== String(otp).trim()) {
      return res.status(400).json({
        success: false,
        message: 'ভুল কোড দেওয়া হয়েছে'
      });
    }

    const duplicateUser = await User.findOne({
      $or: [{ email: pendingRegistration.email }, { phone: pendingRegistration.phone }]
    });

    if (duplicateUser) {
      return res.status(400).json({
        success: false,
        message: 'এই ইমেইল বা মোবাইল নম্বর দিয়ে আগেই অ্যাকাউন্ট খোলা হয়েছে'
      });
    }

    const user = await User.create({
      fullName: pendingRegistration.fullName,
      fullNameBangla: pendingRegistration.fullNameBangla,
      birthRegNumber: pendingRegistration.birthRegNumber,
      dateOfBirth: pendingRegistration.dateOfBirth,
      gender: pendingRegistration.gender,
      placeOfBirth: pendingRegistration.placeOfBirth,
      email: pendingRegistration.email,
      phone: pendingRegistration.phone,
      password: pendingRegistration.password,
      role: 'citizen',
      permissions: getDefaultPermissions('citizen'),
      isVerified: true,
      status: 'active',
      presentAddress: pendingRegistration.presentAddress,
      permanentAddress: pendingRegistration.permanentAddress
    });

    await syncUserBuckets(user);

    await PendingRegistration.deleteMany({
      $or: [{ email: pendingRegistration.email }, { phone: pendingRegistration.phone }]
    });

    return sendAuthResponse(res, user, 'ইমেইল যাচাইকরণ সফল হয়েছে');
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

const resendOTP = async (req, res) => {
  try {
    const { verificationToken } = req.body;

    if (!verificationToken) {
      return res.status(400).json({
        success: false,
        message: 'যাচাইকরণ টোকেন প্রয়োজন'
      });
    }

    const pendingRegistration = await PendingRegistration.findOne({ verificationToken });

    if (!pendingRegistration) {
      return res.status(400).json({
        success: false,
        message: 'যাচাইকরণ সেশন পাওয়া যায়নি। আবার রেজিস্টার করো।'
      });
    }

    pendingRegistration.otpCode = generateOtp();
    pendingRegistration.otpExpires = new Date(Date.now() + 5 * 60 * 1000);
    pendingRegistration.expiresAt = new Date(Date.now() + 30 * 60 * 1000);

    await pendingRegistration.save();

    await sendVerificationCode({
      email: pendingRegistration.email,
      fullName: pendingRegistration.fullName,
      code: pendingRegistration.otpCode
    });

    return res.status(200).json({
      success: true,
      message: 'নতুন যাচাইকরণ কোড তোমার ইমেইলে পাঠানো হয়েছে',
      recipientEmail: pendingRegistration.email
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

const loginUser = async (req, res) => {
  try {
    const errors = getValidationErrors(req);

    if (errors) {
      return res.status(400).json({
        success: false,
        errors
      });
    }

    const email = normalizeEmail(req.body.email);
    const { password } = req.body;

    const user = await User.findOne({ email });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'ভুল ইমেইল অথবা পাসওয়ার্ড'
      });
    }

    if (!user.isVerified) {
      return res.status(403).json({
        success: false,
        message: 'লগইন করার আগে তোমার ইমেইল যাচাই করো'
      });
    }

    if (user.status === 'blocked') {
      return res.status(403).json({
        success: false,
        message: 'তোমার অ্যাকাউন্ট বন্ধ আছে'
      });
    }

    const isMatch = await user.matchPassword(password);

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'ভুল ইমেইল অথবা পাসওয়ার্ড'
      });
    }

    return sendAuthResponse(res, user, 'লগইন সফল হয়েছে');
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

const refreshAccessToken = async (req, res) => {
  try {
    const refreshToken = req.cookies?.refreshToken;

    if (!refreshToken) {
      return res.status(401).json({
        success: false,
        message: 'Refresh token not found'
      });
    }

    const decoded = verifyRefreshToken(refreshToken);
    const user = await User.findById(decoded.id);

    if (!user || user.status === 'blocked') {
      return res.status(401).json({
        success: false,
        message: 'Session is no longer valid'
      });
    }

    return sendAuthResponse(res, user, 'নতুন টোকেন তৈরি হয়েছে');
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'Refresh token is invalid'
    });
  }
};

const logoutUser = async (req, res) => {
  const cookieOptions = getRefreshCookieOptions();

  res.clearCookie('refreshToken', {
    ...cookieOptions,
    maxAge: undefined
  });

  return res.status(200).json({
    success: true,
    message: 'লগআউট সফল হয়েছে'
  });
};

const forgotPassword = async (req, res) => {
  try {
    const identifier = String(
      req.body.identifier || req.body.email || req.body.phone || ''
    ).trim();

    if (!identifier) {
      return res.status(400).json({
        success: false,
        message: 'ইমেইল অথবা মোবাইল নম্বর দিতে হবে'
      });
    }

    const isEmailIdentifier = identifier.includes('@');
    const query = isEmailIdentifier
      ? { email: normalizeEmail(identifier) }
      : { phone: normalizePhone(identifier) };

    const user = await User.findOne(query);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'এই তথ্য দিয়ে কোনো অ্যাকাউন্ট পাওয়া যায়নি'
      });
    }

    if (user.status === 'blocked') {
      return res.status(403).json({
        success: false,
        message: 'এই অ্যাকাউন্টটি এখন সাময়িকভাবে ব্লক করা আছে'
      });
    }

    const resetCode = generateOtp();
    const resetToken = generateSecureToken();

    await PasswordResetRequest.findOneAndDelete({ user: user._id });

    await PasswordResetRequest.create({
      user: user._id,
      email: user.email,
      resetCode,
      resetCodeExpires: new Date(Date.now() + 10 * 60 * 1000),
      resetToken,
      expiresAt: new Date(Date.now() + 30 * 60 * 1000)
    });

    await sendPasswordResetCode({
      email: user.email,
      fullName: user.fullName,
      code: resetCode
    });

    return res.status(200).json({
      success: true,
      message: 'পাসওয়ার্ড রিসেট কোড তোমার ইমেইলে পাঠানো হয়েছে',
      resetToken,
      recipientEmail: user.email
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

const resetPassword = async (req, res) => {
  try {
    const { resetToken, otp, password } = req.body;

    if (!resetToken || !otp || !password) {
      return res.status(400).json({
        success: false,
        message: 'রিসেট টোকেন, কোড এবং নতুন পাসওয়ার্ড প্রয়োজন'
      });
    }

    const resetRequest = await PasswordResetRequest.findOne({ resetToken }).populate('user');

    if (!resetRequest || !resetRequest.user) {
      return res.status(400).json({
        success: false,
        message: 'রিসেট সেশন পাওয়া যায়নি। আবার চেষ্টা করো।'
      });
    }

    if (resetRequest.resetCodeExpires < new Date()) {
      return res.status(400).json({
        success: false,
        message: 'কোডের সময় শেষ হয়ে গেছে। আবার কোড নাও।'
      });
    }

    if (resetRequest.resetCode !== String(otp).trim()) {
      return res.status(400).json({
        success: false,
        message: 'ভুল কোড দেওয়া হয়েছে'
      });
    }

    resetRequest.user.password = password;
    await resetRequest.user.save();
    await syncUserBuckets(resetRequest.user);
    await PasswordResetRequest.deleteMany({ user: resetRequest.user._id });

    return res.status(200).json({
      success: true,
      message: 'পাসওয়ার্ড সফলভাবে পরিবর্তন হয়েছে'
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

module.exports = {
  registerUser,
  verifyOTP,
  resendOTP,
  loginUser,
  refreshAccessToken,
  logoutUser,
  forgotPassword,
  resetPassword
};