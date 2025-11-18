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
