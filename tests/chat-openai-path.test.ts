import assert from "node:assert/strict";
import { NextResponse } from "next/server";

import {
  chatPromptContextFromIdentity,
  defaultCallChatDownstream,
  handleChatGet,
  handleChatPost,
  storedHistoryToOpenAI,
  type ChatHandlerDeps,
} from "@/lib/api/chat-handler";
import {
  DEFAULT_OPENAI_CHAT_MODEL,
  publicOpenAIChatError,
  resolveOpenAIChatModel,
} from "@/lib/api/openai-chat-config";
import type { RequestIdentity } from "@/lib/auth/request-identity";
import type { SyncUserProfile } from "@/lib/sync-profile/user-profile";
import { EMPTY_USER_PROFILE } from "@/lib/sync-profile/user-profile";

function identity(userId: string, name: string | null = null): RequestIdentity {
  return {
    mode: "authenticated",
    user: { id: userId, email: `${userId}@example.com`, name },
    workspace: { id: `ws-${userId}`, name: "Personal" },
  };
}

function profile(overrides: Partial<SyncUserProfile> = {}): SyncUserProfile {
  return {
    ...EMPTY_USER_PROFILE,
    name: "Ahmed",
    directness: "direct",
    workingToward: "Keep rent on time",
    currentStress: "Busy mornings",
    ...overrides,
  };
}

