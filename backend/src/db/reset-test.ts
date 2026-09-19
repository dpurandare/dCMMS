import { config } from "dotenv";
config();

import { sql } from "drizzle-orm";
import { db, pool } from "./index";

/**
 * Drops and recreates the public schema of the TEST database.
 *
 * This script used to be run by `npm run db:reset:test` with no DATABASE_URL
 * override, unlike its sibling `db:migrate:test`. `src/db/index.ts` loads
 * `.env`, so it connected to the *development* database and dropped its schema.
 * Jest's globalTeardown calls it after every run, so finishing the test suite
 * destroyed the developer's database — observed on 2026-09-19, dcmms went from
 * 37 tables to 0 (REV-022).
 *
 * The npm script now passes TEST_DATABASE_URL. The guard below is the part that
 * matters: a forgotten environment variable must not be able to drop a schema
 * again.
 */

/** A database this script is willing to destroy. */
function isTestDatabase(connectionString: string): boolean {
  try {
    const name = new URL(connectionString).pathname.replace(/^\//, "");
    return /(^|[_-])test($|[_-])|_test$/.test(name);
  } catch {
    return false;
  }
}

async function resetTestDatabase() {
  const url = process.env.DATABASE_URL;

  if (!url) {
    console.error("❌ DATABASE_URL is not set. Refusing to drop anything.");
    process.exit(1);
  }

  if (process.env.NODE_ENV === "production") {
    console.error("❌ NODE_ENV=production. Refusing to drop a schema.");
    process.exit(1);
  }

  if (!isTestDatabase(url)) {
    const name = (() => {
      try {
        return new URL(url).pathname.replace(/^\//, "");
      } catch {
        return "(unparseable)";
      }
    })();
    console.error(
      `❌ Refusing to reset "${name}": it is not a test database.\n` +
        "   This script drops the public schema. It will only do that to a\n" +
        "   database whose name contains 'test' — set TEST_DATABASE_URL and\n" +
        "   run it through `npm run db:reset:test`.",
    );
    process.exit(1);
  }

  console.log(`⏳ Resetting test database: ${new URL(url).pathname.slice(1)}`);

  try {
    await db.execute(sql`DROP SCHEMA IF EXISTS drizzle CASCADE`);
    await db.execute(sql`DROP SCHEMA public CASCADE`);
    await db.execute(sql`CREATE SCHEMA public`);
    await db.execute(sql`GRANT ALL ON SCHEMA public TO public`);

    console.log("✅ Test database reset successfully!");
  } catch (error) {
    console.error("❌ Reset failed:", error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

resetTestDatabase();
