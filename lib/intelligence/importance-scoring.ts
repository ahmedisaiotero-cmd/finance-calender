import { resolveCaptureDateKey } from "@/lib/captured-to-timeline";
import type { CapturedSyncItem } from "@/lib/captured-items";
import type { TimelineResolution } from "@/lib/timeline/resolve-timeline";

export type SyncImportance = "low" | "medium" | "high" | "critical";

export type ImportanceScoreInput = {
  text: string;
  title?: string;
  category?: string;
  destinations?: string[];
  timeline?: TimelineResolution | null;
  reference?: Date;
  priorities?: string[];
  baseImportance?: SyncImportance;
};

function daysUntilDateKey(dateKey: string | null, reference: Date) {
  if (!dateKey) return null;
  const [y, m, d] = dateKey.split("-").map(Number);
  const target = new Date(y, m - 1, d);
  const start = new Date(reference);
  start.setHours(12, 0, 0, 0);
  target.setHours(12, 0, 0, 0);
  return Math.round((target.getTime() - start.getTime()) / (24 * 60 * 60 * 1000));
}

function clockToMinutes(value?: string) {
  if (!value) return null;
  const [hourText, minuteText = "0"] = value.split(":");
  const hour = Number(hourText);
  const minute = Number(minuteText);
  if (Number.isNaN(hour) || Number.isNaN(minute)) return null;
  return hour * 60 + minute;
}

function isTrivialLog(text: string) {
  return (
    /\b(ate|eating|pizza|burger|snack|coffee)\b/i.test(text) ||
    /\b(showered|shower)\b/i.test(text)
  );
}

function isDistantEvent(days: number | null) {
  return days == null || days > 14;
}

function isNearTerm(days: number | null, maxDays: number) {
  return days != null && days >= 0 && days <= maxDays;
}

export function scoreImportance(input: ImportanceScoreInput): SyncImportance {
  const text = `${input.title ?? ""} ${input.text}`.toLowerCase();
  const destinations = input.destinations ?? [];
  const reference = input.reference ?? new Date();
  const dateKey =
    input.timeline?.startDate ??
    input.timeline?.deadlineDate ??
    null;
  const days = dateKey ? daysUntilDateKey(dateKey, reference) : null;
  const startTime = input.timeline?.startTime ?? input.timeline?.deadlineTime;
  const startMinutes = clockToMinutes(startTime ?? undefined);
  const isTimed = Boolean(input.timeline?.isTimed && startTime);

  if (isTrivialLog(text) && !/\b(flight|school|rent|birthday|payday|doctor)\b/i.test(text)) {
    return "low";
  }

  if (/\b(world cup|sports event|concert|festival)\b/i.test(text) && (days ?? 99) > 7) {
    return days != null && days <= 14 ? "medium" : "low";
  }

  const criticalSignals =
    (/\b(flight|airport|departure)\b/i.test(text) &&
      isNearTerm(days, 1) &&
      (isTimed ? (startMinutes ?? 999) < 8 * 60 : true)) ||
    (/\btake\s+(?:my\s+)?(daughter|son)\s+to\s+school\b/i.test(text) &&
      isNearTerm(days, 1)) ||
    (/\b(daughter|son)\b/i.test(text) &&
      /\b(school|drop[- ]?off)\b/i.test(text) &&
      isNearTerm(days, 1)) ||
    (/\b(doctor|hospital|surgery|emergency)\b/i.test(text) &&
      isNearTerm(days, 1)) ||
    (/\brent\b/i.test(text) && /\b(due|pay)\b/i.test(text) && days === 1);

  if (criticalSignals) return "critical";

  if (
    (/\b(birthday|bday|anniversary)\b/i.test(text) && isNearTerm(days, 1)) ||
    (/\brent\b/i.test(text) && /\b(due|pay)\b/i.test(text) && isNearTerm(days, 7)) ||
    (/\b(flight|travel|trip)\b/i.test(text) && isNearTerm(days, 3)) ||
    (/\b(interview|wedding|court|funeral)\b/i.test(text) && isNearTerm(days, 7)) ||
    (/\b(doctor|dentist|appointment|medical)\b/i.test(text) && isNearTerm(days, 7)) ||
    (destinations.includes("Family") && isNearTerm(days, 1))
  ) {
    return "high";
  }

  if (
    /\b(payday|pay day|get paid)\b/i.test(text) ||
    (/\b(gym|workout|exercise)\b/i.test(text) && isNearTerm(days, 3)) ||
    (destinations.includes("Finance") && isNearTerm(days, 7)) ||
    (destinations.includes("Relationships") && isNearTerm(days, 7))
  ) {
    return "medium";
  }

  if (input.baseImportance === "critical") return "critical";
  if (input.baseImportance === "high") return "high";
  if (input.baseImportance === "low") return "low";
  if (isDistantEvent(days)) return "low";

  return "medium";
}

export function scoreMemoryImportance(
  item: CapturedSyncItem,
  reference = new Date(),
  priorities: string[] = [],
): SyncImportance {
  const scored = scoreImportance({
    text: item.originalPrompt ?? item.prompt,
    title: item.title,
    category: item.category,
    destinations: item.destinations,
    timeline: item.timeline,
    reference,
    priorities,
    baseImportance: item.meaning?.importance,
  });

  if (priorities.length > 0) {
    const text = `${item.title} ${item.originalPrompt ?? item.prompt}`.toLowerCase();
    const boosted =
      (priorities.includes("Family") && /\b(mom|dad|daughter|son|family)\b/i.test(text)) ||
      (priorities.includes("Money") && /\b(rent|payday|bill)\b/i.test(text)) ||
      (priorities.includes("Relationships") && /\b(friend|girlfriend|partner)\b/i.test(text));
    if (boosted && scored === "medium") return "high";
  }

  return scored;
}

export function importanceToPriorityBoost(level: SyncImportance): number {
  switch (level) {
    case "critical":
      return -14;
    case "high":
      return -8;
    case "medium":
      return -2;
    default:
      return 4;
  }
}

export function importanceLabel(level: SyncImportance): string {
  return level.charAt(0).toUpperCase() + level.slice(1);
}

export function memoryDateKey(item: CapturedSyncItem, reference = new Date()) {
  return resolveCaptureDateKey(item, reference);
}
