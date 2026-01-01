/**
 * API Response Types
 * Matches backend schema and API responses
 */

// ==========================================
// COMMON TYPES
// ==========================================

export type UUID = string;

export interface PaginationParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface ApiError {
  statusCode: number;
  error: string;
  message: string;
  requiredPermissions?: string[];
  anyPermissions?: string[];
}

// ==========================================
// USER & AUTH
// ==========================================

export type UserRole =
  | "super_admin"
  | "tenant_admin"
  | "site_manager"
  | "technician"
  | "operator"
  | "viewer";

export interface User {
  id: UUID;
  tenantId: UUID;
  email: string;
  username: string;
  role: UserRole;
  firstName?: string;
  lastName?: string;
  phone?: string;
  isActive: boolean;
  requirePasswordChange?: boolean;
  lastLoginAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  user: User;
  passwordChangeReminder?: string;
}

export interface RefreshTokenRequest {
  refreshToken: string;
}

export interface RefreshTokenResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

// ==========================================
// WORK ORDERS
// ==========================================

export type WorkOrderStatus =
  | "draft"
  | "open"
  | "scheduled"
  | "in_progress"
  | "on_hold"
  | "completed"
  | "closed"
  | "cancelled";

export type WorkOrderType =
  | "corrective"
  | "preventive"
  | "predictive"
  | "inspection"
  | "emergency";

export type WorkOrderPriority = "critical" | "high" | "medium" | "low";

