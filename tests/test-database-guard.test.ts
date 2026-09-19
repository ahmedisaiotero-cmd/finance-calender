import assert from "node:assert/strict";

import {
  UnsafeTestDatabaseError,
  assertNotProductionMigrationTarget,
  looksLikeProductionDatabaseUrl,
  resolveIsolatedTestDatabaseUrl,
} from "@/lib/db/test-database-guard";

{
  assert.equal(
    looksLikeProductionDatabaseUrl("postgresql://u:p@localhost:5432/sync_test"),
    false,
  );
  assert.equal(
    looksLikeProductionDatabaseUrl(
      "postgresql://u:p@ep-cool.neon.tech/neondb?sslmode=require",
    ),
    true,
  );
}

{
  assert.equal(resolveIsolatedTestDatabaseUrl({}), null);
  assert.equal(
    resolveIsolatedTestDatabaseUrl({
      SYNC_TEST_DATABASE_URL: "postgresql://u:p@127.0.0.1:5432/sync_test",
    }),
    "postgresql://u:p@127.0.0.1:5432/sync_test",
  );
}

{
  assert.throws(
    () =>
      resolveIsolatedTestDatabaseUrl({
        DATABASE_URL: "postgresql://u:p@localhost:5432/sync_test",
        SYNC_TEST_DATABASE_URL: "postgresql://u:p@localhost:5432/sync_test",
      }),
    (error: unknown) =>
      error instanceof UnsafeTestDatabaseError &&
      error.message.includes("must not be the same"),
  );
  assert.throws(
    () =>
      resolveIsolatedTestDatabaseUrl({
        SYNC_TEST_DATABASE_URL:
          "postgresql://u:p@ep-prod.neon.tech/neondb?sslmode=require",
      }),
    UnsafeTestDatabaseError,
  );
}

{
  assert.throws(
    () =>
      assertNotProductionMigrationTarget(
        "postgresql://u:p@ep-prod.neon.tech/neondb",
      ),
    UnsafeTestDatabaseError,
  );
  assert.doesNotThrow(() =>
    assertNotProductionMigrationTarget(
      "postgresql://u:p@localhost:5432/sync_test",
    ),
  );
}

console.log("test-database-guard tests passed");
