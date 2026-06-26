import type { CapturedSyncItem } from "@/lib/captured-items";
import {
  scoreMemoryWeight,
  type MemoryWeight,
} from "@/lib/intelligence/memory-weight";
import { classifyLifeNote } from "@/lib/intelligence/life-note-classifier";
import { normalizeCaptureInput } from "@/lib/parser/normalize-capture-input";
import { memoryFilterCategory } from "@/lib/mobile-prototype/memory-category";
import { resolveNextOccurrenceDateKey } from "@/lib/timeline/next-occurrence";

export type MemoryArea =
  | "Money"
  | "Health"
  | "Family"
  | "Work"
  | "Relationships"
  | "Personal"
  | "Calendar";

export type MemoryType =
  | "expense"
  | "income"
  | "habit"
  | "meal"
  | "emotion"
  | "concern"
  | "goal"
  | "preference"
  | "health_signal"
  | "family_context"
  | "idea"
  | "routine"
  | "commitment"
  | "reminder"
  | "event"
  | "log"
  | "note";

export type TimeRelevance =
  | "past"
  | "today"
  | "tomorrow"
  | "this_week"
  | "later"
  | "none";

export type MemoryConfidence = "high" | "medium" | "low";

export type MemoryAccumulation =
  | "habit"
  | "spending"
  | "emotional"
  | "routine"
  | "relationship";

