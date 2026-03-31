const User = require('../models/User');

const getUserProfile = async (req, res) => {
  try {
    res.status(200).json({
      success: true,
      message: 'User profile fetched successfully',
      user: req.user
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

const updateUserProfile = async (req, res) => {
  try {
    const { fullName, email, phone, password } = req.body;

    // Find current user
    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Check duplicate email
    if (email && email !== user.email) {
      const existingUser = await User.findOne({ email });

      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: 'Email already in use'
        });
      }
    }

    // Update basic fields
    if (fullName !== undefined) user.fullName = fullName;
    if (email !== undefined) user.email = email;
    if (phone !== undefined) user.phone = phone;

    // Update password only if provided
    if (password) {
      user.password = password;
    }

    const updatedUser = await user.save();

    res.status(200).json({
      success: true,
      message: 'User profile updated successfully',
      user: {
        _id: updatedUser._id,
        fullName: updatedUser.fullName,
        email: updatedUser.email,
        phone: updatedUser.phone,
        role: updatedUser.role,
        isVerified: updatedUser.isVerified,
        status: updatedUser.status,
        createdAt: updatedUser.createdAt,
        updatedAt: updatedUser.updatedAt
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

module.exports = {
  getUserProfile,
  updateUserProfile
};