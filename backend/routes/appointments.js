const express = require('express');
const {
  getAvailableCenters,
  bookAppointment,
  getMyAppointments,
  getAllAppointmentsForAdmin,
  getSingleAppointmentForAdmin,
  getAppointmentStatsForAdmin,
  updateAppointmentStatusByAdmin
} = require('../controllers/appointmentController');
const { protect, authorize } = require('../middleware/authMiddleware');

const router = express.Router();

// Citizen center list
router.get('/centers', protect, getAvailableCenters);

// Admin stats
router.get(
  '/admin/stats',
  protect,
  authorize('admin', 'super_admin'),
  getAppointmentStatsForAdmin
);

// Admin all appointments
router.get(
  '/admin/all',
  protect,
  authorize('admin', 'super_admin'),
  getAllAppointmentsForAdmin
);

// Admin single appointment
router.get(
  '/admin/:id',
  protect,
  authorize('admin', 'super_admin'),
  getSingleAppointmentForAdmin
);

// Admin update status
router.patch(
  '/admin/:id/status',
  protect,
  authorize('admin', 'super_admin'),
  updateAppointmentStatusByAdmin
);

// Citizen book appointment
router.post('/', protect, bookAppointment);

// Citizen my appointments
router.get('/my', protect, getMyAppointments);

module.exports = router;