const express = require('express');
const {
  getAdminDashboard,
  getAdminDashboardSummary,
  getInternalUsers,
  createInternalUser,
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

// Application routes
router.get(
  '/applications/stats',
  protect,
  authorize('admin'),
  getApplicationStatsForAdmin
);

router.get(
  '/applications',
  protect,
  authorize('admin'),
  getAllApplicationsForAdmin
);

router.get(
  '/applications/:id',
  protect,
  authorize('admin'),
  getSingleApplicationForAdmin
);

router.patch(
  '/applications/:id/review',
  protect,
  authorize('admin'),
  reviewApplicationByAdmin
);
// Internal user management
router.get(
  '/users',
  protect,
  authorize('admin'),
  getInternalUsers
);

router.post(
  '/users',
  protect,
  authorize('admin'),
  createInternalUser
);
// Support routes
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

// Center routes
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

// Delivery routes
router.get(
  '/delivery/queue',
  protect,
  authorize('admin'),
  getDeliveryQueue
);

router.patch(
  '/delivery/:id/mark-delivered',
  protect,
  authorize('admin'),
  markApplicationAsDelivered
);

// Audit routes
router.get(
  '/audit/recent',
  protect,
  authorize('admin', 'system_supervisor'),
  getRecentAuditLogs
);

// Printing stats
router.get(
  '/printing/stats',
  protect,
  authorize('admin'),
  getPrintingStats
);

// Delivery stats
router.get(
  '/delivery/stats',
  protect,
  authorize('admin'),
  getDeliveryStats
);

// Audit stats
router.get(
  '/audit/stats',
  protect,
  authorize('admin', 'system_supervisor'),
  getAuditStats
);

// Bulk printing
router.patch(
  '/printing/bulk-mark-printed',
  protect,
  authorize('admin'),
  bulkMarkApplicationsAsPrinted
);

// Bulk delivery
router.patch(
  '/delivery/bulk-mark-delivered',
  protect,
  authorize('admin'),
  bulkMarkApplicationsAsDelivered
);


// Export routes
router.get(
  '/printing/export',
  protect,
  authorize('admin'),
  exportPrintingReport
);

router.get(
  '/delivery/export',
  protect,
  authorize('admin'),
  exportDeliveryReport
);

router.get(
  '/audit/export',
  protect,
  authorize('admin', 'system_supervisor'),
  exportAuditReport
);
module.exports = router;