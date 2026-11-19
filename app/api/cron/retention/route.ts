import { NextResponse } from "next/server";

import {
  enforceRetention,
  isAuthorizedCronRequest,
} from "@/lib/retention/enforce-retention";
import { prismaRetentionStore } from "@/lib/retention/prisma-retention-store";

export async function GET(request: Request) {
  const auth = isAuthorizedCronRequest(request);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const result = await enforceRetention({
    store: prismaRetentionStore(),
  });
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 503 });
  }

  return NextResponse.json({
    ok: true,
    captureRetentionDays: result.captureRetentionDays,
    counts: result.counts,
  });
}

export const POST = GET;
