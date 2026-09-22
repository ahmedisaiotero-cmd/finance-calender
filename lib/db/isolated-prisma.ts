import { PrismaClient } from "@prisma/client";

import {
  assertNotProductionMigrationTarget,
  resolveIsolatedTestDatabaseUrl,
} from "@/lib/db/test-database-guard";

export function createIsolatedPrismaClient(
  env: Record<string, string | undefined> = process.env,
): PrismaClient | null {
  const url = resolveIsolatedTestDatabaseUrl(env);
  if (!url) return null;
  assertNotProductionMigrationTarget(url, env);
  return new PrismaClient({
    datasources: { db: { url } },
    log: ["error"],
  });
}
