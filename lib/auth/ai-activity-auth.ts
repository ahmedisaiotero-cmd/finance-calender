import { authenticateDeviceToken } from "@/lib/db/ai-pairing";
import {
  AI_DEVICE_TOKEN_PREFIX,
  type AiExtensionDeviceRecord,
  type AiPairingStore,
} from "@/lib/ai-activity/pairing";
import {
  SYNC_OWNER_EMAIL_ENV,
  authenticateOwnerSecret,
  readPresentedSecret,
} from "@/lib/auth/owner-secret";

export type AiActivityAuthSuccess = {
  ok: true;
  ownerId: string;
  ownerEmail: string;
  connectionId: string;
  authKind: "owner_secret" | "device_token";
  device?: AiExtensionDeviceRecord;
};

export type AiActivityAuthFailure = {
  ok: false;
  status: 401 | 403 | 503;
  error: string;
};

export type AiActivityAuthResult = AiActivityAuthSuccess | AiActivityAuthFailure;

export async function authenticateAiActivityRequest(
  request: Request,
  env: NodeJS.ProcessEnv | Record<string, string | undefined> = process.env,
  store?: AiPairingStore,
): Promise<AiActivityAuthResult> {
  const owner = authenticateOwnerSecret(request, env);
  if (owner.ok) {
    return {
      ok: true,
      ownerId: owner.ownerId,
      ownerEmail: owner.ownerEmail,
      connectionId: "owner-secret",
      authKind: "owner_secret",
    };
  }

  const presented = readPresentedSecret(request);
  if (store && presented) {
    const device = await authenticateDeviceToken(presented, store);
    if (device.ok) {
      return {
        ok: true,
        ownerId: device.device.ownerId,
        ownerEmail: env[SYNC_OWNER_EMAIL_ENV]?.trim() || "owner@sync.local",
        connectionId: device.device.connectionId,
        authKind: "device_token",
        device: device.device,
      };
    }
    if (device.status === 403) {
      return { ok: false, status: 403, error: device.error };
    }
    if (presented.startsWith(AI_DEVICE_TOKEN_PREFIX)) {
      return { ok: false, status: 401, error: "Unauthorized" };
    }
  }

  return { ok: false, status: owner.status, error: owner.error };
}
