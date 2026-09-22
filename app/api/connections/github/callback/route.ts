import { NextResponse } from "next/server";

import { loadRequestIdentity } from "@/lib/auth/load-request-identity";
import { ownerFromIdentity } from "@/lib/activity/ledger";
import { GithubConnectorError } from "@/lib/connectors/github/errors";
import {
  completeGithubOAuthSession,
  requireTokenVaultKey,
} from "@/lib/connectors/github/service";
import {
  assertExactRedirectUri,
  requireGithubOAuthConfig,
} from "@/lib/connectors/github/oauth";
import {
  createPrismaGithubAccessStore,
  takeGithubOAuthHandshake,
} from "@/lib/db/github-access-store";
import { isDatabaseConfigured, prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const loaded = await loadRequestIdentity();
  if (!loaded.ok) return loaded.response;
  if (!isDatabaseConfigured()) {
    return NextResponse.json(
      { error: "DATABASE_URL is not configured" },
      { status: 503 },
    );
  }

  const url = new URL(request.url);
  const code = url.searchParams.get("code") ?? "";
  const state = url.searchParams.get("state") ?? "";

  try {
    const owner = ownerFromIdentity(loaded.identity);
    const handshake = await takeGithubOAuthHandshake(prisma, owner, state);
    if (!handshake || handshake.expiresAt.getTime() < Date.now()) {
      throw new GithubConnectorError(
        "oauth_state_invalid",
        "GitHub OAuth state is missing or expired",
        400,
      );
    }
    const env = process.env;
    const config = requireGithubOAuthConfig(env);
    assertExactRedirectUri(config.redirectUri, handshake.redirectUri);
    const access = await completeGithubOAuthSession({
      identity: loaded.identity,
      config,
      vaultKey: requireTokenVaultKey(env),
      code,
      codeVerifierCipher: handshake.codeVerifierCipher,
      accessStore: createPrismaGithubAccessStore(prisma),
      nowIso: new Date().toISOString(),
    });
    const payload = {
      connectionId: access.connection.id,
      grantId: access.grant.id,
      githubUserId: access.connection.externalSubjectId,
    };
    const accept = request.headers.get("accept") ?? "";
    if (accept.includes("application/json")) {
      return NextResponse.json(payload);
    }
    const next = new URL("/settings", request.url);
    next.searchParams.set("github", "connected");
    return NextResponse.redirect(next);
  } catch (error) {
    if (error instanceof GithubConnectorError) {
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: error.status },
      );
    }
    console.error("/api/connections/github/callback", error);
    return NextResponse.json({ error: "Unexpected error" }, { status: 500 });
  }
}
