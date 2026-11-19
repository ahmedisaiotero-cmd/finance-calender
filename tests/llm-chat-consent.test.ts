import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { NextResponse } from "next/server";

import { handleChatPost } from "@/lib/api/chat-handler";
import {
  hasLlmChatConsent,
  LLM_CHAT_CONSENT_CODE,
  LLM_CHAT_CONSENT_ERROR,
} from "@/lib/auth/llm-chat-consent";
import type { RequestIdentity } from "@/lib/auth/request-identity";

{
  assert.equal(hasLlmChatConsent(null), false);
  assert.equal(hasLlmChatConsent(undefined), false);
  assert.equal(hasLlmChatConsent("not-a-date"), false);
  assert.equal(hasLlmChatConsent(new Date("2026-11-19T12:00:00.000Z")), true);
}

{
  const ingest = readFileSync(
    join(process.cwd(), "lib/api/ai-activity-ingest-handler.ts"),
    "utf8",
  );
  const persist = readFileSync(join(process.cwd(), "lib/db/ai-activity.ts"), "utf8");
  const chat = readFileSync(join(process.cwd(), "lib/api/chat-handler.ts"), "utf8");
  assert.equal(/generateText|createOpenAI|@ai-sdk\/openai/.test(ingest), false);
  assert.equal(/generateText|createOpenAI|@ai-sdk\/openai/.test(persist), false);
  assert.equal(chat.includes("AiConversation"), false);
  assert.equal(chat.includes("persistAiConversationCapture"), false);
}

async function main() {
  let downstreamCalled = false;
  let rateLimited = false;
  const identity: RequestIdentity = {
    mode: "authenticated",
    user: { id: "user-owned", email: "owner@example.com", name: "Ahmed" },
    workspace: { id: "ws-owned", name: "Personal" },
  };

  const denied = await handleChatPost(
    new Request("http://localhost/api/chat", {
      method: "POST",
      body: JSON.stringify({ message: "Rent is due Friday." }),
      headers: { "content-type": "application/json" },
    }),
    {
      loadIdentity: async () => ({ ok: true as const, identity }),
      loadLlmConsent: async () => false,
      consumeRateLimit: async () => {
        rateLimited = true;
        return {
          ok: true as const,
          limit: 30,
          remaining: 29,
          resetAtMs: Date.now() + 3600_000,
          count: 1,
          retryAfterSeconds: 3600,
        };
      },
      callChatDownstream: async () => {
        downstreamCalled = true;
        return { ok: true as const, reply: "should not send", source: "openai" };
      },
    },
  );

  assert.equal(denied.status, 403);
  const body = await denied.json();
  assert.equal(body.error, LLM_CHAT_CONSENT_ERROR);
  assert.equal(body.code, LLM_CHAT_CONSENT_CODE);
  assert.equal(downstreamCalled, false);
  assert.equal(rateLimited, false);

  const unauthorized = await handleChatPost(
    new Request("http://localhost/api/chat", {
      method: "POST",
      body: JSON.stringify({ message: "Rent is due Friday." }),
      headers: { "content-type": "application/json" },
    }),
    {
      loadIdentity: async () => ({
        ok: false as const,
        response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
      }),
      loadLlmConsent: async () => true,
      consumeRateLimit: async () => {
        throw new Error("should not rate-limit unauthorized chat");
      },
      callChatDownstream: async () => {
        throw new Error("should not call OpenAI");
      },
    },
  );
  assert.equal(unauthorized.status, 401);

  console.log("llm-chat-consent tests passed");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
