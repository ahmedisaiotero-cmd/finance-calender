import { NextResponse } from "next/server";

import { withAiActivityCors } from "@/lib/api/ai-activity-cors";
import type { AiPairingStore } from "@/lib/ai-activity/pairing";
import { authenticateOwnerSecret } from "@/lib/auth/owner-secret";
import { ensureOwnerUser } from "@/lib/db/ai-activity";
import {
  claimAiPairingCode,
  createPrismaPairingStore,
  issueAiPairingCode,
  revokeAiExtensionDevice,
} from "@/lib/db/ai-pairing";

export type AiActivityPairDeps = {
  env?: NodeJS.ProcessEnv | Record<string, string | undefined>;
  pairingStore?: AiPairingStore;
};

function json(request: Request, body: unknown, status: number): NextResponse {
  const response =
    status === 204
      ? new NextResponse(null, { status })
      : NextResponse.json(body, { status });
  return withAiActivityCors(request, response) as NextResponse;
}

export function handleAiActivityPairOptions(request: Request): NextResponse {
  return json(request, null, 204);
}

export async function handleAiActivityPairIssue(
  request: Request,
  deps: AiActivityPairDeps = {},
): Promise<NextResponse> {
  const env = deps.env ?? process.env;
  const auth = authenticateOwnerSecret(request, env);
  if (!auth.ok) return json(request, { error: auth.error }, auth.status);

  const store = deps.pairingStore ?? createPrismaPairingStore();
  if (!deps.pairingStore) {
    await ensureOwnerUser({
      ownerId: auth.ownerId,
      ownerEmail: auth.ownerEmail,
    });
  }
  const issued = await issueAiPairingCode(
    { ownerId: auth.ownerId, ownerEmail: auth.ownerEmail },
    store,
  );
  return json(
    request,
    {
      ok: true,
      code: issued.code,
      expiresAt: issued.expiresAt,
    },
    201,
  );
}

export async function handleAiActivityPairList(
  request: Request,
  deps: AiActivityPairDeps = {},
): Promise<NextResponse> {
  const env = deps.env ?? process.env;
  const auth = authenticateOwnerSecret(request, env);
  if (!auth.ok) return json(request, { error: auth.error }, auth.status);

  const store = deps.pairingStore ?? createPrismaPairingStore();
  const devices = await store.listDevices(auth.ownerId);
  return json(
    request,
    {
      ok: true,
      devices: devices.map((device) => ({
        connectionId: device.connectionId,
        label: device.label,
        permissionState: device.permissionState,
        createdAt: device.createdAt,
        lastSeenAt: device.lastSeenAt,
        revokedAt: device.revokedAt,
      })),
    },
    200,
  );
}

export async function handleAiActivityPairClaim(
  request: Request,
  deps: AiActivityPairDeps = {},
): Promise<NextResponse> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return json(request, { error: "Invalid JSON" }, 400);
  }

  const code =
    body && typeof body === "object" && "code" in body
      ? String((body as { code?: unknown }).code ?? "")
      : "";
  const label =
    body && typeof body === "object" && "label" in body
      ? String((body as { label?: unknown }).label ?? "")
      : undefined;

  if (!code.trim()) {
    return json(request, { error: "Pairing code required" }, 400);
  }

  const store = deps.pairingStore ?? createPrismaPairingStore();
  const claimed = await claimAiPairingCode(code, store, { label });
  if (!claimed.ok) {
    return json(request, { error: claimed.error }, 400);
  }

  return json(
    request,
    {
      ok: true,
      token: claimed.token,
      connectionId: claimed.connectionId,
      deviceId: claimed.deviceId,
    },
    201,
  );
}

export async function handleAiActivityPairRevoke(
  request: Request,
  deps: AiActivityPairDeps = {},
): Promise<NextResponse> {
  const env = deps.env ?? process.env;
  const auth = authenticateOwnerSecret(request, env);
  if (!auth.ok) return json(request, { error: auth.error }, auth.status);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return json(request, { error: "Invalid JSON" }, 400);
  }

  const connectionId =
    body && typeof body === "object" && "connectionId" in body
      ? String((body as { connectionId?: unknown }).connectionId ?? "")
      : "";
  if (!connectionId.trim()) {
    return json(request, { error: "Device id required" }, 400);
  }

  const store = deps.pairingStore ?? createPrismaPairingStore();
  const revoked = await revokeAiExtensionDevice(
    auth.ownerId,
    connectionId,
    store,
  );
  if (!revoked) {
    return json(request, { error: "Device not found" }, 404);
  }

  return json(
    request,
    {
      ok: true,
      connectionId: revoked.connectionId,
      permissionState: revoked.permissionState,
    },
    200,
  );
}
