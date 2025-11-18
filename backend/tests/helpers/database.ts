/**
 * Database test helpers
 */

import { Client } from 'pg';

export class DatabaseHelper {
  private client: Client | null = null;

  /**
   * Connect to test database
   */
  async connect(): Promise<void> {
    this.client = new Client({
      connectionString: process.env.TEST_DATABASE_URL,
    });
    await this.client.connect();
  }

  /**
   * Disconnect from database
   */
  async disconnect(): Promise<void> {
    if (this.client) {
      await this.client.end();
      this.client = null;
    }
  }

  /**
   * Clean all tables (except migrations)
   */
  async cleanAll(): Promise<void> {
    if (!this.client) {
      throw new Error('Database not connected');
    }

    const tables = [
      'audit_logs',
      'work_order_parts',
      'work_order_tasks',
      'work_orders',
      'alerts',
      'parts',
      'assets',
      'sites',
      'users',
      'tenants',
    ];

    for (const table of tables) {
      await this.client.query(`TRUNCATE TABLE ${table} CASCADE`);
    }
  }

  /**
   * Execute raw SQL query
   */
  async query(sql: string, params?: any[]): Promise<any> {
    if (!this.client) {
      throw new Error('Database not connected');
    }
    return this.client.query(sql, params);
  }

  /**
   * Insert a record
   */
  async insert(table: string, data: Record<string, any>): Promise<any> {
    const keys = Object.keys(data);
    const values = Object.values(data);
    const placeholders = keys.map((_, i) => `$${i + 1}`).join(', ');

    const sql = `
      INSERT INTO ${table} (${keys.join(', ')})
      VALUES (${placeholders})
      RETURNING *
    `;

    const result = await this.query(sql, values);
    return result.rows[0];
  }

  /**
   * Find records
   */
  async find(table: string, where: Record<string, any> = {}): Promise<any[]> {
    const whereKeys = Object.keys(where);
    const whereValues = Object.values(where);

    let sql = `SELECT * FROM ${table}`;

    if (whereKeys.length > 0) {
      const whereClause = whereKeys.map((key, i) => `${key} = $${i + 1}`).join(' AND ');
      sql += ` WHERE ${whereClause}`;
    }

    const result = await this.query(sql, whereValues);
    return result.rows;
  }

  /**
   * Count records
   */
  async count(table: string, where: Record<string, any> = {}): Promise<number> {
    const whereKeys = Object.keys(where);
    const whereValues = Object.values(where);

    let sql = `SELECT COUNT(*) as count FROM ${table}`;

    if (whereKeys.length > 0) {
      const whereClause = whereKeys.map((key, i) => `${key} = $${i + 1}`).join(' AND ');
      sql += ` WHERE ${whereClause}`;
    }

    const result = await this.query(sql, whereValues);
    return parseInt(result.rows[0].count, 10);
  }

  /**
   * Seed default tenant for tests
   */
  async seedDefaultTenant(): Promise<any> {
    return this.insert('tenants', {
      tenant_id: 'test-tenant',
      name: 'Test Tenant',
      domain: 'test.local',
      is_active: true,
      config: '{}',
    });
  }
}

// Export singleton instance for convenience
export const db = new DatabaseHelper();
