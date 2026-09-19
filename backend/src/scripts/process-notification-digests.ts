#!/usr/bin/env node
/**
 * Process Notification Digests (DCMMS-073)
 *
 * Scheduled job to send batched notification digests
 *
 * Schedule with cron:
 *   # Every hour
 *   0 * * * * cd /path/to/backend && node dist/scripts/process-notification-digests.js
 *
 *   # Every 15 minutes (more responsive)
 *   0,15,30,45 * * * * cd /path/to/backend && node dist/scripts/process-notification-digests.js
 */

import { Pool } from "pg";
import NotificationBatchService from "../services/notification-batch.service";
import { envOrDefault, requireSecret } from "../config/env";

// Database configuration
const pool = new Pool({
  host: envOrDefault("DATABASE_HOST", "localhost"),
  port: parseInt(envOrDefault("DATABASE_PORT", "5432"), 10),
  user: envOrDefault("DATABASE_USER", "postgres"),
  password: requireSecret("DATABASE_PASSWORD"),
  database: envOrDefault("DATABASE_NAME", "dcmms"),
});

async function main() {
  console.log("=".repeat(60));
  console.log("Notification Digest Processor");
  console.log("=".repeat(60));
  console.log(`Started at: ${new Date().toISOString()}`);

  const batchService = new NotificationBatchService(pool);

  try {
    const sentCount = await batchService.processScheduledDigests();

    console.log("=".repeat(60));
    console.log(`✓ Processing complete: ${sentCount} digests sent`);
    console.log("=".repeat(60));

    process.exit(0);
  } catch (error) {
    console.error("✗ Error processing digests:", error);
    process.exit(1);
  }
}

main();
