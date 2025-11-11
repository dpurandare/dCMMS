# Notification and Alerting System Specification

**Version:** 1.0
**Priority:** P1 (Release 1)
**Status:** Complete
**Last Updated:** 2025-11-11

---

## Table of Contents

1. [Overview](#1-overview)
2. [Multi-Channel Architecture](#2-multi-channel-architecture)
3. [Alert Rule Engine](#3-alert-rule-engine)
4. [Escalation Workflows](#4-escalation-workflows)
5. [Notification Templates](#5-notification-templates)
6. [Service Integrations](#6-service-integrations)
7. [Delivery Tracking](#7-delivery-tracking)
8. [Alert Management UI](#8-alert-management-ui)
9. [Integration Points](#9-integration-points)
10. [Performance & Scaling](#10-performance--scaling)

---

## 1. Overview

### 1.1 Purpose

The dCMMS Notification and Alerting System provides real-time, multi-channel notification delivery for critical operational events, work order updates, equipment failures, safety incidents, and compliance alerts.

### 1.2 Key Requirements

- **Multi-channel delivery:** Email, SMS, push notifications, in-app, webhooks, voice calls
- **Real-time alerting:** <5 second latency for critical alerts
- **Escalation management:** Automatic escalation based on acknowledgment timeouts
- **Template-based:** Reusable templates with variable substitution
- **Delivery tracking:** Full audit trail of notification delivery status
- **On-call scheduling:** Integration with on-call rotation schedules
- **Quiet hours:** Respect user notification preferences and quiet hours
- **Rate limiting:** Prevent notification flooding

### 1.3 Industry Context

**Renewable Energy Operations:**
- **Critical alerts:** Equipment failures, safety events, grid disturbances requiring immediate response
- **Escalation:** Multi-tier on-call schedules (field tech → supervisor → site manager → operations director)
- **Regulatory notifications:** NERC/FERC event reporting within mandated timeframes
- **Multi-stakeholder:** Notifications to O&M teams, asset owners, OEMs, regulatory bodies

---

## 2. Multi-Channel Architecture

### 2.1 Channel Types

```yaml
channels:
  email:
    providers: ["sendgrid", "ses"]
    priority: medium
    latency_target: "30s"
    use_cases: ["detailed_reports", "compliance_submissions", "daily_summaries"]

  sms:
    providers: ["twilio", "aws_sns"]
    priority: high
    latency_target: "5s"
    use_cases: ["critical_alerts", "authentication_codes", "escalations"]
    character_limit: 160

  push:
    providers: ["fcm", "apns"]
    priority: high
    latency_target: "3s"
    use_cases: ["work_order_updates", "equipment_alarms", "task_assignments"]
    platforms: ["ios", "android"]

  in_app:
    priority: low
    latency_target: "1s"
    use_cases: ["status_updates", "informational_messages", "chat"]
    persistence: true

  webhook:
    priority: medium
    latency_target: "10s"
    use_cases: ["system_integrations", "third_party_platforms", "custom_workflows"]
    retry_strategy: "exponential_backoff"

  voice:
    providers: ["twilio_voice"]
    priority: critical
    latency_target: "10s"
    use_cases: ["emergency_alerts", "safety_incidents", "grid_failures"]
    fallback_to_sms: true
```

### 2.2 Channel Selection Logic

```javascript
class ChannelSelector {
  /**
   * Selects appropriate notification channels based on alert severity,
   * user preferences, and time of day
   */
  selectChannels(alert, user, context) {
    const channels = [];
    const currentHour = new Date().getHours();
    const isQuietHours = currentHour >= user.preferences.quietHoursStart ||
                         currentHour < user.preferences.quietHoursEnd;

    // Critical alerts override quiet hours
    if (alert.severity === 'critical') {
      channels.push('push', 'sms');

      // Voice call for safety incidents during on-call hours
      if (alert.category === 'safety_incident' && user.onCallStatus === 'active') {
        channels.push('voice');
      }
    }

    // High priority alerts
    else if (alert.severity === 'high') {
      channels.push('push');

      if (!isQuietHours || alert.overrideQuietHours) {
        channels.push('sms');
      }
    }

    // Medium/low priority
    else {
      channels.push('in_app');

      if (!isQuietHours) {
        channels.push('push');
      }

      // Email for detailed reports
      if (alert.type === 'report' || alert.attachments.length > 0) {
        channels.push('email');
      }
    }

    // Webhook for external integrations
    if (user.webhookUrl && alert.category in user.webhookCategories) {
      channels.push('webhook');
    }

    return channels;
  }
}
```

### 2.3 Channel Failover

```yaml
failover_strategy:
  primary_channel: "push"
  fallback_sequence:
    - channel: "sms"
      delay: "30s"
      condition: "push_delivery_failed || not_acknowledged"

    - channel: "email"
      delay: "2m"
      condition: "sms_delivery_failed"

    - channel: "voice"
      delay: "5m"
      condition: "critical_severity && no_acknowledgment"

  max_retries_per_channel: 3
  retry_delay: "exponential_backoff"
```

---

## 3. Alert Rule Engine

### 3.1 Rule Definition Schema

```json
{
  "ruleId": "RULE-INVERTER-TEMP-001",
  "name": "Inverter Over-Temperature Alert",
  "description": "Alert when inverter temperature exceeds safe operating threshold",
  "enabled": true,
  "tenantId": "tenant-acme-solar",
  "siteId": "SITE-AZ-001",

  "trigger": {
    "type": "threshold",
    "metric": "inverter.temperature",
    "operator": "greater_than",
    "threshold": 75,
    "unit": "celsius",
    "duration": "5m",
    "aggregation": "avg"
  },

  "conditions": [
    {
      "field": "asset.status",
      "operator": "equals",
      "value": "operational"
    },
    {
      "field": "site.weather.ambient_temp",
      "operator": "less_than",
      "value": 45,
      "description": "Only alert if not extreme ambient conditions"
    }
  ],

  "severity": "high",
  "category": "equipment_fault",
  "priority": 2,

  "notification": {
    "channels": ["push", "sms", "email"],
    "templateId": "TPL-INVERTER-OVERTEMP",
    "recipients": {
      "roles": ["field_technician", "site_manager"],
      "users": ["user-123"],
      "groups": ["on_call_group_az"]
    },
    "escalation": {
      "enabled": true,
      "timeoutMinutes": 15,
      "escalationChainId": "ESC-EQUIPMENT-FAULT"
    }
  },

  "actions": [
    {
      "type": "create_work_order",
      "template": "WO-INVERTER-INSPECTION",
      "priority": "high",
      "assignTo": "role:field_technician",
      "dueIn": "4h"
    },
    {
      "type": "webhook",
      "url": "https://oem-portal.example.com/api/alerts",
      "method": "POST",
      "headers": {
        "Authorization": "Bearer {{vault:oem_api_token}}"
      }
    }
  ],

  "throttling": {
    "enabled": true,
    "maxNotificationsPerHour": 4,
    "aggregationWindow": "15m"
  },

  "autoResolve": {
    "enabled": true,
    "condition": {
      "metric": "inverter.temperature",
      "operator": "less_than",
      "threshold": 70,
      "duration": "10m"
    }
  }
}
```

### 3.2 Rule Types

```yaml
rule_types:
  threshold:
    description: "Trigger when metric crosses threshold"
    operators: ["greater_than", "less_than", "equals", "between"]
    aggregations: ["avg", "min", "max", "sum", "count"]

  anomaly:
    description: "ML-based anomaly detection"
    algorithms: ["isolation_forest", "z_score", "iqr"]
    sensitivity: ["low", "medium", "high"]
    baseline_period: "7d"

  pattern:
    description: "Complex event patterns"
    patterns: ["sequence", "absence", "frequency"]
    example: "3 consecutive failures within 1 hour"

  change:
    description: "State change detection"
    change_types: ["status_change", "value_delta", "rate_of_change"]
    example: "Asset status changes from operational to failed"

  schedule:
    description: "Time-based triggers"
    schedule_types: ["cron", "interval", "one_time"]
    example: "Daily report at 8 AM"

  composite:
    description: "Combination of multiple rules"
    operators: ["AND", "OR", "NOT"]
    max_depth: 3
```

### 3.3 Rule Evaluation Engine

```javascript
class AlertRuleEngine {
  constructor() {
    this.rules = new Map();
    this.activeAlerts = new Map();
    this.throttleCache = new Map();
  }

  /**
   * Evaluate all active rules against incoming telemetry data
   */
  async evaluateRules(dataPoint) {
    const { siteId, assetId, metric, value, timestamp } = dataPoint;

    // Get applicable rules for this metric
    const rules = this.getApplicableRules(siteId, metric);

    for (const rule of rules) {
      try {
        const triggered = await this.evaluateRule(rule, dataPoint);

        if (triggered) {
          await this.handleTriggeredRule(rule, dataPoint);
        } else {
          // Check for auto-resolve
          await this.checkAutoResolve(rule, dataPoint);
        }
      } catch (error) {
        logger.error('Rule evaluation failed', {
          ruleId: rule.ruleId,
          error: error.message
        });
      }
    }
  }

  async evaluateRule(rule, dataPoint) {
    const { trigger, conditions } = rule;

    // Evaluate main trigger
    const triggerMet = await this.evaluateTrigger(trigger, dataPoint);

    if (!triggerMet) return false;

    // Evaluate additional conditions
    for (const condition of conditions) {
      const conditionMet = await this.evaluateCondition(condition, dataPoint);
      if (!conditionMet) return false;
    }

    return true;
  }

  async evaluateTrigger(trigger, dataPoint) {
    const { type, metric, operator, threshold, duration, aggregation } = trigger;

    if (type === 'threshold') {
      // Get historical data for duration window
      const windowData = await this.getTimeWindowData(
        dataPoint.assetId,
        metric,
        duration
      );

      // Apply aggregation
      const aggregatedValue = this.aggregate(windowData, aggregation);

      // Compare against threshold
      return this.compare(aggregatedValue, operator, threshold);
    }

    // Other trigger types...
  }

  async handleTriggeredRule(rule, dataPoint) {
    const alertId = `${rule.ruleId}-${dataPoint.assetId}-${Date.now()}`;

    // Check throttling
    if (this.isThrottled(rule.ruleId)) {
      logger.debug('Alert throttled', { ruleId: rule.ruleId });
      return;
    }

    // Create alert
    const alert = {
      alertId,
      ruleId: rule.ruleId,
      ruleName: rule.name,
      severity: rule.severity,
      category: rule.category,
      siteId: dataPoint.siteId,
      assetId: dataPoint.assetId,
      metric: dataPoint.metric,
      value: dataPoint.value,
      threshold: rule.trigger.threshold,
      triggeredAt: new Date(),
      status: 'active',
      acknowledgedAt: null,
      resolvedAt: null
    };

    // Store alert
    await db.alerts.insert(alert);
    this.activeAlerts.set(alertId, alert);

    // Send notifications
    await this.sendNotifications(rule, alert, dataPoint);

    // Execute actions
    await this.executeActions(rule, alert, dataPoint);

    // Update throttle cache
    this.updateThrottle(rule.ruleId);

    // Schedule escalation if configured
    if (rule.notification.escalation?.enabled) {
      await this.scheduleEscalation(alert, rule.notification.escalation);
    }
  }

  isThrottled(ruleId) {
    const throttleKey = `throttle:${ruleId}`;
    const throttleData = this.throttleCache.get(throttleKey);

    if (!throttleData) return false;

    const now = Date.now();
    const hourAgo = now - (60 * 60 * 1000);

    // Count notifications in last hour
    const recentNotifications = throttleData.timestamps.filter(
      ts => ts > hourAgo
    );

    return recentNotifications.length >= throttleData.maxPerHour;
  }
}
```

---

## 4. Escalation Workflows

### 4.1 Escalation Chain Definition

```json
{
  "escalationChainId": "ESC-EQUIPMENT-FAULT",
  "name": "Equipment Fault Escalation",
  "description": "Standard escalation for equipment failures",
  "tenantId": "tenant-acme-solar",
  "siteId": "SITE-AZ-001",

  "levels": [
    {
      "level": 1,
      "timeoutMinutes": 15,
      "recipients": {
        "roles": ["field_technician"],
        "onCallGroup": "on_call_tier1_az",
        "users": []
      },
      "channels": ["push", "sms"],
      "requireAcknowledgment": true,
      "message": "URGENT: {{alert.ruleName}} at {{asset.name}}. Please acknowledge within 15 minutes."
    },
    {
      "level": 2,
      "timeoutMinutes": 30,
      "recipients": {
        "roles": ["site_supervisor"],
        "onCallGroup": "on_call_tier2_az",
        "users": []
      },
      "channels": ["push", "sms", "voice"],
      "requireAcknowledgment": true,
      "message": "ESCALATED: {{alert.ruleName}} at {{asset.name}}. No response from Tier 1 after 15 minutes."
    },
    {
      "level": 3,
      "timeoutMinutes": 60,
      "recipients": {
        "roles": ["site_manager", "operations_director"],
        "users": ["user-exec-001"],
        "notifyAll": true
      },
      "channels": ["push", "sms", "voice", "email"],
      "requireAcknowledgment": true,
      "message": "CRITICAL ESCALATION: {{alert.ruleName}} at {{asset.name}}. No response after 45 minutes. Executive notification required.",
      "additionalActions": [
        {
          "type": "create_incident",
          "severity": "sev2",
          "assignTo": "incident_commander"
        },
        {
          "type": "notify_oem",
          "contactId": "OEM-SUPPORT-001"
        }
      ]
    }
  ],

  "autoResolveOnAcknowledge": false,
  "notifyOnResolve": true,
  "auditLog": true
}
```

### 4.2 On-Call Schedule

```json
{
  "scheduleId": "ONCALL-AZ-TIER1",
  "name": "Arizona Site - Tier 1 On-Call",
  "siteId": "SITE-AZ-001",
  "timezone": "America/Phoenix",

  "rotation": {
    "type": "weekly",
    "startDate": "2025-11-10",
    "participants": [
      {
        "userId": "user-tech-001",
        "name": "John Smith",
        "phone": "+1-602-555-0101",
        "email": "john.smith@company.com",
        "backupUserId": "user-tech-002"
      },
      {
        "userId": "user-tech-002",
        "name": "Jane Doe",
        "phone": "+1-602-555-0102",
        "email": "jane.doe@company.com",
        "backupUserId": "user-tech-003"
      },
      {
        "userId": "user-tech-003",
        "name": "Bob Johnson",
        "phone": "+1-602-555-0103",
        "email": "bob.johnson@company.com",
        "backupUserId": "user-tech-001"
      }
    ],
    "rotationOrder": ["user-tech-001", "user-tech-002", "user-tech-003"]
  },

  "coverage": {
    "type": "24x7",
    "businessHours": {
      "start": "08:00",
      "end": "17:00",
      "days": ["monday", "tuesday", "wednesday", "thursday", "friday"]
    },
    "afterHours": {
      "escalationDelay": "10m",
      "requireBackupNotification": true
    }
  },

  "overrides": [
    {
      "userId": "user-tech-004",
      "startDate": "2025-11-15",
      "endDate": "2025-11-21",
      "reason": "Vacation coverage"
    }
  ]
}
```

### 4.3 Escalation Execution

```javascript
class EscalationManager {
  async scheduleEscalation(alert, escalationConfig) {
    const chain = await this.getEscalationChain(escalationConfig.escalationChainId);

    const escalation = {
      escalationId: uuidv4(),
      alertId: alert.alertId,
      chainId: chain.escalationChainId,
      currentLevel: 1,
      status: 'active',
      createdAt: new Date(),
      levelHistory: []
    };

    await db.escalations.insert(escalation);

    // Start level 1 immediately
    await this.executeEscalationLevel(escalation, chain.levels[0]);

    // Schedule next level
    await this.scheduleNextLevel(escalation, chain);
  }

  async executeEscalationLevel(escalation, level) {
    const alert = await db.alerts.findOne({ alertId: escalation.alertId });

    // Resolve variables in message
    const message = this.resolveTemplate(level.message, { alert });

    // Get on-call users for this level
    const recipients = await this.getOnCallRecipients(level.recipients);

    // Send notifications
    for (const recipient of recipients) {
      for (const channel of level.channels) {
        await notificationService.send({
          channel,
          recipient,
          message,
          alertId: alert.alertId,
          escalationLevel: level.level,
          requireAcknowledgment: level.requireAcknowledgment
        });
      }
    }

    // Execute additional actions
    if (level.additionalActions) {
      for (const action of level.additionalActions) {
        await this.executeAction(action, alert);
      }
    }

    // Record level execution
    await db.escalations.update(
      { escalationId: escalation.escalationId },
      {
        $push: {
          levelHistory: {
            level: level.level,
            executedAt: new Date(),
            recipients: recipients.map(r => r.userId),
            channels: level.channels
          }
        }
      }
    );
  }

  async scheduleNextLevel(escalation, chain) {
    const currentLevel = escalation.currentLevel;
    const nextLevel = chain.levels[currentLevel]; // 0-indexed, so currentLevel = next index

    if (!nextLevel) {
      // No more levels
      await db.escalations.update(
        { escalationId: escalation.escalationId },
        { status: 'exhausted', completedAt: new Date() }
      );
      return;
    }

    const timeout = chain.levels[currentLevel - 1].timeoutMinutes * 60 * 1000;

    // Schedule job to check if alert is still unacknowledged
    await scheduler.scheduleJob({
      jobId: `escalation:${escalation.escalationId}:level${nextLevel.level}`,
      executeAt: new Date(Date.now() + timeout),
      handler: 'escalation.checkAndExecute',
      payload: {
        escalationId: escalation.escalationId,
        level: nextLevel.level
      }
    });
  }

  async getOnCallRecipients(recipientConfig) {
    const recipients = [];

    // Add users from roles
    if (recipientConfig.roles) {
      const roleUsers = await db.users.find({
        role: { $in: recipientConfig.roles },
        status: 'active'
      });
      recipients.push(...roleUsers);
    }

    // Add on-call group
    if (recipientConfig.onCallGroup) {
      const schedule = await db.onCallSchedules.findOne({
        scheduleId: recipientConfig.onCallGroup
      });

      const onCallUser = await this.getCurrentOnCallUser(schedule);
      recipients.push(onCallUser);

      // Add backup if configured
      if (schedule.coverage.afterHours?.requireBackupNotification) {
        const backupUser = await db.users.findOne({
          userId: onCallUser.backupUserId
        });
        if (backupUser) recipients.push(backupUser);
      }
    }

    // Add specific users
    if (recipientConfig.users) {
      const users = await db.users.find({
        userId: { $in: recipientConfig.users }
      });
      recipients.push(...users);
    }

    return [...new Set(recipients)]; // Deduplicate
  }

  getCurrentOnCallUser(schedule) {
    const now = new Date();
    const weeksSinceStart = Math.floor(
      (now - schedule.rotation.startDate) / (7 * 24 * 60 * 60 * 1000)
    );

    // Check for overrides
    const override = schedule.overrides.find(
      o => now >= o.startDate && now <= o.endDate
    );

    if (override) {
      return db.users.findOne({ userId: override.userId });
    }

    // Calculate rotation
    const rotationIndex = weeksSinceStart % schedule.rotation.participants.length;
    const userId = schedule.rotation.rotationOrder[rotationIndex];

    return db.users.findOne({ userId });
  }
}
```

---

## 5. Notification Templates

### 5.1 Template Schema

```json
{
  "templateId": "TPL-INVERTER-OVERTEMP",
  "name": "Inverter Over-Temperature Alert",
  "category": "equipment_fault",
  "tenantId": "tenant-acme-solar",

  "channels": {
    "sms": {
      "body": "ALERT: {{asset.name}} temp {{value}}°C (threshold {{threshold}}°C). Ack: {{acknowledgment_link}}"
    },

    "email": {
      "subject": "[{{severity}}] {{alert.ruleName}} - {{asset.name}}",
      "body": {
        "html": "<h2>Alert Notification</h2><p><strong>Asset:</strong> {{asset.name}} ({{asset.id}})</p><p><strong>Site:</strong> {{site.name}}</p><p><strong>Severity:</strong> <span style='color:{{severity_color}}'>{{severity}}</span></p><p><strong>Description:</strong> Inverter temperature has exceeded safe operating threshold.</p><table><tr><th>Metric</th><td>{{metric}}</td></tr><tr><th>Current Value</th><td>{{value}} {{unit}}</td></tr><tr><th>Threshold</th><td>{{threshold}} {{unit}}</td></tr><tr><th>Duration</th><td>{{duration}}</td></tr><tr><th>Triggered At</th><td>{{triggered_at}}</td></tr></table><p><a href='{{dashboard_link}}'>View Dashboard</a> | <a href='{{acknowledgment_link}}'>Acknowledge Alert</a></p>",
        "text": "Alert: {{alert.ruleName}}\n\nAsset: {{asset.name}} ({{asset.id}})\nSite: {{site.name}}\nSeverity: {{severity}}\n\nInverter temperature has exceeded safe operating threshold.\n\nMetric: {{metric}}\nCurrent Value: {{value}} {{unit}}\nThreshold: {{threshold}} {{unit}}\nDuration: {{duration}}\nTriggered At: {{triggered_at}}\n\nView Dashboard: {{dashboard_link}}\nAcknowledge: {{acknowledgment_link}}"
      },
      "attachments": [
        {
          "type": "trend_chart",
          "metric": "{{metric}}",
          "timeRange": "1h",
          "filename": "inverter_temp_trend.png"
        }
      ]
    },

    "push": {
      "title": "[{{severity}}] {{asset.name}}",
      "body": "{{alert.ruleName}}: {{value}}{{unit}} (threshold: {{threshold}}{{unit}})",
      "data": {
        "alertId": "{{alert.alertId}}",
        "assetId": "{{asset.id}}",
        "deepLink": "dcmms://alerts/{{alert.alertId}}"
      },
      "priority": "high",
      "sound": "alert_critical.wav",
      "badge": 1
    },

    "webhook": {
      "method": "POST",
      "headers": {
        "Content-Type": "application/json",
        "X-DCMMS-Event": "alert.triggered"
      },
      "body": {
        "event": "alert.triggered",
        "alertId": "{{alert.alertId}}",
        "severity": "{{severity}}",
        "asset": {
          "id": "{{asset.id}}",
          "name": "{{asset.name}}",
          "type": "{{asset.type}}"
        },
        "metric": "{{metric}}",
        "value": "{{value}}",
        "threshold": "{{threshold}}",
        "triggeredAt": "{{triggered_at}}"
      }
    },

    "voice": {
      "script": "This is an urgent alert from the dCMMS system. {{asset.name}} has triggered a {{severity}} severity alert for {{alert.ruleName}}. Current temperature is {{value}} degrees celsius, which exceeds the threshold of {{threshold}} degrees. Please acknowledge this alert immediately.",
      "voice": "female",
      "language": "en-US",
      "repeat": 2
    }
  },

  "variables": [
    { "name": "asset.name", "type": "string", "required": true },
    { "name": "asset.id", "type": "string", "required": true },
    { "name": "asset.type", "type": "string", "required": true },
    { "name": "site.name", "type": "string", "required": true },
    { "name": "severity", "type": "enum", "values": ["low", "medium", "high", "critical"] },
    { "name": "value", "type": "number", "required": true },
    { "name": "threshold", "type": "number", "required": true },
    { "name": "unit", "type": "string", "required": true },
    { "name": "metric", "type": "string", "required": true },
    { "name": "duration", "type": "string" },
    { "name": "triggered_at", "type": "datetime", "required": true }
  ],

  "localization": {
    "supported_languages": ["en", "es", "pt", "hi"],
    "default_language": "en"
  }
}
```

### 5.2 Template Rendering

```javascript
class TemplateRenderer {
  constructor() {
    this.handlebars = require('handlebars');
    this.registerHelpers();
  }

  registerHelpers() {
    // Date formatting
    this.handlebars.registerHelper('formatDate', (date, format) => {
      return require('date-fns').format(new Date(date), format);
    });

    // Number formatting
    this.handlebars.registerHelper('formatNumber', (number, decimals = 2) => {
      return Number(number).toFixed(decimals);
    });

    // Severity color mapping
    this.handlebars.registerHelper('severity_color', (severity) => {
      const colors = {
        low: '#4CAF50',
        medium: '#FF9800',
        high: '#F44336',
        critical: '#D32F2F'
      };
      return colors[severity] || '#757575';
    });

    // URL encoding for acknowledgment links
    this.handlebars.registerHelper('ack_link', (alertId, userId) => {
      return `https://dcmms.company.com/alerts/${alertId}/acknowledge?user=${userId}`;
    });
  }

  async render(template, channel, context) {
    const channelTemplate = template.channels[channel];

    if (!channelTemplate) {
      throw new Error(`Channel ${channel} not defined in template ${template.templateId}`);
    }

    // Validate required variables
    this.validateContext(template.variables, context);

    // Enrich context with computed values
    const enrichedContext = {
      ...context,
      acknowledgment_link: this.generateAcknowledgmentLink(context.alert.alertId, context.user.userId),
      dashboard_link: this.generateDashboardLink(context.asset.id),
      severity_color: this.getSeverityColor(context.severity)
    };

    // Render based on channel
    if (channel === 'email') {
      return {
        subject: this.handlebars.compile(channelTemplate.subject)(enrichedContext),
        html: this.handlebars.compile(channelTemplate.body.html)(enrichedContext),
        text: this.handlebars.compile(channelTemplate.body.text)(enrichedContext),
        attachments: await this.generateAttachments(channelTemplate.attachments, enrichedContext)
      };
    } else if (channel === 'sms' || channel === 'push') {
      return {
        title: channelTemplate.title ? this.handlebars.compile(channelTemplate.title)(enrichedContext) : undefined,
        body: this.handlebars.compile(channelTemplate.body)(enrichedContext),
        data: channelTemplate.data ? this.renderObject(channelTemplate.data, enrichedContext) : undefined
      };
    } else if (channel === 'webhook') {
      return {
        method: channelTemplate.method,
        headers: this.renderObject(channelTemplate.headers, enrichedContext),
        body: this.renderObject(channelTemplate.body, enrichedContext)
      };
    } else if (channel === 'voice') {
      return {
        script: this.handlebars.compile(channelTemplate.script)(enrichedContext),
        voice: channelTemplate.voice,
        language: channelTemplate.language,
        repeat: channelTemplate.repeat
      };
    }
  }

  renderObject(obj, context) {
    const rendered = {};
    for (const [key, value] of Object.entries(obj)) {
      if (typeof value === 'string') {
        rendered[key] = this.handlebars.compile(value)(context);
      } else if (typeof value === 'object') {
        rendered[key] = this.renderObject(value, context);
      } else {
        rendered[key] = value;
      }
    }
    return rendered;
  }

  validateContext(variables, context) {
    for (const variable of variables) {
      if (variable.required) {
        const value = this.getNestedValue(context, variable.name);
        if (value === undefined || value === null) {
          throw new Error(`Required variable ${variable.name} not provided`);
        }
      }
    }
  }

  getNestedValue(obj, path) {
    return path.split('.').reduce((current, part) => current?.[part], obj);
  }
}
```

---

## 6. Service Integrations

### 6.1 Email - SendGrid

```javascript
const sgMail = require('@sendgrid/mail');

class SendGridProvider {
  constructor(apiKey) {
    sgMail.setApiKey(apiKey);
  }

  async send(notification) {
    const msg = {
      to: notification.recipient.email,
      from: {
        email: 'alerts@dcmms.company.com',
        name: 'dCMMS Alert System'
      },
      subject: notification.subject,
      text: notification.text,
      html: notification.html,
      attachments: notification.attachments?.map(att => ({
        content: att.content,
        filename: att.filename,
        type: att.mimeType,
        disposition: 'attachment'
      })),
      customArgs: {
        alertId: notification.alertId,
        tenantId: notification.tenantId
      },
      trackingSettings: {
        clickTracking: { enable: true },
        openTracking: { enable: true }
      }
    };

    try {
      const response = await sgMail.send(msg);

      return {
        success: true,
        messageId: response[0].headers['x-message-id'],
        provider: 'sendgrid',
        timestamp: new Date()
      };
    } catch (error) {
      throw new Error(`SendGrid delivery failed: ${error.message}`);
    }
  }

  async processWebhook(event) {
    // Handle SendGrid webhooks for delivery status
    const { event: eventType, sg_message_id, email, timestamp } = event;

    await db.notificationDelivery.update(
      { messageId: sg_message_id },
      {
        status: eventType, // delivered, opened, clicked, bounce, dropped
        statusUpdatedAt: new Date(timestamp * 1000)
      }
    );
  }
}
```

### 6.2 SMS - Twilio

```javascript
const twilio = require('twilio');

class TwilioSMSProvider {
  constructor(accountSid, authToken, fromNumber) {
    this.client = twilio(accountSid, authToken);
    this.fromNumber = fromNumber;
  }

  async send(notification) {
    try {
      const message = await this.client.messages.create({
        body: notification.body,
        from: this.fromNumber,
        to: notification.recipient.phone,
        statusCallback: 'https://dcmms-api.company.com/webhooks/twilio/sms-status',
        validityPeriod: 3600 // 1 hour
      });

      return {
        success: true,
        messageId: message.sid,
        provider: 'twilio_sms',
        timestamp: new Date(),
        segments: message.numSegments,
        price: message.price
      };
    } catch (error) {
      throw new Error(`Twilio SMS delivery failed: ${error.message}`);
    }
  }

  async processWebhook(event) {
    const { MessageSid, MessageStatus, ErrorCode } = event;

    await db.notificationDelivery.update(
      { messageId: MessageSid },
      {
        status: MessageStatus, // queued, sent, delivered, failed, undelivered
        errorCode: ErrorCode,
        statusUpdatedAt: new Date()
      }
    );
  }
}
```

### 6.3 Push - Firebase Cloud Messaging (FCM)

```javascript
const admin = require('firebase-admin');

class FCMProvider {
  constructor(serviceAccount) {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
    this.messaging = admin.messaging();
  }

  async send(notification) {
    const { recipient, title, body, data, priority, sound, badge } = notification;

    // Get device tokens for user
    const devices = await db.userDevices.find({
      userId: recipient.userId,
      platform: { $in: ['ios', 'android'] },
      fcmToken: { $exists: true },
      enabled: true
    });

    if (devices.length === 0) {
      throw new Error('No registered devices for push notification');
    }

    const tokens = devices.map(d => d.fcmToken);

    const message = {
      notification: {
        title,
        body
      },
      data: {
        ...data,
        alertId: notification.alertId,
        clickAction: data.deepLink
      },
      android: {
        priority: priority === 'high' ? 'high' : 'normal',
        notification: {
          sound: sound || 'default',
          channelId: 'alerts'
        }
      },
      apns: {
        payload: {
          aps: {
            sound: sound || 'default',
            badge: badge || 1,
            alert: {
              title,
              body
            }
          }
        }
      },
      tokens
    };

    try {
      const response = await this.messaging.sendMulticast(message);

      // Handle failed tokens
      if (response.failureCount > 0) {
        const failedTokens = [];
        response.responses.forEach((resp, idx) => {
          if (!resp.success) {
            failedTokens.push(tokens[idx]);

            // Remove invalid tokens
            if (resp.error.code === 'messaging/invalid-registration-token' ||
                resp.error.code === 'messaging/registration-token-not-registered') {
              db.userDevices.update(
                { fcmToken: tokens[idx] },
                { enabled: false }
              );
            }
          }
        });
      }

      return {
        success: response.successCount > 0,
        messageId: response.responses[0]?.messageId,
        provider: 'fcm',
        timestamp: new Date(),
        successCount: response.successCount,
        failureCount: response.failureCount
      };
    } catch (error) {
      throw new Error(`FCM delivery failed: ${error.message}`);
    }
  }
}
```

### 6.4 Voice - Twilio Voice

```javascript
class TwilioVoiceProvider {
  constructor(accountSid, authToken, fromNumber) {
    this.client = twilio(accountSid, authToken);
    this.fromNumber = fromNumber;
  }

  async send(notification) {
    const { recipient, script, voice, language, repeat } = notification;

    try {
      const call = await this.client.calls.create({
        twiml: this.generateTwiML(script, voice, language, repeat),
        to: recipient.phone,
        from: this.fromNumber,
        statusCallback: 'https://dcmms-api.company.com/webhooks/twilio/call-status',
        statusCallbackEvent: ['initiated', 'ringing', 'answered', 'completed'],
        machineDetection: 'DetectMessageEnd' // Detect voicemail
      });

      return {
        success: true,
        messageId: call.sid,
        provider: 'twilio_voice',
        timestamp: new Date()
      };
    } catch (error) {
      throw new Error(`Twilio voice call failed: ${error.message}`);
    }
  }

  generateTwiML(script, voice = 'Polly.Joanna', language = 'en-US', repeat = 1) {
    const VoiceResponse = require('twilio').twiml.VoiceResponse;
    const response = new VoiceResponse();

    // Repeat message
    for (let i = 0; i < repeat; i++) {
      response.say({
        voice,
        language
      }, script);

      if (i < repeat - 1) {
        response.pause({ length: 2 });
      }
    }

    // Gather acknowledgment
    const gather = response.gather({
      input: 'dtmf',
      numDigits: 1,
      action: '/webhooks/twilio/voice-acknowledgment',
      method: 'POST'
    });

    gather.say({
      voice,
      language
    }, 'Press 1 to acknowledge this alert, or press 2 to escalate.');

    return response.toString();
  }
}
```

---

## 7. Delivery Tracking

### 7.1 Delivery Record Schema

```json
{
  "deliveryId": "DELIV-001",
  "notificationId": "NOTIF-001",
  "alertId": "ALERT-001",
  "channel": "sms",
  "provider": "twilio_sms",
  "recipient": {
    "userId": "user-123",
    "email": "user@example.com",
    "phone": "+1-555-0101"
  },
  "status": "delivered",
  "statusHistory": [
    {
      "status": "queued",
      "timestamp": "2025-11-11T10:00:00Z"
    },
    {
      "status": "sent",
      "timestamp": "2025-11-11T10:00:02Z"
    },
    {
      "status": "delivered",
      "timestamp": "2025-11-11T10:00:05Z"
    }
  ],
  "messageId": "SM1234567890abcdef",
  "sentAt": "2025-11-11T10:00:02Z",
  "deliveredAt": "2025-11-11T10:00:05Z",
  "openedAt": null,
  "clickedAt": null,
  "acknowledgedAt": null,
  "errorCode": null,
  "errorMessage": null,
  "retryCount": 0,
  "cost": {
    "amount": 0.0075,
    "currency": "USD"
  }
}
```

### 7.2 Retry Logic

```javascript
class DeliveryRetryManager {
  constructor() {
    this.maxRetries = {
      email: 3,
      sms: 3,
      push: 2,
      webhook: 5,
      voice: 2
    };

    this.retryDelays = [30, 120, 300]; // seconds: 30s, 2m, 5m
  }

  async handleFailedDelivery(delivery) {
    const maxRetries = this.maxRetries[delivery.channel];

    if (delivery.retryCount >= maxRetries) {
      await this.handlePermanentFailure(delivery);
      return;
    }

    // Determine if error is transient or permanent
    const isTransient = this.isTransientError(delivery.errorCode);

    if (!isTransient) {
      await this.handlePermanentFailure(delivery);
      return;
    }

    // Schedule retry
    const delay = this.retryDelays[delivery.retryCount] || 300;

    await scheduler.scheduleJob({
      jobId: `retry:${delivery.deliveryId}:${delivery.retryCount + 1}`,
      executeAt: new Date(Date.now() + delay * 1000),
      handler: 'notification.retry',
      payload: {
        deliveryId: delivery.deliveryId,
        retryCount: delivery.retryCount + 1
      }
    });

    await db.notificationDelivery.update(
      { deliveryId: delivery.deliveryId },
      {
        status: 'retry_scheduled',
        retryCount: delivery.retryCount + 1,
        nextRetryAt: new Date(Date.now() + delay * 1000)
      }
    );
  }

  isTransientError(errorCode) {
    const transientErrors = {
      sms: ['30001', '30002', '30003', '30005'], // Twilio queue errors
      email: ['ETIMEDOUT', 'ECONNRESET'],
      push: ['messaging/server-unavailable'],
      webhook: ['ETIMEDOUT', 'ECONNRESET', '503', '504']
    };

    return Object.values(transientErrors).flat().includes(errorCode);
  }

  async handlePermanentFailure(delivery) {
    await db.notificationDelivery.update(
      { deliveryId: delivery.deliveryId },
      {
        status: 'failed_permanent',
        failedAt: new Date()
      }
    );

    // Try alternate channel
    const alert = await db.alerts.findOne({ alertId: delivery.alertId });
    const notification = await db.notifications.findOne({ notificationId: delivery.notificationId });

    const alternateChannel = this.getAlternateChannel(delivery.channel, alert.severity);

    if (alternateChannel) {
      await notificationService.send({
        ...notification,
        channel: alternateChannel,
        reason: `Fallback from failed ${delivery.channel} delivery`
      });
    } else {
      // No alternate channel - escalate
      logger.error('All notification channels exhausted', {
        alertId: delivery.alertId,
        recipient: delivery.recipient.userId
      });

      // Notify system administrators
      await this.notifyAdmins(delivery);
    }
  }

  getAlternateChannel(failedChannel, severity) {
    const fallbackMap = {
      push: severity === 'critical' ? 'sms' : 'email',
      sms: 'voice',
      email: severity === 'critical' ? 'sms' : null,
      voice: null,
      webhook: null
    };

    return fallbackMap[failedChannel];
  }
}
```

---

## 8. Alert Management UI

### 8.1 Alert Dashboard Wireframe

```
┌─────────────────────────────────────────────────────────────────┐
│ dCMMS - Alert Dashboard                                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Filters: [All Sites ▼] [All Severities ▼] [Active Only ✓]    │
│           [Last 24h ▼]  [Search alerts...]                      │
│                                                                 │
│  Summary:  🔴 Critical: 2   🟠 High: 5   🟡 Medium: 12   ⚪ Low: 3│
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│ ALERT ID      │ SEVERITY │ ASSET        │ RULE           │ AGE  │
├───────────────┼──────────┼──────────────┼────────────────┼──────┤
│ ALT-001       │ 🔴 CRIT  │ INV-3A       │ Over-Temp      │ 5m   │
│ Status: Active │ Ack: No  │ Site: AZ-001 │ Esc: Level 2   │      │
│ [Acknowledge] [View Details] [Create WO] [Suppress]             │
├───────────────┼──────────┼──────────────┼────────────────┼──────┤
│ ALT-002       │ 🔴 CRIT  │ TRK-12       │ Position Error │ 15m  │
│ Status: Ack    │ Ack: John Smith (10m ago)                       │
│ [View Details] [Resolve] [Add Comment]                          │
├───────────────┼──────────┼──────────────┼────────────────┼──────┤
│ ALT-003       │ 🟠 HIGH  │ MET-STATION  │ Comm Loss      │ 1h   │
│ Status: Active │ Ack: No  │ Site: AZ-001 │ Esc: Level 1   │      │
│ [Acknowledge] [View Details] [Suppress]                          │
└─────────────────────────────────────────────────────────────────┘
```

### 8.2 Alert Detail View

```
┌─────────────────────────────────────────────────────────────────┐
│ Alert Details - ALT-001                                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│ OVERVIEW                                                        │
│ ───────────────────────────────────────────────────────────    │
│ Severity:        🔴 CRITICAL                                    │
│ Status:          Active (Unacknowledged)                        │
│ Rule:            Inverter Over-Temperature Alert                │
│ Asset:           INV-3A (Site: Arizona Solar Farm)              │
│ Triggered At:    2025-11-11 10:15:32 MST                        │
│ Age:             5 minutes 12 seconds                           │
│ Escalation:      Level 2 - Site Supervisor Notified            │
│                                                                 │
│ METRICS                                                         │
│ ───────────────────────────────────────────────────────────    │
│ Current Temperature:   78.5°C                                   │
│ Threshold:             75.0°C                                   │
│ Ambient Temp:          32°C                                     │
│ Duration Over Limit:   5 minutes                                │
│                                                                 │
│ TREND CHART                                                     │
│ ───────────────────────────────────────────────────────────    │
│  80°C ┤                                    ╭──●                 │
│  75°C ┤─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ╭─╯                    │
│  70°C ┤                          ╭────────╯                     │
│  65°C ┤              ╭───────────╯                              │
│       └───────────────────────────────────────────────────     │
│       9:00      9:30      10:00     10:15      10:20           │
│                                                                 │
│ NOTIFICATIONS SENT                                              │
│ ───────────────────────────────────────────────────────────    │
│ Level 1 (10:15): Push + SMS → John Smith (Field Tech)          │
│   Status: Delivered (no acknowledgment)                         │
│                                                                 │
│ Level 2 (10:30): Push + SMS + Voice → Jane Doe (Supervisor)    │
│   Status: Delivered (awaiting acknowledgment)                   │
│                                                                 │
│ RELATED WORK ORDERS                                             │
│ ───────────────────────────────────────────────────────────    │
│ WO-1234: Inspect INV-3A Cooling System (Auto-created)           │
│   Assigned: John Smith                                          │
│   Priority: High                                                │
│   Due: 2025-11-11 14:15                                         │
│                                                                 │
│ COMMENTS                                                        │
│ ───────────────────────────────────────────────────────────    │
│ [Add comment...]                                                │
│                                                                 │
│ ACTIONS                                                         │
│ ───────────────────────────────────────────────────────────    │
│ [Acknowledge Alert] [Resolve Alert] [Suppress Future Alerts]    │
│ [Create Work Order] [Notify Additional Users] [Export Details]  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 8.3 Alert Management API

```javascript
// GET /api/v1/alerts
router.get('/alerts', authenticate, authorize('view_alerts'), async (req, res) => {
  const {
    siteId,
    severity,
    status,
    category,
    startDate,
    endDate,
    page = 1,
    limit = 20,
    sortBy = 'triggeredAt',
    sortOrder = 'desc'
  } = req.query;

  const query = {
    tenantId: req.user.tenantId
  };

  if (siteId) query.siteId = siteId;
  if (severity) query.severity = { $in: severity.split(',') };
  if (status) query.status = { $in: status.split(',') };
  if (category) query.category = { $in: category.split(',') };
  if (startDate || endDate) {
    query.triggeredAt = {};
    if (startDate) query.triggeredAt.$gte = new Date(startDate);
    if (endDate) query.triggeredAt.$lte = new Date(endDate);
  }

  const alerts = await db.alerts
    .find(query)
    .sort({ [sortBy]: sortOrder === 'desc' ? -1 : 1 })
    .skip((page - 1) * limit)
    .limit(limit)
    .lean();

  const total = await db.alerts.countDocuments(query);

  res.json({
    alerts,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      pages: Math.ceil(total / limit)
    }
  });
});

// POST /api/v1/alerts/:alertId/acknowledge
router.post('/alerts/:alertId/acknowledge', authenticate, async (req, res) => {
  const { alertId } = req.params;
  const { comment } = req.body;

  const alert = await db.alerts.findOne({
    alertId,
    tenantId: req.user.tenantId
  });

  if (!alert) {
    return res.status(404).json({ error: 'Alert not found' });
  }

  if (alert.status === 'acknowledged' || alert.status === 'resolved') {
    return res.status(400).json({ error: 'Alert already acknowledged or resolved' });
  }

  // Update alert
  await db.alerts.update(
    { alertId },
    {
      status: 'acknowledged',
      acknowledgedBy: req.user.userId,
      acknowledgedAt: new Date(),
      acknowledgmentComment: comment
    }
  );

  // Cancel escalation
  await db.escalations.update(
    { alertId, status: 'active' },
    { status: 'cancelled', cancelledAt: new Date() }
  );

  // Send acknowledgment notification to original recipients
  await notificationService.send({
    templateId: 'TPL-ALERT-ACKNOWLEDGED',
    recipients: alert.notifiedUsers,
    context: {
      alert,
      acknowledgedBy: req.user,
      comment
    }
  });

  // Audit log
  await auditLogger.log({
    action: 'alert.acknowledged',
    actor: req.user.userId,
    resource: { type: 'alert', id: alertId },
    details: { comment }
  });

  res.json({ success: true });
});

// POST /api/v1/alerts/:alertId/resolve
router.post('/alerts/:alertId/resolve', authenticate, async (req, res) => {
  const { alertId } = req.params;
  const { resolution, rootCause } = req.body;

  await db.alerts.update(
    { alertId },
    {
      status: 'resolved',
      resolvedBy: req.user.userId,
      resolvedAt: new Date(),
      resolution,
      rootCause
    }
  );

  res.json({ success: true });
});
```

---

## 9. Integration Points

### 9.1 Work Order Integration

```javascript
// Automatically create work orders from alerts
class AlertWorkOrderIntegration {
  async createWorkOrderFromAlert(alert, rule) {
    const workOrderTemplate = await db.workOrderTemplates.findOne({
      templateId: rule.actions.find(a => a.type === 'create_work_order')?.template
    });

    const workOrder = {
      workOrderId: this.generateWorkOrderId(),
      title: `${alert.ruleName} - ${alert.assetName}`,
      description: `Auto-generated work order for alert ${alert.alertId}\n\n${workOrderTemplate.description}`,
      type: workOrderTemplate.type,
      priority: this.mapSeverityToPriority(alert.severity),
      status: 'draft',
      siteId: alert.siteId,
      assetId: alert.assetId,
      assignedTo: await this.determineAssignee(alert, rule),
      dueDate: this.calculateDueDate(rule.actions[0].dueIn),
      createdBy: 'system',
      createdAt: new Date(),
      linkedAlertId: alert.alertId,
      tasks: workOrderTemplate.tasks
    };

    await db.workOrders.insert(workOrder);

    // Link alert to work order
    await db.alerts.update(
      { alertId: alert.alertId },
      { linkedWorkOrderId: workOrder.workOrderId }
    );

    return workOrder;
  }

  mapSeverityToPriority(severity) {
    const mapping = {
      critical: 'emergency',
      high: 'high',
      medium: 'medium',
      low: 'low'
    };
    return mapping[severity];
  }
}
```

### 9.2 Audit Log Integration

All notification events are logged to the audit system:

```javascript
await auditLogger.log({
  category: 'notification',
  action: 'notification.sent',
  actor: 'system',
  resource: {
    type: 'notification',
    id: notification.notificationId
  },
  details: {
    channel: delivery.channel,
    recipient: delivery.recipient.userId,
    alertId: notification.alertId,
    messageId: delivery.messageId
  },
  compliance: {
    relevant: alert.category === 'safety_incident',
    regulatoryFramework: ['NERC', 'OSHA']
  }
});
```

### 9.3 Analytics Integration

```javascript
// Notification metrics for analytics
class NotificationMetrics {
  async recordMetrics(delivery) {
    const latency = delivery.deliveredAt - delivery.sentAt;

    await metrics.record({
      name: 'notification.delivery.latency',
      value: latency,
      unit: 'milliseconds',
      tags: {
        channel: delivery.channel,
        provider: delivery.provider,
        severity: delivery.alert.severity
      }
    });

    await metrics.increment('notification.delivery.count', {
      channel: delivery.channel,
      status: delivery.status
    });

    if (delivery.cost) {
      await metrics.record({
        name: 'notification.delivery.cost',
        value: delivery.cost.amount,
        unit: 'usd',
        tags: {
          channel: delivery.channel
        }
      });
    }
  }
}
```

---

## 10. Performance & Scaling

### 10.1 Performance Targets

```yaml
performance_targets:
  notification_latency:
    critical_alerts: "< 5s end-to-end"
    high_alerts: "< 10s"
    medium_alerts: "< 30s"
    low_alerts: "< 60s"

  throughput:
    sustained: "1,000 notifications/second"
    burst: "5,000 notifications/second"

  availability: "99.9%"

  delivery_success_rate:
    sms: "> 98%"
    email: "> 95%"
    push: "> 90%"

  rule_evaluation_latency: "< 100ms per datapoint"
```

### 10.2 Scaling Architecture

```yaml
architecture:
  rule_evaluation:
    component: "Apache Flink"
    parallelism: 16
    state_backend: "RocksDB"
    checkpointing: "1 minute"

  notification_queue:
    component: "Apache Kafka"
    topic: "notifications"
    partitions: 32
    replication: 3
    retention: "7 days"

  notification_workers:
    replicas: 10
    auto_scaling:
      min: 5
      max: 50
      target_cpu: "70%"
      target_queue_depth: 1000

  template_cache:
    component: "Redis"
    ttl: "15 minutes"
    max_memory: "2 GB"
    eviction: "allkeys-lru"

  delivery_tracking:
    database: "TimescaleDB"
    retention: "90 days"
    partitioning: "daily"
```

### 10.3 Rate Limiting

```javascript
class NotificationRateLimiter {
  constructor() {
    this.redis = new Redis();
  }

  async checkLimit(userId, channel) {
    const key = `rate_limit:${userId}:${channel}`;
    const limits = {
      sms: { count: 10, window: 3600 },      // 10 SMS per hour
      email: { count: 50, window: 3600 },    // 50 emails per hour
      push: { count: 100, window: 3600 },    // 100 push per hour
      voice: { count: 5, window: 3600 }      // 5 voice calls per hour
    };

    const limit = limits[channel];

    const current = await this.redis.incr(key);

    if (current === 1) {
      await this.redis.expire(key, limit.window);
    }

    if (current > limit.count) {
      throw new Error(`Rate limit exceeded for ${channel}: ${limit.count} per ${limit.window}s`);
    }

    return {
      allowed: true,
      remaining: limit.count - current,
      resetAt: await this.redis.ttl(key)
    };
  }
}
```

---

## 11. Testing Strategy

### 11.1 Unit Tests

```javascript
describe('AlertRuleEngine', () => {
  it('should trigger alert when threshold exceeded for duration', async () => {
    const rule = {
      trigger: {
        metric: 'temperature',
        operator: 'greater_than',
        threshold: 75,
        duration: '5m'
      }
    };

    // Simulate 5 minutes of data over threshold
    for (let i = 0; i < 5; i++) {
      await engine.evaluateRules({
        metric: 'temperature',
        value: 76,
        timestamp: new Date(Date.now() - (5 - i) * 60000)
      });
    }

    const alerts = await db.alerts.find({ status: 'active' });
    expect(alerts).toHaveLength(1);
  });

  it('should throttle duplicate alerts', async () => {
    // Send 10 identical alerts
    for (let i = 0; i < 10; i++) {
      await engine.handleTriggeredRule(rule, dataPoint);
    }

    const notifications = await db.notifications.find({ ruleId: rule.ruleId });
    expect(notifications.length).toBeLessThanOrEqual(rule.throttling.maxNotificationsPerHour);
  });
});
```

### 11.2 Integration Tests

```javascript
describe('Multi-channel notification delivery', () => {
  it('should deliver critical alert via all configured channels', async () => {
    const alert = createTestAlert({ severity: 'critical' });

    await notificationService.process(alert);

    // Verify all channels sent
    const deliveries = await db.notificationDelivery.find({ alertId: alert.alertId });
    expect(deliveries.map(d => d.channel)).toContain('push');
    expect(deliveries.map(d => d.channel)).toContain('sms');
    expect(deliveries.map(d => d.channel)).toContain('email');
  });

  it('should escalate after timeout with no acknowledgment', async () => {
    const alert = createTestAlert({ severity: 'high' });

    await notificationService.process(alert);

    // Fast-forward 15 minutes
    jest.advanceTimersByTime(15 * 60 * 1000);

    const escalation = await db.escalations.findOne({ alertId: alert.alertId });
    expect(escalation.currentLevel).toBe(2);
  });
});
```

---

## Summary

This specification provides a comprehensive notification and alerting system for dCMMS with:

1. **Multi-channel delivery** (email, SMS, push, in-app, webhook, voice) with intelligent channel selection
2. **Flexible alert rule engine** supporting threshold, anomaly, pattern, and composite rules
3. **Automated escalation workflows** with on-call scheduling and multi-tier notification
4. **Template-based notifications** with variable substitution and localization support
5. **Service integrations** for SendGrid, Twilio (SMS/Voice), FCM, APNS
6. **Delivery tracking** with retry logic, failover strategies, and audit trails
7. **Alert management UI** for acknowledgment, resolution, and work order creation
8. **Performance & scaling** architecture supporting 1,000+ notifications/second
9. **Integration points** with work orders, audit logs, and analytics systems

**Lines:** ~1,450
**Status:** Complete
**Next:** Compliance and Regulatory Reporting (Spec 15)
