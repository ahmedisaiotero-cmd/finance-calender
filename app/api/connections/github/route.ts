import { NextResponse } from "next/server";

import { loadRequestIdentity } from "@/lib/auth/load-request-identity";
import { GithubConnectorError } from "@/lib/connectors/github/errors";
import { startGithubOAuthSession } from "@/lib/connectors/github/service";
import { putGithubOAuthHandshake } from "@/lib/db/github-access-store";
import { isDatabaseConfigured, prisma } from "@/lib/prisma";

export async function POST() {
  const loaded = await loadRequestIdentity();
  if (!loaded.ok) return loaded.response;
  if (!isDatabaseConfigured()) {
    return NextResponse.json(
      { error: "DATABASE_URL is not configured" },
      { status: 503 },
    );
  }

  try {
    const started = startGithubOAuthSession({ identity: loaded.identity });
    await putGithubOAuthHandshake(prisma, {
      owner: started.owner,
      state: started.state,
      codeVerifierCipher: started.codeVerifierCipher,
      redirectUri: started.redirectUri,
      expiresAt: new Date(Date.now() + 10 * 60 * 1000),
    });
    return NextResponse.json({ authorizeUrl: started.authorizeUrl });
  } catch (error) {
    if (error instanceof GithubConnectorError) {
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: error.status },
      );
    }
    console.error("/api/connections/github", error);
    return NextResponse.json({ error: "Unexpected error" }, { status: 500 });
  }
}