export interface WorkOrder {
  id: UUID;
  tenantId: UUID;
  workOrderId: string; // Human-readable ID
  title: string;
  description?: string;
  type: WorkOrderType;
  priority: WorkOrderPriority;
  status: WorkOrderStatus;
  siteId: UUID;
  assetId?: UUID;
  assignedTo?: UUID;
  createdBy: UUID;
  scheduledStart?: string;
  scheduledEnd?: string;
  actualStart?: string;
  actualEnd?: string;
  estimatedHours?: number;
  actualHours?: number;
  metadata?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

export interface CreateWorkOrderRequest {
  title: string;
  description?: string;
  type: WorkOrderType;
  priority: WorkOrderPriority;
  siteId: UUID;
  assetId?: UUID;
  assignedTo?: UUID;
  scheduledStart?: string;
  scheduledEnd?: string;
  estimatedHours?: number;
  metadata?: Record<string, any>;
}

export interface UpdateWorkOrderRequest {
  title?: string;
  description?: string;
  type?: WorkOrderType;
  priority?: WorkOrderPriority;
  status?: WorkOrderStatus;
  assignedTo?: UUID;
  scheduledStart?: string;
  scheduledEnd?: string;
  estimatedHours?: number;
  actualHours?: number;
  metadata?: Record<string, any>;
}

export interface WorkOrderTask {
  id: UUID;
  workOrderId: UUID;
  title: string;
  description?: string;
  taskOrder: number;
  isCompleted: boolean;
  completedAt?: string;
  completedBy?: UUID;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

// ==========================================
// ASSETS
// ==========================================

export type AssetStatus =
  | "operational"
  | "degraded"
  | "down"
  | "maintenance"
  | "decommissioned";

export interface Asset {
  id: UUID;
  tenantId: UUID;
  siteId: UUID;
  parentAssetId?: UUID;
  assetId: string; // Human-readable ID
  name: string;
  description?: string;
  type: string;
  manufacturer?: string;
  model?: string;
  serialNumber?: string;
  location?: string;
  latitude?: string;
  longitude?: string;
  status: AssetStatus;
  tags?: string;
  image?: string;
  metadata?: string;
  createdAt: string;
  updatedAt: string;
  children?: Asset[];
}

export interface CreateAssetRequest {
  siteId: UUID;
  assetTag?: string;
  name: string;
  description?: string;
  type: string;
  manufacturer?: string;
  model?: string;
  serialNumber?: string;
  location?: string;
  parentAssetId?: UUID;
  status?: AssetStatus;
  latitude?: number;
  longitude?: number;
  tags?: string[];
  image?: string;
  metadata?: Record<string, any>;
}

// ==========================================
// SITES
// ==========================================

export interface Site {
  id: UUID;
  tenantId: UUID;
  siteId: string; // Human-readable ID
  name: string;
  description?: string;
  location?: string;
  latitude?: string;
  longitude?: string;
  capacity?: number;
  energyType?: string;
  timezone?: string;
  metadata?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

// ==========================================
// ALERTS
// ==========================================

export type AlertSeverity = "critical" | "high" | "medium" | "low" | "info";
export type AlertStatus = "active" | "acknowledged" | "resolved" | "suppressed";

export interface Alert {
  id: UUID;
  tenantId: UUID;
  siteId?: UUID;
  assetId?: UUID;
  alertId: string;
  title: string;
  description?: string;
  severity: AlertSeverity;
  status: AlertStatus;
  source?: string;
  acknowledgedBy?: UUID;
  acknowledgedAt?: string;
  resolvedBy?: UUID;
  resolvedAt?: string;
  metadata?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

// ==========================================
// NOTIFICATIONS
// ==========================================

export type NotificationChannel = "email" | "sms" | "push" | "webhook" | "slack";
export type NotificationStatus = "pending" | "sent" | "failed" | "cancelled";

export interface Notification {
  id: UUID;
  tenantId: UUID;
  userId: UUID;
  channel: NotificationChannel;
  status: NotificationStatus;
  subject?: string;
  body: string;
  metadata?: Record<string, any>;
  sentAt?: string;
  failedAt?: string;
  errorMessage?: string;
  createdAt: string;
}

export interface NotificationPreferences {
  id: UUID;
  userId: UUID;
  emailEnabled: boolean;
  smsEnabled: boolean;
  pushEnabled: boolean;
  quietHoursStart?: string;
  quietHoursEnd?: string;
  eventTypes?: string[];
  createdAt: string;
  updatedAt: string;
}

// ==========================================
// AUDIT LOGS
// ==========================================

export interface AuditLog {
  id: UUID;
  tenantId: UUID;
  userId: UUID;
  action: string;
  entityType: string;
  entityId: string;
  changes?: string;
  ipAddress?: string;
  userAgent?: string;
  timestamp: string;
  createdAt: string;
}

export interface AuditLogFilters {
  userId?: UUID;
  action?: string;
  entityType?: string;
  entityId?: string;
  startDate?: string;
  endDate?: string;
}

// ==========================================
// ANALYTICS & DASHBOARDS
// ==========================================

export interface Dashboard {
  id: UUID;
  tenantId: UUID;
  name: string;
  description?: string;
  layout: Record<string, any>;
  isDefault: boolean;
  createdBy: UUID;
  createdAt: string;
  updatedAt: string;
}

export interface DashboardWidget {
  id: string;
  type: "kpi" | "chart" | "table" | "gauge" | "heatmap";
  title: string;
  dataSource: string;
  configuration: Record<string, any>;
  position: {
    x: number;
    y: number;
    w: number;
    h: number;
  };
}

// ==========================================
// ML FEATURES
// ==========================================

export interface MLModel {
  id: UUID;
  name: string;
  version: string;
  type: string;
  status: string;
  accuracy?: number;
  metadata?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

export interface Forecast {
  id: UUID;
  siteId: UUID;
  type: "generation" | "weather";
  timestamp: string;
  value: number;
  confidence?: number;
  metadata?: Record<string, any>;
  createdAt: string;
}

export interface Anomaly {
  id: UUID;
  siteId: UUID;
  assetId?: UUID;
  severity: AlertSeverity;
  score: number;
  description: string;
  detectedAt: string;
  resolvedAt?: string;
  metadata?: Record<string, any>;
}

// ==========================================
// GENAI
// ==========================================

export interface ChatMessage {
  id: string;
  role: "user" | "bot";
  content: string;
  timestamp: Date;
  citations?: Array<{
    text: string;
    source: string;
    page?: number;
  }>;
}

export interface GenAIDocument {
  id: UUID;
  tenantId: UUID;
  name: string;
  type: string;
  size: number;
  uploadedBy: UUID;
  uploadedAt: string;
  processingStatus: "pending" | "processing" | "completed" | "failed";
  metadata?: Record<string, any>;
}

// ==========================================
// PERMISSIONS (RBAC)
// ==========================================

export type Permission =
  | "create:work-orders"
  | "read:work-orders"
  | "update:work-orders"
  | "delete:work-orders"
  | "approve:work-orders"
  | "assign:work-orders"
  | "close:work-orders"
  | "create:assets"
  | "read:assets"
  | "update:assets"
  | "delete:assets"
  | "manage:assets"
  | "create:parts"
  | "read:parts"
  | "update:parts"
  | "delete:parts"
  | "consume:parts"
  | "create:sites"
  | "read:sites"
  | "update:sites"
  | "delete:sites"
  | "create:users"
  | "read:users"
  | "update:users"
  | "delete:users"
  | "manage:roles"
  | "create:alerts"
  | "read:alerts"
  | "acknowledge:alerts"
  | "resolve:alerts"
  | "manage:notifications"
  | "read:reports"
  | "create:reports"
  | "read:analytics"
  | "read:compliance"
  | "create:compliance"
  | "approve:compliance"
  | "submit:compliance"
  | "create:permits"
  | "read:permits"
  | "approve:permits"
  | "close:permits"
  | "manage:system"
  | "manage:tenants"
  | "read:audit-logs"
  | "manage:integrations";

export interface UserPermissions {
  role: UserRole;
  permissions: Permission[];
}
