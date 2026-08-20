"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { SyncLogo } from "@/components/brand/sync-logo";
import { Button } from "@/components/ui/button";
import { useCapturedItems } from "@/lib/captured-items";
import {
  completeOnboardingSubmission,
  canEnterAuthenticatedHome,
  interpretProfileGetResponse,
  sanitizeSyncUserProfile,
} from "@/lib/sync-profile/complete-onboarding";
import { materializeOnboardingReading } from "@/lib/sync-profile/materialize-onboarding-reading";
import {
  applyInitialReadingCorrection,
  buildOnboardingInitialReading,
  nextOnboardingStep,
  onboardingQuestionCount,
  onboardingQuestionIndex,
  pressureQuestion,
  shouldAskGoalQuestion,
  type OnboardingStepId,
} from "@/lib/sync-profile/onboarding-reading";
import {
  CONSTRAINT_OPTIONS,
  DIRECTNESS_OPTIONS,
  EMPTY_USER_PROFILE,
  GOAL_TIMEFRAME_OPTIONS,
  ONBOARDING_PRIORITY_OPTIONS,
  loadUserProfile,
  saveUserProfile,
  toggleProfileChip,
  type GoalTimeframe,
  type SyncUserProfile,
} from "@/lib/sync-profile/user-profile";
import { cn } from "@/lib/utils";

