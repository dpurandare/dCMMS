import { pgTable, uuid, varchar, text, boolean, timestamp, integer, decimal, pgEnum } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// ==========================================
// ENUMS
// ==========================================

export const userRoleEnum = pgEnum('user_role', [
  'super_admin',
  'tenant_admin',
  'site_manager',
  'technician',
  'operator',
  'viewer',
]);

export const workOrderTypeEnum = pgEnum('work_order_type', [
  'corrective',
  'preventive',
  'predictive',
  'inspection',
  'emergency',
]);

export const workOrderPriorityEnum = pgEnum('work_order_priority', [
  'critical',
  'high',
  'medium',
  'low',
]);

export const workOrderStatusEnum = pgEnum('work_order_status', [
  'draft',
  'open',
  'in_progress',
  'on_hold',
  'completed',
  'cancelled',
]);

export const assetStatusEnum = pgEnum('asset_status', [
  'operational',
  'degraded',
  'down',
  'maintenance',
  'decommissioned',
]);

export const alertSeverityEnum = pgEnum('alert_severity', [
  'critical',
  'high',
  'medium',
  'low',
  'info',
]);

export const alertStatusEnum = pgEnum('alert_status', [
  'active',
  'acknowledged',
  'resolved',
  'suppressed',
]);

export const notificationChannelEnum = pgEnum('notification_channel', [
  'email',
  'sms',
  'push',
  'webhook',
  'slack',
]);

export const notificationEventTypeEnum = pgEnum('notification_event_type', [
  'work_order_assigned',
  'work_order_overdue',
  'work_order_completed',
  'alert_critical',
  'alert_high',
  'alert_medium',
  'alert_acknowledged',
  'alert_resolved',
  'asset_down',
  'maintenance_due',
]);

export const notificationStatusEnum = pgEnum('notification_status', [
  'pending',
  'sent',
  'delivered',
  'failed',
  'bounced',
]);

export const webhookAuthTypeEnum = pgEnum('webhook_auth_type', [
  'none',
  'bearer',
  'basic',
  'api_key',
]);

export const webhookDeliveryStatusEnum = pgEnum('webhook_delivery_status', [
  'success',
  'failed',
  'timeout',
  'invalid_response',
]);

export const energyTypeEnum = pgEnum('energy_type', [
  'solar',
  'wind',
  'hydro',
  'biomass',
  'geothermal',
  'hybrid',
]);

// ==========================================
// TABLES
// ==========================================

