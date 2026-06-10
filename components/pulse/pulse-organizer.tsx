"use client";

import { Mic } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { SyncPreviewPanel } from "@/components/pulse/sync-preview-panel";
import { TimelineDebugPanel } from "@/components/pulse/timeline-debug-panel";
import { generateForecast } from "@/lib/intelligence/forecast-engine";
import { MOCK_SYNC_USER_CONTEXT } from "@/lib/intelligence/sync-user-context";
import {
  type SyncDestination,
  useCapturedItems,
} from "@/lib/captured-items";
import { createPulsePlan } from "@/lib/pulse/create-pulse-plan";
import { getSyncReliefMessage } from "@/lib/pulse/relief-message";
import {
  resolveSyncDestinations,
  sanitizeSyncDestinations,
} from "@/lib/pulse/resolve-sync-destinations";
import { buildSyncPreviewViewModel } from "@/lib/pulse/sync-preview-view-model";
import type { PulseMoneyType, PulsePlan, PulsePlanCategory } from "@/lib/pulse/types";
import type { UserTimelineContext } from "@/lib/timeline/resolve-timeline";

const DEV_MOCK_WORK_SCHEDULE_ENABLED =
  process.env.NODE_ENV !== "production" &&
  process.env.NEXT_PUBLIC_SYNC_DEV_WORK_SCHEDULE === "true";

const DEV_MOCK_USER_TIMELINE_CONTEXT: UserTimelineContext =
  DEV_MOCK_WORK_SCHEDULE_ENABLED
    ? {
        workSchedule: {
          days: ["Sunday", "Monday", "Tuesday", "Wednesday"],
          startTime: "11:00",
          endTime: "21:00",
        },
      }
    : {};

const PLACEHOLDER_EXAMPLES = [
  "What's your work schedule?",
  "What do you have planned tomorrow?",
  "Don't let me forget this.",
  "It's my mom's birthday today.",
  "I need to call someone tomorrow.",
  "I want to start working out.",
  "I want to save for something important.",
  "How was your day?",
  "I feel overwhelmed.",
  "I don't want to forget this goal.",
] as const;

type CompactTitleInput = {
  category: PulsePlanCategory;
  timeLabel: string;
  title: string;
  parsedInput?: PulsePlan["parsedInput"];
  moneyType?: PulseMoneyType;
};

function compactTitle(plan: CompactTitleInput): string {
  if (plan.parsedInput?.moneyType === "income" || plan.moneyType === "income") {
    return "Upcoming Paycheck";
  }

  if (plan.category === "workout" && plan.timeLabel !== "Flexible") {
    return `${plan.timeLabel} Workout`;
  }

  if (plan.category === "reminder") {
    return plan.title.replace(/\s+Reminder$/i, "");
  }

  if (plan.category === "savings-goal") {
    return plan.title.replace(/\s+Savings Goal$/i, " Goal");
  }

  return plan.title;
}

