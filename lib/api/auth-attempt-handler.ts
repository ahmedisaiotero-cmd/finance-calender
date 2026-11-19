import { NextResponse } from "next/server";

import {
  consumeEndpointRateLimit,
  endpointRateLimitResponse,
  endpointRateLimitSubject,
  type ConsumeEndpointRateLimit,
} from "@/lib/api/endpoint-rate-limit";
import { requestClientIp } from "@/lib/api/endpoint-rate-limit-config";
import type { ChatRateLimitStore } from "@/lib/api/chat-rate-limit";
import {
  requestPasswordReset,
  signInWithMagicLink,
  signInWithPassword,
  signUpWithPassword,
  type BrowserAuthClient,
} from "@/lib/auth/browser-auth";
import { PUBLIC_AUTH_ERROR } from "@/lib/auth/app-auth-gate";

export type AuthAttemptAction = "login" | "signup" | "magic_link" | "reset";

export type AuthAttemptBody = {
  action?: AuthAttemptAction;
  email?: string;
  password?: string;
  emailRedirectTo?: string;
  userMetadata?: Record<string, unknown>;
};

export type AuthAttemptDeps = {
  env?: NodeJS.ProcessEnv | Record<string, string | undefined>;
  consumeRateLimit?: ConsumeEndpointRateLimit;
  rateLimitStore?: ChatRateLimitStore;
  createClient?: () => BrowserAuthClient;
};

function bucketForAction(action: AuthAttemptAction): "login" | "signup" {
  return action === "signup" ? "signup" : "login";
}

export async function handleAuthAttemptPost(
  request: Request,
  deps: AuthAttemptDeps = {},
): Promise<NextResponse> {
  const env = deps.env ?? process.env;
  let body: AuthAttemptBody;
  try {
    body = (await request.json()) as AuthAttemptBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const action = body.action;
  if (
    action !== "login" &&
    action !== "signup" &&
    action !== "magic_link" &&
    action !== "reset"
  ) {
    return NextResponse.json({ error: "Unknown sign-in action." }, { status: 400 });
  }

  const email = body.email?.trim() ?? "";
  if (!email) {
    return NextResponse.json({ error: "Email is required." }, { status: 400 });
  }

  const bucket = bucketForAction(action);
  const consume = deps.consumeRateLimit ?? consumeEndpointRateLimit;
  const limited = await consume({
    bucket,
    subjectId: endpointRateLimitSubject(
      bucket,
      `${requestClientIp(request)}:${email}`,
    ),
    env,
    store: deps.rateLimitStore,
  });
  const limitedResponse = endpointRateLimitResponse(limited);
  if (limitedResponse) {
    const headers = limitedResponse.retryAfterSeconds
      ? { "Retry-After": String(limitedResponse.retryAfterSeconds) }
      : undefined;
    return NextResponse.json(
      { error: limitedResponse.error },
      { status: limitedResponse.status, headers },
    );
  }

  const authDeps = deps.createClient
    ? { createClient: deps.createClient, isConfigured: () => true }
    : undefined;

  if (action === "login") {
    if (!body.password) {
      return NextResponse.json({ error: "Password is required." }, { status: 400 });
    }
    const result = await signInWithPassword(
      { email, password: body.password },
      authDeps,
    );
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 401 });
    }
    return NextResponse.json({ ok: true, user: result.user });
  }

  if (action === "signup") {
    if (!body.password) {
      return NextResponse.json({ error: "Password is required." }, { status: 400 });
    }
    const result = await signUpWithPassword(
      {
        email,
        password: body.password,
        emailRedirectTo: body.emailRedirectTo,
        userMetadata: body.userMetadata,
      },
      authDeps,
    );
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }
    return NextResponse.json({ ok: true, user: result.user });
  }

  if (action === "magic_link") {
    if (!body.emailRedirectTo) {
      return NextResponse.json({ error: PUBLIC_AUTH_ERROR.generic }, { status: 400 });
    }
    const result = await signInWithMagicLink(
      {
        email,
        emailRedirectTo: body.emailRedirectTo,
        userMetadata: body.userMetadata,
      },
      authDeps,
    );
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }
    return NextResponse.json({ ok: true });
  }

  if (!body.emailRedirectTo) {
    return NextResponse.json({ error: PUBLIC_AUTH_ERROR.generic }, { status: 400 });
  }
  const result = await requestPasswordReset(
    { email, redirectTo: body.emailRedirectTo },
    authDeps,
  );
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }
  return NextResponse.json({ ok: true });
}
