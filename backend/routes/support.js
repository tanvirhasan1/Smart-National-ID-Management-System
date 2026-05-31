const express = require('express');
const { body } = require('express-validator');
const {
  createSupportTicket,
  getMySupportTickets,
  getSingleSupportTicket,
  respondToSupportTicket
} = require('../controllers/supportController');
const { protect, authorize } = require('../middleware/authMiddleware');

const router = express.Router();

router.post(
  '/tickets',
  protect,
  authorize('citizen'),
  [
    body('subject')
      .notEmpty()
      .withMessage('Subject is required'),
    body('category')
      .isIn([
        'application_issue',
        'appointment',
        'payment',
        'delivery',
        'technical',
        'other'
      ])
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

router.get('/my-tickets', protect, authorize('citizen'), getMySupportTickets);

router.get('/tickets/:id', protect, getSingleSupportTicket);

router.post(
  '/tickets/:id/respond',
  protect,
  [
    body('message')
      .trim()
      .isLength({ min: 2 })
      .withMessage('Message must be at least 2 characters')
  ],
  respondToSupportTicket
);

module.exports = router;