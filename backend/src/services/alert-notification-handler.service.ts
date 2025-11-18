import { FastifyInstance } from 'fastify';
import { db } from '../db';
import { alerts, users, assets, sites } from '../db/schema';
import { eq, and } from 'drizzle-orm';
import { createNotificationService, NotificationEventType } from './notification.service';
import { createWebhookService } from './webhook.service';

export interface AlertEvent {
  alertId: string;
  tenantId: string;
  siteId: string;
  assetId?: string;
  title: string;
  description?: string;
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
  status: 'active' | 'acknowledged' | 'resolved' | 'suppressed';
  triggeredAt: string;
  metadata?: Record<string, any>;
}

/**
 * Alert Notification Handler Service
 * Handles alert events and triggers notifications
 */
export class AlertNotificationHandler {
  private fastify: FastifyInstance;
  private notificationService: ReturnType<typeof createNotificationService>;
  private webhookService: ReturnType<typeof createWebhookService>;
  private escalationTimers: Map<string, NodeJS.Timeout> = new Map();

  constructor(fastify: FastifyInstance) {
    this.fastify = fastify;
    this.notificationService = createNotificationService(fastify);
    this.webhookService = createWebhookService(fastify);
  }

  /**
   * Handle new alert event
   */
  async handleAlertCreated(alertEvent: AlertEvent): Promise<void> {
    this.fastify.log.info({ alertId: alertEvent.alertId }, 'Handling alert created event');

    try {
      // Get alert details from database
      const alert = await db.query.alerts.findFirst({
        where: eq(alerts.alertId, alertEvent.alertId),
        with: {
          site: true,
          asset: true,
          tenant: true,
        },
      });

      if (!alert) {
        this.fastify.log.warn({ alertId: alertEvent.alertId }, 'Alert not found in database');
        return;
      }

      // Map alert severity to notification event type
      const eventType = this.mapSeverityToEventType(alertEvent.severity);

      if (!eventType) {
        this.fastify.log.info(
          { severity: alertEvent.severity },
          'No notification configured for this severity'
        );
        return;
      }

      // Get users to notify (site managers and assigned technicians)
      const usersToNotify = await this.getUsersToNotify(alert.tenantId, alert.siteId);

      // Prepare notification data
      const notificationData = {
        asset_name: alert.asset?.name || 'Unknown Asset',
        site_name: alert.site.name,
        alarm_severity: alertEvent.severity,
        value: alertEvent.metadata?.value || 'N/A',
        threshold: alertEvent.metadata?.threshold || 'N/A',
        alert_id: alertEvent.alertId,
        alert_title: alertEvent.title,
        alert_description: alertEvent.description || '',
      };

      // Send notifications to all relevant users
      for (const user of usersToNotify) {
        try {
          await this.notificationService.sendNotification({
            tenantId: alert.tenantId,
            userId: user.id,
            eventType,
            data: notificationData,
            severity: alertEvent.severity,
          });

          this.fastify.log.info(
            { userId: user.id, alertId: alertEvent.alertId },
            'Notification sent for alert'
          );
        } catch (error) {
          this.fastify.log.error(
            { error, userId: user.id, alertId: alertEvent.alertId },
            'Failed to send notification'
          );
        }
      }

      // Send webhooks
      try {
        await this.webhookService.sendWebhook(alert.tenantId, eventType, {
          alert: {
            id: alertEvent.alertId,
            title: alertEvent.title,
            description: alertEvent.description,
            severity: alertEvent.severity,
            status: alertEvent.status,
          },
          asset: {
            id: alert.asset?.assetId,
            name: alert.asset?.name,
          },
          site: {
            id: alert.site.siteId,
            name: alert.site.name,
          },
          ...notificationData,
        });
      } catch (error) {
        this.fastify.log.error({ error, alertId: alertEvent.alertId }, 'Failed to send webhooks');
      }

      // Set up escalation timer for critical alerts
      if (alertEvent.severity === 'critical') {
        await this.setupEscalation(alert.id, alert.tenantId, alert.siteId, notificationData);
      }
    } catch (error) {
      this.fastify.log.error({ error, alertEvent }, 'Failed to handle alert created event');
      throw error;
    }
  }

