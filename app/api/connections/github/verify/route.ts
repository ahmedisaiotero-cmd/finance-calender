import { NextResponse } from "next/server";

import { ActivityLedgerError } from "@/lib/activity/ledger";
import { loadRequestIdentity } from "@/lib/auth/load-request-identity";
import { GithubConnectorError } from "@/lib/connectors/github/errors";
import { presentGithubCommitReceipt } from "@/lib/connectors/github/receipt";
import {
  requireTokenVaultKey,
  verifyGithubCommitForIdentity,
} from "@/lib/connectors/github/service";
import { prismaActivityEventStore } from "@/lib/db/activity-event-store";
import { createPrismaGithubAccessStore } from "@/lib/db/github-access-store";
import { isDatabaseConfigured, prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  const loaded = await loadRequestIdentity();
  if (!loaded.ok) return loaded.response;
  if (!isDatabaseConfigured()) {
    return NextResponse.json(
      { error: "DATABASE_URL is not configured" },
      { status: 503 },
    );
  }

  let body: {
    connectionId?: string;
    repoOwner?: string;
    repo?: string;
    sha?: string;
    priorEventId?: string | null;
    idempotencyKey?: string;
  };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (
    !body.connectionId ||
    !body.repoOwner ||
    !body.repo ||
    !body.sha ||
    !body.idempotencyKey
  ) {
    return NextResponse.json(
      { error: "connectionId, repoOwner, repo, sha, and idempotencyKey are required" },
      { status: 400 },
    );
  }

  try {
    const result = await verifyGithubCommitForIdentity({
      identity: loaded.identity,
      connectionId: body.connectionId,
      query: {
        repoOwner: body.repoOwner,
        repo: body.repo,
        sha: body.sha,
      },
      priorEventId: body.priorEventId,
      idempotencyKey: body.idempotencyKey,
      nowIso: new Date().toISOString(),
      vaultKey: requireTokenVaultKey(),
      accessStore: createPrismaGithubAccessStore(prisma),
      activityStore: prismaActivityEventStore,
    });
    return NextResponse.json(
      {
        ...result,
        receipt: presentGithubCommitReceipt(result.record.event),
      },
      { status: result.reused ? 200 : 201 },
    );
  } catch (error) {
    if (error instanceof GithubConnectorError) {
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: error.status },
      );
    }
    if (error instanceof ActivityLedgerError) {
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: error.status },
      );
    }
    console.error("/api/connections/github/verify", error);
    return NextResponse.json({ error: "Unexpected error" }, { status: 500 });
  }
}
