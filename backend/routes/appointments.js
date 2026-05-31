const express = require('express');
const {
  getAvailableCenters,
  getAppointmentAvailability,
  bookAppointment,
  getMyAppointments,
  getAllAppointmentsForAdmin,
  getSingleAppointmentForAdmin,
  getAppointmentStatsForAdmin,
  updateAppointmentStatusByAdmin,
  getAppointmentConfigForAdmin,
  upsertAppointmentConfigForAdmin
} = require('../controllers/appointmentController');
const { protect, authorize } = require('../middleware/authMiddleware');

const router = express.Router();

// Citizen appointment discovery
router.get('/centers', protect, getAvailableCenters);
router.get('/availability', protect, getAppointmentAvailability);

// Admin appointment settings
router.get(
  '/admin/settings/:centerId',
  protect,
  authorize('admin', 'system_supervisor'),
  getAppointmentConfigForAdmin
);

router.put(
  '/admin/settings/:centerId',
  protect,
  authorize('admin', 'system_supervisor'),
  upsertAppointmentConfigForAdmin
);

// Admin appointment stats/list/details
router.get(
  '/admin/stats',
  protect,
  authorize('admin', 'system_supervisor'),
  getAppointmentStatsForAdmin
);

// Keep both routes so old and new frontend calls work.
router.get(
  '/admin',
  protect,
  authorize('admin', 'system_supervisor'),
  getAllAppointmentsForAdmin
);

router.get(
  '/admin/all',
  protect,
  authorize('admin', 'system_supervisor'),
  getAllAppointmentsForAdmin
);

router.get(
  '/admin/:id',
  protect,
  authorize('admin', 'system_supervisor'),
  getSingleAppointmentForAdmin
);

router.patch(
  '/admin/:id/status',
  protect,
  authorize('admin', 'system_supervisor'),
  updateAppointmentStatusByAdmin
);

// Citizen booking/history
router.post('/', protect, authorize('citizen'), bookAppointment);
router.get('/my', protect, authorize('citizen'), getMyAppointments);

module.exports = router;