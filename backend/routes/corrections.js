const express = require('express');
const { body } = require('express-validator');
const {
  getCorrectionPrefill,
  createCorrection,
  uploadCorrectionDocument,
  getMyCorrections,
  getSingleCorrection
} = require('../controllers/correctionController');
const { protect, authorize } = require('../middleware/authMiddleware');
const { uploadSingleApplicationDocument } = require('../middleware/applicationDocumentUpload');

const router = express.Router();

router.get('/prefill', protect, authorize('citizen'), getCorrectionPrefill);
router.get('/my', protect, authorize('citizen'), getMyCorrections);
router.get('/:id', protect, authorize('citizen'), getSingleCorrection);

router.post(
  '/',
  protect,
  authorize('citizen'),
  [
    body('fullNameEnglish').notEmpty().withMessage('Full name in English is required'),
    body('fatherName').notEmpty().withMessage('Father name is required'),
    body('motherName').notEmpty().withMessage('Mother name is required'),
    body('dateOfBirth').notEmpty().withMessage('Date of birth is required'),
    body('gender').notEmpty().withMessage('Gender is required'),
    body('phone').notEmpty().withMessage('Phone number is required'),
    body('presentAddress.division').notEmpty().withMessage('Present address division is required'),
    body('presentAddress.district').notEmpty().withMessage('Present address district is required'),
    body('permanentAddress.division').notEmpty().withMessage('Permanent address division is required'),
    body('permanentAddress.district').notEmpty().withMessage('Permanent address district is required'),
    body('reason').notEmpty().withMessage('Correction reason is required')
  ],
  createCorrection
);

router.post(
  '/:id/documents/:documentType',
  protect,
  authorize('citizen'),
  uploadSingleApplicationDocument,
  uploadCorrectionDocument
);

module.exports = router;
