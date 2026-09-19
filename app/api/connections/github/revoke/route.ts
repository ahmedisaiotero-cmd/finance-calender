import { NextResponse } from "next/server";

import { loadRequestIdentity } from "@/lib/auth/load-request-identity";
import { GithubConnectorError } from "@/lib/connectors/github/errors";
import { revokeGithubForIdentity } from "@/lib/connectors/github/service";
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

  let body: { connectionId?: string };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  if (!body.connectionId) {
    return NextResponse.json({ error: "connectionId is required" }, { status: 400 });
  }

  try {
    const revoked = await revokeGithubForIdentity({
      identity: loaded.identity,
      connectionId: body.connectionId,
      nowIso: new Date().toISOString(),
      accessStore: createPrismaGithubAccessStore(prisma),
    });
    return NextResponse.json({
      connectionId: revoked.connection.id,
      status: revoked.connection.status,
      revokedAt: revoked.connection.revokedAt,
    });
  } catch (error) {
    if (error instanceof GithubConnectorError) {
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: error.status },
      );
    }
    console.error("/api/connections/github/revoke", error);
    return NextResponse.json({ error: "Unexpected error" }, { status: 500 });
  }
}
