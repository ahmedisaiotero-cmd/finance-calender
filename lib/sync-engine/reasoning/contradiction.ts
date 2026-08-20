import type { CapturedSyncItem } from "@/lib/captured-items";

export type ContradictionType =
  | "schedule"
  | "date"
  | "preference"
  | "identity"
  | "unknown";

export type ContradictionDetection = {
  detected: boolean;
  type: ContradictionType;
  relatedMemoryIds: string[];
  recommendedAction: "ask_follow_up" | "update_existing" | "low_confidence_memory";
  reason: string;
};

const DAYS = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
] as const;

const RELATIONSHIP_PRONOUN_PATTERN = /\b(she|he|they)\b/i;

function extractDays(text: string) {
  const normalized = text.toLowerCase();
  return DAYS.filter((day) => normalized.includes(day));
}

function normalize(text: string) {
  return text.toLowerCase().replace(/\s+/g, " ").trim();
}

function rentDueDay(text: string): string | null {
  const match = text.match(
    /\brent\s+is\s+due\s+(?:on\s+)?(?:the\s+)?(\d{1,2}(?:st|nd|rd|th)?|first|second|third|fourth|fifth|sixth|seventh|eighth|ninth|tenth|[a-z]+)\b/i,
  );
  if (!match?.[1]) return null;
  const value = match[1].toLowerCase();
  if (value === "the") return null;
  return value;
}

function birthdayDay(text: string): string | null {
  const match = text.match(/\bbirthday\b.*\b(is|on)\s+([a-z]+)\b/i);
  if (!match?.[2]) return null;
  return match[2].toLowerCase();
}

export function detectContradiction(input: {
  text: string;
  items: CapturedSyncItem[];
}): ContradictionDetection {
  const text = normalize(input.text);
  if (!text) {
    return {
      detected: false,
      type: "unknown",
      relatedMemoryIds: [],
      recommendedAction: "low_confidence_memory",
      reason: "Input is empty.",
    };
  }

  const workDays = extractDays(text);
  const mentionsWork = /\bwork\b/i.test(text);
  if (mentionsWork && workDays.length > 0) {
    const relatedMemoryIds: string[] = [];
    for (const item of input.items) {
      const existing = normalize(`${item.prompt} ${item.title}`);
      if (!/\bwork\b/i.test(existing)) continue;
      const existingDays = extractDays(existing);
      if (existingDays.length === 0) continue;
      const different = existingDays.some((day) => !workDays.includes(day));
      if (different) {
        relatedMemoryIds.push(item.id);
      }
    }
    if (relatedMemoryIds.length > 0) {
      return {
        detected: true,
        type: "schedule",
        relatedMemoryIds,
        recommendedAction: "ask_follow_up",
        reason: "Work schedule appears to conflict with existing schedule memory.",
      };
    }
  }

  const dueDay = rentDueDay(text);
  if (dueDay) {
    const relatedMemoryIds: string[] = [];
    for (const item of input.items) {
      const existingText = normalize(`${item.prompt} ${item.title}`);
      const existingDueDay = rentDueDay(existingText);
      if (!existingDueDay) continue;
      if (existingDueDay !== dueDay) {
        relatedMemoryIds.push(item.id);
      }
    }
    if (relatedMemoryIds.length > 0) {
      return {
        detected: true,
        type: "date",
        relatedMemoryIds,
        recommendedAction: relatedMemoryIds.length === 1 ? "update_existing" : "ask_follow_up",
        reason: "Rent due date conflicts with existing due-date memory.",
      };
    }
  }

  const correctedDueDay = text.match(/\bdue\s+(?:on\s+)?([a-z]+)\b/i)?.[1]?.toLowerCase() ?? null;
  if (correctedDueDay && /\b(actually|instead|now)\b/.test(text)) {
    const relatedMemoryIds = input.items
      .filter((item) => /\bdue\b/i.test(`${item.prompt} ${item.title}`))
      .map((item) => item.id);
    if (relatedMemoryIds.length > 0) {
      return {
        detected: true,
        type: "date",
        relatedMemoryIds,
        recommendedAction: relatedMemoryIds.length === 1 ? "update_existing" : "ask_follow_up",
        reason: "Corrected due-date statement conflicts with existing due-date memory.",
      };
    }
  }

  const birthday = birthdayDay(text);
  if (birthday) {
    const relatedMemoryIds: string[] = [];
    for (const item of input.items) {
      const existingText = normalize(`${item.prompt} ${item.title}`);
      if (!/\bbirthday\b/i.test(existingText)) continue;
      const existingDay = birthdayDay(existingText);
      if (!existingDay || existingDay === birthday) continue;
      relatedMemoryIds.push(item.id);
    }
    if (relatedMemoryIds.length > 0) {
      return {
        detected: true,
        type: "date",
        relatedMemoryIds,
        recommendedAction: relatedMemoryIds.length === 1 ? "update_existing" : "ask_follow_up",
        reason: "Birthday date correction conflicts with an existing birthday memory.",
      };
    }
  }

  const mentionsVegetarian = /\b(i am|i'm)\s+vegetarian\b/i.test(text);
  const mentionsSteak = /\b(i\s+love|love)\s+steak\b/i.test(text);
  const preferenceSignal = /\b(likes?|loves?|hates?|prefers?|doesn't like|does not like)\b/i.test(
    text,
  );
  if (mentionsVegetarian || mentionsSteak || preferenceSignal) {
    const relatedMemoryIds: string[] = [];
    for (const item of input.items) {
      const existing = normalize(`${item.prompt} ${item.title}`);
      const existingVegetarian = /\bvegetarian\b/i.test(existing);
      const existingSteak = /\bsteak\b/i.test(existing);
      const existingPreference = /\b(likes?|loves?|hates?|prefers?|doesn't like|does not like)\b/i.test(
        existing,
      );
      const relationshipAnchor =
        /girlfriend|boyfriend|partner|wife|husband|mom|dad|brother|sister/i.test(text) ||
        RELATIONSHIP_PRONOUN_PATTERN.test(text);
      const existingRelationship =
        /girlfriend|boyfriend|partner|wife|husband|mom|dad|brother|sister/i.test(existing);

      if (
        (mentionsVegetarian && existingSteak) ||
        (mentionsSteak && existingVegetarian) ||
        (preferenceSignal && existingPreference && (!relationshipAnchor || existingRelationship))
      ) {
        relatedMemoryIds.push(item.id);
      }
    }
    if (relatedMemoryIds.length > 0) {
      return {
        detected: true,
        type: "preference",
        relatedMemoryIds,
        recommendedAction: relatedMemoryIds.length === 1 ? "update_existing" : "ask_follow_up",
        reason: "Preference statement conflicts with prior preference memory.",
      };
    }
  }

  return {
    detected: false,
    type: "unknown",
    relatedMemoryIds: [],
    recommendedAction: "low_confidence_memory",
    reason: "No contradiction signal detected.",
  };
}
