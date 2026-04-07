const express = require('express');
const {
  getUserProfile,
  updateUserProfile,
  getCitizenDashboardSummary
} = require('../controllers/userController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

// Get logged-in user profile
router.get('/profile', protect, getUserProfile);

// Update logged-in user profile
router.put('/profile', protect, updateUserProfile);

// Citizen dashboard summary
router.get('/dashboard/summary', protect, getCitizenDashboardSummary);

module.exports = router;