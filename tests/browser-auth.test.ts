import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

import {
  PUBLIC_AUTH_ERROR,
  publicAuthErrorMessage,
} from "@/lib/auth/app-auth-gate";
import {
  getBrowserSessionUser,
  signInWithPassword,
  signOutBrowserSession,
  signUpWithPassword,
  type BrowserAuthClient,
} from "@/lib/auth/browser-auth";
import {
  isPublicSupabaseAnonKey,
  isSecretSupabaseApiKey,
  isSupabaseBrowserConfigured,
  isSupabaseConfigured,
} from "@/lib/supabase/env";

function mockClient(handlers: {
  signIn?: BrowserAuthClient["auth"]["signInWithPassword"];
  signUp?: BrowserAuthClient["auth"]["signUp"];
  signOut?: BrowserAuthClient["auth"]["signOut"];
  getUser?: BrowserAuthClient["auth"]["getUser"];
}): BrowserAuthClient {
  return {
    auth: {
      signInWithPassword:
        handlers.signIn ??
        (async () => ({
          data: { user: null, session: null },
          error: { message: "unmocked signIn" },
        })),
      signUp:
        handlers.signUp ??
        (async () => ({
          data: { user: null, session: null },
          error: { message: "unmocked signUp" },
        })),
      signOut: handlers.signOut ?? (async () => ({ error: null })),
      getUser:
        handlers.getUser ??
        (async () => ({
          data: { user: null },
          error: null,
        })),
    },
  };
}

{
  assert.equal(isSecretSupabaseApiKey("sb_secret_example"), true);
  assert.equal(isPublicSupabaseAnonKey("sb_secret_example"), false);
  assert.equal(isPublicSupabaseAnonKey("sb_publishable_example"), true);
  assert.equal(isPublicSupabaseAnonKey("eyJhbGciOi.example"), true);
  assert.equal(isPublicSupabaseAnonKey("paste_your_anon_key_here"), false);
  assert.equal(
    isSupabaseBrowserConfigured(
      "https://example.supabase.co",
      "sb_secret_example",
    ),
    false,
  );
  assert.equal(
    isSupabaseConfigured("https://example.supabase.co", "sb_secret_example"),
    false,
  );
  assert.equal(
    isSupabaseBrowserConfigured(
      "https://example.supabase.co",
      "sb_publishable_example",
    ),
    true,
  );
}

