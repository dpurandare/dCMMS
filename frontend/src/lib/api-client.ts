import axios, { AxiosInstance, AxiosError, InternalAxiosRequestConfig } from 'axios';

// API client configuration
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api/v1';

// Create axios instance
export const apiClient: AxiosInstance = axios.create({
  baseURL: API_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('accessToken');
      if (token && config.headers) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error: AxiosError) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle errors and token refresh
apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    // Handle 401 Unauthorized errors
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = localStorage.getItem('refreshToken');

        if (!refreshToken) {
          // No refresh token available, redirect to login
          if (typeof window !== 'undefined') {
            window.location.href = '/auth/login';
          }
          return Promise.reject(error);
        }

        // Try to refresh the token
        const response = await axios.post(`${API_URL}/auth/refresh`, {
          refreshToken,
        });

        const { accessToken, refreshToken: newRefreshToken } = response.data;

        // Store new tokens
        localStorage.setItem('accessToken', accessToken);
        localStorage.setItem('refreshToken', newRefreshToken);

        // Retry the original request with new token
        if (originalRequest.headers) {
          originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        }
        return apiClient(originalRequest);
      } catch (refreshError) {
        // Refresh failed, clear tokens and redirect to login
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');

        if (typeof window !== 'undefined') {
          window.location.href = '/auth/login';
        }

        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

// API helper functions
export const api = {
  // Auth endpoints
  auth: {
    login: async (email: string, password: string) => {
      const response = await apiClient.post('/auth/login', { email, password });
      return response.data;
    },
    logout: async () => {
      const response = await apiClient.post('/auth/logout');
      return response.data;
    },
    getMe: async () => {
      const response = await apiClient.get('/auth/me');
      return response.data;
    },
    refresh: async (refreshToken: string) => {
      const response = await apiClient.post('/auth/refresh', { refreshToken });
      return response.data;
    },
  },

  // Work orders endpoints
  workOrders: {
    list: async (params?: Record<string, any>) => {
      const response = await apiClient.get('/work-orders', { params });
      return response.data;
    },
    getById: async (id: string) => {
      const response = await apiClient.get(`/work-orders/${id}`);
      return response.data;
    },
    create: async (data: any) => {
      const response = await apiClient.post('/work-orders', data);
      return response.data;
    },
    update: async (id: string, data: any) => {
      const response = await apiClient.patch(`/work-orders/${id}`, data);
      return response.data;
    },
    delete: async (id: string) => {
      const response = await apiClient.delete(`/work-orders/${id}`);
      return response.data;
    },
  },

  // Assets endpoints (to be implemented)
  assets: {
    list: async () => {
      const response = await apiClient.get('/assets');
      return response.data;
    },
    getById: async (id: string) => {
      const response = await apiClient.get(`/assets/${id}`);
      return response.data;
    },
  },

  // Sites endpoints (to be implemented)
  sites: {
    list: async () => {
      const response = await apiClient.get('/sites');
      return response.data;
    },
    getById: async (id: string) => {
      const response = await apiClient.get(`/sites/${id}`);
      return response.data;
    },
  },
};
