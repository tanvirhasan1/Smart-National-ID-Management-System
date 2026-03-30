const express = require('express');
const { bookAppointment } = require('../controllers/appointmentController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

router.post('/', protect, bookAppointment);

module.exports = router;