export type MemoryProfile = {
  area: MemoryArea;
  type: MemoryType;
  weight: MemoryWeight;
  timeRelevance: TimeRelevance;
  confidence: MemoryConfidence;
  accumulation: MemoryAccumulation | null;
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

function resolveTimeRelevance(
  item: Pick<CapturedSyncItem, "timeline">,
  reference: Date,
): TimeRelevance {
  const dateKey =
    (item.timeline
      ? resolveNextOccurrenceDateKey(item.timeline, reference)
      : null) ?? null;
  const days = daysUntilDateKey(dateKey, reference);

  if (item.timeline?.tense === "past" || (days != null && days < 0)) {
    return "past";
  }
  if (days === 0) return "today";
  if (days === 1) return "tomorrow";
  if (days != null && days <= 7) return "this_week";
  if (days != null && days > 7) return "later";
  return "none";
}

function resolveMemoryArea(item: CapturedSyncItem): MemoryArea {
  const text = `${item.title} ${item.originalPrompt ?? item.prompt}`.toLowerCase();
  const lifeNote = classifyLifeNote(text);
  if (lifeNote?.kind === "goal") return "Personal";
  if (lifeNote?.kind === "preference" && /\b(workout|workouts|running|sleep|health|gym)\b/i.test(text)) {
    return "Health";
  }
  if (lifeNote?.kind === "health_signal") return "Health";
  if (lifeNote?.kind === "family_context") return "Family";
  if (lifeNote?.kind === "routine" && /\b(sleep|workout|workouts|running|gym)\b/i.test(text)) {
    return "Health";
  }
  if (lifeNote?.kind === "idea" && /\b(mom|dad|mother|father|family|daughter|son)\b/i.test(text)) {
    return "Family";
  }

  const category = memoryFilterCategory(item);
  if (category === "Money") return "Money";
  if (category === "Health") return "Health";
  if (category === "Family") return "Family";
  if (category === "Work") return "Work";
  if (category === "Relationships") return "Relationships";
  return "Personal";
}

function resolveMemoryType(
  item: Pick<
    CapturedSyncItem,
    | "title"
    | "prompt"
    | "originalPrompt"
    | "category"
    | "moneyType"
    | "timeline"
    | "destinations"
  >,
  text: string,
): MemoryType {
  const lifeNote = classifyLifeNote(text);

  if (
    item.moneyType === "income" ||
    /\b(payday|pay day|get paid|paycheck)\b/i.test(text)
  ) {
    return "income";
  }

  if (
    item.moneyType === "expense" ||
    /\b(spent|paid|purchase|bought|cost)\b/i.test(text) ||
    item.category === "expense"
  ) {
    return "expense";
  }

  if (lifeNote?.kind === "concern") return "concern";
  if (lifeNote?.kind === "goal") return "goal";
  if (lifeNote?.kind === "preference") return "preference";
  if (lifeNote?.kind === "health_signal") return "health_signal";
  if (lifeNote?.kind === "family_context") return "family_context";
  if (lifeNote?.kind === "idea") return "idea";
  if (lifeNote?.kind === "routine") return "routine";

  if (
    /\b(sad|upset|anxious|stressed|depressed|lonely|cried|crying|feeling low|feeling down|happy|excited|grateful)\b/i.test(
      text,
    )
  ) {
    return "emotion";
  }

  if (/\b(coffee|tea)\b/i.test(text) && !/\b(meeting|date)\b/i.test(text)) {
    return "habit";
  }

  if (/\b(ate|eating|meal|lunch|breakfast|dinner|snack|pizza|burger|mcdonald)\b/i.test(text)) {
    return "meal";
  }

  if (item.timeline?.timelineRole === "log" || item.category === "workout") {
    return "log";
  }

  if (item.timeline?.timelineRole === "deadline" || item.category === "reminder") {
    return "reminder";
  }

  if (
    item.timeline?.timelineRole === "event" ||
    /\b(flight|appointment|school|birthday|anniversary|rent)\b/i.test(text)
  ) {
    return "commitment";
  }

  if (item.timeline?.startDate || item.timeline?.deadlineDate) {
    return "event";
  }

  return "note";
}

function resolveConfidence(
  item: Pick<CapturedSyncItem, "timeline">,
  type: MemoryType,
): MemoryConfidence {
  const timelineConfidence = item.timeline?.confidence;
  if (timelineConfidence != null) {
    if (timelineConfidence >= 0.85) return "high";
    if (timelineConfidence >= 0.65) return "medium";
    return "low";
  }

  if (
    type === "emotion" ||
    type === "habit" ||
    type === "meal" ||
    type === "log" ||
    type === "preference" ||
    type === "health_signal" ||
    type === "family_context" ||
    type === "routine"
  ) {
    return "high";
  }

  if (type === "concern" || type === "goal" || type === "idea") return "medium";

  if (type === "note") return "low";
  return "medium";
}

function resolveAccumulation(
  type: MemoryType,
  area: MemoryArea,
  text: string,
): MemoryAccumulation | null {
  if (type === "habit" || type === "meal") return "habit";
  if (type === "routine") return "routine";
  if (type === "expense") return "spending";
  if (type === "emotion" || type === "concern" || type === "health_signal") {
    return "emotional";
  }
  if (type === "family_context") return "relationship";
  if (type === "log" && area === "Work") return "routine";
  if (type === "commitment" && area === "Relationships") return "relationship";
  if (type === "event" && area === "Relationships") return "relationship";
  if (/\b(work schedule|shift|every other|get paid)\b/i.test(text)) return "routine";
  if (/\b(birthday|anniversary)\b/i.test(text)) return "relationship";
  return null;
}

export function buildMemoryProfile(
  item: CapturedSyncItem,
  reference = new Date(),
): MemoryProfile {
  const prompt = (item.originalPrompt ?? item.prompt).trim();
  const normalized = normalizeCaptureInput(prompt).normalized;
  const text = `${item.title} ${normalized}`.toLowerCase();

  const area = resolveMemoryArea(item);
  const type = resolveMemoryType(item, text);
  const weight = scoreMemoryWeight(item, reference);
  const timeRelevance = resolveTimeRelevance(item, reference);
  const confidence = resolveConfidence(item, type);

  const accumulation = resolveAccumulation(type, area, text);

  return {
    area,
    type,
    weight,
    timeRelevance,
    confidence,
    accumulation,
  };
}

export function describeMemoryType(type: MemoryType): string {
  switch (type) {
    case "expense":
      return "Expense";
    case "income":
      return "Income";
    case "habit":
      return "Habit";
    case "meal":
      return "Meal";
    case "emotion":
      return "Emotional check-in";
    case "concern":
      return "Concern";
    case "goal":
      return "Goal";
    case "preference":
      return "Preference";
    case "health_signal":
      return "Health signal";
    case "family_context":
      return "Family context";
    case "idea":
      return "Idea";
    case "routine":
      return "Routine";
    case "commitment":
      return "Commitment";
    case "reminder":
      return "Reminder";
    case "event":
      return "Event";
    case "log":
      return "Log";
    default:
      return "Note";
  }
}

export function describeTimeRelevance(relevance: TimeRelevance): string {
  switch (relevance) {
    case "past":
      return "Already happened";
    case "today":
      return "Today";
    case "tomorrow":
      return "Tomorrow";
    case "this_week":
      return "This week";
    case "later":
      return "Later";
    default:
      return "No fixed timing";
  }
}

export function describeMemoryConfidence(confidence: MemoryConfidence): string {
  switch (confidence) {
    case "high":
      return "Clear";
    case "medium":
      return "Fair";
    default:
      return "Fuzzy";
  }
}

export function describeMemoryWeight(weight: MemoryWeight): string {
  switch (weight) {
    case "critical":
      return "Critical";
    case "meaningful":
      return "Meaningful";
    case "important":
      return "Important";
    default:
      return "Light";
  }
}
