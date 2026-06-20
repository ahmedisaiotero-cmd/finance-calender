import { titleCaseKeep } from "@/lib/pulse/parse-pulse-prompt";
import type {
  PulseMoneyType,
  PulsePlanCategory,
} from "@/lib/pulse/types";
import type { CapturedSyncItem } from "@/lib/captured-items";
import {
  isWorkDayOffLanguage,
  type WorkAvailability,
} from "@/lib/sync-capture/work-availability";

const RELATION_LABELS: Record<string, string> = {
  mom: "Mom",
  moms: "Mom",
  mother: "Mother",
  dad: "Dad",
  dads: "Dad",
  father: "Father",
  girlfriend: "Girlfriend",
  girlfrienda: "Girlfriend",
  boyfriend: "Boyfriend",
  wife: "Wife",
  husband: "Husband",
  partner: "Partner",
  daughter: "Daughter",
  son: "Son",
  grandma: "Grandma",
  grandpa: "Grandpa",
  grandmother: "Grandmother",
  grandfather: "Grandfather",
  sister: "Sister",
  brother: "Brother",
};

export type MemoryTitleInput = {
  title: string;
  prompt: string;
  category?: PulsePlanCategory;
  timeLabel?: string;
  parsedInput?: {
    moneyType?: PulseMoneyType;
    workAvailability?: WorkAvailability;
  };
  moneyType?: PulseMoneyType;
  workAvailability?: WorkAvailability;
};

function relationLabel(token: string): string {
  const key = token.toLowerCase().replace(/'s$/, "").trim();
  return RELATION_LABELS[key] ?? titleCaseKeep(token.replace(/'s$/i, ""));
}

function combinedText(input: MemoryTitleInput) {
  return `${input.title} ${input.prompt}`.toLowerCase();
}

function isPayday(input: MemoryTitleInput, text: string) {
  return (
    input.parsedInput?.moneyType === "income" ||
    input.moneyType === "income" ||
    /\b(get paid|getting paid|payday|paycheck|every other (?:monday|tuesday|wednesday|thursday|friday|saturday|sunday))\b/.test(
      text,
    )
  );
}

function extractBirthdayRelation(prompt: string): string | null {
  const patterns = [
    /\b(?:my\s+)?(moms?|mother|dads?|father|girlfrienda?|boyfriend|wife|husband|partner|daughter|son|grandma|grandpa|grandmother|grandfather)\s+(?:b(?:irth)?d(?:ay)?|bday)\b/i,
    /\b(?:my\s+)?(moms?|mother|dads?|father|girlfrienda?|boyfriend|wife|husband|partner|daughter|son|grandma|grandpa)'s\s+(?:b(?:irth)?d(?:ay)?|bday)\b/i,
    /\b(?:my\s+)?([a-z]{3,})(?:'s)?\s+(?:b(?:irth)?d(?:ay)?|bday)\b/i,
  ];

  for (const pattern of patterns) {
    const match = prompt.match(pattern);
    if (match?.[1]) {
      return relationLabel(match[1]);
    }
  }

  if (/\b(?:my\s+)?moms?\b/i.test(prompt) && /\bbday\b/i.test(prompt)) {
    return "Mom";
  }
  if (/\b(?:my\s+)?girlfrienda?\b/i.test(prompt) && /\bbday\b/i.test(prompt)) {
    return "Girlfriend";
  }

  return null;
}

function looksLikeRawCaptureTitle(title: string) {
  const normalized = title.trim().toLowerCase();
  if (!normalized) return false;

  return (
    /\b(bday|birthday)\b/.test(normalized) ||
    /\b(is|was|are|on)\b/.test(normalized) ||
    /\b(get paid|every other)\b/.test(normalized) ||
    /\b(showered|shower)\b/.test(normalized) ||
    (normalized.split(/\s+/).length >= 4 &&
      /\b(my|the|on|is|december|april|january|february|march|may|june|july|august|september|october|november)\b/.test(
        normalized,
      ))
  );
}

export function cleanMemoryTitle(input: MemoryTitleInput): string {
  const prompt = input.prompt.trim();
  const text = combinedText(input);

  if (isPayday(input, text)) {
    return "Payday";
  }

  if (
    input.parsedInput?.workAvailability === "off" ||
    input.workAvailability === "off" ||
    isWorkDayOffLanguage(prompt)
  ) {
    if (/\btomorrow\b/i.test(text)) return "Day Off Tomorrow";
    if (/\btoday\b/i.test(text)) return "Day Off Today";
    return "Day Off";
  }

  if (
    input.parsedInput?.workAvailability === "overtime" ||
    input.workAvailability === "overtime" ||
    /\bovertime\b/i.test(text)
  ) {
    if (/\btomorrow\b/i.test(text)) return "Overtime Tomorrow";
    if (/\btoday\b/i.test(text)) return "Overtime Today";
    return "Overtime";
  }

  if (/\banniversary\b/i.test(text)) {
    return "Anniversary";
  }

  const birthdayRelation = extractBirthdayRelation(prompt);
  if (birthdayRelation || /\bbirthday\b/i.test(text) || /\bbday\b/i.test(text)) {
    if (birthdayRelation) {
      return `${birthdayRelation}'s Birthday`;
    }
    if (/\bgirlfrienda?\b/i.test(text)) return "Girlfriend's Birthday";
    if (/\b(mom|mother|moms)\b/i.test(text)) return "Mom's Birthday";
    if (/\b(dad|father|dads)\b/i.test(text)) return "Dad's Birthday";
    return "Birthday";
  }

  if (/\brent\b/i.test(text) && /\b(due|pay)\b/i.test(text)) {
    return "Rent";
  }

  if (/\bshower(?:ed|ing)?\b/i.test(text)) {
    return "Shower Logged";
  }

  if (/\b(slept|sleep)\b/i.test(text) && input.category !== "workout") {
    return "Sleep Logged";
  }

  if (input.category === "workout" && input.timeLabel && input.timeLabel !== "Flexible") {
    return `${input.timeLabel} Workout`;
  }

  if (input.category === "workout" || /\b(gym|workout|exercise)\b/i.test(text)) {
    if (/\btoday\b/i.test(text)) return "Workout Logged";
    return "Workout";
  }

  if (/\b(medication|medicine|prescription)\b/i.test(text)) {
    return "Medication";
  }

  if (input.category === "workday" || /\b(overtime|worked)\b/i.test(text)) {
    if (/\bovertime\b/i.test(text)) return "Overtime";
    if (/\bworked\b/i.test(text)) return "Work Logged";
    return "Work";
  }

  if (input.category === "reminder") {
    const cleaned = input.title.replace(/\s+Reminder$/i, "").trim();
    if (cleaned && !looksLikeRawCaptureTitle(cleaned)) {
      return cleaned;
    }
  }

  if (looksLikeRawCaptureTitle(input.title)) {
    if (/\banniversary\b/i.test(prompt)) return "Anniversary";
    if (isPayday(input, text)) return "Payday";
    const relation = extractBirthdayRelation(prompt);
    if (relation) return `${relation}'s Birthday`;
  }

  const trimmedTitle = input.title.trim();
  if (trimmedTitle && !looksLikeRawCaptureTitle(trimmedTitle)) {
    return trimmedTitle;
  }

  return trimmedTitle || "Memory";
}

export function displayMemoryTitle(item: CapturedSyncItem): string {
  return cleanMemoryTitle({
    title: item.title,
    prompt: item.originalPrompt ?? item.prompt,
    category: item.category,
    timeLabel: item.timeLabel,
    moneyType: item.moneyType,
    workAvailability: item.workAvailability,
  });
}
