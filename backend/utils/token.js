const jwt = require('jsonwebtoken');

const ACCESS_SECRET = () => process.env.ACCESS_TOKEN_SECRET;
const REFRESH_SECRET = () => process.env.REFRESH_TOKEN_SECRET;

const buildAccessPayload = (user) => ({
  id: user._id,
  role: user.role,
  permissions: Array.isArray(user.permissions) ? user.permissions : []
});

const generateAccessToken = (user) =>
  jwt.sign(buildAccessPayload(user), ACCESS_SECRET(), {
    expiresIn: process.env.ACCESS_TOKEN_EXPIRE || '15m'
  });

const generateRefreshToken = (user) =>
  jwt.sign({ id: user._id }, REFRESH_SECRET(), {
    expiresIn: process.env.REFRESH_TOKEN_EXPIRE || '7d'
  });

const verifyAccessToken = (token) => jwt.verify(token, ACCESS_SECRET());
const verifyRefreshToken = (token) => jwt.verify(token, REFRESH_SECRET());

const getRefreshCookieOptions = () => {
  const isProduction = process.env.NODE_ENV === 'production';

  return {
    httpOnly: true,
    secure: isProduction ? true : process.env.COOKIE_SECURE === 'true',
    sameSite: isProduction
      ? process.env.COOKIE_SAME_SITE || 'none'
      : process.env.COOKIE_SAME_SITE || 'lax',
    path: '/api/auth/refresh',
    maxAge: 7 * 24 * 60 * 60 * 1000
  };
};

module.exports = {
  generateAccessToken,
  generateRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
  getRefreshCookieOptions
};