async function run() {
  assert.equal(DEFAULT_OPENAI_CHAT_MODEL, "gpt-4o-mini");
  assert.equal(resolveOpenAIChatModel({}).ok, true);
  const defaultModel = resolveOpenAIChatModel({});
  if (defaultModel.ok) {
    assert.equal(defaultModel.model, "gpt-4o-mini");
  }
  const configured = resolveOpenAIChatModel({ OPENAI_MODEL: "gpt-4o" });
  assert.equal(configured.ok, true);
  if (configured.ok) assert.equal(configured.model, "gpt-4o");
  assert.equal(resolveOpenAIChatModel({ OPENAI_MODEL: "gpt-not-real" }).ok, false);

  assert.equal(
    publicOpenAIChatError({ status: 401, message: "Incorrect API key provided" }).error,
    "Chat is unavailable",
  );
  assert.equal(
    publicOpenAIChatError({ message: "insufficient_quota" }).error,
    "Chat is temporarily unavailable",
  );
  assert.equal(publicOpenAIChatError({ status: 429 }).status, 429);
  assert.equal(
    publicOpenAIChatError({ status: 404, message: "The model does not exist" }).error,
    "Chat model is unavailable",
  );

  const missingKey = await defaultCallChatDownstream({
    body: { message: "Rent is due Friday." },
    message: "Rent is due Friday.",
    history: [],
    promptContext: {
      name: "Ahmed",
      tone: "direct",
      workingToward: "",
      currentStress: "",
    },
    env: {},
  });
  assert.equal(missingKey.ok, false);
  if (!missingKey.ok) {
    assert.equal(missingKey.status, 503);
    assert.equal(missingKey.error, "Chat is not configured");
  }

  const badModel = await defaultCallChatDownstream({
    body: { message: "Rent is due Friday." },
    message: "Rent is due Friday.",
    history: [],
    promptContext: {
      name: "Ahmed",
      tone: "direct",
      workingToward: "",
      currentStress: "",
    },
    env: {
      OPENAI_API_KEY: "sk-test-not-used",
      OPENAI_MODEL: "gpt-not-real",
    },
  });
  assert.equal(badModel.ok, false);
  if (!badModel.ok) {
    assert.equal(badModel.error, "Chat model is unavailable");
  }

  let savedUserId = "";
  let savedUserText = "";
  let savedReply = "";
  let loadedProfileFor = "";
  let historyFor = "";
  let promptName = "";
  let historyRoles: string[] = [];

  const deps = (overrides: Partial<ChatHandlerDeps> = {}): Partial<ChatHandlerDeps> => ({
    loadIdentity: async () => ({
      ok: true as const,
      identity: identity("user-owned", "Session Name"),
    }),
    consumeRateLimit: async () => ({
      ok: true as const,
      limit: 30,
      remaining: 29,
      resetAtMs: Date.now() + 3600_000,
      count: 1,
      retryAfterSeconds: 3600,
    }),
    loadProfile: async (userId) => {
      loadedProfileFor = userId;
      return profile();
    },
    loadHistory: async (userId) => {
      historyFor = userId;
      return [
        { role: "user", text: "Flight at 6:00 AM." },
        { role: "sync", text: "Tomorrow starts early." },
      ];
    },
    saveTurn: async (userId, userText, reply) => {
      savedUserId = userId;
      savedUserText = userText;
      savedReply = reply;
    },
    callChatDownstream: async (input) => {
      promptName = input.promptContext.name;
      historyRoles = input.history.map((entry) => entry.role);
      return {
        ok: true as const,
        reply: "Rent is due Friday.",
        source: "openai" as const,
      };
    },
    ...overrides,
  });

  const unauthorized = await handleChatPost(
    new Request("http://localhost/api/chat", {
      method: "POST",
      body: JSON.stringify({ message: "hello" }),
      headers: { "content-type": "application/json" },
    }),
    {
      loadIdentity: async () => ({
        ok: false as const,
        response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
      }),
    },
  );
  assert.equal(unauthorized.status, 401);

  const spoofed = await handleChatPost(
    new Request("http://localhost/api/chat", {
      method: "POST",
      body: JSON.stringify({
        message: "Rent is due Friday.",
        userId: "attacker",
        profile: { name: "Spoofed", tone: "gentle" },
      }),
      headers: { "content-type": "application/json" },
    }),
    deps(),
  );
  assert.equal(spoofed.status, 200);
  const spoofedBody = await spoofed.json();
  assert.equal(spoofedBody.reply, "Rent is due Friday.");
  assert.equal(spoofedBody.source, "openai");
  assert.equal(loadedProfileFor, "user-owned");
  assert.equal(historyFor, "user-owned");
  assert.equal(savedUserId, "user-owned");
  assert.equal(savedUserText, "Rent is due Friday.");
  assert.equal(savedReply, "Rent is due Friday.");
  assert.equal(promptName, "Ahmed");
  assert.deepEqual(historyRoles, ["user", "assistant"]);

  let savedAfterFailure = false;
  const openaiLimited = await handleChatPost(
    new Request("http://localhost/api/chat", {
      method: "POST",
      body: JSON.stringify({ message: "Rent is due Friday." }),
      headers: { "content-type": "application/json" },
    }),
    deps({
      saveTurn: async () => {
        savedAfterFailure = true;
      },
      callChatDownstream: async () => ({
        ok: false as const,
        status: 429 as const,
        error: "Chat is busy. Please try again later.",
      }),
    }),
  );
  assert.equal(openaiLimited.status, 429);
  assert.equal(savedAfterFailure, false);

  const getUnauthorized = await handleChatGet(
    new Request("http://localhost/api/chat"),
    {
      loadIdentity: async () => ({
        ok: false as const,
        response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
      }),
    },
  );
  assert.equal(getUnauthorized.status, 401);

  const getOwned = await handleChatGet(new Request("http://localhost/api/chat"), {
    loadIdentity: async () => ({
      ok: true as const,
      identity: identity("user-owned"),
    }),
    loadHistory: async (userId) => {
      assert.equal(userId, "user-owned");
      return [{ role: "user", text: "Rent is due Friday." }];
    },
  });
  assert.equal(getOwned.status, 200);
  const historyBody = await getOwned.json();
  assert.equal(historyBody.messages[0].text, "Rent is due Friday.");

  const histories: Record<string, { role: string; text: string }[]> = {
    "user-a": [{ role: "user", text: "A's secret rent." }],
    "user-b": [{ role: "user", text: "B's secret debt." }],
  };
  const getA = await handleChatGet(new Request("http://localhost/api/chat"), {
    loadIdentity: async () => ({
      ok: true as const,
      identity: identity("user-a"),
    }),
    loadHistory: async (userId) => histories[userId] ?? [],
  });
  const getB = await handleChatGet(new Request("http://localhost/api/chat"), {
    loadIdentity: async () => ({
      ok: true as const,
      identity: identity("user-b"),
    }),
    loadHistory: async (userId) => histories[userId] ?? [],
  });
  const bodyA = await getA.json();
  const bodyB = await getB.json();
  assert.equal(bodyA.messages[0].text, "A's secret rent.");
  assert.equal(bodyB.messages[0].text, "B's secret debt.");
  assert.equal(
    bodyA.messages.some((message: { text: string }) => /B's secret/.test(message.text)),
    false,
  );

  const mapped = storedHistoryToOpenAI([
    { role: "user", text: "Flight at 6:00 AM." },
    { role: "sync", text: "Tomorrow starts early." },
  ]);
  assert.deepEqual(
    mapped.map((entry) => entry.role),
    ["user", "assistant"],
  );

  const context = chatPromptContextFromIdentity(identity("user-owned"), profile());
  assert.equal(context.name, "Ahmed");
  assert.equal(context.tone, "direct");

  console.log("chat openai path tests passed");
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
