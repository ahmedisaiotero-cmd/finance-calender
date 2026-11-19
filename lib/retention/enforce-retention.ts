import { isProductionRuntime } from "@/lib/api/endpoint-rate-limit-config";

export const RATE_LIMIT_WINDOW_RETENTION_DAYS = 14;
export const REVOKED_DEVICE_RETENTION_DAYS = 30;
export const CAPTURE_RETENTION_DAYS_BOUND = 3650;

export type RetentionCounts = {
  pairingCodes: number;
  devices: number;
  rateLimitWindows: number;
  captures: number;
};

export type RetentionStore = {
  deleteExpiredPairingCodes: (now: Date) => Promise<number>;
  deleteExpiredDevices: (cutoff: Date) => Promise<number>;
  deleteExpiredRateLimitWindows: (cutoff: Date) => Promise<number>;
  deleteExpiredCaptures: (cutoff: Date) => Promise<number>;
};

type EnvLike = NodeJS.ProcessEnv | Record<string, string | undefined>;

export function resolveCaptureRetentionDays(
  env: EnvLike = process.env,
): { ok: true; days: number | null } | { ok: false; error: string } {
  const raw = env.SYNC_CAPTURE_RETENTION_DAYS?.trim();
  if (!raw) return { ok: true, days: null };
  const days = Number(raw);
  if (!Number.isInteger(days) || days < 0 || days > CAPTURE_RETENTION_DAYS_BOUND) {
    return {
      ok: false,
      error: "SYNC_CAPTURE_RETENTION_DAYS must be an integer from 0 to 3650.",
    };
  }
  if (days === 0) return { ok: true, days: null };
  return { ok: true, days };
}

export function isAuthorizedCronRequest(
  request: Request,
  env: EnvLike = process.env,
): { ok: true } | { ok: false; status: 401 | 503; error: string } {
  const secret = env.CRON_SECRET?.trim();
  if (!secret) {
    if (isProductionRuntime(env)) {
      return { ok: false, status: 503, error: "Cron secret is not configured" };
    }
    return { ok: true };
  }
  const header = request.headers.get("authorization");
  if (header !== `Bearer ${secret}`) {
    return { ok: false, status: 401, error: "Unauthorized" };
  }
  return { ok: true };
}

export async function enforceRetention(input: {
  store: RetentionStore;
  now?: Date;
  env?: EnvLike;
}): Promise<
  | { ok: true; counts: RetentionCounts; captureRetentionDays: number | null }
  | { ok: false; error: string }
> {
  const now = input.now ?? new Date();
  const captureDays = resolveCaptureRetentionDays(input.env);
  if (!captureDays.ok) return captureDays;

  const rateLimitCutoff = new Date(
    now.getTime() - RATE_LIMIT_WINDOW_RETENTION_DAYS * 24 * 60 * 60 * 1000,
  );
  const deviceCutoff = new Date(
    now.getTime() - REVOKED_DEVICE_RETENTION_DAYS * 24 * 60 * 60 * 1000,
  );

  const pairingCodes = await input.store.deleteExpiredPairingCodes(now);
  const devices = await input.store.deleteExpiredDevices(deviceCutoff);
  const rateLimitWindows = await input.store.deleteExpiredRateLimitWindows(
    rateLimitCutoff,
  );
  let captures = 0;
  if (captureDays.days) {
    const captureCutoff = new Date(
      now.getTime() - captureDays.days * 24 * 60 * 60 * 1000,
    );
    captures = await input.store.deleteExpiredCaptures(captureCutoff);
  }

  return {
    ok: true,
    captureRetentionDays: captureDays.days,
    counts: { pairingCodes, devices, rateLimitWindows, captures },
  };
}
