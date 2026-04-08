const express = require('express');
const { body } = require('express-validator');
const {
  registerUser,
  verifyOTP,
  resendOTP,
  loginUser,
  refreshAccessToken,
  logoutUser,
  forgotPassword,
  resetPassword
} = require('../controllers/authController');

const router = express.Router();

router.post(
  '/register',
  [
    body('fullName').trim().notEmpty().withMessage('Full name is required'),
    body('fullNameBangla')
      .trim()
      .notEmpty()
      .withMessage('Bangla full name is required'),
    body('birthRegNumber')
      .trim()
      .notEmpty()
      .withMessage('Birth registration number is required'),
    body('dateOfBirth')
      .notEmpty()
      .withMessage('Date of birth is required')
      .isISO8601()
      .withMessage('Valid date of birth is required'),
    body('gender')
      .isIn(['male', 'female', 'other'])
      .withMessage('Valid gender is required'),
    body('placeOfBirth')
      .trim()
      .notEmpty()
      .withMessage('Place of birth is required'),
    body('email').isEmail().withMessage('Valid email is required'),
    body('mobile')
      .matches(/^01[0-9]{9}$/)
      .withMessage('Valid Bangladeshi mobile number is required'),
    body('password')
      .isLength({ min: 8 })
      .withMessage('Password must be at least 8 characters'),
    body('presentAddress.division')
      .trim()
      .notEmpty()
      .withMessage('Present division is required'),
    body('presentAddress.district')
      .trim()
      .notEmpty()
      .withMessage('Present district is required'),
    body('presentAddress.upazila')
      .trim()
      .notEmpty()
      .withMessage('Present upazila is required'),
    body('permanentAddress.division')
      .trim()
      .notEmpty()
      .withMessage('Permanent division is required'),
    body('permanentAddress.district')
      .trim()
      .notEmpty()
      .withMessage('Permanent district is required'),
    body('permanentAddress.upazila')
      .trim()
      .notEmpty()
      .withMessage('Permanent upazila is required')
  ],
  registerUser
);

router.post(
  '/verify-otp',
  [
    body('otp')
      .trim()
      .isLength({ min: 6, max: 6 })
      .withMessage('Valid OTP is required'),
    body('verificationToken')
      .trim()
      .notEmpty()
      .withMessage('Verification token is required')
  ],
  verifyOTP
);

router.post(
  '/resend-otp',
  [
    body('verificationToken')
      .trim()
      .notEmpty()
      .withMessage('Verification token is required')
  ],
  resendOTP
);

router.post(
  '/login',
  [
    body('email').isEmail().withMessage('Valid email is required'),
    body('password').notEmpty().withMessage('Password is required')
  ],
  loginUser
);

router.post(
  '/forgot-password',
  [
    body('identifier').optional().trim(),
    body('email')
      .optional()
      .isEmail()
      .withMessage('Valid email is required'),
    body('phone')
      .optional()
      .matches(/^01[0-9]{9}$/)
      .withMessage('Valid Bangladeshi mobile number is required')
  ],
  forgotPassword
);

router.post(
  '/reset-password',
  [
    body('resetToken')
      .trim()
      .notEmpty()
      .withMessage('Reset token is required'),
    body('otp')
      .trim()
      .isLength({ min: 6, max: 6 })
      .withMessage('Valid OTP is required'),
    body('password')
      .isLength({ min: 8 })
      .withMessage('Password must be at least 8 characters')
  ],
  resetPassword
);

router.post('/refresh', refreshAccessToken);
router.post('/logout', logoutUser);

module.exports = router;