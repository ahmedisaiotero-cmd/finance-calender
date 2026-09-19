import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";

import { resolveIsolatedTestDatabaseUrl } from "@/lib/db/test-database-guard";

const skip = !resolveIsolatedTestDatabaseUrl();

function psql(database: string, sql: string) {
  const result = spawnSync(
    "docker",
    [
      "exec",
      "-i",
      "sync-test-postgres",
      "psql",
      "-U",
      "sync",
      "-d",
      database,
      "-v",
      "ON_ERROR_STOP=1",
    ],
    { input: sql, encoding: "utf8" },
  );
  if (result.status !== 0) {
    throw new Error(result.stderr || result.stdout || "psql failed");
  }
  return result.stdout;
}

test("existing ledger migration SQL applies onto User/Workspace", { skip }, () => {
  const ledgerSql = readFileSync(
    join(process.cwd(), "prisma/migrations/20260915000000_activity_event_ledger/migration.sql"),
    "utf8",
  );

  psql("postgres", "DROP DATABASE IF EXISTS sync_ledger_sql_probe;");
  psql("postgres", "CREATE DATABASE sync_ledger_sql_probe;");
  try {
    psql(
      "sync_ledger_sql_probe",
      `
      CREATE TABLE "User" (
        "id" TEXT PRIMARY KEY,
        "email" TEXT NOT NULL UNIQUE,
        "name" TEXT,
        "timezone" TEXT NOT NULL DEFAULT 'UTC',
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
      CREATE TABLE "Workspace" (
        "id" TEXT PRIMARY KEY,
        "ownerId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
        "name" TEXT NOT NULL,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
      ${ledgerSql}
      `,
    );
    const indexes = psql(
      "sync_ledger_sql_probe",
      "SELECT indexname FROM pg_indexes WHERE tablename = 'ActivityEventRecord';",
    );
    assert.match(indexes, /workspaceId_userId_idempotencyKey/);
  } finally {
    psql("postgres", "DROP DATABASE IF EXISTS sync_ledger_sql_probe;");
  }
});
