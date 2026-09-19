/**
 * Environment configuration and boot-time validation.
 *
 * Background (review-plan.md §3, REV-001/REV-002): the backend was full of
 * credential-shaped `process.env.X || "<literal>"` fallbacks. A secret that was
 * unset or mistyped did not stop the server — it booted normally and signed
 * tokens (or authenticated to ClickHouse) with a value committed to this
 * repository.
 *
 * Nothing in this module falls back. Secrets are read through `requireSecret`,
 * which throws, and `validateEnvironment()` runs once at boot so a missing
 * secret is a startup failure with a clear message rather than a silent
 * downgrade discovered at first use.
 */

export class ConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ConfigError";
  }
}

/**
 * Values committed to this repository, its `.env.example` files or its docs.
 * Anything still carrying one of these is a placeholder nobody replaced, so
 * treat it as unset in every environment.
 */
const KNOWN_PLACEHOLDERS = new Set([
  "changeme-secret-key",
  "changeme-use-a-long-random-string-at-least-64-characters-long!",
  "changeme-use-a-32-byte-key-for-aes-256!",
  "changeme-use-a-long-random-string!",
  "changeme",
  "your-secret-key-here",
]);

/**
 * Real credentials for the local Docker stack (docker-compose.yml). They are
 * correct in development and a breach in production, so they are rejected only
 * when NODE_ENV says this is production. Matched as substrings, because some
 * of them arrive embedded in a connection URL rather than on their own.
 */
const DEV_ONLY_CREDENTIALS = [
  "clickhouse_password_dev",
  "redis_password_dev",
  "dcmms_password_dev",
  "test_password",
  "ChangeMeNow!2024",
];

const MIN_JWT_SECRET_LENGTH = 64;

interface SecretRule {
  name: string;
  /** Minimum acceptable length. 1 means "must be present and non-empty". */
  minLength: number;
  /** What breaks, and how, when this is missing. Shown in the boot error. */
  usedFor: string;
  /** Some secrets only apply once the subsystem that reads them is configured. */
  isRequired: (env: NodeJS.ProcessEnv) => boolean;
}

const always = () => true;
const inProduction = (env: NodeJS.ProcessEnv) => env.NODE_ENV === "production";

const SECRET_RULES: SecretRule[] = [
  {
    name: "JWT_SECRET",
    minLength: MIN_JWT_SECRET_LENGTH,
    usedFor: "signing access and refresh tokens",
    isRequired: always,
  },
  {
    name: "DATABASE_URL",
    minLength: 1,
    usedFor: "the primary PostgreSQL connection",
    isRequired: always,
  },
  {
    name: "CLICKHOUSE_PASSWORD",
    minLength: 1,
    usedFor: "the analytics database (KPIs, ETL, reports, health scoring)",
    isRequired: always,
  },
  {
    name: "QUESTDB_PASSWORD",
    minLength: 1,
    usedFor: "the telemetry time-series store",
    isRequired: always,
  },
  {
    name: "REDIS_PASSWORD",
    minLength: 1,
    usedFor: "the cache and job queue",
    // Local Redis is often started without auth; production must not be.
    isRequired: inProduction,
  },
];

function describeProblem(
  rule: SecretRule,
  value: string | undefined,
  env: NodeJS.ProcessEnv,
): string | null {
  if (value === undefined || value.trim() === "") {
    return `${rule.name} is not set — required for ${rule.usedFor}.`;
  }
  if (KNOWN_PLACEHOLDERS.has(value)) {
    return `${rule.name} is still set to a placeholder from .env.example — replace it with a real secret.`;
  }
  const devCredential = inProduction(env)
    ? DEV_ONLY_CREDENTIALS.find((candidate) => value.includes(candidate))
    : undefined;
  if (devCredential !== undefined) {
    return `${rule.name} contains the local development credential "${devCredential}", which must never be used with NODE_ENV=production.`;
  }
  if (value.length < rule.minLength) {
    return `${rule.name} is ${value.length} characters — at least ${rule.minLength} are required for ${rule.usedFor}.`;
  }
  return null;
}

/**
 * Validate every required secret at once and fail with the complete list.
 *
 * Reporting one missing variable per restart turns a misconfigured deployment
 * into a guessing game, so this collects all problems before throwing.
 */
export function validateEnvironment(env: NodeJS.ProcessEnv = process.env): void {
  const problems = SECRET_RULES.filter((rule) => rule.isRequired(env))
    .map((rule) => describeProblem(rule, env[rule.name], env))
    .filter((problem): problem is string => problem !== null);

  if (problems.length === 0) {
    return;
  }

  throw new ConfigError(
    [
      `Refusing to start: ${problems.length} required environment variable(s) are missing or invalid.`,
      ...problems.map((problem) => `  • ${problem}`),
      "",
      "Copy backend/.env.example to backend/.env and fill in real values.",
      `Generate a suitable JWT_SECRET with:  openssl rand -base64 ${MIN_JWT_SECRET_LENGTH}`,
    ].join("\n"),
  );
}

/**
 * Read a secret, throwing if it is absent, a placeholder, or too short.
 *
 * Call this at the point of use instead of `process.env.X || "<literal>"`.
 * Under a validated boot it never throws; it is the backstop for code paths
 * that construct clients lazily, and for tests.
 */
export function requireSecret(name: string, minLength = 1): string {
  const value = process.env[name];
  const rule: SecretRule = {
    name,
    minLength,
    usedFor: "this service",
    isRequired: always,
  };
  const problem = describeProblem(rule, value, process.env);
  if (problem !== null) {
    throw new ConfigError(problem);
  }
  return value as string;
}

/**
 * Read a credential for an integration that is allowed to be switched off.
 *
 * Returns "" when unset — the caller is expected to treat that as "feature
 * disabled" and say so. This exists so an optional key is an explicit decision
 * at the call site rather than an inline `|| ""` that reads the same as a
 * hardcoded credential.
 */
export function optionalSecret(name: string): string {
  const value = process.env[name];
  return value === undefined ? "" : value.trim();
}

/** Read a non-credential setting that has a safe, non-secret default. */
export function envOrDefault(name: string, fallback: string): string {
  const value = process.env[name];
  return value === undefined || value.trim() === "" ? fallback : value;
}

export const jwtSecret = () => requireSecret("JWT_SECRET", MIN_JWT_SECRET_LENGTH);
