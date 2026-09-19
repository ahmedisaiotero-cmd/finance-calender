import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import {
  UnsafeTestDatabaseError,
  assertNotProductionMigrationTarget,
  resolveIsolatedTestDatabaseUrl,
} from "../lib/db/test-database-guard";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const url = resolveIsolatedTestDatabaseUrl(process.env);

if (!url) {
  console.error(
    "SYNC_TEST_DATABASE_URL is not set. Use docker-compose.test.yml and a localhost URL.",
  );
  process.exit(2);
}

try {
  assertNotProductionMigrationTarget(url, process.env);
} catch (error) {
  if (error instanceof UnsafeTestDatabaseError) {
    console.error(error.message);
    process.exit(2);
  }
  throw error;
}

console.log(
  "Isolated empty Postgres cannot `prisma migrate deploy` this repo: the earliest migration assumes Workspace already exists (no baseline). Applying the current schema with `prisma db push` to this localhost URL only.",
);

const result = spawnSync(
  process.platform === "win32" ? "npx.cmd" : "npx",
  ["prisma", "db", "push", "--skip-generate"],
  {
    cwd: root,
    stdio: "inherit",
    env: {
      ...process.env,
      DATABASE_URL: url,
    },
    shell: process.platform === "win32",
  },
);

process.exit(result.status === 0 ? 0 : (result.status ?? 1));
