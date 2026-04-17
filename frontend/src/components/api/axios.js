import axios from 'axios';

// Shared axios instance
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
  headers: {
    'Content-Type': 'application/json'
  },
  timeout: 30000
});

// Attach token on every request
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    if (config.data instanceof FormData) {
      delete config.headers['Content-Type'];
    }

    return config;
  },
  (error) => Promise.reject(error)
);

// Handle common API errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response) {
      switch (error.response.status) {
        case 401: {
          localStorage.removeItem('token');

          const currentPath = window.location.pathname;
          const isAdminPath = currentPath.startsWith('/admin');

          if (currentPath !== '/login' && currentPath !== '/admin/login') {
            window.location.href = isAdminPath ? '/admin/login' : '/login';
          }
          break;
        }

        case 403:
          console.error('Access forbidden');
          break;

        case 404:
          console.error('Resource not found');
          break;

        case 500:
          console.error('Server error');
          break;

        default:
          break;
      }
    } else if (error.request) {
      console.error('Network error - please check your connection');
    }

    return Promise.reject(error);
  }
);

export default api;