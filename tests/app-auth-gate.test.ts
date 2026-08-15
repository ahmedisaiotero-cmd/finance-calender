import assert from "node:assert/strict";

import {
  decideAppAuthGate,
  isAuthPublicPath,
  localProfileImpliesAuthenticated,
  publicAuthErrorMessage,
} from "@/lib/auth/app-auth-gate";
import { isSyncDemoMode } from "@/lib/auth/demo-mode";
import { chatRateLimitSubject } from "@/lib/api/chat-rate-limit-config";
import { resolveIdentityAccess } from "@/lib/auth/request-identity";

{
  // Local profile / onboarding never unlocks the app.
  assert.equal(
    localProfileImpliesAuthenticated({
      name: "ahmed",
      onboardingComplete: true,
    }),
    false,
  );
  assert.equal(localProfileImpliesAuthenticated(null), false);
}

{
  assert.equal(isAuthPublicPath("/login"), true);
  assert.equal(isAuthPublicPath("/sync-lab"), true);
  assert.equal(isAuthPublicPath("/mobile/brief"), true);
  assert.equal(isAuthPublicPath("/api/chat"), true);
  assert.equal(isAuthPublicPath("/"), false);
  assert.equal(isAuthPublicPath("/settings"), false);
  assert.equal(isAuthPublicPath("/onboarding"), false);
}

{
  // No session → login for app routes.
  assert.deepEqual(
    decideAppAuthGate({
      pathname: "/",
      hasTrustedSession: false,
      supabaseConfigured: true,
      demoMode: false,
    }),
    { action: "redirect", to: "/login" },
  );

  // Valid session → app.
  assert.deepEqual(
    decideAppAuthGate({
      pathname: "/",
      hasTrustedSession: true,
      supabaseConfigured: true,
      demoMode: false,
    }),
    { action: "allow" },
  );

  // Login while already authenticated → home.
  assert.deepEqual(
    decideAppAuthGate({
      pathname: "/login",
      hasTrustedSession: true,
      supabaseConfigured: true,
      demoMode: false,
    }),
    { action: "redirect", to: "/" },
  );

  // Login without session stays on login.
  assert.deepEqual(
    decideAppAuthGate({
      pathname: "/login",
      hasTrustedSession: false,
      supabaseConfigured: true,
      demoMode: false,
    }),
    { action: "allow" },
  );

  // Explicit non-production demo allows app without session.
  assert.deepEqual(
    decideAppAuthGate({
      pathname: "/chat",
      hasTrustedSession: false,
      supabaseConfigured: true,
      demoMode: true,
    }),
    { action: "allow" },
  );

  // Missing config still forces login redirect for app pages.
  assert.deepEqual(
    decideAppAuthGate({
      pathname: "/settings",
      hasTrustedSession: false,
      supabaseConfigured: false,
      demoMode: false,
    }),
    { action: "redirect", to: "/login" },
  );
}

{
  // Production cannot activate demo.
  assert.equal(
    isSyncDemoMode({
      NODE_ENV: "production",
      SYNC_DEMO_MODE: "true",
    } as NodeJS.ProcessEnv),
    false,
  );

  // Local profile flag is not identity.
  const denied = resolveIdentityAccess({
    session: null,
    demoMode: false,
  });
  assert.equal(denied.ok, false);

  // Trusted subject ignores client spoofing.
  assert.equal(
    chatRateLimitSubject(
      { user: { id: "user-trusted" } },
      { userId: "attacker", workspaceId: "ws-x" },
    ),
    "user-trusted",
  );
}

{
  assert.equal(
    publicAuthErrorMessage({ message: "Invalid login credentials" }),
    "Email or password is incorrect.",
  );
  assert.equal(
    publicAuthErrorMessage({ message: "Email not confirmed" }),
    "Confirm your email before signing in.",
  );
  const generic = publicAuthErrorMessage({
    message: "JWT eyJhbGciOi secret stack trace /Users/ahmed/...",
  });
  assert.equal(generic.includes("eyJ"), false);
  assert.equal(generic.includes("/Users/"), false);
  assert.equal(generic.includes("stack"), false);
}

{
  // Simulated refresh: session still present → still allow app.
  const beforeRefresh = decideAppAuthGate({
    pathname: "/life",
    hasTrustedSession: true,
    supabaseConfigured: true,
    demoMode: false,
  });
  const afterRefresh = decideAppAuthGate({
    pathname: "/life",
    hasTrustedSession: true,
    supabaseConfigured: true,
    demoMode: false,
  });
  assert.deepEqual(beforeRefresh, afterRefresh);
  assert.equal(afterRefresh.action, "allow");

  // Expired session → login.
  assert.deepEqual(
    decideAppAuthGate({
      pathname: "/life",
      hasTrustedSession: false,
      supabaseConfigured: true,
      demoMode: false,
    }),
    { action: "redirect", to: "/login" },
  );

  // Sign-out equivalent: no session on login path stays on login.
  assert.equal(
    decideAppAuthGate({
      pathname: "/login",
      hasTrustedSession: false,
      supabaseConfigured: true,
      demoMode: false,
    }).action,
    "allow",
  );
}

console.log("app-auth-gate tests passed");
