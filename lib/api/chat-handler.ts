import { createOpenAI } from "@ai-sdk/openai";
import { generateText } from "ai";
import { NextResponse } from "next/server";

import {
  CHAT_MAX_HISTORY_ENTRIES,
  clampChatText,
  sanitizeChatHistory,
  validateChatMessage,
  type ChatHistoryEntry,
} from "@/lib/api/chat-request-guards";
import { chatRateLimitSubject } from "@/lib/api/chat-rate-limit-config";
import {
  consumeChatRateLimit,
  type ChatRateLimitDecision,
} from "@/lib/api/chat-rate-limit";
import {
  DEFAULT_OPENAI_CHAT_MODEL,
  logChatDownstreamFailure,
  publicOpenAIChatError,
  resolveOpenAIApiKey,
  resolveOpenAIChatModel,
} from "@/lib/api/openai-chat-config";
import { loadRequestIdentity } from "@/lib/auth/load-request-identity";
import type { RequestIdentity } from "@/lib/auth/request-identity";
import {
  appendChatMessage,
  loadChatHistory,
  loadRemoteProfile,
} from "@/lib/sync-profile/remote-profile";
import type { SyncUserProfile } from "@/lib/sync-profile/user-profile";

export type ChatRequestBody = {
  message: string;
  profile?: {
    name?: string;
    tone?: string;
    workingToward?: string;
    currentStress?: string;
  };
  history?: { role: "user" | "assistant"; content: string }[];
  userId?: string;
  ownerId?: string;
  workspaceId?: string;
};

export type ChatPromptContext = {
  name: string;
  tone: string;
  workingToward: string;
  currentStress: string;
};

