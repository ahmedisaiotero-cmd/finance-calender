import { resolveCaptureDateKey } from "@/lib/captured-to-timeline";
import type { CapturedSyncItem } from "@/lib/captured-items";
import {
  buildMemoryProfile,
  type MemoryProfile,
} from "@/lib/intelligence/memory-profile";
import { normalizeCaptureInput } from "@/lib/parser/normalize-capture-input";
import { displayMemoryTitle } from "@/lib/sync-capture/memory-title";
import { formatSyncClock } from "@/lib/sync-time-blocks";
import { resolveNextOccurrenceDateKey } from "@/lib/timeline/next-occurrence";

function daysUntilDateKey(dateKey: string | null, reference: Date) {
  if (!dateKey) return null;
  const [y, m, d] = dateKey.split("-").map(Number);
  const target = new Date(y, m - 1, d);
  const start = new Date(reference);
  start.setHours(12, 0, 0, 0);
  target.setHours(12, 0, 0, 0);
  return Math.round((target.getTime() - start.getTime()) / (24 * 60 * 60 * 1000));
}

function weekdayLabel(dateKey: string) {
  const [y, m, d] = dateKey.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-US", { weekday: "long" });
}

function whenPhrase(
  days: number | null,
  dateKey: string | null,
  timelineLabel?: string | null,
): string {
  const label = timelineLabel?.trim().toLowerCase();
  if (label && /^(today|tomorrow|next week|this week|later this month)$/.test(label)) {
    return label;
  }
  if (days == null) return "soon";
  if (days === 0) return "today";
  if (days === 1) return "tomorrow";
  if (days >= 2 && days <= 7 && dateKey) return weekdayLabel(dateKey);
  if (days <= 14) return `in ${days} days`;
  if (days <= 45) return "later this month";
  return "coming up";
}

function timePhrase(timeline: CapturedSyncItem["timeline"]): string | null {
  const raw = timeline?.startTime ?? timeline?.deadlineTime;
  if (!raw) return null;
  return formatSyncClock(raw) ?? null;
}

function interpretLightMemory(profile: MemoryProfile, text: string): string | null {
  if (profile.type === "habit" || /\bcoffee\b/i.test(text)) {
    return "Small daily habit.";
  }
  if (profile.type === "meal") {
    return "Meal logged.";
  }
  if (profile.type === "expense") {
    if (/\$\s*\d+|\d+\s*dollars?/i.test(text)) {
      return "Small money note saved.";
    }
    return "Spending logged.";
  }
  if (/\b(shower(?:ed|ing)?|slept|sleep)\b/i.test(text)) {
    return "Personal care logged.";
  }
  return null;
}

function interpretEmotionalMemory(text: string, days: number | null): string {
  if (/\b(happy|excited|grateful|great day|good day)\b/i.test(text)) {
    return days === 0 ? "Positive moment noted today." : "Positive moment recorded.";
  }
  if (/\b(sad|upset|anxious|stressed|depressed|lonely|cried|crying|feeling low|feeling down)\b/i.test(text)) {
    return days === 0
      ? "Emotional check-in noted today."
      : "Emotional check-in recorded.";
  }
  return "Emotional check-in recorded.";
}

function interpretFromProfile(
  profile: MemoryProfile,
  text: string,
  days: number | null,
  when: string,
  time: string | null,
): string | null {
  if (profile.weight === "light" && profile.type !== "routine") {
    return interpretLightMemory(profile, text);
  }

  if (profile.type === "emotion") {
    return interpretEmotionalMemory(text, days);
  }

  if (profile.type === "concern") {
    if (/\brent\b|\bbill\b|\bmoney\b|\bbudget\b|\bafford\b/i.test(text)) {
      return "Money concern noted — Sync will keep this in context without treating it like a bill.";
    }
    return "Concern noted — Sync will keep this in context without turning it into a task.";
  }

  if (profile.type === "goal") {
    if (/\brunning|run|workout|gym|health\b/i.test(text)) {
      return "Health goal noted — Sync will remember this as direction, not a calendar event.";
    }
    return "Goal noted — Sync will remember what you want to move toward.";
  }

  if (profile.type === "preference") {
    if (/\bmorning\b/i.test(text) && /\b(workout|workouts|gym|running|run)\b/i.test(text)) {
      return "Preference noted — morning workouts fit you better.";
    }
    return "Preference noted — Sync will use this as context.";
  }

  if (profile.type === "health_signal") {
    if (/\bsleep|slept|night\b/i.test(text)) {
      return "Sleep signal noted — Sync will keep this quietly in your health context.";
    }
    return "Health signal noted — Sync will keep this in context.";
  }

  if (profile.type === "family_context") {
    if (/\bdad|father\b/i.test(text)) {
      return "Family context noted — Dad may need more support lately.";
    }
    if (/\bmom|mother\b/i.test(text)) {
      return "Family context noted — Mom may need more support lately.";
    }
    return "Family context noted — Sync will keep this relationship context in mind.";
  }

  if (profile.type === "idea") {
    if (/\bmom|mother\b/i.test(text) && /\bbirthday\b/i.test(text)) {
      return "Idea saved — something thoughtful for Mom's birthday.";
    }
    return "Idea saved — Sync will keep it without turning it into a task.";
  }

  if (profile.type === "routine") {
    if (/\bcoffee\b/i.test(text)) {
      return "Routine noted — coffee has been showing up regularly.";
    }
    return "Routine noted — Sync will watch for this pattern over time.";
  }

  return null;
}

