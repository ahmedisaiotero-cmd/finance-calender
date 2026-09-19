/**
 * Isolated test-database safeguards.
 *
 * Automated tests must use SYNC_TEST_DATABASE_URL, never DATABASE_URL.
 * Production-looking hosts are rejected. This module does not connect
 * and does not run migrations.
 */

export class UnsafeTestDatabaseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "UnsafeTestDatabaseError";
  }
}

const PRODUCTION_HOST_MARKERS = [
  "neon.tech",
  "supabase.co",
  "amazonaws.com",
  "azure.com",
  "rds.amazonaws.com",
];

export function parseDatabaseHostname(url: string): string | null {
  try {
    return new URL(url).hostname.toLowerCase();
  } catch {
    return null;
  }
}

export function looksLikeProductionDatabaseUrl(url: string): boolean {
  const host = parseDatabaseHostname(url);
  if (!host) return true;
  if (host === "localhost" || host === "127.0.0.1") return false;
  return PRODUCTION_HOST_MARKERS.some((marker) => host.includes(marker));
}

export function isIsolatedTestDatabaseUrl(url: string): boolean {
  const host = parseDatabaseHostname(url);
  if (!host) return false;
  if (host === "localhost" || host === "127.0.0.1") return true;
  return false;
}

/**
 * Resolve a URL that is safe for Prisma integration tests.
 * Returns null when no isolated test database is configured (current repo default).
 */
export function resolveIsolatedTestDatabaseUrl(
  env: Record<string, string | undefined> = process.env,
): string | null {
  const testUrl = env.SYNC_TEST_DATABASE_URL?.trim();
  if (!testUrl) return null;

  if (env.DATABASE_URL && testUrl === env.DATABASE_URL.trim()) {
    throw new UnsafeTestDatabaseError(
      "SYNC_TEST_DATABASE_URL must not be the same as DATABASE_URL",
    );
  }

  if (looksLikeProductionDatabaseUrl(testUrl) && !isIsolatedTestDatabaseUrl(testUrl)) {
    throw new UnsafeTestDatabaseError(
      "SYNC_TEST_DATABASE_URL looks like a hosted production database",
    );
  }

  if (!isIsolatedTestDatabaseUrl(testUrl)) {
    throw new UnsafeTestDatabaseError(
      "SYNC_TEST_DATABASE_URL must be localhost until a reviewed remote test DB exists",
    );
  }

  return testUrl;
}

export function assertNotProductionMigrationTarget(
  url: string | undefined,
  env: Record<string, string | undefined> = process.env,
): void {
  if (!url) {
    throw new UnsafeTestDatabaseError("No database URL provided for migration");
  }
  if (env.SYNC_ALLOW_PRODUCTION_MIGRATION === "true") {
    throw new UnsafeTestDatabaseError(
      "SYNC_ALLOW_PRODUCTION_MIGRATION is not accepted by automated tools",
    );
  }
  if (looksLikeProductionDatabaseUrl(url)) {
    throw new UnsafeTestDatabaseError(
      "Refusing to treat a hosted database URL as a test/migration target",
    );
  }
}
