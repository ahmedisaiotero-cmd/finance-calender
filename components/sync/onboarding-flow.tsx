"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { SyncLogo } from "@/components/brand/sync-logo";
import { Button } from "@/components/ui/button";
import { applyLifeProfile } from "@/lib/mobile-prototype/apply-life-profile";
import { useCapturedItems } from "@/lib/captured-items";
import {
  AWARENESS_OPTIONS,
  CHECK_IN_OPTIONS,
  DAY_STYLE_OPTIONS,
  DIRECTNESS_OPTIONS,
  EMPTY_USER_PROFILE,
  PRIORITY_OPTIONS,
  toggleProfileChip,
  type SyncUserProfile,
} from "@/lib/sync-profile/user-profile";
import { cn } from "@/lib/utils";

type OnboardingStep =
  | "intro"
  | "name"
  | "day-style"
  | "priorities"
  | "stress"
  | "working-toward"
  | "check-in"
  | "directness"
  | "protected"
  | "coming-up"
  | "building";

const FLOW_STEPS: OnboardingStep[] = [
  "name",
  "day-style",
  "priorities",
  "stress",
  "working-toward",
  "check-in",
  "directness",
  "protected",
  "coming-up",
];

function stepMeta(step: OnboardingStep) {
  const index = FLOW_STEPS.indexOf(step);
  return index === -1 ? null : { current: index + 1, total: FLOW_STEPS.length };
}

function OnboardingShell({
  eyebrow,
  question,
  step,
  children,
  footer,
}: {
  eyebrow: string;
  question: string;
  step: { current: number; total: number };
  children: React.ReactNode;
  footer: React.ReactNode;
}) {
  return (
    <div className="flex min-h-[70vh] flex-col justify-between gap-8">
      <div className="space-y-4">
        <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground/70">
          {step.current} of {step.total}
        </p>
        <p className="text-[11px] font-semibold uppercase tracking-widest text-primary/80">
          {eyebrow}
        </p>
        <h1 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
          {question}
        </h1>
        <div className="pt-2">{children}</div>
      </div>
      <div>{footer}</div>
    </div>
  );
}

