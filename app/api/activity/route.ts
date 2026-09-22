import { NextResponse } from "next/server";

import {
  ActivityLedgerError,
  appendActivityEvent,
  clampActivityLimit,
  listActivityEvents,
  ownerFromIdentity,
} from "@/lib/activity/ledger";
import type { ActivityEventInput } from "@/lib/activity/activity-event";
import { loadRequestIdentity } from "@/lib/auth/load-request-identity";
import { prismaActivityEventStore } from "@/lib/db/activity-event-store";

function ledgerErrorResponse(error: unknown) {
  if (error instanceof ActivityLedgerError) {
    return NextResponse.json(
      { error: error.message, code: error.code },
      { status: error.status },
    );
  }
  console.error("/api/activity", error);
  return NextResponse.json({ error: "Unexpected error" }, { status: 500 });
}

export async function GET(request: Request) {
  const loaded = await loadRequestIdentity();
  if (!loaded.ok) return loaded.response;

  try {
    const { searchParams } = new URL(request.url);
    const limitParam = searchParams.get("limit");
    const limit = limitParam ? Number(limitParam) : undefined;
    const page = await listActivityEvents(
      {
        owner: ownerFromIdentity(loaded.identity, {
          headers: Object.fromEntries(request.headers),
        }),
        limit: clampActivityLimit(limit),
        cursor: searchParams.get("cursor"),
      },
      prismaActivityEventStore,
    );
    return NextResponse.json({
      events: page.records,
      nextCursor: page.nextCursor,
    });
  } catch (error) {
    return ledgerErrorResponse(error);
  }
}

export async function POST(request: Request) {
  const loaded = await loadRequestIdentity();
  if (!loaded.ok) return loaded.response;

  let body: {
    event?: ActivityEventInput;
    idempotencyKey?: string;
    priorEventId?: string | null;
    userId?: unknown;
    workspaceId?: unknown;
    ownerId?: unknown;
    email?: unknown;
  };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  try {
    if (!body.event || !body.idempotencyKey) {
      return NextResponse.json(
        { error: "event and idempotencyKey are required" },
        { status: 400 },
      );
    }

    const result = await appendActivityEvent(
      {
        owner: ownerFromIdentity(loaded.identity, {
          ...body,
          headers: Object.fromEntries(request.headers),
        }),
        event: body.event,
        idempotencyKey: body.idempotencyKey,
        priorEventId: body.priorEventId,
      },
      { store: prismaActivityEventStore },
    );

    return NextResponse.json(result, { status: result.reused ? 200 : 201 });
  } catch (error) {
    return ledgerErrorResponse(error);
  }
}
