import { FastifyInstance } from "fastify";
import type Redis from "ioredis";

/**
 * Per-account failed-login throttling (REV-022).
 *
 * The only limit on login was the global 100 requests/minute in server.ts.
 * That caps total traffic; it does nothing against credential stuffing, where
 * an attacker spreads a few attempts across thousands of accounts and stays
 * far below any global ceiling. The withdrawn audit recorded
 * "Brute Force ✅ PASS — Rate limiting enabled" on the strength of it.
 *
 * Counting is per account, so one attacker cannot lock out an unrelated user,
 * and the backoff grows with the failure count rather than banning outright.
 */

/** Failures allowed before any delay is imposed. */
const FREE_ATTEMPTS = 5;
/** Failures after which the account is locked for LOCKOUT_SECONDS. */
const LOCKOUT_THRESHOLD = 10;
const LOCKOUT_SECONDS = 15 * 60;
/** Counter lifetime — a slow drip of attempts should not accumulate forever. */
const WINDOW_SECONDS = 15 * 60;

export interface ThrottleDecision {
  allowed: boolean;
  /** Seconds the caller must wait. Meaningful only when `allowed` is false. */
  retryAfterSeconds: number;
  failureCount: number;
}

function key(email: string): string {
  // Normalise so Alice@x.com and alice@x.com share a counter.
  return `login:failures:${email.trim().toLowerCase()}`;
}

/**
 * Backoff for a given failure count: nothing for the first few, then doubling
 * from 1 second, then a flat lockout once the threshold is crossed.
 */
export function backoffSeconds(failureCount: number): number {
  if (failureCount < FREE_ATTEMPTS) return 0;
  if (failureCount >= LOCKOUT_THRESHOLD) return LOCKOUT_SECONDS;
  return Math.min(2 ** (failureCount - FREE_ATTEMPTS), 60);
}

function redisOf(server: FastifyInstance): Redis | undefined {
  return (server as unknown as { redis?: Redis }).redis;
}

/** Called before verifying a password. */
export async function checkLoginAllowed(
  server: FastifyInstance,
  email: string,
): Promise<ThrottleDecision> {
  const redis = redisOf(server);
  // Redis is the store, not the gate: if it is unavailable, logins continue
  // unthrottled rather than the product becoming unusable. The tradeoff is
  // deliberate and worth revisiting if Redis becomes a hard dependency.
  if (!redis) return { allowed: true, retryAfterSeconds: 0, failureCount: 0 };

  const raw = await redis.get(key(email));
  const failureCount = raw ? parseInt(raw, 10) : 0;
  const wait = backoffSeconds(failureCount);
  if (wait === 0) return { allowed: true, retryAfterSeconds: 0, failureCount };

  // A rejected attempt counts too. Counting only attempts that reach the
  // password check meant the count froze at the first threshold, the backoff
  // never escalated past 1 second, and the lockout threshold was unreachable —
  // an attacker could simply pause a second between tries. Verified against a
  // running server before the fix: attempts 6-12 all returned Retry-After: 1.
  const escalated = await redis.incr(key(email));
  await redis.expire(key(email), WINDOW_SECONDS);
  if (escalated === LOCKOUT_THRESHOLD) {
    server.log.warn(
      { email, failureCount: escalated, lockoutSeconds: LOCKOUT_SECONDS },
      "Account locked after repeated failed logins",
    );
  }

  return {
    allowed: false,
    retryAfterSeconds: backoffSeconds(escalated),
    failureCount: escalated,
  };
}

/** Called after a password check fails. */
export async function recordLoginFailure(
  server: FastifyInstance,
  email: string,
): Promise<number> {
  const redis = redisOf(server);
  if (!redis) return 0;

  const failureCount = await redis.incr(key(email));
  // Refresh the window on each failure so a sustained attack stays counted.
  await redis.expire(key(email), WINDOW_SECONDS);

  if (failureCount === LOCKOUT_THRESHOLD) {
    server.log.warn(
      { email, failureCount, lockoutSeconds: LOCKOUT_SECONDS },
      "Account locked after repeated failed logins",
    );
  }
  return failureCount;
}

/** Called after a successful password check. */
export async function clearLoginFailures(
  server: FastifyInstance,
  email: string,
): Promise<void> {
  await redisOf(server)?.del(key(email));
}

export const throttleSettings = {
  FREE_ATTEMPTS,
  LOCKOUT_THRESHOLD,
  LOCKOUT_SECONDS,
  WINDOW_SECONDS,
};