function OnboardingShell({
  eyebrow,
  question,
  step,
  total,
  children,
  footer,
}: {
  eyebrow: string;
  question: string;
  step: number;
  total: number;
  children: React.ReactNode;
  footer: React.ReactNode;
}) {
  return (
    <div className="flex min-h-[70vh] flex-col justify-between gap-8">
      <div className="space-y-4">
        <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground/70">
          {step} of {total}
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
  const { activeItems, addCapturedItem, hydrated } = useCapturedItems();
  const [step, setStep] = useState<OnboardingStepId>("intro");
  const [profile, setProfile] = useState<SyncUserProfile>(EMPTY_USER_PROFILE);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const redirectingRef = useRef(false);

  const update = (patch: Partial<SyncUserProfile>) => {
    setProfile((current) => ({ ...current, ...patch }));
  };

  useEffect(() => {
    if (!hydrated || redirectingRef.current) return;

    if (canEnterAuthenticatedHome(loadUserProfile())) {
      redirectingRef.current = true;
      router.replace("/");
      return;
    }

    let cancelled = false;

    async function checkRemote() {
      try {
        const response = await fetch("/api/profile", { credentials: "include" });
        const body = (await response.json().catch(() => ({}))) as {
          profile?: unknown;
        };
        const interpreted = interpretProfileGetResponse({
          ok: response.ok,
          status: response.status,
          body: {
            profile: body.profile
              ? sanitizeSyncUserProfile(body.profile)
              : null,
          },
        });
        if (cancelled || redirectingRef.current) return;
        if (canEnterAuthenticatedHome(interpreted.profile)) {
          saveUserProfile(interpreted.profile!);
          redirectingRef.current = true;
          router.replace("/");
        }
      } catch {
        // Stay on onboarding if remote cannot be read.
      }
    }

    void checkRemote();
    return () => {
      cancelled = true;
    };
  }, [hydrated, router]);

  async function finishOnboarding() {
    if (pending) return;
    setError(null);
    setPending(true);
    setStep("building");

    const result = await completeOnboardingSubmission({
      profile,
      applyLocal: (completed) => {
        materializeOnboardingReading(completed, {
          items: activeItems,
          addCapturedItem,
        });
      },
      saveRemote: async (completed) => {
        const response = await fetch("/api/profile", {
          method: "PUT",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(completed),
        });
        const data = (await response.json().catch(() => ({}))) as {
          error?: string;
        };
        return {
          ok: response.ok,
          status: response.status,
          error: data.error,
        };
      },
    });

    if (!result.ok) {
      setError(result.error);
      setPending(false);
      setStep("reading");
      return;
    }

    router.replace("/");
    router.refresh();
  }

  const total = onboardingQuestionCount(profile);
  const index = onboardingQuestionIndex(step, profile);
  const continueButton = (disabled: boolean, next: OnboardingStepId, label = "Continue") => (
    <Button
      size="lg"
      className="h-12 w-full rounded-xl sm:w-auto"
      disabled={disabled}
      onClick={() => setStep(next)}
    >
      {label}
    </Button>
  );

  if (step === "intro") {
    return (
      <div className="flex min-h-[70vh] flex-col justify-between gap-10">
        <div className="space-y-6 pt-8">
          <SyncLogo size="md" />
          <h1 className="text-4xl font-semibold tracking-tight">Stay in Sync.</h1>
          <p className="max-w-md text-lg text-muted-foreground">
            A short first reading — what matters, what&apos;s pressing, and how
            direct I should be.
          </p>
        </div>
        <Button
          size="lg"
          className="h-12 rounded-xl"
          onClick={() => setStep(nextOnboardingStep("intro", profile))}
        >
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
          I&apos;m taking in what you just told me.
        </p>
      </div>
    );
  }

  if (step === "name") {
    return (
      <OnboardingShell
        eyebrow="Starting point"
        question="What should I call you?"
        step={index + 1}
        total={total}
        footer={continueButton(
          !profile.name.trim(),
          nextOnboardingStep("name", profile),
        )}
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

  if (step === "matters") {
    return (
      <OnboardingShell
        eyebrow="What matters"
        question="What currently matters most?"
        step={index + 1}
        total={total}
        footer={continueButton(
          profile.priorities.length === 0,
          nextOnboardingStep("matters", profile),
        )}
      >
        <p className="mb-4 text-sm text-muted-foreground">Pick one or two.</p>
        <ChipGrid
          options={ONBOARDING_PRIORITY_OPTIONS}
          selected={profile.priorities}
          onToggle={(value) =>
            update({
              priorities: toggleProfileChip(profile.priorities, value).slice(0, 2),
            })
          }
        />
      </OnboardingShell>
    );
  }

  if (step === "pressure") {
    const copy = pressureQuestion(profile);
    return (
      <OnboardingShell
        eyebrow={copy.eyebrow}
        question={copy.question}
        step={index + 1}
        total={total}
        footer={continueButton(false, nextOnboardingStep("pressure", profile))}
      >
        <textarea
          className="min-h-28 w-full rounded-xl border border-border/60 bg-muted/10 px-4 py-3 text-base outline-none focus:border-primary/40"
          placeholder={copy.placeholder}
          value={profile.currentStress}
          onChange={(e) => update({ currentStress: e.target.value })}
        />
      </OnboardingShell>
    );
  }

  if (step === "coming-up") {
    return (
      <OnboardingShell
        eyebrow="On the horizon"
        question="Anything important coming up?"
        step={index + 1}
        total={total}
        footer={continueButton(false, nextOnboardingStep("coming-up", profile))}
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

  if (step === "goal") {
    return (
      <OnboardingShell
        eyebrow="Direction"
        question={
          shouldAskGoalQuestion(profile)
            ? "One thing you're working toward, if you have it?"
            : "What's making that harder right now?"
        }
        step={index + 1}
        total={total}
        footer={continueButton(false, nextOnboardingStep("goal", profile))}
      >
        {shouldAskGoalQuestion(profile) ? (
          <div className="space-y-4">
            <textarea
              className="min-h-24 w-full rounded-xl border border-border/60 bg-muted/10 px-4 py-3 text-base outline-none focus:border-primary/40"
              placeholder="Two months of rent saved, finish the deck, get sleep back…"
              value={profile.workingToward}
              onChange={(e) => update({ workingToward: e.target.value })}
            />
            <ChipGrid
              options={GOAL_TIMEFRAME_OPTIONS}
              selected={profile.goalTimeframe}
              onToggle={(value) =>
                update({
                  goalTimeframe:
                    profile.goalTimeframe === value
                      ? ""
                      : (value as GoalTimeframe),
                })
              }
            />
          </div>
        ) : null}
        <div className={shouldAskGoalQuestion(profile) ? "mt-6 space-y-3" : "space-y-3"}>
          <p className="text-sm text-muted-foreground">
            Anything tight right now?
          </p>
          <ChipGrid
            options={CONSTRAINT_OPTIONS}
            selected={profile.constraints}
            onToggle={(value) =>
              update({
                constraints: toggleProfileChip(profile.constraints, value),
              })
            }
          />
        </div>
      </OnboardingShell>
    );
  }

  if (step === "directness") {
    return (
      <OnboardingShell
        eyebrow="Tone"
        question="How direct should I be when something has a consequence?"
        step={index + 1}
        total={total}
        footer={continueButton(
          !profile.directness,
          nextOnboardingStep("directness", profile),
        )}
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

  if (step === "reading") {
    const reading = buildOnboardingInitialReading(profile);
    return (
      <OnboardingShell
        eyebrow="First reading"
        question="Does this match what you told me?"
        step={total}
        total={total}
        footer={
          <div className="space-y-3">
            {error ? (
              <p className="text-[13px] text-red-600/90 dark:text-red-400/90">
                {error}
              </p>
            ) : null}
            <Button
              size="lg"
              className="h-12 w-full rounded-xl sm:w-auto"
              disabled={pending}
              onClick={() => void finishOnboarding()}
            >
              See my briefing
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          {reading.length === 0 ? (
            <p className="text-muted-foreground">
              Sync will stay quiet until there&apos;s something specific to hold.
            </p>
          ) : (
            reading.map((item) => (
              <label key={item.id} className="block space-y-1">
                <span className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground/70">
                  {item.label}
                </span>
                <textarea
                  className="min-h-16 w-full rounded-xl border border-border/60 bg-muted/10 px-4 py-2 text-sm outline-none focus:border-primary/40"
                  value={item.text}
                  onChange={(e) =>
                    setProfile((current) =>
                      applyInitialReadingCorrection(
                        current,
                        item.id,
                        e.target.value,
                      ),
                    )
                  }
                />
              </label>
            ))
          )}
        </div>
      </OnboardingShell>
    );
  }

  return null;
}