export function buildMemoryUnderstanding(
  item: Pick<
    CapturedSyncItem,
    | "title"
    | "prompt"
    | "originalPrompt"
    | "destinations"
    | "timeline"
    | "category"
    | "workAvailability"
    | "moneyType"
  >,
  reference = new Date(),
): string {
  const prompt = (item.originalPrompt ?? item.prompt).trim();
  const normalizedPrompt = normalizeCaptureInput(prompt).normalized;
  const text = `${item.title} ${normalizedPrompt}`.toLowerCase();
  const profile = buildMemoryProfile(item as CapturedSyncItem, reference);
  const dateKey =
    (item.timeline
      ? resolveNextOccurrenceDateKey(item.timeline, reference)
      : null) ?? resolveCaptureDateKey(item as CapturedSyncItem, reference);
  const days = daysUntilDateKey(dateKey, reference);
  const when = whenPhrase(days, dateKey, item.timeline?.label);
  const time = timePhrase(item.timeline);

  const profileInterpretation = interpretFromProfile(
    profile,
    text,
    days,
    when,
    time,
  );
  if (profileInterpretation) {
    return profileInterpretation;
  }

  if (
    /\bsend\b.*\b(mama|mom|mother)\b.*\b(money|cash)\b/i.test(normalizedPrompt) ||
    /\bsend\b.*\b(money|cash)\b.*\b(mama|mom|mother)\b/i.test(normalizedPrompt)
  ) {
    return `You want to send money to your mother ${when}.`;
  }

  if (
    /\btake\s+(?:my\s+)?(daughter|son)\s+to\s+school\b/i.test(normalizedPrompt) ||
    /take\s+(daughter|son)\s+to\s+school/i.test(item.title)
  ) {
    const child =
      /\bdaughter\b/i.test(normalizedPrompt) || /\bdaughter\b/i.test(item.title)
        ? "daughter"
        : "son";
    if (days === 1) {
      return time
        ? `You need to take your ${child} to school tomorrow at ${time}.`
        : `You need to take your ${child} to school tomorrow.`;
    }
    return `You need to take your ${child} to school ${when}.`;
  }

  if (/\bflight\b/i.test(text)) {
    if (days === 1) {
      return time
        ? `You have a flight tomorrow at ${time}.`
        : "You have a flight tomorrow.";
    }
    return `You have a flight ${when}${time ? ` at ${time}` : ""}.`;
  }

  if (/\b(best\s+)?friend(?:'s)?\s+(?:b(?:irth)?d(?:ay)?|bday)\b/i.test(normalizedPrompt)) {
    return days === 1
      ? "Your friend's birthday is tomorrow."
      : `Your friend's birthday is ${when}.`;
  }

  if (/\bbirthday\b|\bbday\b/i.test(normalizedPrompt)) {
    const title = displayMemoryTitle(item as CapturedSyncItem);
    if (/'s birthday$/i.test(title)) {
      return days === 1
        ? `${title.replace(/'s Birthday$/i, "'s birthday")} is tomorrow.`
        : `${title.replace(/'s Birthday$/i, "'s birthday")} is ${when}.`;
    }
  }

  if (/\brent\b/i.test(text) && /\b(due|pay)\b/i.test(text)) {
    return days === 1 ? "Rent is due tomorrow." : `Rent is due ${when}.`;
  }

  if (
    /\b(payday|pay day|get paid|every other)\b/i.test(text) ||
    item.moneyType === "income"
  ) {
    return days === 1 ? "Payday lands tomorrow." : `Payday lands ${when}.`;
  }

  if (
    item.workAvailability === "off" ||
    /\b(don't|dont)\s+work\b/i.test(normalizedPrompt)
  ) {
    return days === 1 ? "You're off work tomorrow." : `You're off work ${when}.`;
  }

  if (/\banniversary\b/i.test(text)) {
    return days === 1 ? "Your anniversary is tomorrow." : `Your anniversary is ${when}.`;
  }

  if (/\b(gym|workout)\b/i.test(text) && days != null && days < 0) {
    return "You went to the gym recently.";
  }

  if (/\bworld cup\b/i.test(text)) {
    return `World Cup games are ${when}.`;
  }

  if (profile.weight === "light") {
    return interpretLightMemory(profile, text) ?? "Light note logged.";
  }

  if (profile.type === "commitment" || profile.type === "reminder") {
    const title = displayMemoryTitle(item as CapturedSyncItem);
    if (days === 1) return `${title} is tomorrow.`;
    if (days === 0) return `${title} is today.`;
    if (days != null && days > 1) return `${title} is ${when}.`;
  }

  if (profile.weight === "meaningful" && profile.type === "note") {
    return "Something meaningful to hold onto.";
  }

  return "Noted — I'll keep this in context.";
}

export function resolveMemoryUnderstanding(
  item: CapturedSyncItem,
  reference = new Date(),
): string {
  if (item.understanding?.trim()) {
    return item.understanding.trim();
  }
  return buildMemoryUnderstanding(item, reference);
}

export { buildMemoryProfile } from "@/lib/intelligence/memory-profile";
