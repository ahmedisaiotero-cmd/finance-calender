import { NextResponse } from "next/server";

import { withAiActivityCors } from "@/lib/api/ai-activity-cors";
import {
  authenticatePairOwner,
  type AuthenticatePairOwner,
} from "@/lib/auth/owner-identity";
import { listAiActivityTimelineForOwner } from "@/lib/db/ai-activity";

export type AiActivityListDeps = {
  env?: NodeJS.ProcessEnv | Record<string, string | undefined>;
  listTimeline?: typeof listAiActivityTimelineForOwner;
  authenticateOwner?: AuthenticatePairOwner;
};

function json(request: Request, body: unknown, status: number): NextResponse {
  const response = NextResponse.json(body, { status });
  return withAiActivityCors(request, response) as NextResponse;
}

export async function handleAiActivityListGet(
  request: Request,
  deps: AiActivityListDeps = {},
): Promise<NextResponse> {
  const env = deps.env ?? process.env;
  const authenticate = deps.authenticateOwner ?? authenticatePairOwner;
  const auth = await authenticate(request, env);
  if (!auth.ok) {
    return json(request, { error: auth.error }, auth.status);
  }

  const list = deps.listTimeline ?? listAiActivityTimelineForOwner;
  const rows = await list(auth.owner.ownerId);

  return json(
    request,
    {
      ok: true,
      items: rows.map((row) => ({
        id: row.id,
        provider: row.provider.slug,
        providerName: row.provider.displayName,
        title: row.visibility === "hidden" ? "Hidden conversation" : row.title,
        summary:
          row.visibility === "hidden"
            ? null
            : row.summary,
        origin: row.origin,
        capturedAt: row.capturedAt.toISOString(),
        captureMethod: row.captureMethod,
        visibility: row.visibility,
        messageCount: row._count.messages,
        activityEventCount: row._count.activityEvents,
      })),
    },
    200,
  );
}
