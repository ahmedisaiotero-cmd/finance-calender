"use client";

import { useMemo, useState } from "react";

import { attemptBriefCapture } from "@/lib/mobile-prototype/capture-brief-input";
import { loadLifeProfile } from "@/lib/mobile-prototype/life-profile";
import { profileTone } from "@/lib/sync-profile/user-profile";
import { useCapturedItems } from "@/lib/captured-items";
import { loadActiveWorkSchedule } from "@/lib/user-timeline-context";
import { cn } from "@/lib/utils";

type ChatMessage = {
  id: string;
  role: "user" | "sync";
  text: string;
};

const CHAT_STORAGE_KEY = "sync.chatHistory";

function loadChatHistory(): ChatMessage[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(CHAT_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as ChatMessage[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveChatHistory(messages: ChatMessage[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(messages.slice(-40)));
}

function fallbackReply(userText: string, name: string | null, tone: string): string {
  const lower = userText.toLowerCase();
  const who = name?.trim() || "you";
  const gentle = tone === "gentle";
  const direct = tone === "direct";

  if (/\b(stress|anxious|overwhelm|tired|exhausted)\b/.test(lower)) {
    return gentle
      ? `That sounds like a lot, ${who}. Want to tell me what's weighing on you most — or should I keep today lighter in your briefing?`
      : direct
        ? `Noted. I'll keep the briefing lighter today.`
        : `That's a lot, ${who}. I'll readjust your briefing — want to say more?`;
  }

  if (/\b(skip|didn't|did not|forgot)\b/.test(lower)) {
    return "Got it — no judgment. Want to move it, or let it go this week?";
  }

  if (/\b(money|rent|bill|pay|budget|spent)\b/.test(lower)) {
    return "I'll fold that into what matters financially — calm heads up, not alarms.";
  }

  if (/\b(family|mom|dad|partner|wife|husband|kids)\b/.test(lower)) {
    return "People first. I'll remember this when choosing what deserves your attention.";
  }

  return "Thanks for telling me. I'll readjust your briefing around this.";
}

export function ChatSurface() {
  const { activeItems, addCapturedItem, updateCapturedItem, softDeleteCapturedItem } =
    useCapturedItems();
  const profile = loadLifeProfile();
  const tone = profileTone(profile);

  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    const stored = loadChatHistory();
    if (stored.length > 0) return stored;
    return [
      {
        id: "welcome",
        role: "sync",
        text: profile.name
          ? `Hi ${profile.name}. What's on your mind — or what should I know better about your week?`
          : "What's on your mind — or what should I know better about your week?",
      },
    ];
  });
  const [pending, setPending] = useState(false);

  const reference = useMemo(() => new Date(), [messages.length]);

  const send = async () => {
    const trimmed = input.trim();
    if (!trimmed || pending) return;

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      text: trimmed,
    };

    attemptBriefCapture(
      trimmed,
      {
        items: activeItems,
        workSchedule: loadActiveWorkSchedule() ?? null,
        reference,
      },
      {
        addCapturedItem,
        updateCapturedItem,
        softDeleteCapturedItem,
      },
    );

    const nextMessages = [...messages, userMessage];
    setMessages(nextMessages);
    setInput("");
    setPending(true);

    let reply = fallbackReply(trimmed, profile.name, tone);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: trimmed,
          profile: {
            name: profile.name,
            tone,
            workingToward: profile.workingToward,
            currentStress: profile.currentStress,
          },
          history: nextMessages.slice(-6).map((m) => ({
            role: m.role === "sync" ? "assistant" : "user",
            content: m.text,
          })),
        }),
      });

      if (response.ok) {
        const data = (await response.json()) as { reply?: string };
        if (data.reply?.trim()) {
          reply = data.reply.trim();
        }
      }
    } catch {
      // use fallback
    }

    const syncMessage: ChatMessage = {
      id: `sync-${Date.now()}`,
      role: "sync",
      text: reply,
    };

    const finalMessages = [...nextMessages, syncMessage];
    setMessages(finalMessages);
    saveChatHistory(finalMessages);
    setPending(false);
  };

  return (
    <div className="mx-auto flex h-[calc(100vh-8rem)] max-w-2xl flex-col px-6">
      <header className="border-b border-border/40 py-6">
        <h1 className="text-2xl font-semibold tracking-tight">Chat</h1>
        <p className="mt-1 text-sm text-muted-foreground">Curious, not pushy.</p>
      </header>

      <div className="flex-1 space-y-3 overflow-y-auto py-6">
        {messages.map((message) => (
          <div
            key={message.id}
            className={cn(
              "max-w-[88%] rounded-2xl px-4 py-3 text-base leading-relaxed",
              message.role === "user"
                ? "ml-auto bg-primary text-primary-foreground"
                : "border border-border/40 bg-card/50 text-foreground",
            )}
          >
            {message.text}
          </div>
        ))}
        {pending && (
          <p className="text-sm text-muted-foreground">Sync is thinking…</p>
        )}
      </div>

      <footer className="border-t border-border/40 py-4">
        <div className="flex gap-2">
          <textarea
            rows={2}
            className="min-h-11 flex-1 resize-none rounded-xl border border-border/60 bg-muted/10 px-4 py-3 text-base outline-none focus:border-primary/40"
            placeholder="Tell Sync something…"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void send();
              }
            }}
          />
          <button
            type="button"
            disabled={!input.trim() || pending}
            onClick={() => void send()}
            className="self-end rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-40"
          >
            Send
          </button>
        </div>
        {messages.length >= 6 && (
          <p className="mt-3 text-xs text-muted-foreground">
            That&apos;s enough for now — your briefing will readjust tomorrow.
          </p>
        )}
      </footer>
    </div>
  );
}
