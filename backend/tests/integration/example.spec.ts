/**
 * Example integration test
 *
 * Integration tests verify that different components work together correctly
 * (e.g., API endpoints with database)
 */

import { TestServer } from '../helpers/test-server';
import { db } from '../helpers/database';
import { UserFactory } from '../factories/user.factory';

describe('Example Integration Test Suite', () => {
  let server: TestServer;

  beforeAll(async () => {
    // Connect to database
    await db.connect();

    // Start test server
    server = new TestServer();
    await server.start();
  });

  afterAll(async () => {
    // Stop server and disconnect
    await server.stop();
    await db.disconnect();
  });

  beforeEach(async () => {
    // Clean database before each test
    await db.cleanAll();
    await db.seedDefaultTenant();
    UserFactory.reset();
  });

  describe('Health Check Endpoint', () => {
    it('GET /health should return 200 OK', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/health',
      });

      expect(response).toHaveStatus(200);

      const body = JSON.parse(response.body);
      expect(body).toHaveProperty('status', 'ok');
      expect(body).toHaveProperty('timestamp');
    });
  });

  describe('Database Interactions', () => {
    it('should insert and retrieve a user', async () => {
      // Create test user
      const user = await UserFactory.build({
        email: 'test@example.com',
      });

      // Insert into database
      await db.insert('users', user);

      // Retrieve from database
      const users = await db.find('users', { email: 'test@example.com' });

      expect(users).toHaveLength(1);
      expect(users[0]).toMatchObject({
        email: 'test@example.com',
        role: 'viewer',
        isActive: true,
      });
    });

    it('should count users correctly', async () => {
      // Create multiple users
      const users = await UserFactory.buildList(5);

      for (const user of users) {
        await db.insert('users', user);
      }

      const count = await db.count('users');
      expect(count).toBe(5);
    });
  });
});