async function run() {
{
  const missing = await signInWithPassword(
    { email: "a@example.com", password: "secret12" },
    { isConfigured: () => false, createClient: () => mockClient({}) },
  );
  assert.equal(missing.ok, false);
  if (!missing.ok) assert.equal(missing.error, PUBLIC_AUTH_ERROR.config);
}

{
  let signInCalls = 0;
  const signedIn = await signInWithPassword(
    { email: "a@example.com", password: "secret12" },
    {
      isConfigured: () => true,
      createClient: () =>
        mockClient({
          signIn: async () => {
            signInCalls += 1;
            return {
              data: {
                user: { id: "user-1", email: "a@example.com" },
                session: { access_token: "tok" },
              },
              error: null,
            };
          },
        }),
    },
  );
  assert.equal(signedIn.ok, true);
  if (signedIn.ok) assert.equal(signedIn.user.id, "user-1");
  assert.equal(signInCalls, 1);

  const invalid = await signInWithPassword(
    { email: "a@example.com", password: "bad" },
    {
      isConfigured: () => true,
      createClient: () =>
        mockClient({
          signIn: async () => ({
            data: { user: null, session: null },
            error: { message: "Invalid login credentials" },
          }),
        }),
    },
  );
  assert.equal(invalid.ok, false);
  if (!invalid.ok) {
    assert.equal(invalid.error, PUBLIC_AUTH_ERROR.invalidCredentials);
    assert.notEqual(invalid.error, PUBLIC_AUTH_ERROR.config);
  }

  const network = await signInWithPassword(
    { email: "a@example.com", password: "secret12" },
    {
      isConfigured: () => true,
      createClient: () =>
        mockClient({
          signIn: async () => {
            throw new Error("Failed to fetch");
          },
        }),
    },
  );
  assert.equal(network.ok, false);
  if (!network.ok) assert.equal(network.error, PUBLIC_AUTH_ERROR.network);
}

{
  const session = await getBrowserSessionUser({
    isConfigured: () => true,
    createClient: () =>
      mockClient({
        getUser: async () => ({
          data: { user: { id: "user-1", email: "a@example.com" } },
          error: null,
        }),
      }),
  });
  assert.equal(session?.id, "user-1");

  const refreshed = await getBrowserSessionUser({
    isConfigured: () => true,
    createClient: () =>
      mockClient({
        getUser: async () => ({
          data: { user: { id: "user-1", email: "a@example.com" } },
          error: null,
        }),
      }),
  });
  assert.equal(refreshed?.id, "user-1");

  const expired = await getBrowserSessionUser({
    isConfigured: () => true,
    createClient: () =>
      mockClient({
        getUser: async () => ({
          data: { user: null },
          error: { message: "session missing" },
        }),
      }),
  });
  assert.equal(expired, null);
}

{
  let signUpCalls = 0;
  const signedUp = await signUpWithPassword(
    { email: "b@example.com", password: "secret12" },
    {
      isConfigured: () => true,
      createClient: () =>
        mockClient({
          signUp: async () => {
            signUpCalls += 1;
            return {
              data: {
                user: { id: "user-2", email: "b@example.com" },
                session: { access_token: "tok2" },
              },
              error: null,
            };
          },
        }),
    },
  );
  assert.equal(signedUp.ok, true);
  if (signedUp.ok) assert.equal(signedUp.user.id, "user-2");
  assert.equal(signUpCalls, 1);

  const needsConfirm = await signUpWithPassword(
    { email: "c@example.com", password: "secret12" },
    {
      isConfigured: () => true,
      createClient: () =>
        mockClient({
          signUp: async () => ({
            data: {
              user: { id: "user-3", email: "c@example.com" },
              session: null,
            },
            error: null,
          }),
        }),
    },
  );
  assert.equal(needsConfirm.ok, false);
  if (!needsConfirm.ok) {
    assert.equal(needsConfirm.error, PUBLIC_AUTH_ERROR.confirmEmail);
  }

  const signedOut = await signOutBrowserSession({
    isConfigured: () => true,
    createClient: () =>
      mockClient({
        signOut: async () => ({ error: null }),
      }),
  });
  assert.equal(signedOut.ok, true);
}

console.log("browser-auth tests passed");
}

{
  assert.equal("include" satisfies RequestCredentials, "include");
}

{
  const source = fs.readFileSync(
    path.join(process.cwd(), "components/auth/login-form.tsx"),
    "utf8",
  );
  assert.match(source, /type="submit"/);
  assert.match(source, /type="button"/);
  assert.match(source, /handleSubmit\(event, "signin"\)/);
  assert.match(source, /handleSubmit\(event, "signup"\)/);
  assert.match(source, /event\?\.preventDefault\?\.\(\)/);
  assert.match(source, /signInWithPassword/);
  assert.match(source, /signUpWithPassword/);
}

{
  assert.equal(
    publicAuthErrorMessage({ message: "Invalid login credentials" }),
    PUBLIC_AUTH_ERROR.invalidCredentials,
  );
  assert.equal(
    publicAuthErrorMessage({ message: "Invalid API key" }),
    PUBLIC_AUTH_ERROR.config,
  );
  assert.equal(
    publicAuthErrorMessage({ message: "Email not confirmed" }),
    PUBLIC_AUTH_ERROR.emailConfirm,
  );
  assert.equal(
    publicAuthErrorMessage({ message: "Signups not allowed for this instance" }),
    PUBLIC_AUTH_ERROR.signupDisabled,
  );
  assert.equal(
    publicAuthErrorMessage({ message: "User not found" }),
    PUBLIC_AUTH_ERROR.accountMissing,
  );
  assert.equal(
    publicAuthErrorMessage({ message: "Failed to fetch" }),
    PUBLIC_AUTH_ERROR.network,
  );
  const generic = publicAuthErrorMessage({
    message: "JWT eyJhbGciOi secret stack trace /Users/ahmed/...",
  });
  assert.equal(generic, PUBLIC_AUTH_ERROR.generic);
  assert.equal(generic.includes("eyJ"), false);
  assert.equal(generic.includes("/Users/"), false);
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
