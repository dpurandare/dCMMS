import { envOrDefault, optionalSecret } from "./env";

/**
 * One description of where Redis is and how to authenticate to it.
 *
 * `plugins/redis.ts` read REDIS_HOST/REDIS_PORT/REDIS_PASSWORD while
 * `services/queue.service.ts` read `REDIS_URL || "redis://localhost:6379"`,
 * ignoring the password entirely. Against the docker-compose Redis, which runs
 * with `--requirepass`, the queue connection therefore failed on every boot
 * with `NOAUTH Authentication required` — visible in the backend log as an
 * endless retry loop, and the reason the server-backed test suites could not
 * even import the app (REV-020).
 */
export interface RedisConnectionOptions {
  host: string;
  port: number;
  password?: string;
}

export function redisConnectionOptions(): RedisConnectionOptions {
  return {
    host: envOrDefault("REDIS_HOST", "localhost"),
    port: parseInt(envOrDefault("REDIS_PORT", "6379"), 10),
    password: optionalSecret("REDIS_PASSWORD") || undefined,
  };
}
