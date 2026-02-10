import axios, { AxiosInstance, AxiosError, InternalAxiosRequestConfig } from 'axios';
import { showToast } from './toast';
import type {
  LoginRequest,
  LoginResponse,
  RefreshTokenResponse,
  User,
  WorkOrder,
  CreateWorkOrderRequest,
  UpdateWorkOrderRequest,
  PaginatedResponse,
  PaginationParams,
  Asset,
  CreateAssetRequest,
  Site,
  AuditLog,
  AuditLogFilters,
} from '@/types/api';

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
          showToast.info('Your session has expired. Please log in again.');
          window.location.href = '/auth/login';
        }

        return Promise.reject(refreshError);
      }
    }

    // Handle other error status codes with user-friendly messages
    if (error.response?.status === 403) {
      showToast.error((error.response.data as any)?.message || "You don't have permission to perform this action.");
    } else if (error.response?.status === 404) {
      // Don't show toast for 404s by default (component can handle it)
      console.warn('404 Not Found:', error.config?.url);
    } else if (error.response?.status === 422) {
      // Validation errors - component should handle these
      console.warn('Validation Error:', error.response.data);
    } else if (error.response?.status && error.response.status >= 500) {
      showToast.error('Server error. Please try again later.');
    } else if (error.message?.includes('Network Error')) {
      showToast.error('Network error. Please check your internet connection.');
    }

    return Promise.reject(error);
  }
);

// API helper functions
export const api = {
  // Auth endpoints
  auth: {
    login: async (email: string, password: string): Promise<LoginResponse> => {
      const response = await apiClient.post<LoginResponse>('/auth/login', { email, password });
      return response.data;
    },
    logout: async (): Promise<{ message: string }> => {
      const response = await apiClient.post<{ message: string }>('/auth/logout');
      return response.data;
    },
    getMe: async (): Promise<User> => {
      const response = await apiClient.get<User>('/auth/me');
      return response.data;
    },
    refresh: async (refreshToken: string): Promise<RefreshTokenResponse> => {
      const response = await apiClient.post<RefreshTokenResponse>('/auth/refresh', { refreshToken });
      return response.data;
    },
  },

  // Work orders endpoints
  workOrders: {
    list: async (params?: PaginationParams & Partial<WorkOrder>): Promise<PaginatedResponse<WorkOrder>> => {
      const response = await apiClient.get<PaginatedResponse<WorkOrder>>('/work-orders', { params });
      return response.data;
    },
    getById: async (id: string): Promise<WorkOrder> => {
      const response = await apiClient.get<WorkOrder>(`/work-orders/${id}`);
      return response.data;
    },
    create: async (data: CreateWorkOrderRequest): Promise<WorkOrder> => {
      const response = await apiClient.post<WorkOrder>('/work-orders', data);
      return response.data;
    },
    update: async (id: string, data: UpdateWorkOrderRequest): Promise<WorkOrder> => {
      const response = await apiClient.patch<WorkOrder>(`/work-orders/${id}`, data);
      return response.data;
    },
    delete: async (id: string): Promise<{ success: boolean }> => {
      const response = await apiClient.delete<{ success: boolean }>(`/work-orders/${id}`);
      return response.data;
    },
    transition: async (id: string, status: string): Promise<WorkOrder> => {
      const response = await apiClient.post<WorkOrder>(`/work-orders/${id}/transition`, { status });
      return response.data;
    },
  },

  // Assets endpoints
  assets: {
    list: async (params?: PaginationParams & Partial<Asset>): Promise<PaginatedResponse<Asset>> => {
      const response = await apiClient.get<PaginatedResponse<Asset>>('/assets', { params });
      return response.data;
    },
    getById: async (id: string): Promise<Asset> => {
      const response = await apiClient.get<Asset>(`/assets/${id}`);
      return response.data;
    },
    create: async (data: CreateAssetRequest): Promise<Asset> => {
      const response = await apiClient.post<Asset>('/assets', data);
      return response.data;
    },
    update: async (id: string, data: Partial<CreateAssetRequest>): Promise<Asset> => {
      const response = await apiClient.patch<Asset>(`/assets/${id}`, data);
      return response.data;
    },
    delete: async (id: string): Promise<{ success: boolean }> => {
      const response = await apiClient.delete<{ success: boolean }>(`/assets/${id}`);
      return response.data;
    },
    getHierarchy: async (id: string): Promise<Asset> => {
      const response = await apiClient.get<Asset>(`/assets/${id}/hierarchy`);
      return response.data;
    },
  },

  // Sites endpoints
  sites: {
    list: async (params?: PaginationParams): Promise<PaginatedResponse<Site>> => {
      const response = await apiClient.get<PaginatedResponse<Site>>('/sites', { params });
      return response.data;
    },
    getById: async (id: string): Promise<Site> => {
      const response = await apiClient.get<Site>(`/sites/${id}`);
      return response.data;
    },
    create: async (data: Omit<Site, 'id' | 'createdAt' | 'updatedAt'>): Promise<Site> => {
      const response = await apiClient.post<Site>('/sites', data);
      return response.data;
    },
    update: async (id: string, data: Partial<Site>): Promise<Site> => {
      const response = await apiClient.patch<Site>(`/sites/${id}`, data);
      return response.data;
    },
    delete: async (id: string): Promise<{ success: boolean }> => {
      const response = await apiClient.delete<{ success: boolean }>(`/sites/${id}`);
      return response.data;
    },
  },

  // Users endpoints
  users: {
    list: async (params?: PaginationParams): Promise<PaginatedResponse<User>> => {
      const response = await apiClient.get<PaginatedResponse<User>>('/users', { params });
      return response.data;
    },
    getById: async (id: string): Promise<User> => {
      const response = await apiClient.get<User>(`/users/${id}`);
      return response.data;
    },
    create: async (data: Partial<User> & { password: string }): Promise<User> => {
      const response = await apiClient.post<User>('/users', data);
      return response.data;
    },
    update: async (id: string, data: Partial<User>): Promise<User> => {
      const response = await apiClient.put<User>(`/users/${id}`, data);
      return response.data;
    },
    delete: async (id: string): Promise<{ success: boolean }> => {
      const response = await apiClient.delete<{ success: boolean }>(`/users/${id}`);
      return response.data;
    },
  },

  // Audit Logs endpoints
  auditLogs: {
    list: async (params?: PaginationParams & AuditLogFilters): Promise<PaginatedResponse<AuditLog>> => {
      const response = await apiClient.get<PaginatedResponse<AuditLog>>('/audit-logs', { params });
      return response.data;
    },
    export: async (params?: AuditLogFilters): Promise<Blob> => {
      const response = await apiClient.get<Blob>('/audit-logs/export', {
        params,
        responseType: 'blob'
      });
      return response.data;
    },
    getStatistics: async (params?: { startDate?: string; endDate?: string }): Promise<Record<string, any>> => {
      const response = await apiClient.get<Record<string, any>>('/audit-logs/statistics', { params });
      return response.data;
    },
  },
};