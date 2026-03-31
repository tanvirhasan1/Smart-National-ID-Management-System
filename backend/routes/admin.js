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
  getAuditStats,
  bulkMarkApplicationsAsPrinted,
  bulkMarkApplicationsAsDelivered,
  getAllApplicationsForAdmin,
  getSingleApplicationForAdmin,
  reviewApplicationByAdmin,
  getApplicationStatsForAdmin
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


// Application routes
router.get(
  '/applications/stats',
  protect,
  authorize('admin', 'super_admin'),
  getApplicationStatsForAdmin
);

router.get(
  '/applications',
  protect,
  authorize('admin', 'super_admin'),
  getAllApplicationsForAdmin
);

router.get(
  '/applications/:id',
  protect,
  authorize('admin', 'super_admin'),
  getSingleApplicationForAdmin
);

router.patch(
  '/applications/:id/review',
  protect,
  authorize('admin', 'super_admin'),
  reviewApplicationByAdmin
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

// Bulk printing
router.patch(
  '/printing/bulk-mark-printed',
  protect,
  authorize('admin', 'super_admin'),
  bulkMarkApplicationsAsPrinted
);

// Bulk delivery
router.patch(
  '/delivery/bulk-mark-delivered',
  protect,
  authorize('admin', 'super_admin'),
  bulkMarkApplicationsAsDelivered
);

module.exports = router;