  /**
   * Handle alert acknowledged event
   */
  async handleAlertAcknowledged(alertEvent: AlertEvent): Promise<void> {
    this.fastify.log.info({ alertId: alertEvent.alertId }, 'Handling alert acknowledged event');

    try {
      // Cancel escalation timer if exists
      const escalationTimer = this.escalationTimers.get(alertEvent.alertId);
      if (escalationTimer) {
        clearTimeout(escalationTimer);
        this.escalationTimers.delete(alertEvent.alertId);
        this.fastify.log.info({ alertId: alertEvent.alertId }, 'Escalation timer cancelled');
      }

      // Get alert details
      const alert = await db.query.alerts.findFirst({
        where: eq(alerts.alertId, alertEvent.alertId),
        with: {
          site: true,
          asset: true,
          acknowledgedByUser: true,
        },
      });

      if (!alert || !alert.acknowledgedByUser) {
        return;
      }

      // Get users to notify
      const usersToNotify = await this.getUsersToNotify(alert.tenantId, alert.siteId);

      // Prepare notification data
      const notificationData = {
        asset_name: alert.asset?.name || 'Unknown Asset',
        site_name: alert.site.name,
        alert_id: alertEvent.alertId,
        acknowledged_by: `${alert.acknowledgedByUser.firstName} ${alert.acknowledgedByUser.lastName}`,
        acknowledged_at: alert.acknowledgedAt?.toISOString() || new Date().toISOString(),
      };

      // Send notifications
      for (const user of usersToNotify) {
        if (user.id === alert.acknowledgedBy) continue; // Don't notify the user who acknowledged

        try {
          await this.notificationService.sendNotification({
            tenantId: alert.tenantId,
            userId: user.id,
            eventType: 'alert_acknowledged',
            data: notificationData,
          });
        } catch (error) {
          this.fastify.log.error({ error, userId: user.id }, 'Failed to send ack notification');
        }
      }
    } catch (error) {
      this.fastify.log.error({ error, alertEvent }, 'Failed to handle alert acknowledged event');
      throw error;
    }
  }

  /**
   * Handle alert resolved event
   */
  async handleAlertResolved(alertEvent: AlertEvent): Promise<void> {
    this.fastify.log.info({ alertId: alertEvent.alertId }, 'Handling alert resolved event');

    try {
      // Cancel escalation timer if exists
      const escalationTimer = this.escalationTimers.get(alertEvent.alertId);
      if (escalationTimer) {
        clearTimeout(escalationTimer);
        this.escalationTimers.delete(alertEvent.alertId);
      }

      // Get alert details
      const alert = await db.query.alerts.findFirst({
        where: eq(alerts.alertId, alertEvent.alertId),
        with: {
          site: true,
          asset: true,
          resolvedByUser: true,
        },
      });

      if (!alert || !alert.resolvedByUser) {
        return;
      }

      // Get users to notify
      const usersToNotify = await this.getUsersToNotify(alert.tenantId, alert.siteId);

      // Prepare notification data
      const notificationData = {
        asset_name: alert.asset?.name || 'Unknown Asset',
        site_name: alert.site.name,
        alert_id: alertEvent.alertId,
        resolved_by: `${alert.resolvedByUser.firstName} ${alert.resolvedByUser.lastName}`,
        resolved_at: alert.resolvedAt?.toISOString() || new Date().toISOString(),
      };

      // Send notifications
      for (const user of usersToNotify) {
        if (user.id === alert.resolvedBy) continue; // Don't notify the user who resolved

        try {
          await this.notificationService.sendNotification({
            tenantId: alert.tenantId,
            userId: user.id,
            eventType: 'alert_resolved',
            data: notificationData,
          });
        } catch (error) {
          this.fastify.log.error({ error, userId: user.id }, 'Failed to send resolved notification');
        }
      }
    } catch (error) {
      this.fastify.log.error({ error, alertEvent }, 'Failed to handle alert resolved event');
      throw error;
    }
  }

  /**
   * Map alert severity to notification event type
   */
  private mapSeverityToEventType(severity: string): NotificationEventType | null {
    const severityMap: Record<string, NotificationEventType> = {
      critical: 'alert_critical',
      high: 'alert_high',
      medium: 'alert_medium',
    };

    return severityMap[severity] || null;
  }