export const tenants = pgTable('tenants', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: varchar('tenant_id', { length: 100 }).notNull().unique(),
  name: varchar('name', { length: 255 }).notNull(),
  domain: varchar('domain', { length: 255 }),
  config: text('config').default('{}'),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  email: varchar('email', { length: 255 }).notNull(),
  username: varchar('username', { length: 100 }).notNull(),
  firstName: varchar('first_name', { length: 100 }),
  lastName: varchar('last_name', { length: 100 }),
  role: userRoleEnum('role').notNull().default('viewer'),
  isActive: boolean('is_active').notNull().default(true),
  phone: varchar('phone', { length: 20 }),
  lastLoginAt: timestamp('last_login_at'),
  passwordHash: varchar('password_hash', { length: 255 }),
  idpUserId: varchar('idp_user_id', { length: 255 }),
  metadata: text('metadata').default('{}'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const sites = pgTable('sites', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  siteId: varchar('site_id', { length: 100 }).notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  type: varchar('type', { length: 50 }).notNull(),
  energyType: energyTypeEnum('energy_type'), // Energy generation type (solar, wind, etc.)
  location: text('location').notNull(),
  capacityMw: decimal('capacity_mw', { precision: 10, scale: 2 }),
  commissionDate: timestamp('commission_date'),
  config: text('config').default('{}'),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const assets = pgTable('assets', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  siteId: uuid('site_id').notNull().references(() => sites.id, { onDelete: 'cascade' }),
  parentAssetId: uuid('parent_asset_id').references(() => assets.id, { onDelete: 'set null' }),
  assetId: varchar('asset_id', { length: 100 }).notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  type: varchar('type', { length: 100 }).notNull(),
  manufacturer: varchar('manufacturer', { length: 255 }),
  model: varchar('model', { length: 255 }),
  serialNumber: varchar('serial_number', { length: 255 }),
  installationDate: timestamp('installation_date'),
  warrantyExpiryDate: timestamp('warranty_expiry_date'),
  status: assetStatusEnum('status').notNull().default('operational'),
  specifications: text('specifications').default('{}'),
  location: text('location'),
  metadata: text('metadata').default('{}'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const workOrders = pgTable('work_orders', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  siteId: uuid('site_id').notNull().references(() => sites.id, { onDelete: 'cascade' }),
  assetId: uuid('asset_id').references(() => assets.id, { onDelete: 'set null' }),
  workOrderId: varchar('work_order_id', { length: 100 }).notNull(),
  title: varchar('title', { length: 255 }).notNull(),
  description: text('description'),
  type: workOrderTypeEnum('type').notNull(),
  priority: workOrderPriorityEnum('priority').notNull().default('medium'),
  status: workOrderStatusEnum('status').notNull().default('draft'),
  assignedTo: uuid('assigned_to').references(() => users.id, { onDelete: 'set null' }),
  createdBy: uuid('created_by').notNull().references(() => users.id),
  scheduledStart: timestamp('scheduled_start'),
  scheduledEnd: timestamp('scheduled_end'),
  actualStart: timestamp('actual_start'),
  actualEnd: timestamp('actual_end'),
  estimatedHours: decimal('estimated_hours', { precision: 6, scale: 2 }),
  actualHours: decimal('actual_hours', { precision: 6, scale: 2 }),
  version: integer('version').notNull().default(1),
  metadata: text('metadata').default('{}'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const workOrderTasks = pgTable('work_order_tasks', {
  id: uuid('id').primaryKey().defaultRandom(),
  workOrderId: uuid('work_order_id').notNull().references(() => workOrders.id, { onDelete: 'cascade' }),
  taskOrder: integer('task_order').notNull(),
  title: varchar('title', { length: 255 }).notNull(),
  description: text('description'),
  isCompleted: boolean('is_completed').notNull().default(false),
  completedAt: timestamp('completed_at'),
  completedBy: uuid('completed_by').references(() => users.id),
  notes: text('notes'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const alerts = pgTable('alerts', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  siteId: uuid('site_id').notNull().references(() => sites.id, { onDelete: 'cascade' }),
  assetId: uuid('asset_id').references(() => assets.id, { onDelete: 'set null' }),
  alertId: varchar('alert_id', { length: 100 }).notNull(),
  title: varchar('title', { length: 255 }).notNull(),
  description: text('description'),
  severity: alertSeverityEnum('severity').notNull(),
  status: alertStatusEnum('status').notNull().default('active'),
  ruleId: varchar('rule_id', { length: 100 }),
  triggeredAt: timestamp('triggered_at').notNull().defaultNow(),
  acknowledgedAt: timestamp('acknowledged_at'),
  acknowledgedBy: uuid('acknowledged_by').references(() => users.id),
  resolvedAt: timestamp('resolved_at'),
  resolvedBy: uuid('resolved_by').references(() => users.id),
  metadata: text('metadata').default('{}'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const notificationTemplates = pgTable('notification_templates', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  templateId: varchar('template_id', { length: 100 }).notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  eventType: notificationEventTypeEnum('event_type').notNull(),
  channel: notificationChannelEnum('channel').notNull(),
  subject: varchar('subject', { length: 500 }),
  bodyTemplate: text('body_template').notNull(),
  variables: text('variables').default('[]'),
  isActive: boolean('is_active').notNull().default(true),
  metadata: text('metadata').default('{}'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const notificationRules = pgTable('notification_rules', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  ruleId: varchar('rule_id', { length: 100 }).notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  eventType: notificationEventTypeEnum('event_type').notNull(),
  channels: text('channels').notNull(),
  conditions: text('conditions').default('{}'),
  priority: integer('priority').notNull().default(5),
  escalationMinutes: integer('escalation_minutes'),
  escalationRoleId: uuid('escalation_role_id'),
  isActive: boolean('is_active').notNull().default(true),
  metadata: text('metadata').default('{}'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const notificationPreferences = pgTable('notification_preferences', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  eventType: notificationEventTypeEnum('event_type').notNull(),
  channel: notificationChannelEnum('channel').notNull(),
  isEnabled: boolean('is_enabled').notNull().default(true),
  quietHoursStart: varchar('quiet_hours_start', { length: 5 }),
  quietHoursEnd: varchar('quiet_hours_end', { length: 5 }),
  enableBatching: boolean('enable_batching').notNull().default(true),
  batchIntervalMinutes: integer('batch_interval_minutes').notNull().default(15),
  metadata: text('metadata').default('{}'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const notificationHistory = pgTable('notification_history', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  eventType: notificationEventTypeEnum('event_type').notNull(),
  channel: notificationChannelEnum('channel').notNull(),
  templateId: uuid('template_id').references(() => notificationTemplates.id),
  recipient: varchar('recipient', { length: 255 }).notNull(),
  subject: varchar('subject', { length: 500 }),
  body: text('body').notNull(),
  status: notificationStatusEnum('status').notNull().default('pending'),
  sentAt: timestamp('sent_at'),
  deliveredAt: timestamp('delivered_at'),
  failedAt: timestamp('failed_at'),
  errorMessage: text('error_message'),
  retryCount: integer('retry_count').notNull().default(0),
  metadata: text('metadata').default('{}'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const deviceTokens = pgTable('device_tokens', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  token: varchar('token', { length: 500 }).notNull().unique(),
  deviceType: varchar('device_type', { length: 50 }).notNull(),
  deviceId: varchar('device_id', { length: 255 }),
  appVersion: varchar('app_version', { length: 50 }),
  isActive: boolean('is_active').notNull().default(true),
  lastUsedAt: timestamp('last_used_at').notNull().defaultNow(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const notificationQueue = pgTable('notification_queue', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  eventType: notificationEventTypeEnum('event_type').notNull(),
  channel: notificationChannelEnum('channel').notNull(),
  priority: varchar('priority', { length: 50 }).notNull().default('medium'),
  subject: varchar('subject', { length: 500 }),
  body: text('body').notNull(),
  templateId: uuid('template_id'),
  data: text('data').default('{}'),
  batchKey: varchar('batch_key', { length: 255 }).notNull(),
  isBatched: boolean('is_batched').notNull().default(false),
  batchedAt: timestamp('batched_at'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const webhooks = pgTable('webhooks', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  webhookId: varchar('webhook_id', { length: 100 }).notNull().unique(),
  name: varchar('name', { length: 255 }).notNull(),
  url: varchar('url', { length: 500 }).notNull(),
  authType: webhookAuthTypeEnum('auth_type').notNull().default('none'),
  authToken: varchar('auth_token', { length: 500 }),
  authUsername: varchar('auth_username', { length: 255 }),
  authPassword: varchar('auth_password', { length: 255 }),
  headers: text('headers').default('{}'),
  events: text('events').notNull(),
  secret: varchar('secret', { length: 255 }),
  isActive: boolean('is_active').notNull().default(true),
  metadata: text('metadata').default('{}'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const webhookDeliveries = pgTable('webhook_deliveries', {
  id: uuid('id').primaryKey().defaultRandom(),
  webhookId: uuid('webhook_id').notNull().references(() => webhooks.id, { onDelete: 'cascade' }),
  eventType: notificationEventTypeEnum('event_type').notNull(),
  payload: text('payload').notNull(),
  status: webhookDeliveryStatusEnum('status').notNull(),
  statusCode: integer('status_code'),
  responseBody: text('response_body'),
  errorMessage: text('error_message'),
  attemptCount: integer('attempt_count').notNull().default(1),
  sentAt: timestamp('sent_at'),
  metadata: text('metadata').default('{}'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const reportDefinitions = pgTable('report_definitions', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  createdBy: uuid('created_by').notNull().references(() => users.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  datasource: varchar('datasource', { length: 50 }).notNull(),
  columns: text('columns').notNull(),
  filters: text('filters').default('[]'),
  groupBy: text('group_by').default('[]'),
  aggregations: text('aggregations').default('[]'),
  orderBy: text('order_by').default('[]'),
  limitRows: integer('limit_rows').default(1000),
  isPublic: boolean('is_public').notNull().default(false),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const assetHealthScores = pgTable('asset_health_scores', {
  id: uuid('id').primaryKey().defaultRandom(),
  assetId: uuid('asset_id').notNull().references(() => assets.id, { onDelete: 'cascade' }),
  score: integer('score').notNull(),
  category: varchar('category', { length: 20 }).notNull(),
  recentAlarms: integer('recent_alarms').notNull().default(0),
  recentWorkOrders: integer('recent_work_orders').notNull().default(0),
  anomalyCount: integer('anomaly_count').notNull().default(0),
  assetAgeMonths: integer('asset_age_months').notNull().default(0),
  daysSinceLastMaintenance: integer('days_since_last_maintenance').notNull().default(0),
  componentScores: text('component_scores'),
  calculatedAt: timestamp('calculated_at').notNull().defaultNow(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const complianceReportTemplates = pgTable('compliance_report_templates', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').references(() => tenants.id, { onDelete: 'cascade' }),
  templateId: varchar('template_id', { length: 100 }).notNull().unique(),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  reportType: varchar('report_type', { length: 50 }).notNull(),
  complianceStandard: varchar('compliance_standard', { length: 100 }).notNull(),
  version: varchar('version', { length: 20 }).notNull().default('1.0'),
  requiredFields: text('required_fields').notNull().default('[]'),
  optionalFields: text('optional_fields').notNull().default('[]'),
  autoPopulateMappings: text('auto_populate_mappings'),
  validationRules: text('validation_rules'),
  format: varchar('format', { length: 20 }).notNull().default('pdf'),
  frequency: varchar('frequency', { length: 50 }),
  isActive: boolean('is_active').notNull().default(true),
  isSystemTemplate: boolean('is_system_template').notNull().default(false),
  createdBy: uuid('created_by').references(() => users.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const complianceGeneratedReports = pgTable('compliance_generated_reports', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  templateId: uuid('template_id').notNull().references(() => complianceReportTemplates.id, { onDelete: 'cascade' }),
  siteId: uuid('site_id').references(() => sites.id, { onDelete: 'cascade' }),
  reportName: varchar('report_name', { length: 255 }).notNull(),
  reportType: varchar('report_type', { length: 50 }).notNull(),
  reportingPeriodStart: timestamp('reporting_period_start').notNull(),
  reportingPeriodEnd: timestamp('reporting_period_end').notNull(),
  status: varchar('status', { length: 50 }).notNull().default('draft'),
  reportData: text('report_data').notNull(),
  fileUrl: text('file_url'),
  fileSizeBytes: integer('file_size_bytes'),
  fileFormat: varchar('file_format', { length: 20 }).notNull().default('pdf'),
  watermark: varchar('watermark', { length: 50 }).default('DRAFT'),
  generatedBy: uuid('generated_by').notNull().references(() => users.id, { onDelete: 'set null' }),
  generatedAt: timestamp('generated_at').notNull().defaultNow(),
  finalizedBy: uuid('finalized_by').references(() => users.id, { onDelete: 'set null' }),
  finalizedAt: timestamp('finalized_at'),
  submittedAt: timestamp('submitted_at'),
  metadata: text('metadata').default('{}'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// Audit Logs (Tamper-proof, Append-only)
export const auditLogs = pgTable('audit_logs', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'restrict' }),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'restrict' }),
  action: varchar('action', { length: 100 }).notNull(),
  entityType: varchar('entity_type', { length: 50 }).notNull(),
  entityId: varchar('entity_id', { length: 255 }).notNull(),
  changes: text('changes'),
  ipAddress: varchar('ip_address', { length: 45 }),
  userAgent: text('user_agent'),
  timestamp: timestamp('timestamp').notNull().defaultNow(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

// ==========================================
// SPRINT 19: Weather & Forecasting Tables
// ==========================================

export const weatherForecasts = pgTable('weather_forecasts', {
  id: uuid('id').primaryKey().defaultRandom(),
  siteId: uuid('site_id').notNull().references(() => sites.id, { onDelete: 'cascade' }),

  // Forecast metadata
  forecastTimestamp: timestamp('forecast_timestamp').notNull(),
  fetchedAt: timestamp('fetched_at').notNull().defaultNow(),
  source: varchar('source', { length: 50 }).notNull().default('openweathermap'),
  forecastType: varchar('forecast_type', { length: 20 }).notNull(), // 'historical', 'current', 'forecast'

  // Solar-specific weather data
  irradiationWhM2: decimal('irradiation_wh_m2', { precision: 10, scale: 2 }),
  ghiWhM2: decimal('ghi_wh_m2', { precision: 10, scale: 2 }),
  dniWhM2: decimal('dni_wh_m2', { precision: 10, scale: 2 }),
  dhiWhM2: decimal('dhi_wh_m2', { precision: 10, scale: 2 }),

  // Wind-specific weather data
  windSpeedMs: decimal('wind_speed_ms', { precision: 5, scale: 2 }),
  windDirectionDeg: integer('wind_direction_deg'),
  windGustMs: decimal('wind_gust_ms', { precision: 5, scale: 2 }),

  // General weather data
  temperatureC: decimal('temperature_c', { precision: 5, scale: 2 }),
  humidityPercent: integer('humidity_percent'),
  pressureHpa: decimal('pressure_hpa', { precision: 7, scale: 2 }),
  cloudCoverPercent: integer('cloud_cover_percent'),
  precipitationMm: decimal('precipitation_mm', { precision: 6, scale: 2 }),
  snowMm: decimal('snow_mm', { precision: 6, scale: 2 }),
  visibilityM: integer('visibility_m'),

  // Air quality
  airDensityKgM3: decimal('air_density_kg_m3', { precision: 6, scale: 4 }),
  aqi: integer('aqi'),

  // Weather description
  weatherCondition: varchar('weather_condition', { length: 100 }),
  weatherDescription: text('weather_description'),

  // Raw API response
  rawApiResponse: text('raw_api_response'), // JSON stored as text

  // Metadata
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const generationForecasts = pgTable('generation_forecasts', {
  id: uuid('id').primaryKey().defaultRandom(),
  siteId: uuid('site_id').notNull().references(() => sites.id, { onDelete: 'cascade' }),
  assetId: uuid('asset_id').references(() => assets.id, { onDelete: 'cascade' }),

  // Forecast metadata
  forecastTimestamp: timestamp('forecast_timestamp').notNull(),
  forecastHorizonHours: integer('forecast_horizon_hours').notNull(),
  generatedAt: timestamp('generated_at').notNull().defaultNow(),

  // Model information
  modelName: varchar('model_name', { length: 100 }).notNull(),
  modelVersion: varchar('model_version', { length: 50 }).notNull(),
  algorithm: varchar('algorithm', { length: 50 }).notNull(),

  // Forecast values
  predictedGenerationMw: decimal('predicted_generation_mw', { precision: 10, scale: 3 }).notNull(),
  confidenceIntervalLowerMw: decimal('confidence_interval_lower_mw', { precision: 10, scale: 3 }),
  confidenceIntervalUpperMw: decimal('confidence_interval_upper_mw', { precision: 10, scale: 3 }),
  predictionStdDev: decimal('prediction_std_dev', { precision: 10, scale: 3 }),

  // Actual generation (filled after forecast_timestamp)
  actualGenerationMw: decimal('actual_generation_mw', { precision: 10, scale: 3 }),
  errorMw: decimal('error_mw', { precision: 10, scale: 3 }),
  absoluteErrorMw: decimal('absolute_error_mw', { precision: 10, scale: 3 }),
  percentageError: decimal('percentage_error', { precision: 5, scale: 2 }),

  // Weather inputs
  weatherForecastId: uuid('weather_forecast_id').references(() => weatherForecasts.id, { onDelete: 'set null' }),

  // Feature values (for explainability)
  featureValues: text('feature_values'), // JSON stored as text

  // Model metadata
  modelAccuracyScore: decimal('model_accuracy_score', { precision: 5, scale: 4 }),
  trainingDataEndDate: timestamp('training_data_end_date'),

  // Status
  isActive: boolean('is_active').notNull().default(true),
  accuracyValidated: boolean('accuracy_validated').notNull().default(false),

  // Metadata
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const forecastAccuracyMetrics = pgTable('forecast_accuracy_metrics', {
  id: uuid('id').primaryKey().defaultRandom(),
  modelName: varchar('model_name', { length: 100 }).notNull(),
  modelVersion: varchar('model_version', { length: 50 }).notNull(),
  siteId: uuid('site_id').notNull().references(() => sites.id, { onDelete: 'cascade' }),

  // Time period
  periodStart: timestamp('period_start').notNull(),
  periodEnd: timestamp('period_end').notNull(),
  forecastHorizonHours: integer('forecast_horizon_hours').notNull(),

  // Accuracy metrics
  meanAbsoluteErrorMw: decimal('mean_absolute_error_mw', { precision: 10, scale: 3 }),
  meanAbsolutePercentageError: decimal('mean_absolute_percentage_error', { precision: 5, scale: 2 }),
  rootMeanSquaredErrorMw: decimal('root_mean_squared_error_mw', { precision: 10, scale: 3 }),
  rSquared: decimal('r_squared', { precision: 5, scale: 4 }),
  forecastSkillScore: decimal('forecast_skill_score', { precision: 5, scale: 4 }),

  // Sample size
  numForecasts: integer('num_forecasts').notNull(),
  numValidated: integer('num_validated').notNull(),

  // Metadata
  calculatedAt: timestamp('calculated_at').notNull().defaultNow(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const windTurbineMetadata = pgTable('wind_turbine_metadata', {
  id: uuid('id').primaryKey().defaultRandom(),
  assetId: uuid('asset_id').notNull().unique().references(() => assets.id, { onDelete: 'cascade' }),

  // Turbine specifications
  manufacturer: varchar('manufacturer', { length: 100 }),
  model: varchar('model', { length: 100 }),
  ratedPowerMw: decimal('rated_power_mw', { precision: 6, scale: 3 }).notNull(),
  rotorDiameterM: decimal('rotor_diameter_m', { precision: 6, scale: 2 }),
  hubHeightM: decimal('hub_height_m', { precision: 6, scale: 2 }),
  numberOfBlades: integer('number_of_blades').default(3),

  // Power curve
  cutInWindSpeedMs: decimal('cut_in_wind_speed_ms', { precision: 5, scale: 2 }),
  ratedWindSpeedMs: decimal('rated_wind_speed_ms', { precision: 5, scale: 2 }),
  cutOutWindSpeedMs: decimal('cut_out_wind_speed_ms', { precision: 5, scale: 2 }),
  powerCurveData: text('power_curve_data'), // JSON stored as text

  // Blade specifications
  bladeLengthM: decimal('blade_length_m', { precision: 6, scale: 2 }),
  bladeMaterial: varchar('blade_material', { length: 100 }),
  bladeSerialNumbers: text('blade_serial_numbers'), // JSON array stored as text

  // Gearbox
  gearboxType: varchar('gearbox_type', { length: 50 }),
  gearboxRatio: varchar('gearbox_ratio', { length: 20 }),
  gearboxManufacturer: varchar('gearbox_manufacturer', { length: 100 }),

  // Generator
  generatorType: varchar('generator_type', { length: 50 }),
  generatorRatedPowerMw: decimal('generator_rated_power_mw', { precision: 6, scale: 3 }),
  generatorVoltageKv: decimal('generator_voltage_kv', { precision: 6, scale: 2 }),
  generatorFrequencyHz: integer('generator_frequency_hz').default(50),

  // Control system
  controlSystemType: varchar('control_system_type', { length: 100 }),
  yawSystemType: varchar('yaw_system_type', { length: 100 }),
  pitchControlType: varchar('pitch_control_type', { length: 100 }),

  // Performance
  capacityFactor: decimal('capacity_factor', { precision: 5, scale: 4 }),
  availabilityTarget: decimal('availability_target', { precision: 5, scale: 4 }),

  // Operational limits
  maxOperationalTempC: integer('max_operational_temp_c'),
  minOperationalTempC: integer('min_operational_temp_c'),
  maxWindSpeedSurvivalMs: decimal('max_wind_speed_survival_ms', { precision: 6, scale: 2 }),

  // Installation
  commissioningDate: timestamp('commissioning_date'),
  warrantyEndDate: timestamp('warranty_end_date'),
  expectedLifetimeYears: integer('expected_lifetime_years').default(25),

  // Maintenance
  lastMajorServiceDate: timestamp('last_major_service_date'),
  nextMajorServiceDate: timestamp('next_major_service_date'),
  serviceIntervalMonths: integer('service_interval_months').default(6),

  // Metadata
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const windWorkOrderTemplates = pgTable('wind_work_order_templates', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),

  // Template metadata
  templateName: varchar('template_name', { length: 200 }).notNull(),
  templateCode: varchar('template_code', { length: 50 }).notNull(),
  description: text('description'),

  // Work order defaults
  defaultPriority: varchar('default_priority', { length: 20 }).default('medium'),
  defaultType: varchar('default_type', { length: 20 }).default('preventive'),
  estimatedDurationHours: decimal('estimated_duration_hours', { precision: 6, scale: 2 }),

  // Checklist and requirements
  checklistItems: text('checklist_items'), // JSON stored as text
  requiredSkills: text('required_skills'), // JSON stored as text
  safetyRequirements: text('safety_requirements'), // JSON stored as text
  typicalParts: text('typical_parts'), // JSON stored as text

  // Frequency
  frequencyDays: integer('frequency_days'),
  frequencyDescription: varchar('frequency_description', { length: 200 }),

  // Active status
  isActive: boolean('is_active').notNull().default(true),

  // Metadata
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// ==========================================
// RELATIONS
// ==========================================

export const tenantsRelations = relations(tenants, ({ many }) => ({
  users: many(users),
  sites: many(sites),
  assets: many(assets),
  workOrders: many(workOrders),
  alerts: many(alerts),
}));

export const usersRelations = relations(users, ({ one, many }) => ({
  tenant: one(tenants, {
    fields: [users.tenantId],
    references: [tenants.id],
  }),
  assignedWorkOrders: many(workOrders, { relationName: 'assignedTo' }),
  createdWorkOrders: many(workOrders, { relationName: 'createdBy' }),
}));

export const sitesRelations = relations(sites, ({ one, many }) => ({
  tenant: one(tenants, {
    fields: [sites.tenantId],
    references: [tenants.id],
  }),
  assets: many(assets),
  workOrders: many(workOrders),
  alerts: many(alerts),
}));

export const assetsRelations = relations(assets, ({ one, many }) => ({
  tenant: one(tenants, {
    fields: [assets.tenantId],
    references: [tenants.id],
  }),
  site: one(sites, {
    fields: [assets.siteId],
    references: [sites.id],
  }),
  parentAsset: one(assets, {
    fields: [assets.parentAssetId],
    references: [assets.id],
  }),
  childAssets: many(assets),
  workOrders: many(workOrders),
  alerts: many(alerts),
}));

export const workOrdersRelations = relations(workOrders, ({ one, many }) => ({
  tenant: one(tenants, {
    fields: [workOrders.tenantId],
    references: [tenants.id],
  }),
  site: one(sites, {
    fields: [workOrders.siteId],
    references: [sites.id],
  }),
  asset: one(assets, {
    fields: [workOrders.assetId],
    references: [assets.id],
  }),
  assignedUser: one(users, {
    fields: [workOrders.assignedTo],
    references: [users.id],
    relationName: 'assignedTo',
  }),
  createdByUser: one(users, {
    fields: [workOrders.createdBy],
    references: [users.id],
    relationName: 'createdBy',
  }),
  tasks: many(workOrderTasks),
}));

export const workOrderTasksRelations = relations(workOrderTasks, ({ one }) => ({
  workOrder: one(workOrders, {
    fields: [workOrderTasks.workOrderId],
    references: [workOrders.id],
  }),
  completedByUser: one(users, {
    fields: [workOrderTasks.completedBy],
    references: [users.id],
  }),
}));

export const alertsRelations = relations(alerts, ({ one }) => ({
  tenant: one(tenants, {
    fields: [alerts.tenantId],
    references: [tenants.id],
  }),
  site: one(sites, {
    fields: [alerts.siteId],
    references: [sites.id],
  }),
  asset: one(assets, {
    fields: [alerts.assetId],
    references: [assets.id],
  }),
  acknowledgedByUser: one(users, {
    fields: [alerts.acknowledgedBy],
    references: [users.id],
  }),
  resolvedByUser: one(users, {
    fields: [alerts.resolvedBy],
    references: [users.id],
  }),
}));

export const notificationTemplatesRelations = relations(notificationTemplates, ({ one, many }) => ({
  tenant: one(tenants, {
    fields: [notificationTemplates.tenantId],
    references: [tenants.id],
  }),
  notificationHistory: many(notificationHistory),
}));

export const notificationRulesRelations = relations(notificationRules, ({ one }) => ({
  tenant: one(tenants, {
    fields: [notificationRules.tenantId],
    references: [tenants.id],
  }),
}));

export const notificationPreferencesRelations = relations(notificationPreferences, ({ one }) => ({
  user: one(users, {
    fields: [notificationPreferences.userId],
    references: [users.id],
  }),
}));

export const notificationHistoryRelations = relations(notificationHistory, ({ one }) => ({
  tenant: one(tenants, {
    fields: [notificationHistory.tenantId],
    references: [tenants.id],
  }),
  user: one(users, {
    fields: [notificationHistory.userId],
    references: [users.id],
  }),
  template: one(notificationTemplates, {
    fields: [notificationHistory.templateId],
    references: [notificationTemplates.id],
  }),
}));

export const deviceTokensRelations = relations(deviceTokens, ({ one }) => ({
  user: one(users, {
    fields: [deviceTokens.userId],
    references: [users.id],
  }),
}));

export const notificationQueueRelations = relations(notificationQueue, ({ one }) => ({
  tenant: one(tenants, {
    fields: [notificationQueue.tenantId],
    references: [tenants.id],
  }),
  user: one(users, {
    fields: [notificationQueue.userId],
    references: [users.id],
  }),
}));

export const webhooksRelations = relations(webhooks, ({ one, many }) => ({
  tenant: one(tenants, {
    fields: [webhooks.tenantId],
    references: [tenants.id],
  }),
  deliveries: many(webhookDeliveries),
}));

export const webhookDeliveriesRelations = relations(webhookDeliveries, ({ one }) => ({
  webhook: one(webhooks, {
    fields: [webhookDeliveries.webhookId],
    references: [webhooks.id],
  }),
}));

export const reportDefinitionsRelations = relations(reportDefinitions, ({ one }) => ({
  tenant: one(tenants, {
    fields: [reportDefinitions.tenantId],
    references: [tenants.id],
  }),
  creator: one(users, {
    fields: [reportDefinitions.createdBy],
    references: [users.id],
  }),
}));

export const assetHealthScoresRelations = relations(assetHealthScores, ({ one }) => ({
  asset: one(assets, {
    fields: [assetHealthScores.assetId],
    references: [assets.id],
  }),
}));

export const complianceReportTemplatesRelations = relations(complianceReportTemplates, ({ one, many }) => ({
  tenant: one(tenants, {
    fields: [complianceReportTemplates.tenantId],
    references: [tenants.id],
  }),
  creator: one(users, {
    fields: [complianceReportTemplates.createdBy],
    references: [users.id],
  }),
  generatedReports: many(complianceGeneratedReports),
}));

export const complianceGeneratedReportsRelations = relations(complianceGeneratedReports, ({ one }) => ({
  tenant: one(tenants, {
    fields: [complianceGeneratedReports.tenantId],
    references: [tenants.id],
  }),
  template: one(complianceReportTemplates, {
    fields: [complianceGeneratedReports.templateId],
    references: [complianceReportTemplates.id],
  }),
  site: one(sites, {
    fields: [complianceGeneratedReports.siteId],
    references: [sites.id],
  }),
  generator: one(users, {
    fields: [complianceGeneratedReports.generatedBy],
    references: [users.id],
  }),
  finalizer: one(users, {
    fields: [complianceGeneratedReports.finalizedBy],
    references: [users.id],
  }),
}));

export const auditLogsRelations = relations(auditLogs, ({ one }) => ({
  tenant: one(tenants, {
    fields: [auditLogs.tenantId],
    references: [tenants.id],
  }),
  user: one(users, {
    fields: [auditLogs.userId],
    references: [users.id],
  }),
}));

// Sprint 19: Weather & Forecasting Relations
export const weatherForecastsRelations = relations(weatherForecasts, ({ one }) => ({
  site: one(sites, {
    fields: [weatherForecasts.siteId],
    references: [sites.id],
  }),
}));

export const generationForecastsRelations = relations(generationForecasts, ({ one }) => ({
  site: one(sites, {
    fields: [generationForecasts.siteId],
    references: [sites.id],
  }),
  asset: one(assets, {
    fields: [generationForecasts.assetId],
    references: [assets.id],
  }),
  weatherForecast: one(weatherForecasts, {
    fields: [generationForecasts.weatherForecastId],
    references: [weatherForecasts.id],
  }),
}));

export const forecastAccuracyMetricsRelations = relations(forecastAccuracyMetrics, ({ one }) => ({
  site: one(sites, {
    fields: [forecastAccuracyMetrics.siteId],
    references: [sites.id],
  }),
}));

export const windTurbineMetadataRelations = relations(windTurbineMetadata, ({ one }) => ({
  asset: one(assets, {
    fields: [windTurbineMetadata.assetId],
    references: [assets.id],
  }),
}));

export const windWorkOrderTemplatesRelations = relations(windWorkOrderTemplates, ({ one }) => ({
  tenant: one(tenants, {
    fields: [windWorkOrderTemplates.tenantId],
    references: [tenants.id],
  }),
}));
