import React, { createContext, useState, useEffect, useContext } from 'react';
import api from '../api/axios';

const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }

  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const loadUser = async () => {
      if (!token) {
        setLoading(false);
        return;
      }

      try {
        api.defaults.headers.common.Authorization = `Bearer ${token}`;

        const response = await api.get('/users/profile');
        const profileUser = response.data.user;

        setUser(profileUser);
        setIsAuthenticated(true);
      } catch (error) {
        console.error('Failed to load user:', error);
        logout();
      } finally {
        setLoading(false);
      }
    };

    loadUser();
  }, [token]);

  const register = async (userData) => {
    try {
      const response = await api.post('/auth/register', userData);
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Registration failed' };
    }
  };

  const verifyOTP = async (phone, otp, verificationToken) => {
  try {
    const response = await api.post('/auth/verify-otp', {
      phone,
      otp,
      verificationToken
    });

    const { token: newToken, user: userData } = response.data;

    localStorage.setItem('token', newToken);
    setToken(newToken);
    setUser(userData);
    setIsAuthenticated(true);
    api.defaults.headers.common.Authorization = `Bearer ${newToken}`;

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

      const { token: newToken, user: userData } = response.data;

      localStorage.setItem('token', newToken);
      setToken(newToken);
      setUser(userData);
      setIsAuthenticated(true);
      api.defaults.headers.common.Authorization = `Bearer ${newToken}`;

      return { success: true, user: userData };
    } catch (error) {
      throw error.response?.data || { message: 'Login failed' };
    }
  };

  const adminLogin = async (email, password) => {
    try {
      const response = await api.post('/auth/login', {
        email,
        password
      });

      const { token: newToken, user: userData } = response.data;

      if (!['admin', 'super_admin'].includes(userData.role)) {
        throw { message: 'Unauthorized access' };
      }

      localStorage.setItem('token', newToken);
      setToken(newToken);
      setUser(userData);
      setIsAuthenticated(true);
      api.defaults.headers.common.Authorization = `Bearer ${newToken}`;

      return { success: true, user: userData };
    } catch (error) {
      throw error.response?.data || { message: 'Admin login failed' };
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
    setIsAuthenticated(false);
    delete api.defaults.headers.common.Authorization;
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

  const resendOTP = async (phone, verificationToken) => {
  try {
    const response = await api.post('/auth/resend-otp', {
      phone,
      verificationToken
    });

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
    resendOTP
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export default AuthContext;