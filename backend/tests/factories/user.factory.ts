/**
 * User factory for generating test data
 */

import { v4 as uuidv4 } from 'uuid';
import { hash } from 'bcrypt';

export interface UserFactoryOptions {
  id?: string;
  tenantId?: string;
  email?: string;
  username?: string;
  firstName?: string;
  lastName?: string;
  role?: 'super_admin' | 'tenant_admin' | 'site_manager' | 'technician' | 'operator' | 'viewer';
  isActive?: boolean;
  password?: string;
}

export class UserFactory {
  private static counter = 0;

  /**
   * Create a user with default or custom values
   */
  static async build(options: UserFactoryOptions = {}): Promise<any> {
    this.counter++;

    const defaultPassword = 'Test1234!';
    const passwordHash = await hash(options.password || defaultPassword, 10);

    return {
      id: options.id || uuidv4(),
      tenantId: options.tenantId || uuidv4(),
      email: options.email || `user${this.counter}@test.com`,
      username: options.username || `user${this.counter}`,
      firstName: options.firstName || `First${this.counter}`,
      lastName: options.lastName || `Last${this.counter}`,
      role: options.role || 'viewer',
      isActive: options.isActive !== undefined ? options.isActive : true,
      passwordHash,
      idpUserId: null,
      metadata: {},
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }

  /**
   * Create multiple users
   */
  static async buildList(count: number, options: UserFactoryOptions = {}): Promise<any[]> {
    const users = [];
    for (let i = 0; i < count; i++) {
      users.push(await this.build(options));
    }
    return users;
  }

  /**
   * Create an admin user
   */
  static async buildAdmin(options: UserFactoryOptions = {}): Promise<any> {
    return this.build({
      ...options,
      role: 'super_admin',
      email: options.email || 'admin@test.com',
      username: options.username || 'admin',
    });
  }

  /**
   * Create a technician user
   */
  static async buildTechnician(options: UserFactoryOptions = {}): Promise<any> {
    return this.build({
      ...options,
      role: 'technician',
      email: options.email || `technician${this.counter}@test.com`,
      username: options.username || `technician${this.counter}`,
    });
  }

  /**
   * Reset counter (for test isolation)
   */
  static reset(): void {
    this.counter = 0;
  }
}
