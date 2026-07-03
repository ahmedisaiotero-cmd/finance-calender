import { useEffect, useRef, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";

import {
  OnboardingShell,
  SyncBrandMark,
  SyncChipGrid,
  SyncPrimaryButton,
} from "./sync-ui";
import { SyncTextInput } from "./sync-text-input";
import { SyncColors, SyncSpacing, SyncTypography } from "../../constants/sync-theme";
import { applyLifeProfile } from "../../lib/engine/apply-life-profile";
import { useCapturedItems } from "../../lib/engine/captured-items";
import {
  AWARENESS_OPTIONS,
  EMPTY_USER_PROFILE,
  PRIORITY_OPTIONS,
  toggleProfileChip,
  type SyncUserProfile,
} from "../../lib/engine/user-profile";
import {
  LIFE_COMING_UP_PLACEHOLDER,
  LIFE_NAME_PLACEHOLDER,
  LIFE_WEEK_PLACEHOLDER,
  ONBOARDING_BEGIN,
  ONBOARDING_BUILDING_COPY,
  ONBOARDING_BUILDING_TITLE,
  ONBOARDING_CONTINUE,
  ONBOARDING_LEDE,
  ONBOARDING_SEE_BRIEFING,
  ONBOARDING_TAGLINE,
} from "../../lib/engine/sync-voice";

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

export function OnboardingFlow() {
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

    const timer = setTimeout(() => {
      router.replace("/(main)/brief");
    }, 2200);

    return () => clearTimeout(timer);
  }, [step, profile, activeItems, addCapturedItem, router]);

  if (step === "intro") {
    return (
      <View style={styles.intro}>
        <View style={styles.introScroll}>
          <SyncBrandMark size="lg" />
          <Text style={styles.tagline}>{ONBOARDING_TAGLINE}</Text>
          <Text style={styles.lede}>{ONBOARDING_LEDE}</Text>
        </View>
        <SyncPrimaryButton label={ONBOARDING_BEGIN} onPress={() => setStep("name")} />
      </View>
    );
  }

  if (step === "building") {
    return (
      <View style={styles.building}>
        <SyncBrandMark size="sm" />
        <Text style={styles.buildingTitle}>{ONBOARDING_BUILDING_TITLE}</Text>
        <Text style={styles.buildingCopy}>{ONBOARDING_BUILDING_COPY}</Text>
      </View>
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
            label={ONBOARDING_CONTINUE}
            onPress={() => setStep("week")}
          />
        }
      >
        <SyncTextInput
          autoFocus
          onChange={(value) => update({ name: value })}
          placeholder={LIFE_NAME_PLACEHOLDER}
          returnKeyType="next"
          value={profile.name}
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
            label={ONBOARDING_CONTINUE}
            onPress={() => setStep("priorities")}
          />
        }
      >
        <SyncTextInput
          multiline
          onChange={(value) => update({ typicalWeek: value })}
          placeholder={LIFE_WEEK_PLACEHOLDER}
          value={profile.typicalWeek}
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
            label={ONBOARDING_CONTINUE}
            onPress={() => setStep("awareness")}
          />
        }
      >
        <SyncChipGrid
          onToggle={(value) =>
            update({
              priorities: toggleProfileChip(profile.priorities, value),
            })
          }
          options={PRIORITY_OPTIONS}
          selected={profile.priorities}
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
            label={ONBOARDING_CONTINUE}
            onPress={() => setStep("coming-up")}
          />
        }
      >
        <SyncChipGrid
          onToggle={(value) =>
            update({
              awareness: toggleProfileChip(profile.awareness, value),
            })
          }
          options={AWARENESS_OPTIONS}
          selected={profile.awareness}
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
          <SyncPrimaryButton
            label={ONBOARDING_SEE_BRIEFING}
            onPress={() => setStep("building")}
          />
        }
      >
        <SyncTextInput
          multiline
          onChange={(value) => update({ comingUp: value })}
          placeholder={LIFE_COMING_UP_PLACEHOLDER}
          value={profile.comingUp}
        />
      </OnboardingShell>
    );
  }

  return null;
}

const styles = StyleSheet.create({
  intro: {
    flex: 1,
    justifyContent: "space-between",
    paddingBottom: 8,
  },
  introScroll: {
    flex: 1,
    justifyContent: "center",
    gap: SyncSpacing.section,
    paddingTop: 40,
  },
  tagline: {
    ...SyncTypography.display,
    color: SyncColors.text,
  },
  lede: {
    ...SyncTypography.body,
    color: SyncColors.textMuted,
    maxWidth: 320,
  },
  building: {
    flex: 1,
    justifyContent: "center",
    gap: 16,
  },
  buildingTitle: {
    ...SyncTypography.title,
    color: SyncColors.text,
    marginTop: 24,
  },
  buildingCopy: {
    ...SyncTypography.body,
    color: SyncColors.textMuted,
  },
});
