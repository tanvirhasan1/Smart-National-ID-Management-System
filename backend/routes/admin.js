const express = require('express');
const {
  getAdminDashboard,
  getAllSupportTickets,
  getSupportStats,
  assignSupportTicket,
  updateSupportTicketStatus
} = require('../controllers/adminController');
const { protect, authorize } = require('../middleware/authMiddleware');

const router = express.Router();

router.get(
  '/dashboard',
  protect,
  authorize('admin', 'super_admin'),
  getAdminDashboard
);

router.get(
  '/support/tickets',
  protect,
  authorize('admin', 'super_admin'),
  getAllSupportTickets
);

router.get(
  '/support/stats',
  protect,
  authorize('admin', 'super_admin'),
  getSupportStats
);

router.put(
  '/support/tickets/:id/assign',
  protect,
  authorize('admin', 'super_admin'),
  assignSupportTicket
);

router.put(
  '/support/tickets/:id/status',
  protect,
  authorize('admin', 'super_admin'),
  updateSupportTicketStatus
);

module.exports = router;