/**
 * Loads environment variables and validates required secrets.
 *
 * This must be the FIRST import in the entry point. ES module imports are
 * evaluated top to bottom, and several modules in the import graph do work at
 * import time (the Kafka client, for one). Calling dotenv and validating
 * inside the entry point body — as the code did before REV-001 — meant those
 * side effects ran *before* `.env` had been read and before any secret had
 * been checked.
 */
import { config } from "dotenv";
import { ConfigError, validateEnvironment } from "./env";

config();

try {
  validateEnvironment();
} catch (err) {
  if (err instanceof ConfigError) {
    console.error(`\n${err.message}\n`);
    process.exit(1);
  }
  throw err;
}
