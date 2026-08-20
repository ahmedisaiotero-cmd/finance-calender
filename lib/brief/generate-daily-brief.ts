import type { CapturedSyncItem } from "@/lib/captured-items";
import {
  buildDailyBrief,
  formatBriefDate,
  greetingForHour,
} from "@/lib/mobile-prototype/build-daily-brief";
import { buildTodayView } from "@/lib/mobile-prototype/build-today-view";
import {
  loadUserProfile,
  type SyncUserProfile,
} from "@/lib/sync-profile/user-profile";
import type { PulseState } from "@/lib/sync-pulse";
import type { PersistedWorkSchedule } from "@/lib/user-timeline-context";

export type DailyBriefItem = {
  id: string;
  what: string;
  when: string | null;
  why: string | null;
  text: string;
};

export type GeneratedDailyBrief = {
  greeting: string;
  dateLabel: string;
  pulse: {
    state: PulseState;
    title: string;
    message: string;
  };
  items: DailyBriefItem[];
  lede: string;
  curiousHook: string | null;
  isEmpty: boolean;
  reflection: string | null;
  futureContext: string | null;
};

const MAX_BRIEF_ITEMS = 5;

export function maxBriefItemsForProfile(profile: SyncUserProfile): number {
  if (profile.dayStyle === "calm") return 3;
  if (profile.dayStyle === "busy") return 5;
  return 4;
}

function extractWhenLabel(text: string): string | null {
  const match = text.match(
    /\b(today|tonight|tomorrow|this (?:morning|afternoon|evening|week)|next week|in \d+ days?)\b/i,
  );
  return match ? match[0] : null;
}

function whyForItem(text: string, profile: SyncUserProfile): string | null {
  const goal = profile.workingToward?.trim();
  if (goal && /\b(money|rent|pay|save|budget|bill)\b/i.test(text)) {
    return `Connected to what you're working toward: ${goal}.`;
  }

  const protectedTime = profile.protectedCalendar?.trim();
  if (
    protectedTime &&
    text.toLowerCase().includes(protectedTime.toLowerCase())
  ) {
    return "You asked Sync to protect time like this.";
  }

  const pressure = profile.currentStress?.trim();
  if (pressure && text.toLowerCase().includes(pressure.toLowerCase())) {
    return "You said this is demanding attention right now.";
  }

  return null;
}

function buildPulseLine(
  profile: SyncUserProfile,
  itemCount: number,
  isEmpty: boolean,
): GeneratedDailyBrief["pulse"] {
  if (isEmpty) {
    return {
      state: "connect",
      title: "Connect",
      message: "Tell Sync what's on your mind and this fills in.",
    };
  }

  if (profile.currentStress?.trim()) {
    return {
      state: "refocus",
      title: "Refocus",
      message: "Keeping today lighter — only what matters.",
    };
  }

  if (itemCount >= 4) {
    return {
      state: "steady",
      title: "Steady",
      message: "A fuller day — start with the top line.",
    };
  }

  return {
    state: "steady",
    title: "Steady",
    message: "Room to breathe today.",
  };
}

function buildCuriousHook(
  profile: SyncUserProfile,
  items: DailyBriefItem[],
): string | null {
  const goal = profile.workingToward?.trim();
  if (!goal) return null;

  const moneyMentioned = items.some((item) =>
    /\b(money|rent|pay|save|budget)\b/i.test(item.text),
  );
  if (moneyMentioned) {
    return `You mentioned ${goal} — want to talk about how this week looks?`;
  }

  const pressure = profile.currentStress?.trim();
  if (
    pressure &&
    items.some((item) =>
      item.text.toLowerCase().includes(pressure.toLowerCase()),
    )
  ) {
    return `You mentioned ${pressure} — anything shifted since then?`;
  }

  return null;
}

export function generateDailyBrief(input: {
  items: CapturedSyncItem[];
  workSchedule?: PersistedWorkSchedule | null;
  reference?: Date;
  profile?: SyncUserProfile | null;
}): GeneratedDailyBrief {
  const reference = input.reference ?? new Date();
  const profile = input.profile ?? loadUserProfile();
  const cap = Math.min(maxBriefItemsForProfile(profile), MAX_BRIEF_ITEMS);

  const brief = buildDailyBrief({
    items: input.items,
    workSchedule: input.workSchedule ?? null,
    lifeProfile: profile,
    reference,
  });

  const todayView = buildTodayView({
    brief,
    consequences: brief.consequences ?? [],
    items: input.items,
    reference,
    workSchedule: input.workSchedule ?? null,
  });

  const lines = [
    todayView.primaryPriority,
    ...todayView.supportingPriorities,
  ].slice(0, cap);

  const items: DailyBriefItem[] = lines.map((line, index) => ({
    id: `brief-${index}-${line.text.slice(0, 24)}`,
    what: line.text,
    when: extractWhenLabel(line.text),
    why: whyForItem(line.text, profile),
    text: line.text,
  }));

  return {
    greeting: greetingForHour(reference.getHours(), brief.userName),
    dateLabel: formatBriefDate(reference),
    pulse: buildPulseLine(profile, items.length, todayView.isEmpty),
    items,
    lede: brief.lede,
    curiousHook: buildCuriousHook(profile, items),
    isEmpty: todayView.isEmpty,
    reflection: todayView.reflection?.text ?? null,
    futureContext: todayView.futureContext?.text ?? null,
  };
}
