const express = require('express');
const rateLimit = require('express-rate-limit');

const {
  uploadPassportPhoto,
  uploadBiometricCompletion,
  createBiometricSession,
  openMobileBiometricSession,
  completeBiometricSession,
  getBiometricSessionStatus
} = require('../controllers/biometricController');
const { protect, authorize } = require('../middleware/authMiddleware');

const router = express.Router();

const getPositiveIntegerEnv = (name, defaultValue) => {
  const parsed = Number(process.env[name]);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : defaultValue;
};

const biometricAttemptLimiter = rateLimit({
  windowMs: getPositiveIntegerEnv('BIOMETRIC_RATE_LIMIT_WINDOW_MS', 60000),
  max: getPositiveIntegerEnv('BIOMETRIC_RATE_LIMIT_MAX', 20),
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    code: 'BIOMETRIC_RATE_LIMITED',
    message: 'Too many biometric verification requests. Please wait and try again.'
  }
});

router.post(
  '/sessions',
  biometricAttemptLimiter,
  protect,
  authorize('citizen'),
  uploadPassportPhoto,
  createBiometricSession
);

router.post(
  '/sessions/:sessionId/complete',
  biometricAttemptLimiter,
  uploadBiometricCompletion,
  completeBiometricSession
);

router.get(
  '/sessions/:sessionId/mobile-open',
  biometricAttemptLimiter,
  openMobileBiometricSession
);

router.get(
  '/sessions/:sessionId/status',
  biometricAttemptLimiter,
  protect,
  authorize('citizen'),
  getBiometricSessionStatus
);

module.exports = router;
