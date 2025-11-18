import { sql } from 'drizzle-orm';
import { db, pool } from './index';

async function resetTestDatabase() {
  console.log('⏳ Resetting test database...');

  try {
    // Drop all tables
    await db.execute(sql`DROP SCHEMA public CASCADE`);
    await db.execute(sql`CREATE SCHEMA public`);
    await db.execute(sql`GRANT ALL ON SCHEMA public TO public`);

    console.log('✅ Test database reset successfully!');
  } catch (error) {
    console.error('❌ Reset failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

resetTestDatabase();
