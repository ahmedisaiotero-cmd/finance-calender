"use client";

import { useMemo, useState } from "react";

import { useCapturedItems } from "@/lib/captured-items";
import { attemptBriefCapture } from "@/lib/mobile-prototype/capture-brief-input";
import { buildDailyBrief, formatBriefDate, greetingForHour } from "@/lib/mobile-prototype/build-daily-brief";
import { buildTodayView } from "@/lib/mobile-prototype/build-today-view";
import { loadLifeProfile } from "@/lib/mobile-prototype/life-profile";
import { loadActiveWorkSchedule } from "@/lib/user-timeline-context";

type ConversationMessage = {
  id: string;
  role: "user" | "sync";
  text: string;
};

const CONVERSATION_STORAGE_KEY = "sync.mobile.conversation";

function loadRecentConversation(): ConversationMessage[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(CONVERSATION_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as ConversationMessage[];
    return Array.isArray(parsed) ? parsed.slice(-2) : [];
  } catch {
    return [];
  }
}

export function WorkspaceTodayScreen() {
  const { activeItems, addCapturedItem, updateCapturedItem, softDeleteCapturedItem } =
    useCapturedItems();
  const [input, setInput] = useState("");
  const [notice, setNotice] = useState<string | null>(null);
  const [recentConversation] = useState<ConversationMessage[]>(() => loadRecentConversation());

  const reference = useMemo(() => new Date(), [activeItems.length]);
  const profile = useMemo(() => loadLifeProfile(), []);

  const today = useMemo(() => {
    const brief = buildDailyBrief({
      items: activeItems,
      workSchedule: loadActiveWorkSchedule() ?? null,
      lifeProfile: profile,
      reference,
    });

    const view = buildTodayView({
      brief,
      consequences: brief.consequences ?? [],
      items: activeItems,
      reference,
      workSchedule: loadActiveWorkSchedule() ?? null,
    });

    return {
      dateLabel: formatBriefDate(reference),
      greeting: greetingForHour(reference.getHours(), profile.name || null),
      primary: view.primaryPriority.text,
      subtle: view.supportingPriorities[0]?.text ?? view.futureContext?.text ?? null,
    };
  }, [activeItems, profile, reference]);

  const capture = () => {
    const trimmed = input.trim();
    if (!trimmed) return;
    setNotice(null);

    const attempt = attemptBriefCapture(
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

    if (attempt.status === "saved") {
      setNotice("Saved to Sync context.");
      setInput("");
      return;
    }

    if (attempt.status === "needs_clarification") {
      setNotice(attempt.message);
      return;
    }

    if (attempt.status === "too_vague" || attempt.status === "duplicate") {
      setNotice(attempt.message);
      return;
    }
  };

  return (
    <article className="sync-ws-screen sync-ws-screen--today">
      <header className="sync-ws-header">
        <p className="sync-ws-date">{today.dateLabel}</p>
        <h1 className="sync-ws-greeting">{today.greeting}</h1>
      </header>

      <section className="sync-ws-brief">
        <p className="sync-ws-primary">{today.primary}</p>
        {today.subtle && <p className="sync-ws-supporting">{today.subtle}</p>}
      </section>

      {recentConversation.length > 0 && (
        <section className="sync-ws-recent">
          <p className="sync-ws-recent-label">Recent conversation</p>
          {recentConversation.map((message) => (
            <p key={message.id} className="sync-ws-recent-line" data-role={message.role}>
              {message.text}
            </p>
          ))}
        </section>
      )}

      <footer className="sync-ws-composer-wrap">
        <div className="sync-ws-composer">
          <textarea
            value={input}
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                capture();
              }
            }}
            rows={2}
            placeholder="Tell Sync what changed..."
            className="sync-ws-composer-input"
          />
          <button
            type="button"
            onClick={capture}
            disabled={!input.trim()}
            className="sync-ws-composer-send"
          >
            Save
          </button>
        </div>
        {notice && <p className="sync-ws-notice">{notice}</p>}
      </footer>
    </article>
  );
}
