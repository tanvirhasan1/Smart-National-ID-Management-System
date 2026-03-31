const express = require('express');
const {
  bookAppointment,
  getMyAppointments,
  getAllAppointmentsForAdmin,
  getSingleAppointmentForAdmin,
  getAppointmentStatsForAdmin,
  updateAppointmentStatusByAdmin
} = require('../controllers/appointmentController');
const { protect, authorize } = require('../middleware/authMiddleware');

const router = express.Router();

// Admin side appointment routes

// Admin dashboard appointment stats
router.get(
  '/admin/stats',
  protect,
  authorize('admin', 'super_admin'),
  getAppointmentStatsForAdmin
);

// Admin can see all appointment list
router.get(
  '/admin/all',
  protect,
  authorize('admin', 'super_admin'),
  getAllAppointmentsForAdmin
);

// Admin can see single appointment details 
router.get(
  '/admin/:id',
  protect,
  authorize('admin', 'super_admin'),
  getSingleAppointmentForAdmin
);

// Admin appointment can change status
router.patch(
  '/admin/:id/status',
  protect,
  authorize('admin', 'super_admin'),
  updateAppointmentStatusByAdmin
);

// Citizen side appointment routes
router.post('/', protect, bookAppointment);
router.get('/my', protect, getMyAppointments);

module.exports = router;