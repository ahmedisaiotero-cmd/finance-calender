"use client";

import { useCallback, useState } from "react";

import { Button } from "@/components/ui/button";
import { createPulsePlan } from "@/lib/pulse/create-pulse-plan";
import type {
  PulsePlan,
  PulsePlanCategory,
  PulsePlanStatus,
} from "@/lib/pulse/types";
import { cn } from "@/lib/utils";

const STARTER_PROMPTS = [
  "I subscribed to Spotify for $12",
  "I spent $45 on dinner",
  "Organize a workout tomorrow morning",
  "Remind me to cancel my trial",
  "Help me save for a PS5 Pro",
  "I need to finish my project tonight",
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

const STATUS_LABELS: Record<PulsePlanStatus, string> = {
  draft: "Draft",
  saved: "Saved",
  scheduled: "Scheduled",
};

type SyncDestination = "Finance" | "Calendar" | "Health" | "Goals" | "Today";

type OrganizedItem = PulsePlan & {
  destinations: SyncDestination[];
};

const DESTINATIONS: Record<PulsePlanCategory, SyncDestination[]> = {
  workout: ["Health", "Today"],
  workday: ["Calendar", "Today"],
  "date-night": ["Calendar"],
  subscription: ["Finance", "Calendar"],
  expense: ["Finance"],
  reminder: ["Calendar", "Today"],
  "savings-goal": ["Goals", "Finance"],
  task: ["Today"],
  general: ["Today"],
};

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

function compactTitle(plan: PulsePlan): string {
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
  const [prompt, setPrompt] = useState("");
  const [plan, setPlan] = useState<PulsePlan | null>(null);
  const [selectedDestinations, setSelectedDestinations] = useState<
    SyncDestination[]
  >([]);
  const [recentlyOrganized, setRecentlyOrganized] = useState<OrganizedItem[]>(
    [],
  );

  const organizePrompt = useCallback((text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    const nextPlan = createPulsePlan(trimmed);
    setPrompt(trimmed);
    setPlan(nextPlan);
    setSelectedDestinations(DESTINATIONS[nextPlan.category]);
  }, []);

  const handleOrganize = useCallback(() => {
    organizePrompt(prompt);
  }, [organizePrompt, prompt]);

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      event.preventDefault();
      handleOrganize();
    }
  };

  const handleSavePlan = () => {
    if (!plan || plan.status !== "draft" || selectedDestinations.length === 0) {
      return;
    }
    const saved: OrganizedItem = {
      ...plan,
      status: "saved",
      destinations: selectedDestinations,
    };
    setPlan(saved);
    setRecentlyOrganized((items) => [
      saved,
      ...items.filter((item) => item.id !== saved.id),
    ]);
  };

  const handleRemoveOrganized = (id: string) => {
    setRecentlyOrganized((items) => items.filter((item) => item.id !== id));
    if (plan?.id === id) setPlan(null);
  };

  const handleToggleDestination = (destination: SyncDestination) => {
    setSelectedDestinations((current) =>
      current.includes(destination)
        ? current.filter((item) => item !== destination)
        : [...current, destination],
    );
  };

  return (
    <div className="flex w-full max-w-2xl flex-col gap-5 sm:gap-6">
      <section className="sync-home-surface pulse-organizer">
        <h2 className="mb-4 text-[1.15rem] font-medium tracking-[-0.03em] text-foreground/92 sm:text-[1.25rem]">
          What&apos;s on your mind?
        </h2>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-stretch">
          <input
            type="text"
            value={prompt}
            onChange={(event) => setPrompt(event.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Tell Sync something happening in your life..."
            className="h-12 min-h-[48px] flex-1 rounded-2xl border border-border/45 bg-background/55 px-4 text-[15px] text-foreground/90 outline-none transition-colors placeholder:text-muted-foreground/52 focus:border-primary/35 focus:bg-background/70 focus:ring-3 focus:ring-ring/20 sm:h-11 sm:min-h-0"
            aria-label="Sync prompt"
          />
          <Button
            type="button"
            onClick={handleOrganize}
            disabled={!prompt.trim()}
            className="h-12 min-h-[48px] shrink-0 px-5 text-[15px] sm:h-11 sm:min-h-0"
          >
            Synchronize
          </Button>
        </div>

        <div className="-mx-1 mt-4 flex gap-2 overflow-x-auto px-1 pb-1 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0 sm:pb-0">
          {STARTER_PROMPTS.map((example) => (
            <button
              key={example}
              type="button"
              onClick={() => organizePrompt(example)}
              className="shrink-0 rounded-full border border-border/35 bg-muted/25 px-3.5 py-2 text-left text-[12.5px] leading-snug text-muted-foreground/82 transition-colors hover:border-primary/25 hover:bg-accent/30 hover:text-foreground/88"
            >
              {example}
            </button>
          ))}
        </div>

        {plan && (
          <article className="pulse-organizer-plan mt-6 rounded-[1.15rem] bg-background/30 p-5 sm:p-6">
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
                {DESTINATIONS[plan.category].map((destination) => {
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
                onClick={() => setPlan(null)}
                className="h-11 text-muted-foreground/72"
              >
                Dismiss
              </Button>
            </div>
          </article>
        )}
      </section>

      <section className="sync-home-surface pulse-recently-organized">
        <header>
          <h2 className="text-[1.05rem] font-medium tracking-[-0.025em] text-foreground/90">
            Recently Organized
          </h2>
        </header>

        {recentlyOrganized.length === 0 ? (
          <p className="mt-4 text-[14px] leading-relaxed text-muted-foreground/72">
            Nothing yet. Start with one thought.
          </p>
        ) : (
          <ul className="mt-4 flex flex-col gap-3">
            {recentlyOrganized.map((item) => (
              <li
                key={item.id}
                className="flex items-start justify-between gap-3 rounded-2xl border border-border/30 bg-background/30 px-4 py-3.5"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[14px] font-medium tracking-[-0.02em] text-foreground/90">
                    {compactTitle(item)}
                  </p>
                  <div className="mt-1.5 flex flex-wrap items-center gap-2">
                    <span className="text-[11px] text-muted-foreground/65">
                      {item.destinations.join(", ")}
                    </span>
                    <span className="text-muted-foreground/35">·</span>
                    <span
                      className={cn(
                        "text-[11px] font-medium",
                        item.status === "scheduled"
                          ? "text-primary/75"
                          : "text-muted-foreground/65",
                      )}
                    >
                      {STATUS_LABELS[item.status]}
                    </span>
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
