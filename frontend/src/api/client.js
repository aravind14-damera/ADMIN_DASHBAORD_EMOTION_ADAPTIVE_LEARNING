import axios from "axios";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api/v1";

const AUTH_TOKEN_KEY = "admin_token";

/**
 * Token storage helpers
 */
export const tokenStorage = {
  get() {
    try {
      return localStorage.getItem(AUTH_TOKEN_KEY);
    } catch {
      return null;
    }
  },

  set(token) {
    try {
      if (!token) return;
      localStorage.setItem(AUTH_TOKEN_KEY, token);
    } catch {
      // no-op (private mode / storage disabled)
    }
  },

  clear() {
    try {
      localStorage.removeItem(AUTH_TOKEN_KEY);
    } catch {
      // no-op
    }
  },
};

/**
 * Optional auth event callback registry.
 * Consumers can register handlers like:
 * - onUnauthorized: called when 401 is received
 */
let unauthorizedHandler = null;

export const authEvents = {
  onUnauthorized(handler) {
    unauthorizedHandler = typeof handler === "function" ? handler : null;
  },
};

const client = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  timeout: 30000,
  headers: {
    "Content-Type": "application/json",
  },
});

/**
 * Request interceptor:
 * - Attach Bearer token if present
 */
client.interceptors.request.use(
  (config) => {
    const token = tokenStorage.get();

    if (token) {
      config.headers = config.headers || {};
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => Promise.reject(error),
);

/**
 * Response interceptor:
 * - Normalize success payload to `response.data`
 * - Handle 401 globally:
 *    - clear token
 *    - invoke registered unauthorized handler
 */
client.interceptors.response.use(
  (response) => response?.data ?? response,
  (error) => {
    const status = error?.response?.status;

    if (status === 401) {
      tokenStorage.clear();

      if (unauthorizedHandler) {
        unauthorizedHandler(error);
      }
    }

    return Promise.reject(error);
  },
);

export default client;