function ChipGrid({
  options,
  selected,
  onToggle,
}: {
  options: readonly string[] | readonly { id: string; label: string }[];
  selected: string | string[];
  onToggle: (value: string) => void;
}) {
  const selectedList = Array.isArray(selected) ? selected : [selected];

  return (
    <div className="flex flex-wrap gap-2">
      {options.map((option) => {
        const id = typeof option === "string" ? option : option.id;
        const label = typeof option === "string" ? option : option.label;
        const active = selectedList.includes(id);
        return (
          <button
            key={id}
            type="button"
            onClick={() => onToggle(id)}
            className={cn(
              "rounded-full border px-4 py-2 text-sm font-medium transition-colors",
              active
                ? "border-primary/40 bg-primary/10 text-foreground"
                : "border-border/60 bg-muted/20 text-muted-foreground hover:text-foreground",
            )}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}

export function SyncOnboardingFlow() {
  const router = useRouter();
  const { activeItems, addCapturedItem } = useCapturedItems();
  const [step, setStep] = useState<OnboardingStep>("intro");
  const [profile, setProfile] = useState<SyncUserProfile>(EMPTY_USER_PROFILE);
  const appliedRef = useRef(false);

  const update = (patch: Partial<SyncUserProfile>) => {
    setProfile((current) => ({ ...current, ...patch }));
  };

  useEffect(() => {
    if (step !== "building" || appliedRef.current) return;
    appliedRef.current = true;

    const completed: SyncUserProfile = {
      ...profile,
      onboardingComplete: true,
      updatedAt: new Date().toISOString(),
    };

    applyLifeProfile(completed, {
      items: activeItems,
      addCapturedItem,
    });

    void fetch("/api/profile", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(completed),
    }).catch(() => {
      // local profile is source of truth when auth/db unavailable
    });

    const timer = window.setTimeout(() => {
      router.replace("/");
    }, 2200);

    return () => window.clearTimeout(timer);
  }, [step, profile, activeItems, addCapturedItem, router]);

  if (step === "intro") {
    return (
      <div className="flex min-h-[70vh] flex-col justify-between gap-10">
        <div className="space-y-6 pt-8">
          <SyncLogo size="md" />
          <h1 className="text-4xl font-semibold tracking-tight">Stay in Sync.</h1>
          <p className="max-w-md text-lg text-muted-foreground">
            Tell me what matters. I&apos;ll remember — curious, not pushy.
          </p>
        </div>
        <Button size="lg" className="h-12 rounded-xl" onClick={() => setStep("name")}>
          Begin
        </Button>
      </div>
    );
  }

  if (step === "building") {
    return (
      <div className="space-y-4 pt-16">
        <SyncLogo size="sm" />
        <h2 className="text-2xl font-semibold tracking-tight">
          Building your first briefing…
        </h2>
        <p className="text-muted-foreground">
          I&apos;m learning the shape of your life.
        </p>
      </div>
    );
  }

  const meta = stepMeta(step);
  if (!meta) return null;

  const continueButton = (disabled: boolean, next: OnboardingStep, label = "Continue") => (
    <Button
      size="lg"
      className="h-12 w-full rounded-xl sm:w-auto"
      disabled={disabled}
      onClick={() => setStep(next)}
    >
      {label}
    </Button>
  );

  if (step === "name") {
    return (
      <OnboardingShell
        eyebrow="Starting point"
        question="What should I call you?"
        step={meta}
        footer={continueButton(!profile.name.trim(), "day-style")}
      >
        <input
          autoFocus
          className="w-full rounded-xl border border-border/60 bg-muted/10 px-4 py-3 text-lg outline-none focus:border-primary/40"
          placeholder="Your first name"
          value={profile.name}
          onChange={(e) => update({ name: e.target.value })}
        />
      </OnboardingShell>
    );
  }

  if (step === "day-style") {
    return (
      <OnboardingShell
        eyebrow="Your rhythm"
        question="What does a good day look like for you?"
        step={meta}
        footer={continueButton(!profile.dayStyle, "priorities")}
      >
        <ChipGrid
          options={DAY_STYLE_OPTIONS}
          selected={profile.dayStyle}
          onToggle={(value) => update({ dayStyle: value as SyncUserProfile["dayStyle"] })}
        />
      </OnboardingShell>
    );
  }

  if (step === "priorities") {
    return (
      <OnboardingShell
        eyebrow="What matters"
        question="What areas should I keep an eye on?"
        step={meta}
        footer={continueButton(profile.priorities.length === 0, "stress")}
      >
        <ChipGrid
          options={PRIORITY_OPTIONS}
          selected={profile.priorities}
          onToggle={(value) =>
            update({ priorities: toggleProfileChip(profile.priorities, value) })
          }
        />
      </OnboardingShell>
    );
  }

  if (step === "stress") {
    return (
      <OnboardingShell
        eyebrow="Right now"
        question="What's stressing you most right now?"
        step={meta}
        footer={continueButton(false, "working-toward")}
      >
        <textarea
          className="min-h-28 w-full rounded-xl border border-border/60 bg-muted/10 px-4 py-3 text-base outline-none focus:border-primary/40"
          placeholder="Optional — helps me calibrate tone, not alarms."
          value={profile.currentStress}
          onChange={(e) => update({ currentStress: e.target.value })}
        />
      </OnboardingShell>
    );
  }

  if (step === "working-toward") {
    return (
      <OnboardingShell
        eyebrow="Direction"
        question="What are you working toward in the next few months?"
        step={meta}
        footer={continueButton(false, "check-in")}
      >
        <textarea
          className="min-h-28 w-full rounded-xl border border-border/60 bg-muted/10 px-4 py-3 text-base outline-none focus:border-primary/40"
          placeholder="Savings, a project, more balance…"
          value={profile.workingToward}
          onChange={(e) => update({ workingToward: e.target.value })}
        />
      </OnboardingShell>
    );
  }

  if (step === "check-in") {
    return (
      <OnboardingShell
        eyebrow="Timing"
        question="When do you usually have 30 seconds to check in?"
        step={meta}
        footer={continueButton(!profile.checkInTime, "directness")}
      >
        <ChipGrid
          options={CHECK_IN_OPTIONS}
          selected={profile.checkInTime}
          onToggle={(value) =>
            update({ checkInTime: value as SyncUserProfile["checkInTime"] })
          }
        />
      </OnboardingShell>
    );
  }

  if (step === "directness") {
    return (
      <OnboardingShell
        eyebrow="Tone"
        question="How direct should I be?"
        step={meta}
        footer={continueButton(!profile.directness, "protected")}
      >
        <ChipGrid
          options={DIRECTNESS_OPTIONS}
          selected={profile.directness}
          onToggle={(value) =>
            update({ directness: value as SyncUserProfile["directness"] })
          }
        />
      </OnboardingShell>
    );
  }

  if (step === "protected") {
    return (
      <OnboardingShell
        eyebrow="Protected time"
        question="Anything I should always protect on your calendar?"
        step={meta}
        footer={continueButton(false, "coming-up")}
      >
        <textarea
          className="min-h-28 w-full rounded-xl border border-border/60 bg-muted/10 px-4 py-3 text-base outline-none focus:border-primary/40"
          placeholder="Family dinners, workouts, sleep…"
          value={profile.protectedCalendar}
          onChange={(e) => update({ protectedCalendar: e.target.value })}
        />
      </OnboardingShell>
    );
  }

  if (step === "coming-up") {
    return (
      <OnboardingShell
        eyebrow="On the horizon"
        question="Anything important coming up?"
        step={meta}
        footer={
          <Button
            size="lg"
            className="h-12 w-full rounded-xl sm:w-auto"
            onClick={() => setStep("building")}
          >
            See my briefing
          </Button>
        }
      >
        <textarea
          className="min-h-28 w-full rounded-xl border border-border/60 bg-muted/10 px-4 py-3 text-base outline-none focus:border-primary/40"
          placeholder="Rent Friday, trip next month, big meeting Thursday…"
          value={profile.comingUp}
          onChange={(e) => update({ comingUp: e.target.value })}
        />
      </OnboardingShell>
    );
  }

  return null;
}
