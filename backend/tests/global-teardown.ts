/**
 * Global teardown for Jest
 * Runs once after all tests
 */

import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export default async () => {
  console.log('\n🧹 Cleaning up test environment...\n');

  // Clean up test database
  try {
    if (process.env.KEEP_TEST_DB !== 'true') {
      console.log('🗄️  Cleaning test database...');
      await execAsync('npm run db:reset:test');
      console.log('✅ Test database cleaned\n');
    } else {
      console.log('ℹ️  Keeping test database (KEEP_TEST_DB=true)\n');
    }
  } catch (error: any) {
    console.error('⚠️  Failed to clean database:', error.message);
  }

  console.log('✅ Teardown complete\n');
};
