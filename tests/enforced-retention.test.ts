import assert from "node:assert/strict";

import {
  enforceRetention,
  isAuthorizedCronRequest,
  RATE_LIMIT_WINDOW_RETENTION_DAYS,
  resolveCaptureRetentionDays,
  REVOKED_DEVICE_RETENTION_DAYS,
  type RetentionStore,
} from "@/lib/retention/enforce-retention";

function memoryStore(seed: {
  pairing?: Array<{ expiresAt: Date; consumedAt: Date | null }>;
  devices?: Array<{ expiresAt: Date | null; revokedAt: Date | null }>;
  windows?: Date[];
  captures?: Date[];
}): RetentionStore & { remaining: typeof seed } {
  const remaining = {
    pairing: [...(seed.pairing ?? [])],
    devices: [...(seed.devices ?? [])],
    windows: [...(seed.windows ?? [])],
    captures: [...(seed.captures ?? [])],
  };
  return {
    remaining,
    async deleteExpiredPairingCodes(now) {
      const before = remaining.pairing.length;
      remaining.pairing = remaining.pairing.filter(
        (row) => row.expiresAt > now && row.consumedAt === null,
      );
      return before - remaining.pairing.length;
    },
    async deleteExpiredDevices(cutoff) {
      const before = remaining.devices.length;
      remaining.devices = remaining.devices.filter((row) => {
        if (row.expiresAt && row.expiresAt <= cutoff) return false;
        if (row.revokedAt && row.revokedAt <= cutoff) return false;
        return true;
      });
      return before - remaining.devices.length;
    },
    async deleteExpiredRateLimitWindows(cutoff) {
      const before = remaining.windows.length;
      remaining.windows = remaining.windows.filter((stamp) => stamp > cutoff);
      return before - remaining.windows.length;
    },
    async deleteExpiredCaptures(cutoff) {
      const before = remaining.captures.length;
      remaining.captures = remaining.captures.filter((stamp) => stamp > cutoff);
      return before - remaining.captures.length;
    },
  };
}

{
  assert.equal(RATE_LIMIT_WINDOW_RETENTION_DAYS, 14);
  assert.equal(REVOKED_DEVICE_RETENTION_DAYS, 30);
  assert.deepEqual(resolveCaptureRetentionDays({}), { ok: true, days: null });
  assert.deepEqual(resolveCaptureRetentionDays({ SYNC_CAPTURE_RETENTION_DAYS: "0" }), {
    ok: true,
    days: null,
  });
  assert.deepEqual(resolveCaptureRetentionDays({ SYNC_CAPTURE_RETENTION_DAYS: "90" }), {
    ok: true,
    days: 90,
  });
  assert.equal(resolveCaptureRetentionDays({ SYNC_CAPTURE_RETENTION_DAYS: "-1" }).ok, false);
}

{
  const prodMissing = isAuthorizedCronRequest(
    new Request("http://localhost/api/cron/retention"),
    { NODE_ENV: "production" },
  );
  assert.equal(prodMissing.ok, false);
  if (!prodMissing.ok) assert.equal(prodMissing.status, 503);

  const denied = isAuthorizedCronRequest(
    new Request("http://localhost/api/cron/retention"),
    { CRON_SECRET: "cron-secret", NODE_ENV: "production" },
  );
  assert.equal(denied.ok, false);

  const allowed = isAuthorizedCronRequest(
    new Request("http://localhost/api/cron/retention", {
      headers: { authorization: "Bearer cron-secret" },
    }),
    { CRON_SECRET: "cron-secret", NODE_ENV: "production" },
  );
  assert.equal(allowed.ok, true);
}

async function main() {
  const now = new Date("2026-11-19T12:00:00.000Z");
  const store = memoryStore({
    pairing: [
      { expiresAt: new Date("2026-11-19T11:50:00.000Z"), consumedAt: null },
      { expiresAt: new Date("2026-11-19T12:10:00.000Z"), consumedAt: null },
      {
        expiresAt: new Date("2026-11-19T12:10:00.000Z"),
        consumedAt: new Date("2026-11-19T11:00:00.000Z"),
      },
    ],
    devices: [
      { expiresAt: new Date("2026-10-01T00:00:00.000Z"), revokedAt: null },
      {
        expiresAt: null,
        revokedAt: new Date("2026-10-01T00:00:00.000Z"),
      },
      { expiresAt: null, revokedAt: null },
    ],
    windows: [
      new Date("2026-10-01T00:00:00.000Z"),
      new Date("2026-11-18T00:00:00.000Z"),
    ],
    captures: [
      new Date("2026-01-01T00:00:00.000Z"),
      new Date("2026-11-01T00:00:00.000Z"),
    ],
  });

  const withoutCaptures = await enforceRetention({ store, now, env: {} });
  assert.equal(withoutCaptures.ok, true);
  if (withoutCaptures.ok) {
    assert.equal(withoutCaptures.counts.pairingCodes, 2);
    assert.equal(withoutCaptures.counts.devices, 2);
    assert.equal(withoutCaptures.counts.rateLimitWindows, 1);
    assert.equal(withoutCaptures.counts.captures, 0);
    assert.equal(store.remaining.captures?.length, 2);
  }

  const withCaptures = await enforceRetention({
    store,
    now,
    env: { SYNC_CAPTURE_RETENTION_DAYS: "30" },
  });
  assert.equal(withCaptures.ok, true);
  if (withCaptures.ok) {
    assert.equal(withCaptures.counts.captures, 1);
    assert.equal(store.remaining.captures?.length, 1);
  }

  console.log("enforced-retention tests passed");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