  /**
   * Get users to notify for a site
   */
  private async getUsersToNotify(tenantId: string, siteId: string) {
    // Get site managers and technicians for the site
    const siteUsers = await db.query.users.findMany({
      where: and(
        eq(users.tenantId, tenantId),
        eq(users.isActive, true)
      ),
      columns: {
        id: true,
        email: true,
        phone: true,
        role: true,
        firstName: true,
        lastName: true,
      },
    });

    // Filter users by role (site_manager, technician, tenant_admin, super_admin)
    const relevantRoles = ['site_manager', 'technician', 'tenant_admin', 'super_admin'];
    return siteUsers.filter((user) => relevantRoles.includes(user.role));
  }

  /**
   * Setup escalation for critical alerts
   */
  private async setupEscalation(
    alertId: string,
    tenantId: string,
    siteId: string,
    notificationData: Record<string, any>
  ): Promise<void> {
    // Check if there's an escalation rule
    const escalationMinutes = 30; // Default: 30 minutes

    this.fastify.log.info(
      { alertId, escalationMinutes },
      'Setting up escalation timer'
    );

    // Set escalation timer
    const timer = setTimeout(async () => {
      try {
        // Check if alert is still active (not acknowledged or resolved)
        const alert = await db.query.alerts.findFirst({
          where: eq(alerts.id, alertId),
        });

        if (!alert || alert.status !== 'active') {
          this.fastify.log.info({ alertId }, 'Alert already handled, skipping escalation');
          return;
        }

        // Get supervisors/admins to escalate to
        const supervisors = await db.query.users.findMany({
          where: and(
            eq(users.tenantId, tenantId),
            eq(users.isActive, true)
          ),
          columns: {
            id: true,
            email: true,
            role: true,
          },
        });

        const adminRoles = ['tenant_admin', 'super_admin'];
        const admins = supervisors.filter((user) => adminRoles.includes(user.role));

        // Send escalation notifications
        for (const admin of admins) {
          try {
            await this.notificationService.sendNotification({
              tenantId,
              userId: admin.id,
              eventType: 'alert_critical',
              data: {
                ...notificationData,
                escalated: true,
                escalation_reason: 'Alert not acknowledged within 30 minutes',
              },
              severity: 'critical',
            });

            this.fastify.log.info(
              { userId: admin.id, alertId },
              'Escalation notification sent'
            );
          } catch (error) {
            this.fastify.log.error({ error, userId: admin.id }, 'Failed to send escalation');
          }
        }

        // Remove timer from map
        this.escalationTimers.delete(alertId);
      } catch (error) {
        this.fastify.log.error({ error, alertId }, 'Escalation failed');
      }
    }, escalationMinutes * 60 * 1000);

    this.escalationTimers.set(alertId, timer);
  }

  /**
   * Process alert events from Kafka
   */
  async processAlertEvent(event: { type: string; payload: AlertEvent }): Promise<void> {
    const { type, payload } = event;

    this.fastify.log.info({ type, alertId: payload.alertId }, 'Processing alert event');

    try {
      switch (type) {
        case 'alert.created':
          await this.handleAlertCreated(payload);
          break;
        case 'alert.acknowledged':
          await this.handleAlertAcknowledged(payload);
          break;
        case 'alert.resolved':
          await this.handleAlertResolved(payload);
          break;
        default:
          this.fastify.log.warn({ type }, 'Unknown alert event type');
      }
    } catch (error) {
      this.fastify.log.error({ error, event }, 'Failed to process alert event');
      throw error;
    }
  }

  /**
   * Cleanup escalation timers on shutdown
   */
  cleanup(): void {
    this.fastify.log.info('Cleaning up escalation timers');
    for (const [alertId, timer] of this.escalationTimers.entries()) {
      clearTimeout(timer);
      this.fastify.log.info({ alertId }, 'Cleared escalation timer');
    }
    this.escalationTimers.clear();
  }
}

export function createAlertNotificationHandler(fastify: FastifyInstance): AlertNotificationHandler {
  return new AlertNotificationHandler(fastify);
}
