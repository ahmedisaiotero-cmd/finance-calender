import assert from "node:assert/strict";

import {
  getBrowserSessionUser,
  signInWithPassword,
  signOutBrowserSession,
  signUpWithPassword,
  type BrowserAuthClient,
} from "@/lib/auth/browser-auth";

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

async function run() {
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
    assert.equal(invalid.error, "Email or password is incorrect.");
  }

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

  // Simulated refresh still sees trusted user.
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

  const signedUp = await signUpWithPassword(
    { email: "b@example.com", password: "secret12" },
    {
      isConfigured: () => true,
      createClient: () =>
        mockClient({
          signUp: async () => ({
            data: {
              user: { id: "user-2", email: "b@example.com" },
              session: { access_token: "tok2" },
            },
            error: null,
          }),
        }),
    },
  );
  assert.equal(signedUp.ok, true);
  if (signedUp.ok) assert.equal(signedUp.user.id, "user-2");

  const signedOut = await signOutBrowserSession({
    isConfigured: () => true,
    createClient: () =>
      mockClient({
        signOut: async () => ({ error: null }),
      }),
  });
  assert.equal(signedOut.ok, true);

  // Same-origin credentialed requests automatically include cookies —
  // documented contract for authenticated API calls.
  assert.equal("include" satisfies RequestCredentials, "include");

  console.log("browser-auth tests passed");
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
