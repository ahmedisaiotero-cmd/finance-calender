"use client";

import { useEffect, useRef, useState } from "react";

import {
  OnboardingShell,
  SyncBrandMark,
  SyncChipGrid,
  SyncPrimaryButton,
  SyncTextField,
} from "@/components/mobile-prototype/sync-ui";
import { useCapturedItems } from "@/lib/captured-items";
import { applyLifeProfile } from "@/lib/mobile-prototype/apply-life-profile";
import {
  AWARENESS_OPTIONS,
  EMPTY_LIFE_PROFILE,
  PRIORITY_OPTIONS,
  toggleProfileChip,
  type LifeProfile,
} from "@/lib/mobile-prototype/life-profile";
import {
  ONBOARDING_BEGIN,
  ONBOARDING_BUILDING_COPY,
  ONBOARDING_BUILDING_TITLE,
  ONBOARDING_CONTINUE,
  ONBOARDING_LEDE,
  ONBOARDING_SEE_BRIEFING,
  ONBOARDING_TAGLINE,
  LIFE_COMING_UP_PLACEHOLDER,
  LIFE_NAME_PLACEHOLDER,
  LIFE_WEEK_PLACEHOLDER,
} from "@/lib/mobile-prototype/sync-voice";

type OnboardingStep =
  | "intro"
  | "name"
  | "week"
  | "priorities"
  | "awareness"
  | "coming-up"
  | "building";

const FLOW_STEPS: OnboardingStep[] = [
  "name",
  "week",
  "priorities",
  "awareness",
  "coming-up",
];

function stepMeta(step: OnboardingStep) {
  const index = FLOW_STEPS.indexOf(step);
  return index === -1 ? null : { current: index + 1, total: FLOW_STEPS.length };
}

type OnboardingFlowProps = {
  onComplete: () => void;
};

export function OnboardingFlow({ onComplete }: OnboardingFlowProps) {
  const { activeItems, addCapturedItem } = useCapturedItems();
  const [step, setStep] = useState<OnboardingStep>("intro");
  const [profile, setProfile] = useState<LifeProfile>(EMPTY_LIFE_PROFILE);

  const update = (patch: Partial<LifeProfile>) => {
    setProfile((current) => ({ ...current, ...patch }));
  };

  const appliedRef = useRef(false);

  useEffect(() => {
    if (step !== "building" || appliedRef.current) return;
    appliedRef.current = true;

    const completed: LifeProfile = {
      ...profile,
      onboardingComplete: true,
      updatedAt: new Date().toISOString(),
    };

    applyLifeProfile(completed, {
      items: activeItems,
      addCapturedItem,
    });

    const timer = window.setTimeout(() => {
      onComplete();
    }, 2200);

    return () => window.clearTimeout(timer);
  }, [step, profile, activeItems, addCapturedItem, onComplete]);

  if (step === "intro") {
    return (
      <div className="sync-onboarding-intro">
        <div className="sync-onboarding-intro-scroll mobile-prototype-pad-x">
          <SyncBrandMark size="lg" />
          <h1 className="sync-onboarding-tagline mobile-prototype-display">
            {ONBOARDING_TAGLINE}
          </h1>
          <p className="sync-onboarding-lede">{ONBOARDING_LEDE}</p>
        </div>
        <footer className="sync-onboarding-footer mobile-prototype-pad-x">
          <SyncPrimaryButton onClick={() => setStep("name")}>
            {ONBOARDING_BEGIN}
          </SyncPrimaryButton>
        </footer>
      </div>
    );
  }

  if (step === "building") {
    return (
      <div className="sync-onboarding-building mobile-prototype-pad-x">
        <SyncBrandMark size="sm" />
        <p className="sync-onboarding-building-title mobile-prototype-display">
          {ONBOARDING_BUILDING_TITLE}
        </p>
        <p className="sync-onboarding-building-copy">{ONBOARDING_BUILDING_COPY}</p>
      </div>
    );
  }

  const meta = stepMeta(step);

  if (step === "name" && meta) {
    return (
      <OnboardingShell
        eyebrow="Starting point"
        question="What should I call you?"
        step={meta}
        footer={
          <SyncPrimaryButton
            disabled={!profile.name.trim()}
            onClick={() => setStep("week")}
          >
            {ONBOARDING_CONTINUE}
          </SyncPrimaryButton>
        }
      >
        <SyncTextField
          value={profile.name}
          onChange={(value) => update({ name: value })}
          placeholder={LIFE_NAME_PLACEHOLDER}
        />
      </OnboardingShell>
    );
  }

  if (step === "week" && meta) {
    return (
      <OnboardingShell
        eyebrow="Your rhythm"
        question="Tell me about your typical week."
        step={meta}
        footer={
          <SyncPrimaryButton
            disabled={!profile.typicalWeek.trim()}
            onClick={() => setStep("priorities")}
          >
            {ONBOARDING_CONTINUE}
          </SyncPrimaryButton>
        }
      >
        <SyncTextField
          multiline
          value={profile.typicalWeek}
          onChange={(value) => update({ typicalWeek: value })}
          placeholder={LIFE_WEEK_PLACEHOLDER}
        />
      </OnboardingShell>
    );
  }

  if (step === "priorities" && meta) {
    return (
      <OnboardingShell
        eyebrow="What matters"
        question="What matters most right now?"
        step={meta}
        footer={
          <SyncPrimaryButton
            disabled={profile.priorities.length === 0}
            onClick={() => setStep("awareness")}
          >
            {ONBOARDING_CONTINUE}
          </SyncPrimaryButton>
        }
      >
        <SyncChipGrid
          options={PRIORITY_OPTIONS}
          selected={profile.priorities}
          onToggle={(value) =>
            update({
              priorities: toggleProfileChip(profile.priorities, value),
            })
          }
        />
      </OnboardingShell>
    );
  }

  if (step === "awareness" && meta) {
    return (
      <OnboardingShell
        eyebrow="Your life"
        question="What should I keep on my radar?"
        step={meta}
        footer={
          <SyncPrimaryButton
            disabled={profile.awareness.length === 0}
            onClick={() => setStep("coming-up")}
          >
            {ONBOARDING_CONTINUE}
          </SyncPrimaryButton>
        }
      >
        <SyncChipGrid
          options={AWARENESS_OPTIONS}
          selected={profile.awareness}
          onToggle={(value) =>
            update({
              awareness: toggleProfileChip(profile.awareness, value),
            })
          }
        />
      </OnboardingShell>
    );
  }

  if (step === "coming-up" && meta) {
    return (
      <OnboardingShell
        eyebrow="On the horizon"
        question="Anything important coming up?"
        step={meta}
        footer={
          <SyncPrimaryButton onClick={() => setStep("building")}>
            {ONBOARDING_SEE_BRIEFING}
          </SyncPrimaryButton>
        }
      >
        <SyncTextField
          multiline
          value={profile.comingUp}
          onChange={(value) => update({ comingUp: value })}
          placeholder={LIFE_COMING_UP_PLACEHOLDER}
        />
      </OnboardingShell>
    );
  }

  return null;
}
