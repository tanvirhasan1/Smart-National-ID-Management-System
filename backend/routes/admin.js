const express = require('express');
const { getAdminDashboard } = require('../controllers/adminController');
const { protect, authorize } = require('../middleware/authMiddleware');

const router = express.Router();

router.get(
  '/dashboard',
  protect,
  authorize('admin', 'super_admin'),
  getAdminDashboard
);

module.exports = router;