export function fallbackReply(body: ChatRequestBody): string {
  const lower = body.message.toLowerCase();
  const who = clampChatText(body.profile?.name, 80) || "you";
  const tone = clampChatText(body.profile?.tone, 40) || "balanced";

  if (/\b(skip|didn't|did not|forgot)\b/.test(lower)) {
    return "Got it — no judgment. Want to move it, or let it go this week?";
  }

  if (/\b(stress|anxious|overwhelm|tired)\b/.test(lower)) {
    return tone === "direct"
      ? `Noted, ${who}. I'll keep the briefing lighter.`
      : `That sounds like a lot, ${who}. I'll readjust — want to say more?`;
  }

  return "Thanks for telling me. I'll readjust your briefing around this.";
}

export function chatPromptContextFromIdentity(
  identity: RequestIdentity,
  profile: SyncUserProfile | null,
): ChatPromptContext {
  return {
    name:
      clampChatText(profile?.name, 80) ||
      clampChatText(identity.user.name ?? "", 80) ||
      "the user",
    tone: clampChatText(profile?.directness, 40) || "balanced",
    workingToward: clampChatText(profile?.workingToward, 200),
    currentStress: clampChatText(profile?.currentStress, 200),
  };
}

export function systemPromptFromContext(context: ChatPromptContext) {
  return `You are Sync — a calm personal reasoning companion. Not a chatbot, not a coach.

Voice: curious, concise, compassionate. Never shame. Never say "failed", "missed", or "behind".
Reply in 1-3 short sentences. Ask at most one curious follow-up when it helps.
Tone setting: ${context.tone}.
User name: ${context.name}.
${context.workingToward ? `Working toward: ${context.workingToward}.` : ""}
${context.currentStress ? `Current stress context: ${context.currentStress}.` : ""}

If the user shares life events, acknowledge and remember the shape of it — do not invent facts.`;
}

/** @deprecated Use systemPromptFromContext with server-loaded profile. */
export function systemPrompt(body: ChatRequestBody) {
  return systemPromptFromContext({
    name: clampChatText(body.profile?.name, 80) || "the user",
    tone: clampChatText(body.profile?.tone, 40) || "balanced",
    workingToward: clampChatText(body.profile?.workingToward, 200),
    currentStress: clampChatText(body.profile?.currentStress, 200),
  });
}

export function storedHistoryToOpenAI(
  rows: { role: string; text: string }[],
): ChatHistoryEntry[] {
  return sanitizeChatHistory(
    rows.map((row) => ({
      role: row.role === "sync" ? "assistant" : "user",
      content: row.text,
    })),
  );
}

export type ChatDownstreamResult =
  | { ok: true; reply: string; source: "openai" }
  | { ok: false; status: 429 | 503; error: string };

export type ChatHandlerDeps = {
  loadIdentity: () => ReturnType<typeof loadRequestIdentity>;
  consumeRateLimit: (input: {
    subjectId: string;
  }) => Promise<ChatRateLimitDecision>;
  loadProfile?: (userId: string) => Promise<SyncUserProfile | null>;
  loadHistory?: (userId: string) => Promise<{ role: string; text: string }[]>;
  saveTurn?: (
    userId: string,
    userText: string,
    reply: string,
  ) => Promise<void>;
  callChatDownstream: (input: {
    body: ChatRequestBody;
    message: string;
    history: ChatHistoryEntry[];
    promptContext: ChatPromptContext;
  }) => Promise<ChatDownstreamResult>;
};

function rateLimitHeaders(decision: Extract<ChatRateLimitDecision, { limit: number }>) {
  return {
    "X-RateLimit-Limit": String(decision.limit),
    "X-RateLimit-Remaining": String(decision.remaining),
    "X-RateLimit-Reset": String(Math.ceil(decision.resetAtMs / 1000)),
  };
}

export async function defaultCallChatDownstream(input: {
  body: ChatRequestBody;
  message: string;
  history: ChatHistoryEntry[];
  promptContext: ChatPromptContext;
  env?: NodeJS.ProcessEnv | Record<string, string | undefined>;
}): Promise<ChatDownstreamResult> {
  const env = input.env ?? process.env;
  const apiKey = resolveOpenAIApiKey(env);
  if (!apiKey) {
    return { ok: false, status: 503, error: "Chat is not configured" };
  }

  const model = resolveOpenAIChatModel(env);
  if (!model.ok) {
    return { ok: false, status: 503, error: "Chat model is unavailable" };
  }

  try {
    const openai = createOpenAI({ apiKey });
    const { text } = await generateText({
      model: openai(model.model),
      system: systemPromptFromContext(input.promptContext),
      messages: [
        ...input.history.map((entry) => ({
          role: entry.role,
          content: entry.content,
        })),
        { role: "user" as const, content: input.message },
      ],
      maxTokens: 180,
      temperature: 0.6,
    });

    const reply = text.trim();
    if (!reply) {
      return { ok: false, status: 503, error: "Chat is temporarily unavailable" };
    }

    return { ok: true, reply, source: "openai" };
  } catch (error) {
    logChatDownstreamFailure(error);
    return { ok: false, ...publicOpenAIChatError(error) };
  }
}

async function defaultSaveTurn(
  userId: string,
  userText: string,
  reply: string,
) {
  await appendChatMessage(userId, "user", userText);
  await appendChatMessage(userId, "sync", reply);
}

export const defaultChatHandlerDeps: ChatHandlerDeps = {
  loadIdentity: loadRequestIdentity,
  consumeRateLimit: ({ subjectId }) => consumeChatRateLimit({ subjectId }),
  loadProfile: loadRemoteProfile,
  loadHistory: (userId) => loadChatHistory(userId, CHAT_MAX_HISTORY_ENTRIES),
  saveTurn: defaultSaveTurn,
  callChatDownstream: defaultCallChatDownstream,
};

/**
 * Authenticated, rate-limited chat handling.
 * Order: identity → payload validation → rate limit → context → downstream → save.
 */
export async function handleChatPost(
  request: Request,
  deps: Partial<ChatHandlerDeps> = {},
): Promise<NextResponse> {
  const {
    loadIdentity,
    consumeRateLimit,
    loadProfile,
    loadHistory,
    saveTurn,
    callChatDownstream,
  } = { ...defaultChatHandlerDeps, ...deps };
  const loadProfileFn = loadProfile ?? loadRemoteProfile;
  const loadHistoryFn =
    loadHistory ??
    ((userId: string) => loadChatHistory(userId, CHAT_MAX_HISTORY_ENTRIES));
  const saveTurnFn = saveTurn ?? defaultSaveTurn;

  const loaded = await loadIdentity();
  if (!loaded.ok) return loaded.response;

  const identity: RequestIdentity = loaded.identity;

  let body: ChatRequestBody;
  try {
    body = (await request.json()) as ChatRequestBody;
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const validated = validateChatMessage(body.message);
  if (!validated.ok) {
    return NextResponse.json(
      { error: validated.error },
      { status: validated.status },
    );
  }

  const subjectId = chatRateLimitSubject(identity, body);
  const limitDecision = await consumeRateLimit({ subjectId });

  if (!limitDecision.ok && limitDecision.reason === "misconfigured") {
    return NextResponse.json(
      { error: "Chat rate limit is not configured" },
      { status: 503 },
    );
  }

  if (!limitDecision.ok && limitDecision.reason === "store_unavailable") {
    return NextResponse.json(
      { error: "Chat temporarily unavailable" },
      { status: 503 },
    );
  }

  if (!limitDecision.ok && limitDecision.reason === "limited") {
    return NextResponse.json(
      { error: "Too many chat requests. Please try again later." },
      {
        status: 429,
        headers: {
          "Retry-After": String(limitDecision.retryAfterSeconds),
          ...rateLimitHeaders(limitDecision),
        },
      },
    );
  }

  if (!limitDecision.ok) {
    return NextResponse.json(
      { error: "Chat temporarily unavailable" },
      { status: 503 },
    );
  }

  let profile;
  let stored;
  try {
    profile = await loadProfileFn(identity.user.id);
    stored = await loadHistoryFn(identity.user.id);
  } catch (error) {
    console.error("POST /api/chat context", {
      name:
        error && typeof error === "object" && "name" in error
          ? String((error as { name?: unknown }).name ?? "Error")
          : "Error",
    });
    return NextResponse.json(
      { error: "Chat temporarily unavailable" },
      { status: 503 },
    );
  }
  const promptContext = chatPromptContextFromIdentity(identity, profile);

  const result = await callChatDownstream({
    body: { ...body, message: validated.message },
    message: validated.message,
    history: storedHistoryToOpenAI(stored),
    promptContext,
  });

  if (!result.ok) {
    return NextResponse.json(
      { error: result.error },
      { status: result.status },
    );
  }

  try {
    await saveTurnFn(identity.user.id, validated.message, result.reply);
  } catch (error) {
    console.error("POST /api/chat persist", {
      name:
        error && typeof error === "object" && "name" in error
          ? String((error as { name?: unknown }).name ?? "Error")
          : "Error",
    });
    return NextResponse.json(
      { error: "Chat temporarily unavailable" },
      { status: 503 },
    );
  }

  return NextResponse.json(
    { reply: result.reply, source: result.source },
    { headers: rateLimitHeaders(limitDecision) },
  );
}

export async function handleChatGet(
  _request: Request,
  deps: Partial<Pick<ChatHandlerDeps, "loadIdentity" | "loadHistory">> = {},
): Promise<NextResponse> {
  const loadIdentity = deps.loadIdentity ?? defaultChatHandlerDeps.loadIdentity;
  const loadHistory =
    deps.loadHistory ?? ((userId: string) => loadChatHistory(userId, 40));

  const loaded = await loadIdentity();
  if (!loaded.ok) return loaded.response;

  try {
    const messages = await loadHistory(loaded.identity.user.id);
    return NextResponse.json({ messages });
  } catch (error) {
    console.error("GET /api/chat history", {
      name:
        error && typeof error === "object" && "name" in error
          ? String((error as { name?: unknown }).name ?? "Error")
          : "Error",
    });
    return NextResponse.json(
      { error: "Chat temporarily unavailable" },
      { status: 503 },
    );
  }
}

export { DEFAULT_OPENAI_CHAT_MODEL };
