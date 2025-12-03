/**
 * Test server helper for integration tests
 */

import { FastifyInstance } from 'fastify';
import { buildServer } from '../../src/server';

export class TestServer {
  private app: FastifyInstance | null = null;
  private baseURL = '';

  /**
   * Start test server
   */
  async start(): Promise<FastifyInstance> {
    this.app = await buildServer();

    // Register plugins (will be implemented in Sprint 1)
    // await this.app.register(routes);
    // await this.app.register(authPlugin);

    await this.app.listen({ port: 0, host: '127.0.0.1' });

    const address = this.app.server.address();
    if (address && typeof address === 'object') {
      this.baseURL = `http://127.0.0.1:${address.port}`;
    }

    return this.app;
  }

  /**
   * Stop test server
   */
  async stop(): Promise<void> {
    if (this.app) {
      await this.app.close();
      this.app = null;
    }
  }

  /**
   * Get app instance
   */
  getApp(): FastifyInstance {
    if (!this.app) {
      throw new Error('Server not started. Call start() first.');
    }
    return this.app;
  }

  /**
   * Get base URL
   */
  getBaseURL(): string {
    return this.baseURL;
  }

  /**
   * Inject request (for testing without HTTP)
   */
  async inject(options: any) {
    if (!this.app) {
      throw new Error('Server not started. Call start() first.');
    }
    return this.app.inject(options);
  }
}
