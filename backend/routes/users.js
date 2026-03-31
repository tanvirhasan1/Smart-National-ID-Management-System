const express = require('express');
const {
  getUserProfile,
  updateUserProfile
} = require('../controllers/userController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

// Get logged-in user profile
router.get('/profile', protect, getUserProfile);

// Update logged-in user profile
router.put('/profile', protect, updateUserProfile);

module.exports = router;