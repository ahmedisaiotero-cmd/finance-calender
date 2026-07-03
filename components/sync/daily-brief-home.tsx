"use client";

import Link from "next/link";
import { useMemo, useState, useSyncExternalStore } from "react";

import { Pulse } from "@/components/sync/pulse";
import { generateDailyBrief } from "@/lib/brief/generate-daily-brief";
import { useCapturedItems } from "@/lib/captured-items";
import {
  attemptBriefCapture,
} from "@/lib/mobile-prototype/capture-brief-input";
import {
  CAPTURE_COMPACT_PLACEHOLDER,
  CAPTURE_PREVIEW,
} from "@/lib/mobile-prototype/sync-voice";
import { loadLifeProfile } from "@/lib/mobile-prototype/life-profile";
import { loadActiveWorkSchedule } from "@/lib/user-timeline-context";
import { cn } from "@/lib/utils";

export function DailyBriefHome() {
  const { activeItems, addCapturedItem, updateCapturedItem, softDeleteCapturedItem } =
    useCapturedItems();
  const [input, setInput] = useState("");
  const [notice, setNotice] = useState<string | null>(null);
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );

  const reference = useMemo(() => new Date(), [activeItems.length]);

  const brief = useMemo(() => {
    if (!mounted) return null;
    return generateDailyBrief({
      items: activeItems,
      workSchedule: loadActiveWorkSchedule() ?? null,
      profile: loadLifeProfile(),
      reference,
    });
  }, [mounted, activeItems, reference]);

  const handleCapture = () => {
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
      setNotice("Remembered.");
      setInput("");
      return;
    }

    if (attempt.status === "needs_clarification" || attempt.status === "too_vague" || attempt.status === "duplicate") {
      setNotice(attempt.message);
    }
  };

  if (!mounted || !brief) {
    return (
      <div className="sync-daily-brief mx-auto max-w-2xl px-6 py-10">
        <p className="text-muted-foreground">One moment — pulling your briefing together.</p>
      </div>
    );
  }

  return (
    <article className="sync-daily-brief mx-auto max-w-2xl px-6 pb-28 pt-6">
      <header className="mb-8 space-y-2">
        <time className="text-sm text-muted-foreground">{brief.dateLabel}</time>
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
          {brief.greeting}
        </h1>
      </header>

      <Pulse
        className="mb-8"
        state={brief.pulse.state}
        title={brief.pulse.title}
        message={brief.pulse.message}
      />

      {brief.reflection && (
        <p className="mb-4 text-base text-muted-foreground">{brief.reflection}</p>
      )}

      <div className="space-y-5">
        {brief.items.length === 0 ? (
          <p className="text-xl font-medium leading-snug text-foreground/90">
            {brief.lede}
          </p>
        ) : (
          brief.items.map((item, index) => (
            <section
              key={item.id}
              className={cn(
                "rounded-2xl border border-border/40 bg-card/40 p-5",
                index === 0 && "border-primary/20 bg-primary/5",
              )}
            >
              <p className="text-lg font-medium leading-snug text-foreground">
                {item.what}
              </p>
              {item.when && (
                <p className="mt-1 text-sm text-muted-foreground">{item.when}</p>
              )}
              {item.why && (
                <p className="mt-2 text-sm text-muted-foreground/90">{item.why}</p>
              )}
            </section>
          ))
        )}
      </div>

      {brief.futureContext && (
        <p className="mt-8 border-t border-border/40 pt-6 text-base text-muted-foreground">
          {brief.futureContext}
        </p>
      )}

      {brief.curiousHook && (
        <p className="mt-6 text-sm text-muted-foreground">
          {brief.curiousHook}{" "}
          <Link href="/chat" className="font-medium text-primary underline-offset-2 hover:underline">
            Open chat
          </Link>
        </p>
      )}

      <footer className="fixed inset-x-0 bottom-0 border-t border-border/40 bg-background/95 backdrop-blur-sm">
        <div className="mx-auto flex max-w-2xl items-center gap-2 px-6 py-4">
          <input
            aria-label="Tell Sync something"
            className="min-h-11 flex-1 rounded-xl border border-border/60 bg-muted/10 px-4 text-base outline-none focus:border-primary/40"
            placeholder={CAPTURE_COMPACT_PLACEHOLDER}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleCapture();
            }}
          />
          {input.trim() && (
            <button
              type="button"
              onClick={handleCapture}
              className="rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
            >
              {CAPTURE_PREVIEW}
            </button>
          )}
        </div>
        {notice && (
          <p className="mx-auto max-w-2xl px-6 pb-3 text-sm text-muted-foreground" role="status">
            {notice}
          </p>
        )}
      </footer>
    </article>
  );
}
