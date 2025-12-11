/**
 * Global setup for Jest
 * Runs once before all tests
 */

import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export default async () => {
  console.log('\n🔧 Setting up test environment...\n');

  // Set global test environment variables
  process.env.NODE_ENV = 'test';
  if (!process.env.TEST_DATABASE_URL) {
    process.env.TEST_DATABASE_URL = 'postgresql://dcmms_user:dcmms_password_dev@localhost:5434/dcmms_test';
  }

  // Wait for test database to be ready (if using Docker)
  if (process.env.CI !== 'true') {
    console.log('⏳ Waiting for test database...');
    await waitForDatabase();
  }

  // Run database migrations
  try {
    console.log('🗄️  Running database migrations...');
    await execAsync('npm run db:migrate:test');
    console.log('✅ Database migrations complete\n');
  } catch (error: any) {
    console.error('❌ Failed to run migrations:', error.message);
    throw error;
  }

  console.log('✅ Test environment ready\n');
};

/**
 * Wait for database to be ready
 */
async function waitForDatabase(maxAttempts = 30): Promise<void> {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const { Client } = require('pg');
      const client = new Client({
        connectionString: process.env.TEST_DATABASE_URL || 'postgresql://dcmms_user:dcmms_password_dev@localhost:5434/dcmms_test',
      });

      await client.connect();
      await client.query('SELECT 1');
      await client.end();

      console.log('✅ Database is ready');
      return;
    } catch (error) {
      if (attempt === maxAttempts) {
        throw new Error('Database not ready after maximum attempts');
      }
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
}
