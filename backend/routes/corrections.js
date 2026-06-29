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
    body('reason').notEmpty().withMessage('Correction reason is required'),
    body().custom((_, { req }) => {
      const rawValue =
        req.body.supportingDocumentCount ??
        req.body.correctionInfo?.supportingDocumentCount ??
        req.body.documentCount;
      const count = Number(rawValue);

      if (!Number.isInteger(count) || count < 1 || count > 4) {
        throw new Error('Upload 1-4 supporting documents for your correction request.');
      }

      return true;
    }),
    body().custom((_, { req }) => {
      const value =
        req.body.photoChangeRequested ??
        req.body.correctionInfo?.photoChangeRequested;

      if (value === undefined || value === null || value === '') {
        return true;
      }

      if ([true, false, 'true', 'false', '1', '0', 1, 0].includes(value)) {
        return true;
      }

      throw new Error('Photo change flag must be true or false');
    })
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
