const express = require('express');

const {
  getAdminDashboard,
  getAdminDashboardSummary,
  getInternalUsers,
  createInternalUser,
  updateInternalUser,
  archiveInternalUser,
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
  getApplicationStatsForAdmin,
  exportPrintingReport,
  exportDeliveryReport,
  exportAuditReport
} = require('../controllers/adminController');

const {
  getApplicationReviewQueue,
  getApplicationReviewDetails,
  updateApplicationReviewDecision
} = require('../controllers/adminApplicationReviewController');

const { protect, authorize } = require('../middleware/authMiddleware');

const router = express.Router();

// Dashboard
router.get(
  '/dashboard',
  protect,
  authorize('admin', 'system_supervisor', 'support_staff'),
  getAdminDashboard
);

router.get(
  '/dashboard/summary',
  protect,
  authorize('admin', 'system_supervisor', 'support_staff'),
  getAdminDashboardSummary
);

router.get(
  '/dashboard/stats',
  protect,
  authorize('admin', 'system_supervisor', 'support_staff'),
  getAdminDashboardSummary
);

// Application stats
router.get(
  '/applications/stats',
  protect,
  authorize('admin', 'system_supervisor'),
  getApplicationStatsForAdmin
);

// Old application routes
router.get(
  '/applications',
  protect,
  authorize('admin', 'system_supervisor'),
  getAllApplicationsForAdmin
);

router.get(
  '/applications/:id',
  protect,
  authorize('admin', 'system_supervisor'),
  getSingleApplicationForAdmin
);

router.patch(
  '/applications/:id/review',
  protect,
  authorize('admin'),
  reviewApplicationByAdmin
);

// New review workspace routes
router.get(
  '/application-review/queue',
  protect,
  authorize('admin', 'system_supervisor'),
  getApplicationReviewQueue
);

router.get(
  '/application-review/:id',
  protect,
  authorize('admin', 'system_supervisor'),
  getApplicationReviewDetails
);

router.patch(
  '/application-review/:id/decision',
  protect,
  authorize('admin'),
  updateApplicationReviewDecision
);

// Internal users
router.get(
  '/users',
  protect,
  authorize('admin', 'system_supervisor'),
  getInternalUsers
);

router.post(
  '/users',
  protect,
  authorize('admin', 'system_supervisor'),
  createInternalUser
);

router.put(
  '/users/:id',
  protect,
  authorize('admin', 'system_supervisor'),
  updateInternalUser
);

router.delete(
  '/users/:id',
  protect,
  authorize('admin'),
  archiveInternalUser
);

// Support
router.get(
  '/support/tickets',
  protect,
  authorize('admin', 'support_staff'),
  getAllSupportTickets
);

router.get(
  '/support/stats',
  protect,
  authorize('admin', 'support_staff'),
  getSupportStats
);

router.put(
  '/support/tickets/:id/assign',
  protect,
  authorize('admin', 'support_staff'),
  assignSupportTicket
);

router.put(
  '/support/tickets/:id/status',
  protect,
  authorize('admin', 'support_staff'),
  updateSupportTicketStatus
);

// Centers
router.post(
  '/centers',
  protect,
  authorize('admin'),
  createCenter
);

router.get(
  '/centers',
  protect,
  authorize('admin'),
  getAllCenters
);

router.get(
  '/centers/:id',
  protect,
  authorize('admin'),
  getSingleCenter
);

router.put(
  '/centers/:id',
  protect,
  authorize('admin'),
  updateCenter
);

router.patch(
  '/centers/:id/toggle-status',
  protect,
  authorize('admin'),
  toggleCenterStatus
);

// Delivery
router.get(
  '/delivery/queue',
  protect,
  authorize('admin', 'system_supervisor'),
  getDeliveryQueue
);

router.patch(
  '/delivery/:id/mark-delivered',
  protect,
  authorize('admin'),
  markApplicationAsDelivered
);

// Audit
router.get(
  '/audit/recent',
  protect,
  authorize('admin', 'system_supervisor'),
  getRecentAuditLogs
);

router.get(
  '/audit/stats',
  protect,
  authorize('admin', 'system_supervisor'),
  getAuditStats
);

// Printing
router.get(
  '/printing/stats',
  protect,
  authorize('admin', 'system_supervisor'),
  getPrintingStats
);

router.patch(
  '/printing/bulk-mark-printed',
  protect,
  authorize('admin'),
  bulkMarkApplicationsAsPrinted
);

router.get(
  '/printing/export',
  protect,
  authorize('admin', 'system_supervisor'),
  exportPrintingReport
);

// Delivery extra
router.get(
  '/delivery/stats',
  protect,
  authorize('admin', 'system_supervisor'),
  getDeliveryStats
);

router.patch(
  '/delivery/bulk-mark-delivered',
  protect,
  authorize('admin'),
  bulkMarkApplicationsAsDelivered
);

router.get(
  '/delivery/export',
  protect,
  authorize('admin', 'system_supervisor'),
  exportDeliveryReport
);

// Exports
router.get(
  '/audit/export',
  protect,
  authorize('admin', 'system_supervisor'),
  exportAuditReport
);

module.exports = router;