export function PulseOrganizer() {
  const { items, addCapturedItem } = useCapturedItems();
  const inputRef = useRef<HTMLInputElement>(null);
  const [prompt, setPrompt] = useState("");
  const [plan, setPlan] = useState<PulsePlan | null>(null);
  const [selectedDestinations, setSelectedDestinations] = useState<
    SyncDestination[]
  >([]);
  const [placeholderIndex, setPlaceholderIndex] = useState(0);
  const [reliefMessage, setReliefMessage] = useState<string | null>(null);

  const preview = useMemo(
    () =>
      plan
        ? buildSyncPreviewViewModel(plan, {
            selectedDestinations,
            userContext: MOCK_SYNC_USER_CONTEXT,
          })
        : null,
    [plan, selectedDestinations],
  );

  const forecast = useMemo(
    () =>
      generateForecast({
        items,
        userContext: MOCK_SYNC_USER_CONTEXT,
      }),
    [items],
  );

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setPlaceholderIndex((current) => (current + 1) % PLACEHOLDER_EXAMPLES.length);
    }, 3200);

    return () => window.clearInterval(intervalId);
  }, []);

  const generatePreview = useCallback((text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    const nextPlan = createPulsePlan(trimmed, {
      timeline: { userContext: DEV_MOCK_USER_TIMELINE_CONTEXT },
    });
    setPrompt(trimmed);
    setPlan(nextPlan);
    setSelectedDestinations(resolveSyncDestinations(nextPlan));
    setReliefMessage(null);
  }, []);

  const generatePreviewFromInput = useCallback(() => {
    generatePreview(inputRef.current?.value ?? prompt);
  }, [generatePreview, prompt]);

  const handlePreviewSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    generatePreviewFromInput();
  };

  const handleSavePlan = () => {
    if (!plan || plan.status !== "draft" || selectedDestinations.length === 0) {
      return;
    }
    const capturedItem = addCapturedItem(
      { ...plan, status: "saved" },
      sanitizeSyncDestinations(selectedDestinations),
      compactTitle(plan),
    );
    const saved = { ...plan, status: "saved" as const };
    setPlan(saved);
    setReliefMessage(getSyncReliefMessage(plan, capturedItem));
  };

  const handleDismissPreview = () => {
    setPlan(null);
    setSelectedDestinations([]);
    setReliefMessage(null);
  };

  const handleToggleDestination = (destination: SyncDestination) => {
    setSelectedDestinations((current) =>
      current.includes(destination)
        ? current.filter((item) => item !== destination)
        : [...current, destination],
    );
  };

  return (
    <div className="flex w-full max-w-3xl flex-col items-center gap-6 sm:gap-7">
      <section className="w-full">
        <form
          className="mx-auto flex w-full max-w-2xl flex-col gap-3 rounded-[1.75rem] border border-border/35 bg-card/55 p-2.5 shadow-[0_24px_80px_-52px_var(--foreground)] backdrop-blur-sm sm:flex-row sm:items-center"
          onSubmit={handlePreviewSubmit}
        >
          <div className="flex min-h-[3.4rem] flex-1 items-center gap-2 rounded-[1.35rem] bg-background/35 px-4">
            <div className="relative min-w-0 flex-1">
              {!prompt && (
                <span
                  key={PLACEHOLDER_EXAMPLES[placeholderIndex]}
                  className="sync-placeholder-example pointer-events-none absolute left-0 top-1/2 -translate-y-1/2 truncate text-[16px] text-muted-foreground/48"
                  aria-hidden
                >
                  {PLACEHOLDER_EXAMPLES[placeholderIndex]}
                </span>
              )}
              <input
                ref={inputRef}
                type="text"
                value={prompt}
                onChange={(event) => setPrompt(event.target.value)}
                placeholder=""
                className="relative z-10 h-12 w-full min-w-0 bg-transparent text-[16px] text-foreground/92 outline-none"
                aria-label="Sync prompt"
              />
            </div>
            <button
              type="button"
              aria-label="Audio capture coming soon"
              className="flex size-9 shrink-0 items-center justify-center rounded-full text-muted-foreground/55 transition-colors hover:bg-muted/40 hover:text-foreground/75"
            >
              <Mic className="size-4" strokeWidth={1.75} />
            </button>
          </div>
          <Button
            type="submit"
            className="h-12 min-h-[48px] shrink-0 px-5 text-[15px] sm:h-[3.4rem] sm:min-h-0"
          >
            Synchronize
          </Button>
        </form>

        {reliefMessage && (
          <p
            className="mx-auto mt-4 max-w-2xl text-center text-[14px] leading-relaxed text-muted-foreground/72"
            aria-live="polite"
          >
            {reliefMessage}
          </p>
        )}

        {plan && preview && (
          <SyncPreviewPanel
            plan={plan}
            preview={preview}
            selectedDestinations={sanitizeSyncDestinations(selectedDestinations)}
            onToggleDestination={handleToggleDestination}
            onSave={handleSavePlan}
            onDismiss={handleDismissPreview}
          />
        )}
      </section>

      <section className="w-full max-w-2xl">
        <header>
          <h2 className="text-[12px] font-medium tracking-[-0.01em] text-muted-foreground/54">
            What matters next
          </h2>
          <p className="mt-1 text-[12px] text-muted-foreground/40">
            {forecast.cards.length > 0 ? forecast.summary : "Nothing urgent right now."}
          </p>
        </header>
        {forecast.cards.length > 0 && (
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {forecast.cards.slice(0, 4).map((card) => (
              <article
                key={card.id}
                className="rounded-2xl border border-border/20 bg-card/25 p-3"
              >
                <p className="text-[13px] font-medium tracking-[-0.02em] text-foreground/78">
                  {card.title}
                </p>
                <p className="mt-1 text-[12px] leading-relaxed text-muted-foreground/62">
                  {card.message}
                </p>
              </article>
            ))}
          </div>
        )}
      </section>

      {process.env.NODE_ENV !== "production" && <TimelineDebugPanel />}
    </div>
  );
}
