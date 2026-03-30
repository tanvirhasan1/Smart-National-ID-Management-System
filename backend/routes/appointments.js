const express = require('express');
const {
  bookAppointment,
  getMyAppointments,
  getAllAppointmentsForAdmin,
  updateAppointmentStatusByAdmin
} = require('../controllers/appointmentController');
const { protect, authorize } = require('../middleware/authMiddleware');

const router = express.Router();

router.get(
  '/admin/all',
  protect,
  authorize('admin', 'super_admin'),
  getAllAppointmentsForAdmin
);

router.patch(
  '/admin/:id/status',
  protect,
  authorize('admin', 'super_admin'),
  updateAppointmentStatusByAdmin
);

router.post('/', protect, bookAppointment);
router.get('/my', protect, getMyAppointments);

module.exports = router;