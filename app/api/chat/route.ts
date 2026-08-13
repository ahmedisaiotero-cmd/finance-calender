import { createOpenAI } from "@ai-sdk/openai";
import { generateText } from "ai";
import { NextResponse } from "next/server";

import {
  clampChatText,
  sanitizeChatHistory,
  validateChatMessage,
} from "@/lib/api/chat-request-guards";

type ChatRequest = {
  message: string;
  profile?: {
    name?: string;
    tone?: string;
    workingToward?: string;
    currentStress?: string;
  };
  history?: { role: "user" | "assistant"; content: string }[];
};

function fallbackReply(body: ChatRequest): string {
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

function systemPrompt(body: ChatRequest) {
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

export async function POST(request: Request) {
  let body: ChatRequest;

  try {
    body = (await request.json()) as ChatRequest;
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

  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    return NextResponse.json({ reply: fallbackReply(body), source: "fallback" });
  }

  try {
    const openai = createOpenAI({ apiKey });
    const history = sanitizeChatHistory(body.history);

    const { text } = await generateText({
      model: openai("gpt-4o-mini"),
      system: systemPrompt(body),
      messages: [
        ...history.map((entry) => ({
          role: entry.role,
          content: entry.content,
        })),
        { role: "user" as const, content: validated.message },
      ],
      maxTokens: 180,
      temperature: 0.6,
    });

    return NextResponse.json({
      reply: text.trim() || fallbackReply(body),
      source: "openai",
    });
  } catch (error) {
    console.error("POST /api/chat", error);
    return NextResponse.json({
      reply: fallbackReply(body),
      source: "fallback",
    });
  }
}
