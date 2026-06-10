"use client";

import { Mic } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  type SyncDestination,
  useCapturedItems,
} from "@/lib/captured-items";
import { createPulsePlan } from "@/lib/pulse/create-pulse-plan";
import { getSyncPreviewThought } from "@/lib/pulse/preview-copy";
import { getSyncReliefMessage } from "@/lib/pulse/relief-message";
import type { PulseMoneyType, PulsePlan, PulsePlanCategory } from "@/lib/pulse/types";
import { cn } from "@/lib/utils";

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

const CATEGORY_LABELS: Record<PulsePlanCategory, string> = {
  workout: "Workout",
  workday: "Workday",
  "date-night": "Date Night",
  subscription: "Subscription",
  expense: "Expense",
  reminder: "Reminder",
  "savings-goal": "Savings Goal",
  task: "Task",
  general: "General",
};

const DESTINATIONS: Record<PulsePlanCategory, SyncDestination[]> = {
  workout: ["Health", "Calendar", "Today"],
  workday: ["Calendar", "Today"],
  "date-night": ["Calendar"],
  subscription: ["Finance", "Calendar"],
  expense: ["Finance", "Today"],
  reminder: ["Calendar", "Today"],
  "savings-goal": ["Goals", "Finance"],
  task: ["Today"],
  general: ["Today"],
};

function hasFutureDate(plan: PulsePlan) {
  return plan.dateLabel !== "Today" && plan.dateLabel !== "Upcoming";
}

function defaultDestinations(plan: PulsePlan): SyncDestination[] {
  if (plan.parsedInput?.moneyType === "income") {
    return hasFutureDate(plan) ? ["Finance", "Calendar"] : ["Finance"];
  }

  return DESTINATIONS[plan.category];
}

function formatDuration(minutes: number): string {
  if (minutes <= 0) return "—";
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  if (remainder === 0) return `${hours} hr`;
  return `${hours} hr ${remainder} min`;
}

function frequencyLabel(plan: PulsePlan): string {
  const frequency = plan.parsedInput?.frequency;
  if (!frequency || frequency === "one-time") return "One-time";
  return frequency.charAt(0).toUpperCase() + frequency.slice(1);
}

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

function compactMeta(plan: PulsePlan): string {
  const amount = plan.parsedInput?.amount;

  if (plan.parsedInput?.moneyType === "income") {
    return [plan.dateLabel, amount].filter(Boolean).join(" • ");
  }

  if (plan.category === "subscription") {
    return [frequencyLabel(plan), amount].filter(Boolean).join(" • ");
  }

  if (plan.category === "expense") {
    const dateLabel = plan.dateLabel === "Upcoming" ? "Today" : plan.dateLabel;
    return [dateLabel, amount].filter(Boolean).join(" • ");
  }

  if (plan.category === "workout") {
    return [plan.dateLabel, formatDuration(plan.durationMinutes)]
      .filter(Boolean)
      .join(" • ");
  }

  if (plan.category === "savings-goal") return "Savings goal";

  if (plan.timeLabel !== "Flexible") return plan.timeLabel;
  if (plan.dateLabel !== "Upcoming") return plan.dateLabel;

  return CATEGORY_LABELS[plan.category];
}

export function PulseOrganizer() {
  const { items, addCapturedItem, removeCapturedItem } = useCapturedItems();
  const inputRef = useRef<HTMLInputElement>(null);
  const [prompt, setPrompt] = useState("");
  const [plan, setPlan] = useState<PulsePlan | null>(null);
  const [selectedDestinations, setSelectedDestinations] = useState<
    SyncDestination[]
  >([]);
  const [placeholderIndex, setPlaceholderIndex] = useState(0);
  const [reliefMessage, setReliefMessage] = useState<string | null>(null);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setPlaceholderIndex((current) => (current + 1) % PLACEHOLDER_EXAMPLES.length);
    }, 3200);

    return () => window.clearInterval(intervalId);
  }, []);

  const generatePreview = useCallback((text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    const nextPlan = createPulsePlan(trimmed);
    setPrompt(trimmed);
    setPlan(nextPlan);
    setSelectedDestinations(defaultDestinations(nextPlan));
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
      selectedDestinations,
      compactTitle(plan),
    );
    const saved = { ...plan, status: "saved" as const };
    setPlan(saved);
    setReliefMessage(getSyncReliefMessage(plan, capturedItem));
  };

  const handleRemoveOrganized = (id: string) => {
    removeCapturedItem(id);
    if (plan?.id === id) setPlan(null);
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

        {plan && (
          <article className="pulse-organizer-plan mx-auto mt-5 max-w-2xl rounded-[1.15rem] bg-card/45 p-5 sm:p-6">
            <h3 className="text-[18px] font-medium tracking-[-0.03em] text-foreground/95">
              {compactTitle(plan)}
            </h3>
            <p className="mt-1.5 text-[14px] font-medium text-muted-foreground/72">
              {compactMeta(plan)}
            </p>

            <div className="mt-5">
              <p className="text-[13px] text-muted-foreground/58">
                Will be added to
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                {defaultDestinations(plan).map((destination) => {
                  const selected = selectedDestinations.includes(destination);

                  return (
                    <button
                      key={destination}
                      type="button"
                      onClick={() => handleToggleDestination(destination)}
                      className={cn(
                        "rounded-full border px-3 py-1.5 text-[13px] font-medium transition-colors",
                        selected
                          ? "border-primary/30 bg-primary/10 text-foreground/90"
                          : "border-border/30 bg-muted/15 text-muted-foreground/65 hover:text-foreground/80",
                      )}
                      aria-pressed={selected}
                    >
                      {destination}
                    </button>
                  );
                })}
              </div>
            </div>

            <p className="mt-5 text-[14px] leading-relaxed text-muted-foreground/68">
              {getSyncPreviewThought(plan)}
            </p>

            <div className="mt-6 flex flex-col gap-2.5 sm:flex-row">
              <Button
                type="button"
                onClick={handleSavePlan}
                disabled={
                  plan.status !== "draft" || selectedDestinations.length === 0
                }
                className="h-11"
              >
                Synchronize
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={handleDismissPreview}
                className="h-11 text-muted-foreground/72"
              >
                Dismiss
              </Button>
            </div>
          </article>
        )}
      </section>

      <section className="w-full max-w-2xl">
        <header>
          <h2 className="text-[12px] font-medium tracking-[-0.01em] text-muted-foreground/54">
            Recent synchronizations
          </h2>
        </header>

        {items.length === 0 ? (
          <p className="mt-2 text-[12px] leading-relaxed text-muted-foreground/40">
            Nothing yet. Start with one thought.
          </p>
        ) : (
          <ul className="mt-3 flex flex-col gap-2">
            {items.slice(0, 5).map((item) => (
              <li
                key={item.id}
                className="flex items-center justify-between gap-3 rounded-2xl px-1 py-1"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] font-medium tracking-[-0.02em] text-foreground/78">
                    {compactTitle(item)}
                  </p>
                  <div className="mt-1 flex flex-wrap gap-1.5">
                    {item.destinations.map((destination) => (
                      <span
                        key={destination}
                        className="size-1.5 rounded-full bg-primary/45"
                        title={destination}
                      />
                    ))}
                  </div>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="xs"
                  onClick={() => handleRemoveOrganized(item.id)}
                  className="shrink-0 text-muted-foreground/60 hover:text-foreground/80"
                  aria-label={`Remove ${compactTitle(item)}`}
                >
                  Remove
                </Button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
