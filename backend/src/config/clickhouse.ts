import { createClient, ClickHouseClient } from "@clickhouse/client";
import { envOrDefault, requireSecret } from "./env";

/**
 * Single construction point for ClickHouse clients.
 *
 * Six call sites (four services, the report builder and the analytics-admin
 * route) each built their own client with an identical hardcoded password
 * fallback — see REV-002. Routing them all through here means the credential
 * is resolved one way, and a missing one fails loudly instead of silently
 * authenticating with the dev password.
 */
export function createClickhouseClient(): ClickHouseClient {
  return createClient({
    host: envOrDefault("CLICKHOUSE_HOST", "http://localhost:8123"),
    username: envOrDefault("CLICKHOUSE_USER", "clickhouse_user"),
    password: requireSecret("CLICKHOUSE_PASSWORD"),
    database: envOrDefault("CLICKHOUSE_DATABASE", "dcmms_analytics"),
  });
}
