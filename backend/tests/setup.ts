/**
 * Jest setup file
 * Runs before each test file
 */

// import 'reflect-metadata'; // Required for TypeORM decorators

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = process.env.TEST_DATABASE_URL || 'postgresql://test_user:test_password@localhost:5432/dcmms_test';
process.env.REDIS_HOST = process.env.REDIS_HOST = 'localhost';
process.env.REDIS_PORT = '6379';
process.env.REDIS_PASSWORD = 'redis_password_dev'; process.env.TEST_REDIS_PORT || '6379';
process.env.JWT_SECRET = 'test-jwt-secret-key-for-testing-only';
process.env.LOG_LEVEL = 'error'; // Suppress logs during tests

// Extend Jest matchers
expect.extend({
  toBeValidUUID(received: string) {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const pass = uuidRegex.test(received);

    return {
      pass,
      message: () => pass
        ? `expected ${received} not to be a valid UUID`
        : `expected ${received} to be a valid UUID`,
    };
  },

  toBeISO8601DateString(received: string) {
    const iso8601Regex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z?$/;
    const pass = iso8601Regex.test(received);

    return {
      pass,
      message: () => pass
        ? `expected ${received} not to be an ISO 8601 date string`
        : `expected ${received} to be an ISO 8601 date string`,
    };
  },

  toHaveStatus(received: any, expected: number) {
    const actualStatus = received.statusCode || received.status;
    const pass = actualStatus === expected;

    return {
      pass,
      message: () => pass
        ? `expected status not to be ${expected}`
        : `expected status ${actualStatus} to be ${expected}`,
    };
  },
});

// Declare custom matchers for TypeScript
// Declare custom matchers for TypeScript
declare global {
  namespace jest {
    interface Matchers<R> {
      toBeValidUUID(): R;
      toBeISO8601DateString(): R;
      toHaveStatus(expected: number): R;
    }
  }
}

export { };

// Mock external services by default
// jest.mock('@sendgrid/mail');
// jest.mock('twilio');
// jest.mock('aws-sdk');

// Global test utilities
(global as any).sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Suppress console during tests (can be overridden per test)
(global as any).console = {
  ...console,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  // Keep error for debugging
  error: console.error,
};
