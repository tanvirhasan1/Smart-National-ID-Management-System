const AdminUser = require('../models/AdminUser');
const CitigenUser = require('../models/CitigenUser');
const { isInternalUserRole } = require('./roles');

const mapAdminBucket = (user) => ({
  userId: user._id,
  fullName: user.fullName,
  email: user.email,
  phone: user.phone,
  role: user.role,
  permissions: Array.isArray(user.permissions) ? user.permissions : [],
  adminScope: user.adminScope || {
    scopeType: 'national',
    districts: [],
    primaryDistrict: '',
    scopeUpdatedAt: null
  },
  status: user.status,
  isVerified: user.isVerified
});

const mapCitizenBucket = (user) => ({
  userId: user._id,
  fullName: user.fullName,
  fullNameBangla: user.fullNameBangla || '',
  email: user.email,
  phone: user.phone,
  birthRegNumber: user.birthRegNumber || '',
  status: user.status,
  isVerified: user.isVerified
});

const syncUserBuckets = async (user) => {
  if (!user || !user._id) {
    return;
  }

  if (isInternalUserRole(user.role)) {
    await AdminUser.findOneAndUpdate(
      { userId: user._id },
      mapAdminBucket(user),
      {
        upsert: true,
        new: true,
        setDefaultsOnInsert: true
      }
    );

    await CitigenUser.deleteOne({ userId: user._id });
    return;
  }

  await CitigenUser.findOneAndUpdate(
    { userId: user._id },
    mapCitizenBucket(user),
    {
      upsert: true,
      new: true,
      setDefaultsOnInsert: true
    }
  );

  await AdminUser.deleteOne({ userId: user._id });
};

module.exports = {
  syncUserBuckets
};
