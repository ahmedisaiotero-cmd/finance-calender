import { resolveCaptureDateKey } from "@/lib/captured-to-timeline";
import type { CapturedSyncItem } from "@/lib/captured-items";
import { buildConsequenceBrief } from "@/lib/intelligence/sync-consequences";
import { displayMemoryTitle } from "@/lib/sync-capture/memory-title";
import { loadUserProfile, saveUserProfile } from "@/lib/sync-profile/user-profile";
import type { SyncUserProfile } from "@/lib/sync-profile/user-profile";
import type { PersistedWorkSchedule } from "@/lib/user-timeline-context";

export type BriefSectionId = "today" | "noticing" | "possibility";

export type BriefSection = {
  id: BriefSectionId;
  label?: string;
  paragraphs: string[];
};

export type DailyBriefSnapshot = {
  userName: string | null;
  lede: string;
  sections: BriefSection[];
  isEmpty: boolean;
  consequences?: import("@/lib/intelligence/sync-consequences").SyncConsequence[];
};

function daysUntil(dateKey: string | null, reference: Date) {
  if (!dateKey) return null;
  const [y, m, d] = dateKey.split("-").map(Number);
  const target = new Date(y, m - 1, d);
  const start = new Date(reference);
  start.setHours(12, 0, 0, 0);
  target.setHours(12, 0, 0, 0);
  return Math.round((target.getTime() - start.getTime()) / (24 * 60 * 60 * 1000));
}

function relativeDayPhrase(days: number) {
  if (days === 0) return "today";
  if (days === 1) return "tomorrow";
  if (days > 1 && days < 7) return `in ${days} days`;
  if (days >= 7 && days < 14) return "next week";
  if (days >= 14 && days < 45) return "later this month";
  return "coming up";
}

function isPaydayItem(item: CapturedSyncItem) {
  const text = `${item.title} ${item.prompt}`.toLowerCase();
  return (
    item.moneyType === "income" ||
    /\b(payday|pay day|get paid|paycheck)\b/.test(text) ||
    item.title === "Payday" ||
    item.title === "Upcoming Paycheck"
  );
}

function paydayPhrase(item: CapturedSyncItem, reference: Date) {
  const key =
    item.timeline?.deadlineDate ??
    item.timeline?.startDate ??
    resolveCaptureDateKey(item, reference);
  const days = daysUntil(key, reference);
  if (days == null) return null;
  if (days === 0) return "Payday is today";
  if (days === 1) return "Payday is tomorrow";
  if (days > 1 && days <= 21) return `Payday is in ${days} days`;
  return null;
}

function deadlineBriefSubject(item: CapturedSyncItem) {
  const prompt = (item.originalPrompt ?? item.prompt).toLowerCase();
  if (/\brent\b/.test(prompt) && /\b(due|pay)\b/.test(prompt)) {
    return "Rent";
  }

  const title = displayMemoryTitle(item);
  if (/\bdue$/i.test(title)) {
    return title.replace(/\s+due$/i, "").trim() || title;
  }

  return title;
}

function friendlyDeadline(item: CapturedSyncItem, reference: Date) {
  const title = deadlineBriefSubject(item);
  const key =
    item.timeline?.deadlineDate ??
    item.timeline?.startDate ??
    resolveCaptureDateKey(item, reference);
  const days = daysUntil(key, reference);
  if (days == null) return item.dateLabel !== "Flexible" ? item.dateLabel : null;

  if (item.timeline?.timelineRole === "deadline" || item.category === "reminder") {
    if (days === 0) return `${title} is due today`;
    if (days === 1) return `${title} is due tomorrow`;
    if (days > 1 && days <= 7 && key) {
      const [y, m, d] = key.split("-").map(Number);
      const weekday = new Date(y, m - 1, d).toLocaleDateString("en-US", {
        weekday: "long",
      });
      return `${title} is due ${weekday}`;
    }
    if (days > 1 && days <= 14) return `${title} is due in ${days} days`;
    if (days > 14) return `${title} is due ${relativeDayPhrase(days)}`;
  }

  if (days === 0) return `${title} is today`;
  if (days === 1) return `${title} is tomorrow`;
  if (days > 1 && days <= 21) return `${title} is in ${days} days`;
  return null;
}

export function describeItemTiming(item: CapturedSyncItem, reference: Date) {
  if (isPaydayItem(item)) {
    return paydayPhrase(item, reference) ?? friendlyDeadline(item, reference);
  }
  return friendlyDeadline(item, reference);
}

export function buildDailyBrief(input: {
  items: CapturedSyncItem[];
  workSchedule?: PersistedWorkSchedule | null;
  reference?: Date;
  userName?: string | null;
  lifeProfile?: SyncUserProfile | null;
}): DailyBriefSnapshot {
  const result = buildConsequenceBrief(input);
  return {
    userName: result.userName,
    lede: result.lede,
    sections: result.sections,
    isEmpty: result.isEmpty,
    consequences: result.consequences,
  };
}

export function greetingForHour(hour: number, name?: string | null) {
  const trimmed = name?.trim();
  const suffix = trimmed ? `, ${trimmed}` : "";
  if (hour < 12) return `Good morning${suffix}.`;
  if (hour < 17) return `Good afternoon${suffix}.`;
  return `Good evening${suffix}.`;
}

export function formatBriefDate(date = new Date()) {
  return date.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

export function formatProfileDisplayName(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");
}

export function loadPreferredName(): string | null {
  const name = loadUserProfile().name.trim();
  return name || null;
}

export function loadProfileDisplayName(): string | null {
  const name = loadPreferredName();
  if (!name) return null;
  return formatProfileDisplayName(name);
}

export function savePreferredName(name: string) {
  const profile = loadUserProfile();
  saveUserProfile({ ...profile, name: name.trim() });
}

export {
  buildAllConsequences,
  buildConsequenceBrief,
  composeDailyBriefFromConsequences,
  deriveConsequencesFromMemory,
  type SyncConsequence,
  type ConsequenceKind,
} from "@/lib/intelligence/sync-consequences";
