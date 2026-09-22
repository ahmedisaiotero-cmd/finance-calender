import { createHash, randomBytes } from "node:crypto";

import { GithubConnectorError } from "@/lib/connectors/github/errors";
import type { GithubFetch } from "@/lib/connectors/github/client";

export const GITHUB_OAUTH_AUTHORIZE_URL = "https://github.com/login/oauth/authorize";
export const GITHUB_OAUTH_TOKEN_URL = "https://github.com/login/oauth/access_token";

/** Classic OAuth has no checks-read-only scope. Identity bind only; public commits. */
export const GITHUB_READ_SCOPES = ["read:user"] as const;

export type GithubOAuthConfig = {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
};

export type GithubOAuthStart = {
  authorizeUrl: string;
  state: string;
  codeVerifier: string;
};

export type GithubTokenExchange = {
  accessToken: string;
  scope: string;
  tokenType: string;
};

export function requireGithubOAuthConfig(
  env: Record<string, string | undefined>,
): GithubOAuthConfig {
  const clientId = env.GITHUB_CLIENT_ID?.trim();
  const clientSecret = env.GITHUB_CLIENT_SECRET?.trim();
  const redirectUri = env.GITHUB_OAUTH_REDIRECT_URI?.trim();
  if (!clientId || !clientSecret || !redirectUri) {
    throw new GithubConnectorError(
      "github_oauth_unconfigured",
      "GitHub OAuth is not configured",
      503,
    );
  }
  return { clientId, clientSecret, redirectUri };
}

export function assertExactRedirectUri(
  configured: string,
  requested: string,
): void {
  if (configured !== requested) {
    throw new GithubConnectorError(
      "redirect_mismatch",
      "OAuth redirect URI must match the configured allowlist exactly",
      400,
    );
  }
}

function base64url(buffer: Buffer): string {
  return buffer
    .toString("base64")
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replaceAll("=", "");
}

export function createGithubOAuthStart(config: GithubOAuthConfig): GithubOAuthStart {
  const state = base64url(randomBytes(24));
  const codeVerifier = base64url(randomBytes(32));
  const challenge = base64url(createHash("sha256").update(codeVerifier).digest());
  const params = new URLSearchParams({
    client_id: config.clientId,
    redirect_uri: config.redirectUri,
    scope: GITHUB_READ_SCOPES.join(" "),
    state,
    code_challenge: challenge,
    code_challenge_method: "S256",
  });
  return {
    authorizeUrl: `${GITHUB_OAUTH_AUTHORIZE_URL}?${params.toString()}`,
    state,
    codeVerifier,
  };
}

export async function exchangeGithubOAuthCode(input: {
  config: GithubOAuthConfig;
  code: string;
  codeVerifier: string;
  fetchImpl?: GithubFetch;
}): Promise<GithubTokenExchange> {
  if (!input.code.trim() || !input.codeVerifier.trim()) {
    throw new GithubConnectorError("invalid_oauth_code", "OAuth code is missing");
  }
  const fetchImpl = input.fetchImpl ?? fetch;
  const response = await fetchImpl(GITHUB_OAUTH_TOKEN_URL, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      client_id: input.config.clientId,
      client_secret: input.config.clientSecret,
      code: input.code,
      redirect_uri: input.config.redirectUri,
      code_verifier: input.codeVerifier,
    }),
  });
  if (!response.ok) {
    throw new GithubConnectorError(
      "oauth_exchange_failed",
      "GitHub token exchange failed",
      502,
    );
  }
  const body = (await response.json()) as {
    access_token?: unknown;
    scope?: unknown;
    token_type?: unknown;
    error?: unknown;
  };
  if (typeof body.access_token !== "string" || !body.access_token) {
    throw new GithubConnectorError(
      "oauth_exchange_failed",
      typeof body.error === "string" ? body.error : "GitHub did not return a token",
      502,
    );
  }
  return {
    accessToken: body.access_token,
    scope: typeof body.scope === "string" ? body.scope : "",
    tokenType: typeof body.token_type === "string" ? body.token_type : "bearer",
  };
}

export async function fetchGithubAuthenticatedUser(input: {
  accessToken: string;
  fetchImpl?: GithubFetch;
}): Promise<{ id: string; login: string }> {
  const fetchImpl = input.fetchImpl ?? fetch;
  const response = await fetchImpl("https://api.github.com/user", {
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${input.accessToken}`,
      "X-GitHub-Api-Version": "2022-11-28",
      "User-Agent": "sync-github-vertical-slice",
    },
  });
  if (!response.ok) {
    throw new GithubConnectorError(
      "github_user_failed",
      "GitHub user lookup failed",
      502,
    );
  }
  const body = (await response.json()) as { id?: unknown; login?: unknown };
  if (typeof body.id !== "number" || typeof body.login !== "string") {
    throw new GithubConnectorError(
      "github_user_failed",
      "GitHub user payload was not usable",
      502,
    );
  }
  return { id: String(body.id), login: body.login };
}
