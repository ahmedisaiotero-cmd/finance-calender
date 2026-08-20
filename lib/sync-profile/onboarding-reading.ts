import {
  GOAL_TIMEFRAME_OPTIONS,
  splitComingUpLines,
  type GoalTimeframe,
  type SyncUserProfile,
} from "@/lib/sync-profile/user-profile";

export type OnboardingStepId =
  | "intro"
  | "name"
  | "matters"
  | "pressure"
  | "coming-up"
  | "goal"
  | "directness"
  | "reading"
  | "building";

export type InitialReadingItem = {
  id: "name" | "matters" | "pressure" | "comingUp" | "goal" | "constraints" | "directness";
  label: string;
  text: string;
};

export type OnboardingSeed = {
  id: string;
  text: string;
};

const GOAL_SIGNAL =
  /\b(save|saving|trying to|want to|working toward|goal|by (jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)|in \d+ months?|this (month|quarter|year))\b/i;

export function primaryOnboardingArea(profile: Pick<SyncUserProfile, "priorities">) {
  return profile.priorities[0] ?? "";
}

export function pressureQuestion(profile: Pick<SyncUserProfile, "priorities">) {
  const area = primaryOnboardingArea(profile);

  if (area === "Money") {
    return {
      eyebrow: "Right now",
      question: "What's weighing on money right now?",
      placeholder: "Rent's due Friday and payday isn't until next week…",
    };
  }

  if (area === "Family") {
    return {
      eyebrow: "Right now",
      question: "Who or what should I treat as protected?",
      placeholder: "Sunday dinners with my parents, kids' bedtime…",
    };
  }

  if (area === "Health") {
    return {
      eyebrow: "Right now",
      question: "What's the live health pressure?",
      placeholder: "Sleep is shot, physio Thursday, running on fumes…",
    };
  }

  if (area === "Work") {
    return {
      eyebrow: "Right now",
      question: "What's demanding your attention at work?",
      placeholder: "Q3 deck, boss wants it before the offsite…",
    };
  }

  return {
    eyebrow: "Right now",
    question: "What's demanding your attention right now?",
    placeholder: "Whatever is actually taking up space.",
  };
}

export function pressureImpliesGoal(text: string) {
  return GOAL_SIGNAL.test(text.trim());
}

export function shouldAskGoalQuestion(profile: Pick<SyncUserProfile, "currentStress">) {
  return !pressureImpliesGoal(profile.currentStress);
}

export function nextOnboardingStep(
  current: OnboardingStepId,
  profile: Pick<SyncUserProfile, "currentStress">,
): OnboardingStepId {
  if (current === "intro") return "name";
  if (current === "name") return "matters";
  if (current === "matters") return "pressure";
  if (current === "pressure") return "coming-up";
  if (current === "coming-up") return "goal";
  if (current === "goal") return "directness";
  if (current === "directness") return "reading";
  if (current === "reading") return "building";
  return "building";
}

export function onboardingQuestionCount(_profile: Pick<SyncUserProfile, "currentStress">) {
  void _profile;
  return 6;
}

export function onboardingQuestionIndex(
  step: OnboardingStepId,
  _profile: Pick<SyncUserProfile, "currentStress">,
) {
  void _profile;
  const sequence: OnboardingStepId[] = [
    "name",
    "matters",
    "pressure",
    "coming-up",
    "goal",
    "directness",
  ];
  return sequence.indexOf(step);
}

export function goalTimeframeLabel(timeframe: GoalTimeframe | string) {
  return GOAL_TIMEFRAME_OPTIONS.find((option) => option.id === timeframe)?.label ?? "";
}

