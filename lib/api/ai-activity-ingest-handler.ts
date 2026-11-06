import { NextResponse } from "next/server";

import { withAiActivityCors } from "@/lib/api/ai-activity-cors";
import {
  AI_CAPTURE_MAX_BODY_BYTES,
  validateAiConversationCapturePayload,
} from "@/lib/ai-activity/validation";
import { authenticateAiActivityRequest } from "@/lib/auth/ai-activity-auth";
import type { AiPairingStore } from "@/lib/ai-activity/pairing";
import {
  persistAiConversationCapture,
  type AiOwnerIdentity,
  type PersistAiCaptureResult,
} from "@/lib/db/ai-activity";
import type { ValidatedAiConversationCapturePayload } from "@/lib/ai-activity/types";

export type AiActivityIngestDeps = {
  env?: NodeJS.ProcessEnv | Record<string, string | undefined>;
  pairingStore?: AiPairingStore;
  persistCapture?: (input: {
    owner: AiOwnerIdentity;
    payload: ValidatedAiConversationCapturePayload;
  }) => Promise<PersistAiCaptureResult>;
};

async function readJsonBodyWithLimit(
  request: Request,
  maxBytes: number,
): Promise<{ ok: true; value: unknown } | { ok: false; status: number; error: string }> {
  const contentLength = request.headers.get("content-length");
  if (contentLength && Number(contentLength) > maxBytes) {
    return { ok: false, status: 413, error: "Request body is too large" };
  }

  const reader = request.body?.getReader();
  if (!reader) return { ok: false, status: 400, error: "Invalid request body" };

  const chunks: Uint8Array[] = [];
  let received = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    if (!value) continue;
    received += value.byteLength;
    if (received > maxBytes) {
      return { ok: false, status: 413, error: "Request body is too large" };
    }
    chunks.push(value);
  }

  const buffer = new Uint8Array(received);
  let offset = 0;
  for (const chunk of chunks) {
    buffer.set(chunk, offset);
    offset += chunk.byteLength;
  }

  try {
    return {
      ok: true,
      value: JSON.parse(new TextDecoder().decode(buffer)),
    };
  } catch {
    return { ok: false, status: 400, error: "Invalid JSON" };
  }
}

function json(
  request: Request,
  body: unknown,
  status: number,
): NextResponse {
  const response =
    status === 204
      ? new NextResponse(null, { status })
      : NextResponse.json(body, { status });
  return withAiActivityCors(request, response) as NextResponse;
}

export async function handleAiActivityIngestOptions(
  request: Request,
): Promise<NextResponse> {
  return json(request, null, 204);
}

export async function handleAiActivityIngestPost(
  request: Request,
  deps: AiActivityIngestDeps = {},
): Promise<NextResponse> {
  const env = deps.env ?? process.env;
  const auth = await authenticateAiActivityRequest(
    request,
    env,
    deps.pairingStore,
  );
  if (!auth.ok) {
    return json(request, { error: auth.error }, auth.status);
  }

  const body = await readJsonBodyWithLimit(request, AI_CAPTURE_MAX_BODY_BYTES);
  if (!body.ok) {
    return json(request, { error: body.error }, body.status);
  }

  const rawBody = body.value;
  const requestBody =
    auth.authKind === "device_token" &&
    rawBody &&
    typeof rawBody === "object" &&
    !Array.isArray(rawBody)
      ? {
          ...rawBody,
          captureMethod: "extension",
          proof: {
            ...("proof" in rawBody &&
            rawBody.proof &&
            typeof rawBody.proof === "object" &&
            !Array.isArray(rawBody.proof)
              ? rawBody.proof
              : {}),
            sourceKind: "chrome_extension",
            connectionId: auth.connectionId,
          },
        }
      : rawBody;

  const validated = validateAiConversationCapturePayload(requestBody);
  if (!validated.ok) {
    return json(request, { error: validated.error }, 400);
  }

  const payload = validated.value;

  try {
    const persist = deps.persistCapture ?? persistAiConversationCapture;
    const result = await persist({
      owner: {
        ownerId: auth.ownerId,
        ownerEmail: auth.ownerEmail,
      },
      payload,
    });

    return json(
      request,
      {
        ok: true,
        conversationId: result.conversationId,
        activityEventId: result.activityEventId,
        messageCount: result.messageIds.length,
      },
      201,
    );
  } catch (error) {
    if (error instanceof Error && error.message.includes("revoked")) {
      return json(request, { error: "Capture source is revoked" }, 403);
    }
    console.error("POST /api/ai-activity/ingest", {
      name:
        error && typeof error === "object" && "name" in error
          ? String((error as { name?: unknown }).name ?? "Error")
          : "Error",
    });
    return json(request, { error: "Failed to ingest AI activity" }, 500);
  }
}
