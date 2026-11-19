import assert from "node:assert/strict";

import {
  scrubSecretText,
  scrubSentryEvent,
  sentryDsnFromEnv,
  sentryInitOptions,
} from "@/lib/security/sentry-scrub";

{
  assert.equal(
    scrubSecretText("Contact owner@example.com with Bearer abc.def"),
    "Contact [redacted] with Bearer [redacted]",
  );
  assert.equal(scrubSecretText("sk-ABCDEFGHIJKLMNOP").includes("sk-ABCDEF"), false);
  assert.equal(
    scrubSecretText("eyJhbGciOiJIUzI1NiJ9.aaaa.bbbb").includes("eyJ"),
    false,
  );
}

{
  const event = scrubSentryEvent({
    message: "Failed for owner@example.com",
    request: {
      url: "https://app.example/api/chat?email=owner@example.com",
      cookies: { sb: "secret-cookie" },
      data: { messages: [{ text: "Rent is due Friday." }] },
      query_string: "email=owner@example.com",
      headers: {
        authorization: "Bearer super-secret-token",
        "x-sync-owner-secret": "lab-secret",
        "content-type": "application/json",
      },
    },
    user: {
      id: "user-1",
      email: "owner@example.com",
      username: "ahmed",
      ip_address: "203.0.113.9",
    },
    extra: {
      messages: [{ text: "Flight at 6:00 AM." }],
      note: "plain",
    },
    exception: {
      values: [{ type: "Error", value: "Token eyJhbGciOiJIUzI1NiJ9.aaaa.bbbb" }],
    },
  });

  assert.equal(event.message, "Failed for [redacted]");
  assert.equal(event.request?.data, undefined);
  assert.equal(event.request?.cookies, undefined);
  assert.equal(event.request?.query_string, undefined);
  assert.equal(event.request?.headers?.authorization, "[redacted]");
  assert.equal(event.request?.headers?.["x-sync-owner-secret"], "[redacted]");
  assert.equal(event.request?.headers?.["content-type"], "application/json");
  assert.equal(event.user?.id, "user-1");
  assert.equal(event.user?.email, undefined);
  assert.equal(event.user?.ip_address, undefined);
  assert.equal(event.extra?.messages, "[redacted]");
  assert.equal(event.extra?.note, "plain");
  assert.equal(event.exception?.values?.[0]?.value?.includes("eyJ"), false);
}

{
  assert.equal(sentryDsnFromEnv({}, "server"), undefined);
  assert.equal(sentryInitOptions({}, "server"), null);
  assert.equal(
    sentryDsnFromEnv({ SENTRY_DSN: "https://abc@o.ingest.sentry.io/1" }, "server"),
    "https://abc@o.ingest.sentry.io/1",
  );
  assert.equal(
    sentryDsnFromEnv({ SENTRY_DSN: "https://abc@o.ingest.sentry.io/1" }, "client"),
    undefined,
  );
  assert.equal(
    sentryDsnFromEnv(
      { NEXT_PUBLIC_SENTRY_DSN: "https://pub@o.ingest.sentry.io/1" },
      "client",
    ),
    "https://pub@o.ingest.sentry.io/1",
  );
}

console.log("sentry-scrub tests passed");