export function collectOnboardingSeedTexts(profile: SyncUserProfile): OnboardingSeed[] {
  const seeds: OnboardingSeed[] = [];
  const stress = profile.currentStress.trim();
  if (stress) {
    seeds.push({ id: "pressure", text: stress });
  }

  for (const [index, line] of splitComingUpLines(profile.comingUp).entries()) {
    seeds.push({ id: `comingUp-${index}`, text: line });
  }

  const goal = profile.workingToward.trim();
  if (goal) {
    const when = goalTimeframeLabel(profile.goalTimeframe);
    seeds.push({
      id: "goal",
      text: when ? `${goal} — ${when}` : goal,
    });
  }

  const protectedTime = profile.protectedCalendar.trim();
  if (protectedTime && protectedTime.toLowerCase() !== stress.toLowerCase()) {
    seeds.push({ id: "protected", text: protectedTime });
  }

  if (profile.constraints.length > 0) {
    seeds.push({
      id: "constraints",
      text: `What's tight right now: ${profile.constraints.join(", ").toLowerCase()}.`,
    });
  }

  return seeds;
}

export function buildOnboardingInitialReading(
  profile: SyncUserProfile,
): InitialReadingItem[] {
  const items: InitialReadingItem[] = [];
  const name = profile.name.trim();
  if (name) {
    items.push({
      id: "name",
      label: "What to call you",
      text: name,
    });
  }

  if (profile.priorities.length > 0) {
    items.push({
      id: "matters",
      label: "What you're watching",
      text: profile.priorities.join(", "),
    });
  }

  if (profile.currentStress.trim()) {
    items.push({
      id: "pressure",
      label: "Demanding attention",
      text: profile.currentStress.trim(),
    });
  }

  if (profile.comingUp.trim()) {
    items.push({
      id: "comingUp",
      label: "Coming up",
      text: profile.comingUp.trim(),
    });
  }

  if (profile.workingToward.trim()) {
    const when = goalTimeframeLabel(profile.goalTimeframe);
    items.push({
      id: "goal",
      label: "Working toward",
      text: when
        ? `${profile.workingToward.trim()} — ${when}`
        : profile.workingToward.trim(),
    });
  }

  if (profile.constraints.length > 0) {
    items.push({
      id: "constraints",
      label: "What's tight",
      text: profile.constraints.join(", "),
    });
  }

  if (profile.directness) {
    const tone =
      profile.directness === "gentle"
        ? "Be cautious when surfacing consequences."
        : profile.directness === "direct"
          ? "Be direct when something has a consequence."
          : "Stay balanced — clear, not loud.";
    items.push({
      id: "directness",
      label: "How Sync should speak",
      text: tone,
    });
  }

  return items;
}

export function applyInitialReadingCorrection(
  profile: SyncUserProfile,
  itemId: InitialReadingItem["id"],
  text: string,
): SyncUserProfile {
  const trimmed = text.trim();

  if (itemId === "name") return { ...profile, name: trimmed };
  if (itemId === "pressure") return { ...profile, currentStress: trimmed };
  if (itemId === "comingUp") return { ...profile, comingUp: trimmed };
  if (itemId === "goal") {
    const timeframe = GOAL_TIMEFRAME_OPTIONS.find((option) =>
      trimmed.toLowerCase().includes(option.label.toLowerCase()),
    );
    const stripped = timeframe
      ? trimmed.replace(new RegExp(`\\s*[—-]\\s*${timeframe.label}$`, "i"), "").trim()
      : trimmed;
    return {
      ...profile,
      workingToward: stripped,
      goalTimeframe: timeframe?.id ?? profile.goalTimeframe,
    };
  }
  if (itemId === "constraints") {
    const next = trimmed
      .split(/[,/]+/)
      .map((part) => part.trim())
      .filter(Boolean);
    return { ...profile, constraints: next };
  }
  if (itemId === "matters") {
    const next = trimmed
      .split(/[,/]+/)
      .map((part) => part.trim())
      .filter(Boolean);
    return { ...profile, priorities: next };
  }

  return profile;
}

export function isOnboardingSubmissionReady(profile: SyncUserProfile) {
  return Boolean(
    profile.name.trim() &&
      profile.priorities.length > 0 &&
      profile.directness,
  );
}
