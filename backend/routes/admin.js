const express = require('express');
const {
  getAdminDashboard,
  getAllSupportTickets,
  getSupportStats,
  assignSupportTicket,
  updateSupportTicketStatus,
  createCenter,
  getAllCenters,
  getSingleCenter,
  updateCenter,
  toggleCenterStatus
} = require('../controllers/adminController');
const { protect, authorize } = require('../middleware/authMiddleware');

const router = express.Router();

// Dashboard
router.get(
  '/dashboard',
  protect,
  authorize('admin', 'super_admin'),
  getAdminDashboard
);

// Support routes
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

// Center routes
router.post(
  '/centers',
  protect,
  authorize('admin', 'super_admin'),
  createCenter
);

router.get(
  '/centers',
  protect,
  authorize('admin', 'super_admin'),
  getAllCenters
);

router.get(
  '/centers/:id',
  protect,
  authorize('admin', 'super_admin'),
  getSingleCenter
);

router.put(
  '/centers/:id',
  protect,
  authorize('admin', 'super_admin'),
  updateCenter
);

router.patch(
  '/centers/:id/toggle-status',
  protect,
  authorize('admin', 'super_admin'),
  toggleCenterStatus
);

module.exports = router;