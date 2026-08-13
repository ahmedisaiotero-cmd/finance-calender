import assert from "node:assert/strict";

import { isSyncDemoMode } from "@/lib/auth/demo-mode";
import {
  ownedRecordWhere,
  trustedWorkspaceId,
} from "@/lib/auth/ownership";
import {
  RequestIdentityError,
  resolveIdentityAccess,
} from "@/lib/auth/request-identity";
import { assertDemoWorkspaceAllowed } from "@/lib/db/workspace";

function env(overrides: Record<string, string | undefined>): NodeJS.ProcessEnv {
  return { ...overrides } as NodeJS.ProcessEnv;
}

async function main() {
  // Demo mode disabled by default / missing vars.
  assert.equal(isSyncDemoMode(env({})), false);
  assert.equal(isSyncDemoMode(env({ NODE_ENV: "development" })), false);
  assert.equal(
    isSyncDemoMode(env({ NODE_ENV: "development", SYNC_DEMO_MODE: "1" })),
    false,
  );
  assert.equal(
    isSyncDemoMode(env({ NODE_ENV: "development", SYNC_DEMO_MODE: "TRUE" })),
    false,
  );
  assert.equal(
    isSyncDemoMode(env({ NODE_ENV: "development", SYNC_DEMO_MODE: "false" })),
    false,
  );

  // Explicit local demo only.
  assert.equal(
    isSyncDemoMode(env({ NODE_ENV: "development", SYNC_DEMO_MODE: "true" })),
    true,
  );
  assert.equal(
    isSyncDemoMode(env({ NODE_ENV: "test", SYNC_DEMO_MODE: "true" })),
    true,
  );

  // Production always rejects demo mode.
  assert.equal(
    isSyncDemoMode(env({ NODE_ENV: "production", SYNC_DEMO_MODE: "true" })),
    false,
  );
  assert.equal(
    isSyncDemoMode(env({ NODE_ENV: "production", SYNC_DEMO_MODE: "false" })),
    false,
  );

  // Shared-demo workspace helper must refuse production (fail closed).
  assert.throws(
    () => assertDemoWorkspaceAllowed(env({ NODE_ENV: "production" })),
    (error: unknown) =>
      error instanceof Error &&
      error.message === "Demo workspace is not available in production",
  );
  assert.doesNotThrow(() =>
    assertDemoWorkspaceAllowed(env({ NODE_ENV: "development" })),
  );

  // Missing auth does not activate demo; production fails closed.
  const denied = resolveIdentityAccess({ session: null, demoMode: false });
  assert.equal(denied.ok, false);
  if (!denied.ok) {
    assert.equal(denied.status, 401);
    assert.equal(denied.error, "Unauthorized");
  }

  // Missing Supabase/auth config behaves like null session → 401 when demo off.
  const missingAuthConfig = resolveIdentityAccess({
    session: null,
    demoMode: isSyncDemoMode(
      env({ NODE_ENV: "production", SYNC_DEMO_MODE: "true" }),
    ),
  });
  assert.equal(missingAuthConfig.ok, false);

  const demo = resolveIdentityAccess({ session: null, demoMode: true });
  assert.equal(demo.ok, true);
  if (demo.ok) assert.equal(demo.mode, "demo");

  const authenticated = resolveIdentityAccess({
    session: { id: "user-trusted", email: "a@example.com" },
    demoMode: true,
  });
  assert.equal(authenticated.ok, true);
  if (authenticated.ok) {
    assert.equal(authenticated.mode, "authenticated");
    assert.equal(authenticated.session.id, "user-trusted");
  }

  // Trusted reads/writes use identity workspace — never client overrides.
  const identity = {
    workspace: { id: "ws-trusted" },
    user: { id: "user-trusted" },
  };

  assert.equal(
    trustedWorkspaceId(identity, {
      workspaceId: "ws-attacker",
      userId: "user-attacker",
      ownerId: "owner-attacker",
      email: "attacker@example.com",
    }),
    "ws-trusted",
  );

  assert.deepEqual(ownedRecordWhere("rec-1", "ws-trusted"), {
    id: "rec-1",
    workspaceId: "ws-trusted",
  });

  // Cross-user update/delete must include owner scope in the where clause.
  const foreignAttempt = ownedRecordWhere("rec-other", "ws-attacker");
  assert.notEqual(foreignAttempt.workspaceId, identity.workspace.id);
  const safeMutation = ownedRecordWhere("rec-other", identity.workspace.id);
  assert.equal(safeMutation.workspaceId, "ws-trusted");
  assert.equal(safeMutation.id, "rec-other");

  // Public error contract stays generic (no Prisma/stack leakage).
  const error = new RequestIdentityError();
  assert.equal(error.status, 401);
  assert.equal(error.message, "Unauthorized");
  assert.equal(error.message.includes("Prisma"), false);
  assert.equal(error.message.includes("stack"), false);

  console.log("request-identity auth boundary tests passed");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
