const express = require('express');
const {
  bookAppointment,
  getMyAppointments
} = require('../controllers/appointmentController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

router.post('/', protect, bookAppointment);
router.get('/my', protect, getMyAppointments);

module.exports = router;