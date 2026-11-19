import assert from "node:assert/strict";

import {
  assertSafeTransactionalVars,
  buildTransactionalMessage,
  isAllowedTransactionalTemplate,
  resolveTransactionalEmailConfig,
  sendTransactionalEmail,
  TRANSACTIONAL_TEMPLATES,
} from "@/lib/email/transactional";

{
  assert.equal(isAllowedTransactionalTemplate("account_deleted"), true);
  assert.equal(isAllowedTransactionalTemplate("newsletter"), false);
  assert.equal(isAllowedTransactionalTemplate("welcome_promo"), false);
  assert.deepEqual(Object.keys(TRANSACTIONAL_TEMPLATES), ["account_deleted"]);
}

{
  const message = buildTransactionalMessage({
    template: "account_deleted",
    to: "owner@example.com",
  });
  assert.match(message.subject, /deleted/i);
  assert.match(message.text, /Captures/);
  assert.equal(message.text.includes("Rent is due Friday"), false);
  assert.equal(/sk-|Bearer /i.test(message.text), false);
}

{
  assert.equal(assertSafeTransactionalVars({ note: "ok" }).ok, true);
  assert.equal(assertSafeTransactionalVars({ messages: "secret chat" }).ok, false);
  assert.equal(assertSafeTransactionalVars({ transcript: "flight" }).ok, false);
}

{
  assert.equal(resolveTransactionalEmailConfig({}).ok, false);
  assert.equal(
    resolveTransactionalEmailConfig({ RESEND_API_KEY: "re_test" }).ok,
    false,
  );
  assert.equal(
    resolveTransactionalEmailConfig({
      RESEND_API_KEY: "re_test",
      EMAIL_FROM: "Sync <sync@example.com>",
    }).ok,
    true,
  );
}

async function main() {
  const skipped = await sendTransactionalEmail(
    { template: "account_deleted", to: "owner@example.com" },
    { env: {} },
  );
  assert.deepEqual(skipped, { ok: true, skipped: "not_configured" });

  const invalid = await sendTransactionalEmail(
    { template: "account_deleted", to: "not-an-email" },
    { env: { RESEND_API_KEY: "re_test", EMAIL_FROM: "Sync <sync@example.com>" } },
  );
  assert.deepEqual(invalid, { ok: true, skipped: "invalid_recipient" });

  let sentBody = "";
  const sent = await sendTransactionalEmail(
    { template: "account_deleted", to: "owner@example.com" },
    {
      env: { RESEND_API_KEY: "re_test", EMAIL_FROM: "Sync <sync@example.com>" },
      fetchImpl: (async (_url, init) => {
        sentBody = String(init?.body ?? "");
        return new Response("{}", { status: 200 });
      }) as typeof fetch,
    },
  );
  assert.equal(sent.ok, true);
  assert.match(sentBody, /owner@example.com/);
  assert.equal(sentBody.includes("Rent is due"), false);
  assert.equal(sentBody.includes("messages"), false);

  const forbidden = await sendTransactionalEmail({
    template: "account_deleted",
    to: "owner@example.com",
    vars: { transcript: "captured chat" },
  });
  assert.equal(forbidden.ok, false);

  console.log("transactional-email tests passed");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
