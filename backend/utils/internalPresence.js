const AdminPresence = require('../models/AdminPresence');
const { isInternalUserRole } = require('./roles');

const LIVE_WINDOW_MINUTES = 3;

// Pick the best client IP we can get from headers or socket.
const getClientIp = (req) => {
  const forwardedHeader = req?.headers?.['x-forwarded-for'];
  const forwardedValue = Array.isArray(forwardedHeader)
    ? forwardedHeader[0]
    : forwardedHeader;

  if (forwardedValue) {
    return String(forwardedValue).split(',')[0].trim();
  }

  return req?.ip || req?.socket?.remoteAddress || '';
};

// Mark internal staff as currently active when they hit protected routes.
const markInternalUserPresence = async ({
  user,
  req,
  source = 'request'
}) => {
  try {
    if (!user || !isInternalUserRole(user.role)) {
      return;
    }

    const now = new Date();

    await AdminPresence.findOneAndUpdate(
      { userId: user._id },
      {
        $set: {
          role: user.role,
          isOnline: true,
          lastSeenAt: now,
          currentRoute: req?.originalUrl || '',
          ipAddress: getClientIp(req),
          userAgent: req?.headers?.['user-agent'] || '',
          lastActiveSource: source
        },
        $setOnInsert: {
          sessionStartedAt: now
        }
      },
      {
        upsert: true,
        new: true,
        setDefaultsOnInsert: true
      }
    );
  } catch (error) {
    console.error('Internal presence update failed:', error.message);
  }
};

// Mark internal staff offline when they are explicitly removed or blocked.
const markInternalUserOffline = async ({
  user,
  req,
  source = 'manual'
}) => {
  try {
    if (!user || !isInternalUserRole(user.role)) {
      return;
    }

    const now = new Date();

    await AdminPresence.findOneAndUpdate(
      { userId: user._id },
      {
        $set: {
          role: user.role,
          isOnline: false,
          lastSeenAt: now,
          currentRoute: '',
          ipAddress: getClientIp(req),
          userAgent: req?.headers?.['user-agent'] || '',
          lastActiveSource: source
        }
      },
      {
        upsert: true,
        new: true,
        setDefaultsOnInsert: true
      }
    );
  } catch (error) {
    console.error('Internal presence offline update failed:', error.message);
  }
};

// Build a quick map so admin list responses can show live status and last seen.
const buildInternalPresenceMap = async (userIds = []) => {
  const normalizedIds = userIds
    .filter(Boolean)
    .map((id) => id.toString());

  if (!normalizedIds.length) {
    return {};
  }

  const presenceRows = await AdminPresence.find({
    userId: { $in: normalizedIds }
  });

  const liveCutoff = new Date(Date.now() - LIVE_WINDOW_MINUTES * 60 * 1000);
  const presenceMap = {};

  for (const row of presenceRows) {
    const key = row.userId.toString();

    presenceMap[key] = {
      isLive: Boolean(row.isOnline && row.lastSeenAt && row.lastSeenAt >= liveCutoff),
      lastSeenAt: row.lastSeenAt || null,
      sessionStartedAt: row.sessionStartedAt || null,
      currentRoute: row.currentRoute || ''
    };
  }

  return presenceMap;
};

module.exports = {
  LIVE_WINDOW_MINUTES,
  markInternalUserPresence,
  markInternalUserOffline,
  buildInternalPresenceMap
};