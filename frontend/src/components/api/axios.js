import axios from 'axios';

const DEFAULT_API_TIMEOUT_MS = 180000;
const REQUEST_TIMEOUT_MESSAGE =
  'Request is taking longer than expected. Please try again.';
const API_TIMEOUT_ENV_VALUE = import.meta.env.VITE_API_TIMEOUT_MS;
const isDev = Boolean(import.meta.env.DEV);

const TOKEN_KEY = 'token';
const AUTH_LOGOUT_EVENT = 'smartnid:auth:logout';
const AUTH_REFRESH_EVENT = 'smartnid:auth:token-refreshed';

const getApiTimeoutMs = () => {
  const configuredTimeoutMs = Number(API_TIMEOUT_ENV_VALUE);

  return Number.isFinite(configuredTimeoutMs) && configuredTimeoutMs > 0
    ? configuredTimeoutMs
    : DEFAULT_API_TIMEOUT_MS;
};

const apiTimeoutMs = getApiTimeoutMs();
const apiBaseURL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

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

  // Keep API diagnostics silent by default. Enable this line only while debugging.
  // console.info(`[api] ${event}`, details);
};

logApiDiagnostic('timeout_configured', {
  configuredTimeoutMs: API_TIMEOUT_ENV_VALUE || '',
  finalTimeoutMs: apiTimeoutMs
});

const publicAuthPaths = [
  '/auth/login',
  '/auth/register',
  '/auth/verify-otp',
  '/auth/resend-otp',
  '/auth/forgot-password',
  '/auth/reset-password'
];

const normalizeUrlPath = (url = '') => {
  const text = String(url || '');

  try {
    if (/^https?:\/\//i.test(text)) {
      const parsed = new URL(text);
      return parsed.pathname.replace(/^\/api/, '');
    }
  } catch (error) {
    // Fall back to raw string normalization below.
  }

  return text.replace(/^https?:\/\/[^/]+/i, '').replace(/^\/api/, '');
};

const isAuthRefreshRequest = (config = {}) =>
  normalizeUrlPath(config.url).includes('/auth/refresh');

const isPublicAuthRequest = (config = {}) => {
  const path = normalizeUrlPath(config.url);
  return publicAuthPaths.some((publicPath) => path.includes(publicPath));
};

const setStoredAccessToken = (token) => {
  if (!token) {
    return;
  }

  localStorage.setItem(TOKEN_KEY, token);
  api.defaults.headers.common.Authorization = `Bearer ${token}`;
};

const clearStoredAccessToken = () => {
  localStorage.removeItem(TOKEN_KEY);
  delete api.defaults.headers.common.Authorization;
};

const emitAuthRefresh = (payload = {}) => {
  if (typeof window === 'undefined') {
    return;
  }

  window.dispatchEvent(
    new CustomEvent(AUTH_REFRESH_EVENT, {
      detail: payload
    })
  );
};

const emitAuthLogout = (reason = 'session_expired') => {
  if (typeof window === 'undefined') {
    return;
  }

  window.dispatchEvent(
    new CustomEvent(AUTH_LOGOUT_EVENT, {
      detail: { reason }
    })
  );
};

const redirectAfterSessionExpired = () => {
  if (typeof window === 'undefined') {
    return;
  }

  const currentPath = window.location.pathname;
  const isAuthPage = ['/login', '/admin/login'].includes(currentPath);

  if (isAuthPage) {
    return;
  }

  const isAdminPath = currentPath.startsWith('/admin');
  window.location.href = isAdminPath ? '/admin/login' : '/login';
};

const authRefreshClient = axios.create({
  baseURL: apiBaseURL,
  headers: {
    'Content-Type': 'application/json'
  },
  timeout: apiTimeoutMs,
  withCredentials: true
});

let refreshPromise = null;

const refreshAccessToken = async () => {
  if (!refreshPromise) {
    refreshPromise = authRefreshClient
      .post('/auth/refresh')
      .then((response) => {
        const payload = response.data || {};
        const nextToken = payload.accessToken || payload.token;

        if (!nextToken) {
          throw new Error('Refresh response did not include an access token');
        }

        setStoredAccessToken(nextToken);
        emitAuthRefresh({ token: nextToken, user: payload.user || null });
        return nextToken;
      })
      .catch((error) => {
        clearStoredAccessToken();
        emitAuthLogout('session_expired');
        throw error;
      })
      .finally(() => {
        refreshPromise = null;
      });
  }

  return refreshPromise;
};

// Shared axios instance
const api = axios.create({
  baseURL: apiBaseURL,
  headers: {
    'Content-Type': 'application/json'
  },
  timeout: apiTimeoutMs,
  withCredentials: true
});

const storedToken = localStorage.getItem(TOKEN_KEY);
if (storedToken) {
  api.defaults.headers.common.Authorization = `Bearer ${storedToken}`;
}

// Attach token on every request
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem(TOKEN_KEY);
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
  async (error) => {
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

    if (error.response?.status === 401) {
      if (isPublicAuthRequest(config) || isAuthRefreshRequest(config)) {
        return Promise.reject(safeError);
      }

      if (!config._smartNidRetry) {
        config._smartNidRetry = true;

        try {
          const nextToken = await refreshAccessToken();
          config.headers = {
            ...(config.headers || {}),
            Authorization: `Bearer ${nextToken}`
          };

          return api(config);
        } catch (refreshError) {
          redirectAfterSessionExpired();
          return Promise.reject(sanitizeTimeoutError(refreshError));
        }
      }

      clearStoredAccessToken();
      emitAuthLogout('session_expired');
      redirectAfterSessionExpired();
    } else if (error.response?.status === 403) {
      console.error('Access forbidden');
    } else if (error.response?.status === 404) {
      console.error('Resource not found');
    } else if (error.response?.status >= 500) {
      console.error('Server error');
    } else if (error.request) {
      console.error('Network error - please check your connection');
    }

    return Promise.reject(safeError);
  }
);

export { AUTH_LOGOUT_EVENT, AUTH_REFRESH_EVENT };
export default api;
