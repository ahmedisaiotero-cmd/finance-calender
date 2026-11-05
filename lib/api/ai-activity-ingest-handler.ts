import { NextResponse } from "next/server";

import {
  AI_CAPTURE_MAX_BODY_BYTES,
  validateAiConversationCapturePayload,
} from "@/lib/ai-activity/validation";
import { authenticateOwnerSecret } from "@/lib/auth/owner-secret";
import {
  persistAiConversationCapture,
  type AiOwnerIdentity,
  type PersistAiCaptureResult,
} from "@/lib/db/ai-activity";
import type { ValidatedAiConversationCapturePayload } from "@/lib/ai-activity/types";

export type AiActivityIngestDeps = {
  env?: NodeJS.ProcessEnv | Record<string, string | undefined>;
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

export async function handleAiActivityIngestPost(
  request: Request,
  deps: AiActivityIngestDeps = {},
): Promise<NextResponse> {
  const auth = authenticateOwnerSecret(request, deps.env ?? process.env);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const body = await readJsonBodyWithLimit(request, AI_CAPTURE_MAX_BODY_BYTES);
  if (!body.ok) {
    return NextResponse.json(
      { error: body.error },
      { status: body.status },
    );
  }

  const validated = validateAiConversationCapturePayload(body.value);
  if (!validated.ok) {
    return NextResponse.json({ error: validated.error }, { status: 400 });
  }

  try {
    const persist = deps.persistCapture ?? persistAiConversationCapture;
    const result = await persist({
      owner: {
        ownerId: auth.ownerId,
        ownerEmail: auth.ownerEmail,
      },
      payload: validated.value,
    });

    return NextResponse.json(
      {
        ok: true,
        conversationId: result.conversationId,
        activityEventId: result.activityEventId,
        messageCount: result.messageIds.length,
      },
      { status: 201 },
    );
  } catch (error) {
    if (error instanceof Error && error.message.includes("revoked")) {
      return NextResponse.json(
        { error: "Capture source is revoked" },
        { status: 403 },
      );
    }
    console.error("POST /api/ai-activity/ingest", {
      name:
        error && typeof error === "object" && "name" in error
          ? String((error as { name?: unknown }).name ?? "Error")
          : "Error",
    });
    return NextResponse.json(
      { error: "Failed to ingest AI activity" },
      { status: 500 },
    );
  }
}
