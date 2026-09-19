import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import cookie from "@fastify/cookie";

import { envOrDefault } from "../config/env";

/**
 * The refresh token lives in an HttpOnly cookie, never in a response body.
 *
 * Both tokens used to be returned in the login response and stored in
 * `localStorage` by the frontend, so any XSS handed an attacker the 7-day
 * refresh token — a durable credential, not just a 15-minute session
 * (REV-017). JavaScript cannot read an HttpOnly cookie, so an injected script
 * can no longer exfiltrate it.
 *
 * This also changes the threat model: the browser now attaches the refresh
 * credential automatically, which is precisely the condition that makes CSRF
 * applicable. `SameSite=Strict` is the primary defence, and the existing CSRF
 * subsystem becomes meaningful rather than redundant (REV-018, ADR-005).
 */

export const REFRESH_COOKIE_NAME = "dcmms_refresh_token";

/** Only the refresh endpoint and logout ever need this cookie sent. */
const REFRESH_COOKIE_PATH = "/api/v1/auth";

export async function registerRefreshCookie(server: FastifyInstance) {
  await server.register(cookie);
}

function isSecureContext(): boolean {
  // Secure cookies are not sent over plain HTTP, which would break local dev.
  return envOrDefault("NODE_ENV", "development") === "production";
}

export function setRefreshCookie(reply: FastifyReply, token: string): void {
  reply.setCookie(REFRESH_COOKIE_NAME, token, {
    httpOnly: true,
    secure: isSecureContext(),
    sameSite: "strict",
    path: REFRESH_COOKIE_PATH,
    // Matches JWT_REFRESH_TOKEN_EXPIRY; the server-side record is what
    // actually decides validity, this only stops the browser holding it longer.
    maxAge: 7 * 24 * 60 * 60,
  });
}

export function clearRefreshCookie(reply: FastifyReply): void {
  reply.clearCookie(REFRESH_COOKIE_NAME, { path: REFRESH_COOKIE_PATH });
}

export function readRefreshCookie(request: FastifyRequest): string | undefined {
  return request.cookies?.[REFRESH_COOKIE_NAME];
}
