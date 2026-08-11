"use client";

import { useState } from "react";

import { useCapturedItems } from "@/lib/captured-items";
import {
  attemptBriefCapture,
  formatCaptureAcknowledgment,
} from "@/lib/mobile-prototype/capture-brief-input";
import { loadActiveWorkSchedule } from "@/lib/user-timeline-context";

type ConversationMessage = {
  id: string;
  role: "user" | "sync";
  text: string;
};

const STORAGE_KEY = "sync.mobile.conversation";

function loadMessages(): ConversationMessage[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as ConversationMessage[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveMessages(messages: ConversationMessage[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(messages.slice(-24)));
}

function syncReply(text: string) {
  const lower = text.toLowerCase();
  if (/\b(stress|drained|overwhelmed|tired|anxious)\b/.test(lower)) {
    return "Noted. I will keep this in context and keep your brief calm.";
  }
  if (/\b(money|rent|payday|subscriptions|bill|spending)\b/.test(lower)) {
    return "Understood. I will keep this visible in money context.";
  }
  if (/\b(mom|dad|family|birthday)\b/.test(lower)) {
    return "Got it. I will keep this around family timing.";
  }
  return "Got it. I will keep this in context.";
}

export function ConversationScreen() {
  const { activeItems, addCapturedItem, updateCapturedItem, softDeleteCapturedItem } =
    useCapturedItems();
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<ConversationMessage[]>(() => {
    const stored = loadMessages();
    if (stored.length > 0) return stored;
    return [
      {
        id: "conversation-welcome",
        role: "sync",
        text: "Tell me what happened, what changed, or what is coming up.",
      },
    ];
  });

  const send = () => {
    const trimmed = input.trim();
    if (!trimmed) return;

    const nextMessages = [
      ...messages,
      { id: `user-${Date.now()}`, role: "user" as const, text: trimmed },
    ];
    setMessages(nextMessages);
    setInput("");

    const attempt = attemptBriefCapture(
      trimmed,
      {
        items: activeItems,
        workSchedule: loadActiveWorkSchedule() ?? null,
        reference: new Date(),
      },
      {
        addCapturedItem,
        updateCapturedItem,
        softDeleteCapturedItem,
      },
    );

    let reply = syncReply(trimmed);
    if (attempt.status === "saved") {
      reply =
        attempt.kind === "create"
          ? formatCaptureAcknowledgment(attempt.result, "create")
          : attempt.kind === "edit"
            ? "Updated. I will use the latest version."
            : "Understood. I let that go.";
    } else if (attempt.status === "needs_clarification") {
      const hint = attempt.suggestions[0];
      reply = hint ? `${attempt.message} Try: ${hint}` : attempt.message;
    } else if (attempt.status === "too_vague" || attempt.status === "duplicate") {
      reply = attempt.message;
    }

    const finalMessages = [
      ...nextMessages,
      { id: `sync-${Date.now()}`, role: "sync" as const, text: reply },
    ];
    setMessages(finalMessages);
    saveMessages(finalMessages);
  };

  return (
    <article className="sync-ws-screen sync-ws-screen--chat">
      <header className="sync-ws-header">
        <h1 className="sync-ws-title">Chat</h1>
        <p className="sync-ws-subtitle">Short conversation. Quiet context updates.</p>
      </header>

      <div className="sync-ws-thread">
        {messages.map((message) => (
          <p
            key={message.id}
            className={`sync-ws-bubble ${
              message.role === "user"
                ? "sync-ws-bubble--user"
                : "sync-ws-bubble--sync"
            }`}
          >
            {message.text}
          </p>
        ))}
      </div>

      <footer className="sync-ws-composer-wrap">
        <textarea
          value={input}
          onChange={(event) => setInput(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              send();
            }
          }}
          rows={2}
          placeholder="Tell Sync what changed..."
          className="sync-ws-composer-input"
        />
        <button
          type="button"
          onClick={send}
          disabled={!input.trim()}
          className="sync-ws-composer-send"
        >
          Send
        </button>
      </footer>
    </article>
  );
}
