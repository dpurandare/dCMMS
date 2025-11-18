import { FastifyInstance } from 'fastify';
import { db } from '../db';
import { auditLogs } from '../db/schema';
import { eq, and, gte, lte, desc } from 'drizzle-orm';

export interface AuditLogEntry {
  tenantId: string;
  userId: string;
  action: string;
  entityType: string;
  entityId: string;
  changes?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
}

export interface AuditLogFilter {
  userId?: string;
  action?: string;
  entityType?: string;
  entityId?: string;
  startDate?: Date;
  endDate?: Date;
}

/**
 * Audit Log Service
 * Tamper-proof, append-only audit trail for compliance
 * Retention: 7 years (compliance requirement)
 */
export class AuditLogService {
  private fastify: FastifyInstance;

  constructor(fastify: FastifyInstance) {
    this.fastify = fastify;
  }

  /**
   * Log an audit entry (append-only)
   */
  async log(entry: AuditLogEntry): Promise<void> {
    try {
      await db.insert(auditLogs).values({
        tenantId: entry.tenantId,
        userId: entry.userId,
        action: entry.action,
        entityType: entry.entityType,
        entityId: entry.entityId,
        changes: entry.changes ? JSON.stringify(entry.changes) : null,
        ipAddress: entry.ipAddress || null,
        userAgent: entry.userAgent || null,
      });

      this.fastify.log.info(
        {
          action: entry.action,
          entityType: entry.entityType,
          entityId: entry.entityId,
        },
        'Audit log entry created'
      );
    } catch (error) {
      this.fastify.log.error({ error, entry }, 'Failed to create audit log entry');
      // Don't throw - audit logging should not break the main flow
    }
  }

  /**
   * Convenience methods for common compliance actions
   */

