const express = require('express');
const { body } = require('express-validator');
const {
  createApplication,
  verifyBirthCertificateDocument,
  getApplicationEligibility,
  uploadApplicationDocument,
  getApplicationPrefill,
  getMyApplications,
  getSingleApplication,
  updateApplication,
  cancelApplication,
  getAllApplicationsForAdmin,
  getSingleApplicationForAdmin,
  reviewApplicationByAdmin,
  getAdminDashboardStats
} = require('../controllers/applicationController');
const { protect, authorize } = require('../middleware/authMiddleware');
const {
  uploadSingleApplicationDocument,
  uploadBirthCertificateVerificationDocument
} = require('../middleware/applicationDocumentUpload');

const router = express.Router();

router.get(
  '/admin/stats',
  protect,
  authorize('admin', 'system_supervisor'),
  getAdminDashboardStats
);

router.get(
  '/admin/all',
  protect,
  authorize('admin', 'system_supervisor'),
  getAllApplicationsForAdmin
);

router.get(
  '/admin/:id',
  protect,
  authorize('admin', 'system_supervisor'),
  getSingleApplicationForAdmin
);

router.patch(
  '/admin/:id/review',
  protect,
  authorize('admin', 'super_admin'),
  reviewApplicationByAdmin
);

router.post(
  '/document-verification/birth-certificate',
  protect,
  authorize('citizen'),
  uploadBirthCertificateVerificationDocument,
  verifyBirthCertificateDocument
);

router.get(
  '/eligibility',
  protect,
  authorize('citizen'),
  getApplicationEligibility
);

router.post(
  '/',
  protect,
  [
    body('fullNameEnglish')
      .notEmpty()
      .withMessage('Full name in English is required'),
    body('fatherName').notEmpty().withMessage('Father name is required'),
    body('motherName').notEmpty().withMessage('Mother name is required'),
    body('dateOfBirth').notEmpty().withMessage('Date of birth is required'),
    body('gender').notEmpty().withMessage('Gender is required'),
    body('phone').notEmpty().withMessage('Phone number is required'),
    body('presentAddress.division')
      .notEmpty()
      .withMessage('Present address division is required'),
    body('presentAddress.district')
      .notEmpty()
      .withMessage('Present address district is required'),
    body('permanentAddress.division')
      .notEmpty()
      .withMessage('Permanent address division is required'),
    body('permanentAddress.district')
      .notEmpty()
      .withMessage('Permanent address district is required'),
    body('biometricSessionId')
      .notEmpty()
      .withMessage('Biometric verification is required before application submission')
  ],
  createApplication
);

router.post(
  '/:id/documents/:documentType',
  protect,
  authorize('citizen'),
  uploadSingleApplicationDocument,
  uploadApplicationDocument
);

router.put('/:id', protect, updateApplication);
router.get('/prefill', protect, getApplicationPrefill);
router.patch('/:id/cancel', protect, cancelApplication);
router.get('/my', protect, getMyApplications);
router.get('/:id', protect, getSingleApplication);

module.exports = router;
