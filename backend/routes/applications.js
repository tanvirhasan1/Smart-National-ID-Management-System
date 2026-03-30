const express = require('express');
const { body } = require('express-validator');
const {
  createApplication,
  getMyApplications,
  getSingleApplication,
  updateApplication,
  cancelApplication,
  getAllApplicationsForAdmin
} = require('../controllers/applicationController');
const { protect, authorize } = require('../middleware/authMiddleware');

const router = express.Router();

router.get(
  '/admin/all',
  protect,
  authorize('admin', 'super_admin'),
  getAllApplicationsForAdmin
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
      .withMessage('Permanent address district is required')
  ],
  createApplication
);

router.get('/my', protect, getMyApplications);
router.get('/:id', protect, getSingleApplication);
router.put('/:id', protect, updateApplication);
router.patch('/:id/cancel', protect, cancelApplication);

module.exports = router;