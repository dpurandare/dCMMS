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
  Crew,
} from '@/types/api';

// API client configuration
// 3001 is the backend's port (see CLAUDE.md) — 3000 is this frontend's own
// port. Defaulting to 3000 here was a same-origin looking but wrong fallback
// that only ever worked because NEXT_PUBLIC_API_URL happened to always be
// set (REV-033).
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

// Create axios instance
export const apiClient: AxiosInstance = axios.create({
  baseURL: API_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
  // Required so the browser sends the HttpOnly refresh cookie to /auth/refresh
  // and /auth/logout (REV-017).
  withCredentials: true,
});

// Request interceptor to add auth token and CSRF token
apiClient.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    if (typeof window !== 'undefined') {
      // The access token lives in memory, not localStorage, so an injected
      // script has nothing durable to steal (REV-017).
      const { useAuthStore } = await import('@/store/auth-store');
      const token = useAuthStore.getState().accessToken;
      if (token && config.headers) {
        config.headers.Authorization = `Bearer ${token}`;
      }

      // Add CSRF token for state-changing requests
      const { getCsrfToken, requiresCsrfProtection } = await import('@/lib/csrf');
      if (config.method && requiresCsrfProtection(config.method)) {
        const csrfToken = getCsrfToken();
        if (csrfToken && config.headers) {
          config.headers['X-CSRF-Token'] = csrfToken;
        }
      }
    }
    return config;
  },
  (error: AxiosError) => {
    return Promise.reject(error);
  }
);

// Serializes concurrent refresh attempts behind one in-flight request
// (REV-035). Without this, N requests that all 401 at once each fire their
// own /auth/refresh call; with refresh-token rotation the second call can
// invalidate the token the first one just issued, incorrectly logging out a
// session that was actually still valid. Every 401 handler awaits this same
// promise instead, so exactly one refresh happens no matter how many
// requests were in flight when the token expired.
let refreshPromise: Promise<string> | null = null;

async function refreshAccessToken(): Promise<string> {
  if (!refreshPromise) {
    refreshPromise = axios
      .post(`${API_URL}/auth/refresh`, {}, { withCredentials: true })
      .then((response) => response.data.accessToken as string)
      .finally(() => {
        refreshPromise = null;
      });
  }
  return refreshPromise;
}

// Response interceptor to handle errors and token refresh
apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    // Import error handler for better error messages
    const { handleErrorWithToast, categorizeError, ErrorCategory } = await import('@/lib/error-handler');

    // Handle 401 Unauthorized errors
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      const { useAuthStore } = await import('@/store/auth-store');

      try {
        // No token is sent: the browser attaches the HttpOnly refresh cookie.
        // This is also why withCredentials is set on the instance.
        const newAccessToken = await refreshAccessToken();
        useAuthStore.getState().setAccessToken(newAccessToken);

        // Update header and retry original request
        if (originalRequest.headers) {
          originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
        }
        return apiClient(originalRequest);
      } catch (refreshError) {
        // Refresh failed — the cookie is gone, expired or revoked.
        useAuthStore.getState().logout();
        window.location.href = '/auth/login';
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
    /** Takes no argument: the refresh token is the HttpOnly cookie (REV-017). */
    refresh: async (): Promise<RefreshTokenResponse> => {
      const response = await apiClient.post<RefreshTokenResponse>('/auth/refresh');
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

  // Crews endpoints
  crews: {
    list: async (params?: PaginationParams & { search?: string, siteId?: string }): Promise<PaginatedResponse<Crew>> => {
      const response = await apiClient.get<PaginatedResponse<Crew>>('/crews', { params });
      return response.data;
    },
    getById: async (id: string): Promise<Crew> => {
      const response = await apiClient.get<Crew>(`/crews/${id}`);
      return response.data;
    },
    create: async (data: Partial<Crew>): Promise<Crew> => {
      const response = await apiClient.post<Crew>('/crews', data);
      return response.data;
    },
    update: async (id: string, data: Partial<Crew>): Promise<Crew> => {
      const response = await apiClient.patch<Crew>(`/crews/${id}`, data);
      return response.data;
    },
    delete: async (id: string): Promise<{ success: boolean }> => {
      const response = await apiClient.delete<{ success: boolean }>(`/crews/${id}`);
      return response.data;
    },
    addMember: async (crewId: string, userId: string, isLeader: boolean = false): Promise<any> => {
      const response = await apiClient.post(`/crews/${crewId}/members`, { userId, isLeader });
      return response.data;
    },
    removeMember: async (crewId: string, userId: string): Promise<{ success: boolean }> => {
      const response = await apiClient.delete<{ success: boolean }>(`/crews/${crewId}/members/${userId}`);
      return response.data;
    },
    setMemberRole: async (crewId: string, userId: string, isLeader: boolean): Promise<any> => {
      const response = await apiClient.patch(`/crews/${crewId}/members/${userId}`, { isLeader });
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