  async logReportGenerated(
    tenantId: string,
    userId: string,
    reportId: string,
    templateId: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<void> {
    await this.log({
      tenantId,
      userId,
      action: 'report_generated',
      entityType: 'compliance_report',
      entityId: reportId,
      changes: { templateId },
      ipAddress,
      userAgent,
    });
  }

  async logReportDownloaded(
    tenantId: string,
    userId: string,
    reportId: string,
    format: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<void> {
    await this.log({
      tenantId,
      userId,
      action: 'report_downloaded',
      entityType: 'compliance_report',
      entityId: reportId,
      changes: { format },
      ipAddress,
      userAgent,
    });
  }

  async logReportStatusChanged(
    tenantId: string,
    userId: string,
    reportId: string,
    oldStatus: string,
    newStatus: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<void> {
    await this.log({
      tenantId,
      userId,
      action: 'report_status_changed',
      entityType: 'compliance_report',
      entityId: reportId,
      changes: { oldStatus, newStatus },
      ipAddress,
      userAgent,
    });
  }

  async logReportDeleted(
    tenantId: string,
    userId: string,
    reportId: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<void> {
    await this.log({
      tenantId,
      userId,
      action: 'report_deleted',
      entityType: 'compliance_report',
      entityId: reportId,
      ipAddress,
      userAgent,
    });
  }

  async logTemplateModified(
    tenantId: string,
    userId: string,
    templateId: string,
    changes: Record<string, any>,
    ipAddress?: string,
    userAgent?: string
  ): Promise<void> {
    await this.log({
      tenantId,
      userId,
      action: 'template_modified',
      entityType: 'compliance_template',
      entityId: templateId,
      changes,
      ipAddress,
      userAgent,
    });
  }

  async logTemplateCreated(
    tenantId: string,
    userId: string,
    templateId: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<void> {
    await this.log({
      tenantId,
      userId,
      action: 'template_created',
      entityType: 'compliance_template',
      entityId: templateId,
      ipAddress,
      userAgent,
    });
  }

  async logTemplateDeleted(
    tenantId: string,
    userId: string,
    templateId: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<void> {
    await this.log({
      tenantId,
      userId,
      action: 'template_deleted',
      entityType: 'compliance_template',
      entityId: templateId,
      ipAddress,
      userAgent,
    });
  }

  /**
   * Query audit logs (admin-only)
   */
  async query(
    tenantId: string,
    filters?: AuditLogFilter,
    limit: number = 1000,
    offset: number = 0
  ): Promise<any[]> {
    try {
      const whereConditions = [eq(auditLogs.tenantId, tenantId)];

      if (filters?.userId) {
        whereConditions.push(eq(auditLogs.userId, filters.userId));
      }

      if (filters?.action) {
        whereConditions.push(eq(auditLogs.action, filters.action));
      }

      if (filters?.entityType) {
        whereConditions.push(eq(auditLogs.entityType, filters.entityType));
      }

      if (filters?.entityId) {
        whereConditions.push(eq(auditLogs.entityId, filters.entityId));
      }

      if (filters?.startDate) {
        whereConditions.push(gte(auditLogs.timestamp, filters.startDate));
      }

      if (filters?.endDate) {
        whereConditions.push(lte(auditLogs.timestamp, filters.endDate));
      }

      const logs = await db.query.auditLogs.findMany({
        where: and(...whereConditions),
        orderBy: [desc(auditLogs.timestamp)],
        limit,
        offset,
      });

      return logs.map((log) => ({
        id: log.id,
        userId: log.userId,
        action: log.action,
        entityType: log.entityType,
        entityId: log.entityId,
        changes: log.changes ? JSON.parse(log.changes) : null,
        ipAddress: log.ipAddress,
        userAgent: log.userAgent,
        timestamp: log.timestamp,
      }));
    } catch (error) {
      this.fastify.log.error({ error, tenantId, filters }, 'Failed to query audit logs');
      throw error;
    }
  }

  /**
   * Export audit logs to CSV (for external audits)
   */
  async exportToCSV(
    tenantId: string,
    filters?: AuditLogFilter
  ): Promise<string> {
    try {
      const logs = await this.query(tenantId, filters, 100000); // Max 100k rows

      const lines: string[] = [];

      // Header
      lines.push('"Timestamp","User ID","Action","Entity Type","Entity ID","Changes","IP Address","User Agent"');

      // Data rows
      for (const log of logs) {
        const changes = log.changes ? JSON.stringify(log.changes).replace(/"/g, '""') : '';
        const userAgent = log.userAgent ? log.userAgent.replace(/"/g, '""') : '';

        lines.push(
          `"${log.timestamp}","${log.userId}","${log.action}","${log.entityType}","${log.entityId}","${changes}","${log.ipAddress || ''}","${userAgent}"`
        );
      }

      return lines.join('\n');
    } catch (error) {
      this.fastify.log.error({ error, tenantId, filters }, 'Failed to export audit logs');
      throw error;
    }
  }

  /**
   * Get audit log statistics
   */
  async getStatistics(
    tenantId: string,
    filters?: AuditLogFilter
  ): Promise<{
    totalLogs: number;
    actionCounts: Record<string, number>;
    entityTypeCounts: Record<string, number>;
  }> {
    try {
      const logs = await this.query(tenantId, filters, 100000);

      const actionCounts: Record<string, number> = {};
      const entityTypeCounts: Record<string, number> = {};

      for (const log of logs) {
        actionCounts[log.action] = (actionCounts[log.action] || 0) + 1;
        entityTypeCounts[log.entityType] = (entityTypeCounts[log.entityType] || 0) + 1;
      }

      return {
        totalLogs: logs.length,
        actionCounts,
        entityTypeCounts,
      };
    } catch (error) {
      this.fastify.log.error({ error, tenantId, filters }, 'Failed to get audit log statistics');
      throw error;
    }
  }
}

export function createAuditLogService(fastify: FastifyInstance): AuditLogService {
  return new AuditLogService(fastify);
}
