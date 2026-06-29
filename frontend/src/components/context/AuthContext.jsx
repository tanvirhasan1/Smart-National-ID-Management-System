import React, { createContext, useState, useEffect, useContext } from 'react';
import api, { AUTH_LOGOUT_EVENT, AUTH_REFRESH_EVENT } from '../api/axios';
import { isInternalUserRole } from '../utils/roles';

const AuthContext = createContext(null);
const TOKEN_KEY = 'token';
const PENDING_VERIFICATION_KEY = 'pendingVerification';
const PASSWORD_RESET_KEY = 'pendingPasswordReset';

export const useAuth = () => {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }

  return context;
};

const getStoredToken = () => localStorage.getItem(TOKEN_KEY);

const setApiToken = (token) => {
  if (token) {
    api.defaults.headers.common.Authorization = `Bearer ${token}`;
    return;
  }

  delete api.defaults.headers.common.Authorization;
};

const storeTokenAndUser = (setters, token, user) => {
  if (token) {
    localStorage.setItem(TOKEN_KEY, token);
    setApiToken(token);
  }

  setters.setToken(token || null);
  setters.setUser(user || null);
  setters.setIsAuthenticated(Boolean(token));
};

const clearAuthState = (setters) => {
  localStorage.removeItem(TOKEN_KEY);
  setApiToken(null);
  setters.setToken(null);
  setters.setUser(null);
  setters.setIsAuthenticated(false);
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(getStoredToken());
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(Boolean(getStoredToken()));

  useEffect(() => {
    const handleTokenRefresh = (event) => {
      const nextToken = event.detail?.token || getStoredToken();
      const refreshedUser = event.detail?.user || null;

      if (nextToken) {
        setToken(nextToken);
        setApiToken(nextToken);
        setIsAuthenticated(true);
      }

      if (refreshedUser) {
        setUser(refreshedUser);
      }
    };

    const handleForcedLogout = () => {
      clearAuthState({ setToken, setUser, setIsAuthenticated });
      setLoading(false);
    };

    window.addEventListener(AUTH_REFRESH_EVENT, handleTokenRefresh);
    window.addEventListener(AUTH_LOGOUT_EVENT, handleForcedLogout);

    return () => {
      window.removeEventListener(AUTH_REFRESH_EVENT, handleTokenRefresh);
      window.removeEventListener(AUTH_LOGOUT_EVENT, handleForcedLogout);
    };
  }, []);

  useEffect(() => {
    const loadUser = async () => {
      const activeToken = getStoredToken();

      if (!activeToken) {
        setLoading(false);
        return;
      }

      try {
        setApiToken(activeToken);

        const response = await api.get('/users/profile');
        const profileUser = response.data.user;
        const latestToken = getStoredToken();

        setToken(latestToken || activeToken);
        setUser(profileUser);
        setIsAuthenticated(true);
      } catch (error) {
        console.error('Failed to load user:', error);

        if (error.response?.status === 401) {
          clearAuthState({ setToken, setUser, setIsAuthenticated });
        }
      } finally {
        setLoading(false);
      }
    };

    loadUser();
  }, []);

  const register = async (userData) => {
    try {
      const response = await api.post('/auth/register', userData);
      const payload = response.data || {};

      sessionStorage.setItem(
        PENDING_VERIFICATION_KEY,
        JSON.stringify({
          email: payload.recipientEmail || userData.email,
          verificationToken: payload.verificationToken
        })
      );

      return payload;
    } catch (error) {
      throw error.response?.data || { message: 'Registration failed' };
    }
  };

  const verifyOTP = async (otp, verificationToken) => {
    try {
      const response = await api.post('/auth/verify-otp', {
        otp,
        verificationToken
      });

      const newToken = response.data?.accessToken || response.data?.token;
      const userData = response.data?.user || null;

      storeTokenAndUser(
        { setToken, setUser, setIsAuthenticated },
        newToken,
        userData
      );

      sessionStorage.removeItem(PENDING_VERIFICATION_KEY);

      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'OTP verification failed' };
    }
  };

  const login = async (email, password) => {
    try {
      const response = await api.post('/auth/login', {
        email,
        password
      });

      const newToken = response.data?.accessToken || response.data?.token;
      const userData = response.data?.user || null;

      storeTokenAndUser(
        { setToken, setUser, setIsAuthenticated },
        newToken,
        userData
      );

      return { success: true, user: userData };
    } catch (error) {
      throw error.response?.data || { message: 'Login failed' };
    }
  };

  const adminLogin = async (email, password) => {
    try {
      const result = await login(email, password);
      const role = result.user?.role;

      if (!isInternalUserRole(role)) {
        clearAuthState({ setToken, setUser, setIsAuthenticated });
        throw { message: 'Unauthorized access' };
      }

      return result;
    } catch (error) {
      throw error.response?.data || error || { message: 'Admin login failed' };
    }
  };

  const logout = async () => {
    clearAuthState({ setToken, setUser, setIsAuthenticated });

    try {
      await api.post('/auth/logout');
    } catch (error) {
      // Local logout should still complete even if the backend logout request fails.
    }
  };

  const updateProfile = async (profileData) => {
    try {
      const response = await api.put('/users/profile', profileData);
      const updatedUser =
        response.data.user || response.data.updatedUser || response.data.data;

      if (updatedUser) {
        setUser(updatedUser);
      }

      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Profile update failed' };
    }
  };

  const forgotPassword = async (identifier) => {
    try {
      const response = await api.post('/auth/forgot-password', { identifier });
      const payload = response.data || {};

      sessionStorage.setItem(
        PASSWORD_RESET_KEY,
        JSON.stringify({
          email: payload.recipientEmail,
          resetToken: payload.resetToken
        })
      );

      return payload;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to send reset code' };
    }
  };

  const resetPassword = async ({ otp, password, resetToken }) => {
    try {
      const response = await api.post('/auth/reset-password', {
        otp,
        password,
        resetToken
      });

      sessionStorage.removeItem(PASSWORD_RESET_KEY);
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to reset password' };
    }
  };

  const resendOTP = async (verificationToken) => {
    try {
      const response = await api.post('/auth/resend-otp', {
        verificationToken
      });

      const stored = JSON.parse(
        sessionStorage.getItem(PENDING_VERIFICATION_KEY) || '{}'
      );

      sessionStorage.setItem(
        PENDING_VERIFICATION_KEY,
        JSON.stringify({
          ...stored,
          email: response.data?.recipientEmail || stored.email,
          verificationToken
        })
      );

      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to resend OTP' };
    }
  };

  const value = {
    user,
    token,
    loading,
    isAuthenticated,
    register,
    verifyOTP,
    login,
    adminLogin,
    logout,
    updateProfile,
    resendOTP,
    forgotPassword,
    resetPassword,
    pendingVerificationKey: PENDING_VERIFICATION_KEY,
    passwordResetKey: PASSWORD_RESET_KEY
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export default AuthContext;
