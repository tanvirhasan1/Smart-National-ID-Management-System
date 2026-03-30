const getAdminDashboard = async (req, res) => {
  try {
    res.status(200).json({
      success: true,
      message: 'Welcome to admin dashboard',
      admin: req.user
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

module.exports = {
  getAdminDashboard
};