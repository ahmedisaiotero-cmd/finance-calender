import type { CapturedSyncItem } from "@/lib/captured-items";
import type { SyncConsequence } from "@/lib/intelligence/sync-consequences";
import { formatSyncClock } from "@/lib/sync-time-blocks";

const DEFAULT_PLACEHOLDER_MINUTES = 12 * 60;

export function clockToMinutes(value?: string | null): number | null {
  if (!value) return null;
  const [hourText, minuteText = "0"] = value.split(":");
  const hour = Number(hourText);
  const minute = Number(minuteText);
  if (Number.isNaN(hour) || Number.isNaN(minute)) return null;
  return hour * 60 + minute;
}

export function formatMinutesLabel(minutes: number): string | null {
  const hour = Math.floor(minutes / 60);
  const minute = minutes % 60;
  return formatSyncClock(`${hour}:${String(minute).padStart(2, "0")}`) ?? null;
}

function extractTimeFromText(text: string) {
  const match = text.match(/\b(\d{1,2}:\d{2}\s*(?:AM|PM)?)\b/i);
  return match?.[1] ?? null;
}

export function resolveConsequenceSortMinutes(
  consequence: SyncConsequence,
  items: CapturedSyncItem[],
): number | null {
  if (consequence.sourceMemoryId) {
    const item = items.find((entry) => entry.id === consequence.sourceMemoryId);
    if (item?.timeline?.startTime) {
      const minutes = clockToMinutes(item.timeline.startTime);
      if (minutes != null) return minutes;
    }
  }

  if (consequence.sortMinutes == null) return null;
  if (consequence.sortMinutes === DEFAULT_PLACEHOLDER_MINUTES) return null;
  return consequence.sortMinutes;
}

export function resolveConsequenceTimeLabel(
  consequence: SyncConsequence,
  items: CapturedSyncItem[],
): string | null {
  if (consequence.sourceMemoryId) {
    const item = items.find((entry) => entry.id === consequence.sourceMemoryId);
    if (item?.timeline?.startTime) {
      const start = formatMinutesLabel(clockToMinutes(item.timeline.startTime)!);
      const prompt = item.originalPrompt ?? item.prompt ?? "";
      const hasRangeInPrompt =
        /\b(from|to|until|through)\b/i.test(prompt) ||
        /\d\s*(?:am|pm)?\s*(?:-|–|to)\s*\d/i.test(prompt);
      if (item.timeline.endTime && hasRangeInPrompt) {
        const end = formatMinutesLabel(clockToMinutes(item.timeline.endTime)!);
        if (start && end) return `${start}–${end}`;
      }
      if (start) return start;
    }
  }

  const minutes = resolveConsequenceSortMinutes(consequence, items);
  if (minutes != null) {
    return formatMinutesLabel(minutes);
  }
  return extractTimeFromText(consequence.surfaceText);
}

export function withResolvedConsequenceTiming(
  consequence: SyncConsequence,
  items: CapturedSyncItem[],
): SyncConsequence {
  const sortMinutes = resolveConsequenceSortMinutes(consequence, items);
  return sortMinutes != null ? { ...consequence, sortMinutes } : consequence;
}

export function isGenericTimingSurfaceText(text: string) {
  const normalized = text.toLowerCase();
  return (
    (/\bis tomorrow\b/.test(normalized) ||
      /\bis today\b/.test(normalized) ||
      /\bis in \d+ days\b/.test(normalized)) &&
    !/\bat \d{1,2}:\d{2}\b/.test(normalized)
  );
}

export function isTimelineNoiseConsequence(consequence: SyncConsequence) {
  const text = consequence.surfaceText.toLowerCase();
  if (
    consequence.kind === "time_opens" ||
    consequence.kind === "ambient" ||
    consequence.kind === "day_synthesis" ||
    consequence.kind === "work_stretch"
  ) {
    return true;
  }
  if (/tomorrow is open after/.test(text)) return true;
  if (/evening opens|open after/.test(text)) return true;
  if (/finance deadline within the week/.test(text)) return true;
  if (/you work the next/.test(text)) return true;
  if (/early flight tomorrow — tonight/.test(text)) return true;
  return false;
}

