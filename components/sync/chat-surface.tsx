"use client";

import { useEffect, useMemo, useState } from "react";

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

function welcomeMessage(name: string | null): ChatMessage {
  return {
    id: "welcome",
    role: "sync",
    text: name
      ? `Hi ${name}. What's on your mind — or what should I know better about your week?`
      : "What's on your mind — or what should I know better about your week?",
  };
}

export function ChatSurface() {
  const { activeItems, addCapturedItem, updateCapturedItem, softDeleteCapturedItem } =
    useCapturedItems();
  const profile = loadLifeProfile();
  const tone = profileTone(profile);

  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>(() => [
    welcomeMessage(profile.name),
  ]);
  const [pending, setPending] = useState(false);

  const reference = useMemo(() => new Date(), [messages.length]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const response = await fetch("/api/chat", {
          method: "GET",
          credentials: "include",
        });
        if (!response.ok) return;
        const data = (await response.json()) as {
          messages?: { id: string; role: "user" | "sync"; text: string }[];
        };
        if (cancelled || !Array.isArray(data.messages) || data.messages.length === 0) {
          return;
        }
        setMessages(data.messages);
      } catch {
        // Keep the welcome line if history cannot load.
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

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

    let reply =
      "Thanks for telling me. I'll readjust your briefing around this.";

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: trimmed,
        }),
      });

      const data = (await response.json()) as { reply?: string; error?: string };
      if (response.ok && data.reply?.trim()) {
        reply = data.reply.trim();
      } else if (data.error?.trim()) {
        reply = data.error.trim();
      }
    } catch {
      reply = "Could not reach chat. Check your connection and try again.";
    }

    const syncMessage: ChatMessage = {
      id: `sync-${Date.now()}`,
      role: "sync",
      text: reply,
    };

    setMessages([...nextMessages, syncMessage]);
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
