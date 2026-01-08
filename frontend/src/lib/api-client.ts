/**
 * Centralized API Client with Automatic Token Refresh
 * 
 * Features:
 * - Automatic authentication headers
 * - Automatic token refresh on 401
 * - Request queue during token refresh
 * - Centralized error handling
 */

import axios, { AxiosInstance, AxiosRequestConfig, AxiosError, InternalAxiosRequestConfig } from 'axios';
import { API_CONFIG } from '@/config';

// Token refresh state
let isRefreshing = false;
let refreshSubscribers: ((token: string) => void)[] = [];

/**
 * Subscribe to token refresh completion
 */
function subscribeTokenRefresh(cb: (token: string) => void) {
  refreshSubscribers.push(cb);
}

/**
 * Notify all subscribers when token is refreshed
 */
function onRefreshed(token: string) {
  refreshSubscribers.forEach((cb) => cb(token));
  refreshSubscribers = [];
}

/**
 * Get access token from storage
 */
function getAccessToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('accessToken');
}

/**
 * Get refresh token from storage
 */
function getRefreshToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('refreshToken');
}

/**
 * Store new tokens
 */
function storeTokens(accessToken: string, refreshToken?: string) {
  if (typeof window === 'undefined') return;
  localStorage.setItem('accessToken', accessToken);
  if (refreshToken) {
    localStorage.setItem('refreshToken', refreshToken);
  }
}

/**
 * Clear all tokens and redirect to login
 */
function clearTokensAndRedirect() {
  if (typeof window === 'undefined') return;

  localStorage.removeItem('accessToken');
  localStorage.removeItem('refreshToken');
  localStorage.removeItem('user');
  localStorage.removeItem('isAuthenticated');

  // Redirect to login
  window.location.href = '/auth/login';
}

/**
 * Create configured axios instance
 */
export function createApiClient(): AxiosInstance {
  const client = axios.create({
    baseURL: API_CONFIG.baseURL,
    timeout: API_CONFIG.timeout,
    headers: {
      'Content-Type': 'application/json',
    },
  });

  /**
   * Request Interceptor - Add authentication headers
   */
  client.interceptors.request.use(
    (config: InternalAxiosRequestConfig) => {
      const token = getAccessToken();

      if (token && config.headers) {
        config.headers.Authorization = `Bearer ${token}`;
      }

      if (API_CONFIG.enableLogging) {
        console.log(`[API] ${config.method?.toUpperCase()} ${config.url}`);
      }

      return config;
    },
    (error) => {
      if (API_CONFIG.enableLogging) {
        console.error('[API] Request error:', error);
      }
      return Promise.reject(error);
    }
  );

  /**
   * Response Interceptor - Handle token refresh on 401
   */
  client.interceptors.response.use(
    (response) => {
      // Successful response
      if (API_CONFIG.enableLogging) {
        console.log(`[API] Response ${response.status} from ${response.config.url}`);
      }
      return response;
    },
    async (error: AxiosError) => {
      const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

      // Handle 401 Unauthorized - Token Expired
      if (error.response?.status === 401 && !originalRequest._retry) {
        if (isRefreshing) {
          // Token refresh already in progress - queue this request
          return new Promise((resolve) => {
            subscribeTokenRefresh((token: string) => {
              if (originalRequest.headers) {
                originalRequest.headers.Authorization = `Bearer ${token}`;
              }
              resolve(client(originalRequest));
            });
          });
        }

        originalRequest._retry = true;
        isRefreshing = true;

        try {
          const refreshToken = getRefreshToken();

          if (!refreshToken) {
            throw new Error('No refresh token available');
          }

          // Call refresh token endpoint
          const response = await axios.post(
            `${API_CONFIG.baseURL}/auth/refresh`,
            { refreshToken },
            { headers: { 'Content-Type': 'application/json' } }
          );

          const { accessToken, refreshToken: newRefreshToken } = response.data;

          // Store new tokens
          storeTokens(accessToken, newRefreshToken || refreshToken);

          // Update original request with new token
          if (originalRequest.headers) {
            originalRequest.headers.Authorization = `Bearer ${accessToken}`;
          }

          // Notify all queued requests
          onRefreshed(accessToken);
          isRefreshing = false;

          // Retry original request
          return client(originalRequest);
        } catch (refreshError) {
          // Refresh failed - clear tokens and redirect to login
          if (API_CONFIG.enableLogging) {
            console.error('[API] Token refresh failed:', refreshError);
          }

          isRefreshing = false;
          clearTokensAndRedirect();

          return Promise.reject(refreshError);
        }
      }

      // Handle other errors
      if (API_CONFIG.enableLogging) {
        console.error(`[API] Response error ${error.response?.status}:`, error.message);
      }

      // Handle network errors
      if (!error.response) {
        console.error('[API] Network error - server may be unreachable');
      }

      return Promise.reject(error);
    }
  );

  return client;
}

/**
 * Default API client instance
 */
export const apiClient = createApiClient();

/**
 * Typed API helper methods
 */
export const api = {
  get: <T = any>(url: string, config?: AxiosRequestConfig) =>
    apiClient.get<T>(url, config),

  post: <T = any>(url: string, data?: any, config?: AxiosRequestConfig) =>
    apiClient.post<T>(url, data, config),

  put: <T = any>(url: string, data?: any, config?: AxiosRequestConfig) =>
    apiClient.put<T>(url, data, config),

  patch: <T = any>(url: string, data?: any, config?: AxiosRequestConfig) =>
    apiClient.patch<T>(url, data, config),

  delete: <T = any>(url: string, config?: AxiosRequestConfig) =>
    apiClient.delete<T>(url, config),
};

export default apiClient;