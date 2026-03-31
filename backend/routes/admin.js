const express = require('express');
const {
  getAdminDashboard,
  getAdminDashboardSummary,
  getAllSupportTickets,
  getSupportStats,
  assignSupportTicket,
  updateSupportTicketStatus,
  createCenter,
  getAllCenters,
  getSingleCenter,
  updateCenter,
  toggleCenterStatus,
  getDeliveryQueue,
  markApplicationAsDelivered,
  getRecentAuditLogs,
  getPrintingStats,
  getDeliveryStats,
  getAuditStats
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

router.get(
  '/dashboard/summary',
  protect,
  authorize('admin', 'super_admin'),
  getAdminDashboardSummary
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

// Delivery routes
router.get(
  '/delivery/queue',
  protect,
  authorize('admin', 'super_admin'),
  getDeliveryQueue
);

router.patch(
  '/delivery/:id/mark-delivered',
  protect,
  authorize('admin', 'super_admin'),
  markApplicationAsDelivered
);

// Audit routes
router.get(
  '/audit/recent',
  protect,
  authorize('admin', 'super_admin'),
  getRecentAuditLogs
);

// Printing stats
router.get(
  '/printing/stats',
  protect,
  authorize('admin', 'super_admin'),
  getPrintingStats
);

// Delivery stats
router.get(
  '/delivery/stats',
  protect,
  authorize('admin', 'super_admin'),
  getDeliveryStats
);

// Audit stats
router.get(
  '/audit/stats',
  protect,
  authorize('admin', 'super_admin'),
  getAuditStats
);

module.exports = router;