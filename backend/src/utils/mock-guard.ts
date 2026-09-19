/**
 * Guards `*.mock.ts` services from ever running in production.
 * Part of the mock policy (REV-027): a mock implementation must refuse to
 * load outside development/test, so it cannot silently ship fabricated data.
 */
export function assertMockAllowed(serviceName: string): void {
  if (process.env.NODE_ENV === "production") {
    throw new Error(
      `${serviceName} is a mock implementation and must not run in production`,
    );
  }
}