export function dedupeOverlappingConsequences(
  consequences: SyncConsequence[],
  items: CapturedSyncItem[] = [],
): SyncConsequence[] {
  const groups = new Map<string, SyncConsequence[]>();

  for (const consequence of consequences) {
    if (!consequence.sourceMemoryId || !consequence.dateKey) continue;
    const key = `${consequence.sourceMemoryId}:${consequence.dateKey}`;
    const list = groups.get(key) ?? [];
    list.push(consequence);
    groups.set(key, list);
  }

  const dropIds = new Set<string>();

  for (const group of groups.values()) {
    if (group.length <= 1) continue;

    const timed = group.filter(
      (consequence) =>
        resolveConsequenceSortMinutes(consequence, items) != null,
    );
    if (timed.length === 0) continue;

    for (const consequence of group) {
      if (timed.some((entry) => entry.id === consequence.id)) continue;
      if (isGenericTimingSurfaceText(consequence.surfaceText)) {
        dropIds.add(consequence.id);
      }
    }
  }

  const topicGroups = new Map<string, SyncConsequence[]>();
  for (const consequence of consequences) {
    if (dropIds.has(consequence.id)) continue;
    if (consequence.daysUntil == null || !consequence.dateKey) continue;
    const topic = topicKey(consequence.surfaceText);
    if (!topic) continue;
    const key = `${consequence.dateKey}:${topic}`;
    const list = topicGroups.get(key) ?? [];
    list.push(consequence);
    topicGroups.set(key, list);
  }

  for (const group of topicGroups.values()) {
    if (group.length <= 1) continue;
    const ranked = [...group].sort((a, b) => {
      const explicitA = /\bat \d{1,2}:\d{2}/i.test(a.surfaceText) ? 0 : 1;
      const explicitB = /\bat \d{1,2}:\d{2}/i.test(b.surfaceText) ? 0 : 1;
      if (explicitA !== explicitB) return explicitA - explicitB;
      const genericA = isGenericTimingSurfaceText(a.surfaceText) ? 1 : 0;
      const genericB = isGenericTimingSurfaceText(b.surfaceText) ? 1 : 0;
      if (genericA !== genericB) return genericA - genericB;
      const timeA = a.sortMinutes ?? 9999;
      const timeB = b.sortMinutes ?? 9999;
      return timeA - timeB;
    });
    for (const duplicate of ranked.slice(1)) {
      dropIds.add(duplicate.id);
    }
  }

  return consequences.filter((consequence) => !dropIds.has(consequence.id));
}

function topicKey(text: string) {
  const normalized = text.toLowerCase();
  if (/\bpayday\b/.test(normalized)) return "payday";
  if (/\bflight\b/.test(normalized)) return "flight";
  if (/\brent\b/.test(normalized)) return "rent";
  if (/\bbirthday\b/.test(normalized)) return "birthday";
  if (/\banniversary\b/.test(normalized)) return "anniversary";
  if (/\bworkout\b|\bgym\b/.test(normalized)) return "workout";
  if (/\bwork starts\b|\bwork begins\b/.test(normalized)) return "work";
  return null;
}

export function formatItemTimePhrase(
  item: CapturedSyncItem,
  reference: Date,
): string | null {
  const startClock = item.timeline?.startTime;
  const endClock = item.timeline?.endTime;
  const prompt = item.originalPrompt ?? item.prompt ?? "";
  const hasRangeInPrompt =
    /\b(from|to|until|through)\b/i.test(prompt) ||
    /\d\s*(?:am|pm)?\s*(?:-|–|to)\s*\d/i.test(prompt);
  const startLabel = startClock ? formatSyncClock(startClock) : null;
  const endLabel =
    endClock && hasRangeInPrompt ? formatSyncClock(endClock) : null;
  const time =
    startLabel && endLabel
      ? `${startLabel}–${endLabel}`
      : startLabel ??
        (item.timeLabel !== "Flexible" ? item.timeLabel : null);

  if (!time) return null;

  const dateKey = item.timeline?.startDate ?? item.timeline?.deadlineDate;
  if (!dateKey) return time;

  const [y, m, d] = dateKey.split("-").map(Number);
  const target = new Date(y, m - 1, d);
  const start = new Date(reference);
  start.setHours(12, 0, 0, 0);
  target.setHours(12, 0, 0, 0);
  const days = Math.round((target.getTime() - start.getTime()) / (24 * 60 * 60 * 1000));

  const minutes = item.timeline?.startTime
    ? clockToMinutes(item.timeline.startTime)
    : null;
  const evening = minutes != null && minutes >= 17 * 60;

  const saidToday = /\btoday\b/i.test(prompt);

  if (days === 0) {
    if (endLabel) {
      if (saidToday) return `Today, ${time}`;
      return evening ? `Tonight, ${time}` : `Today, ${time}`;
    }
    if (saidToday) return `Today at ${time}`;
    return evening ? `Tonight at ${time}` : `Today at ${time}`;
  }
  if (days === 1) {
    if (endLabel) return `Tomorrow, ${time}`;
    return `Tomorrow at ${time}`;
  }
  if (days > 1 && days <= 7) {
    const weekday = target.toLocaleDateString("en-US", { weekday: "long" });
    return `${weekday} at ${time}`;
  }

  return time;
}
