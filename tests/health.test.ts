import assert from "node:assert/strict";

import {
  buildHealthReport,
  healthReportLeaksSecrets,
} from "@/lib/api/health";

async function main() {
  const skipped = await buildHealthReport({ env: {} });
  assert.deepEqual(skipped, {
    ok: true,
    status: "ok",
    checks: { app: "ok", database: "skipped" },
  });

  const healthy = await buildHealthReport({
    env: { DATABASE_URL: "postgres://secret-user:secret-pass@db.example/sync" },
    pingDatabase: async () => undefined,
  });
  assert.equal(healthy.ok, true);
  assert.equal(healthy.checks.database, "ok");
  assert.equal(
    healthReportLeaksSecrets(healthy, {
      DATABASE_URL: "postgres://secret-user:secret-pass@db.example/sync",
    }),
    false,
  );

  const degraded = await buildHealthReport({
    env: { DATABASE_URL: "postgres://secret-user:secret-pass@db.example/sync" },
    pingDatabase: async () => {
      throw new Error("postgres://secret-user:secret-pass@db.example/sync");
    },
  });
  assert.equal(degraded.ok, false);
  assert.equal(degraded.status, "degraded");
  assert.equal(JSON.stringify(degraded).includes("secret-pass"), false);
  assert.equal(JSON.stringify(degraded).includes("postgres://"), false);

  console.log("health tests passed");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
