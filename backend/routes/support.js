const express = require('express');
const { body } = require('express-validator');
const {
  createSupportTicket,
  getMySupportTickets
} = require('../controllers/supportController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

router.post(
  '/tickets',
  protect,
  [
    body('subject')
      .notEmpty()
      .withMessage('Subject is required'),
    body('category')
      .isIn(['application_issue', 'appointment', 'payment', 'delivery', 'technical', 'other'])
      .withMessage('Valid category is required'),
    body('priority')
      .optional()
      .isIn(['low', 'medium', 'high', 'urgent'])
      .withMessage('Invalid priority value'),
    body('description')
      .isLength({ min: 20 })
      .withMessage('Description must be at least 20 characters')
  ],
  createSupportTicket
);

router.get('/my-tickets', protect, getMySupportTickets);

module.exports = router;