import axios from 'axios';

const DEFAULT_API_TIMEOUT_MS = 180000;
const REQUEST_TIMEOUT_MESSAGE =
  'Request is taking longer than expected. Please try again.';
const API_TIMEOUT_ENV_VALUE = import.meta.env.VITE_API_TIMEOUT_MS;
const isDev = Boolean(import.meta.env.DEV);

const getApiTimeoutMs = () => {
  const configuredTimeoutMs = Number(API_TIMEOUT_ENV_VALUE);

  return Number.isFinite(configuredTimeoutMs) && configuredTimeoutMs > 0
    ? configuredTimeoutMs
    : DEFAULT_API_TIMEOUT_MS;
};

const apiTimeoutMs = getApiTimeoutMs();

const isAxiosTimeout = (error) =>
  error?.code === 'ECONNABORTED' ||
  error?.code === 'ETIMEDOUT' ||
  String(error?.message || '').toLowerCase().includes('timeout');

const sanitizeTimeoutError = (error) => {
  if (!isAxiosTimeout(error)) {
    return error;
  }

  error.message = REQUEST_TIMEOUT_MESSAGE;
  error.safeMessage = REQUEST_TIMEOUT_MESSAGE;
  return error;
};

const getRequestUrl = (config = {}) => {
  const baseURL = config.baseURL || '';
  const url = config.url || '';

  if (!baseURL || /^https?:\/\//i.test(url)) {
    return url || baseURL;
  }

  return `${String(baseURL).replace(/\/$/, '')}/${String(url).replace(/^\//, '')}`;
};

const logApiDiagnostic = (event, details = {}) => {
  if (!isDev) {
    return;
  }

  console.info(`[api] ${event}`, details);
};

logApiDiagnostic('timeout_configured', {
  configuredTimeoutMs: API_TIMEOUT_ENV_VALUE || '',
  finalTimeoutMs: apiTimeoutMs
});

// Shared axios instance
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
  headers: {
    'Content-Type': 'application/json'
  },
  timeout: apiTimeoutMs
});

// Attach token on every request
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    config.metadata = {
      ...(config.metadata || {}),
      startedAtMs: Date.now()
    };

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    if (config.data instanceof FormData) {
      delete config.headers['Content-Type'];
    }

    logApiDiagnostic('request_started', {
      method: String(config.method || 'get').toUpperCase(),
      url: getRequestUrl(config),
      timeoutMs: Number(config.timeout) || apiTimeoutMs
    });

    return config;
  },
  (error) => Promise.reject(sanitizeTimeoutError(error))
);

// Handle common API errors
api.interceptors.response.use(
  (response) => {
    const startedAtMs = response.config?.metadata?.startedAtMs;

    logApiDiagnostic('request_finished', {
      method: String(response.config?.method || 'get').toUpperCase(),
      url: getRequestUrl(response.config),
      timeoutMs: Number(response.config?.timeout) || apiTimeoutMs,
      durationMs: startedAtMs ? Date.now() - startedAtMs : undefined,
      httpStatus: response.status
    });

    return response;
  },
  (error) => {
    const timedOut = isAxiosTimeout(error);
    const safeError = sanitizeTimeoutError(error);
    const config = error.config || {};
    const startedAtMs = config.metadata?.startedAtMs;

    logApiDiagnostic('request_failed', {
      method: String(config.method || 'get').toUpperCase(),
      url: getRequestUrl(config),
      timeoutMs: Number(config.timeout) || apiTimeoutMs,
      durationMs: startedAtMs ? Date.now() - startedAtMs : undefined,
      timedOut,
      frontendTimedOutBeforeBackendResponse: timedOut && !error.response,
      httpStatus: error.response?.status,
      backendCode: error.response?.data?.code || ''
    });

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

    return Promise.reject(safeError);
  }
);

export default api;
