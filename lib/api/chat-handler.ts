import { createOpenAI } from "@ai-sdk/openai";
import { generateText } from "ai";
import { NextResponse } from "next/server";

import {
  clampChatText,
  sanitizeChatHistory,
  validateChatMessage,
} from "@/lib/api/chat-request-guards";
import {
  chatRateLimitSubject,
} from "@/lib/api/chat-rate-limit-config";
import {
  consumeChatRateLimit,
  type ChatRateLimitDecision,
} from "@/lib/api/chat-rate-limit";
import { loadRequestIdentity } from "@/lib/auth/load-request-identity";
import type { RequestIdentity } from "@/lib/auth/request-identity";

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

export function systemPrompt(body: ChatRequestBody) {
  const name = clampChatText(body.profile?.name, 80) || "the user";
  const tone = clampChatText(body.profile?.tone, 40) || "balanced";
  const goals = clampChatText(body.profile?.workingToward, 200);
  const stress = clampChatText(body.profile?.currentStress, 200);

  return `You are Sync — a calm personal reasoning companion. Not a chatbot, not a coach.

Voice: curious, concise, compassionate. Never shame. Never say "failed", "missed", or "behind".
Reply in 1-3 short sentences. Ask at most one curious follow-up when it helps.
Tone setting: ${tone}.
User name: ${name}.
${goals ? `Working toward: ${goals}.` : ""}
${stress ? `Current stress context: ${stress}.` : ""}

If the user shares life events, acknowledge and remember the shape of it — do not invent facts.`;
}

export type ChatDownstreamResult = {
  reply: string;
  source: "openai" | "fallback";
};

export type ChatHandlerDeps = {
  loadIdentity: () => ReturnType<typeof loadRequestIdentity>;
  consumeRateLimit: (input: {
    subjectId: string;
  }) => Promise<ChatRateLimitDecision>;
  callChatDownstream: (input: {
    body: ChatRequestBody;
    message: string;
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
}): Promise<ChatDownstreamResult> {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    return { reply: fallbackReply(input.body), source: "fallback" };
  }

  try {
    const openai = createOpenAI({ apiKey });
    const history = sanitizeChatHistory(input.body.history);

    const { text } = await generateText({
      model: openai("gpt-4o-mini"),
      system: systemPrompt(input.body),
      messages: [
        ...history.map((entry) => ({
          role: entry.role,
          content: entry.content,
        })),
        { role: "user" as const, content: input.message },
      ],
      maxTokens: 180,
      temperature: 0.6,
    });

    return {
      reply: text.trim() || fallbackReply(input.body),
      source: "openai",
    };
  } catch (error) {
    console.error("POST /api/chat downstream", error);
    return { reply: fallbackReply(input.body), source: "fallback" };
  }
}

export const defaultChatHandlerDeps: ChatHandlerDeps = {
  loadIdentity: loadRequestIdentity,
  consumeRateLimit: ({ subjectId }) => consumeChatRateLimit({ subjectId }),
  callChatDownstream: defaultCallChatDownstream,
};

/**
 * Authenticated, rate-limited chat handling.
 * Order: identity → payload validation → rate limit → downstream.
 */
export async function handleChatPost(
  request: Request,
  deps: ChatHandlerDeps = defaultChatHandlerDeps,
): Promise<NextResponse> {
  const loaded = await deps.loadIdentity();
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

  // Ownership / subject never comes from the client body.
  const subjectId = chatRateLimitSubject(identity, body);
  const limitDecision = await deps.consumeRateLimit({ subjectId });

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

  const result = await deps.callChatDownstream({
    body: { ...body, message: validated.message },
    message: validated.message,
  });

  return NextResponse.json(
    { reply: result.reply, source: result.source },
    { headers: rateLimitHeaders(limitDecision) },
  );
}
