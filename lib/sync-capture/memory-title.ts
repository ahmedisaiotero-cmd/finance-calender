import { normalizeCaptureInput } from "@/lib/parser/normalize-capture-input";
import { titleCaseKeep } from "@/lib/pulse/parse-pulse-prompt";
import { isMoneyLanguage } from "@/lib/sync-capture/surface-copy";
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
  friend: "Friend",
  friends: "Friend",
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
  const normalizedPrompt = normalizeCaptureInput(input.prompt).normalized;
  return `${input.title} ${normalizedPrompt}`.toLowerCase();
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
    /\b(?:my\s+)?(moms?|mother|dads?|father|girlfrienda?|boyfriend|wife|husband|partner|daughter|son|grandma|grandpa|grandmother|grandfather|friend|friends)\s+(?:b(?:irth)?d(?:ay)?|bday)\b/i,
    /\b(?:my\s+)?(moms?|mother|dads?|father|girlfrienda?|boyfriend|wife|husband|partner|daughter|son|grandma|grandpa|friend|friends)'s\s+(?:b(?:irth)?d(?:ay)?|bday)\b/i,
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

  if (normalized === "work") return true;

  return (
    /\b(bday|birthday)\b/.test(normalized) ||
    /\bbday\s+is\b/.test(normalized) ||
    /\b(is|was|are|on)\b/.test(normalized) ||
    /\b(get paid|every other|don't work|dont work)\b/.test(normalized) ||
    /\b(showered|shower)\b/.test(normalized) ||
    /\b(girlfrienda|moms?)\b/.test(normalized) ||
    (normalized.split(/\s+/).length >= 3 &&
      /\b(my|the|on|is|december|april|january|february|march|may|june|july|august|september|october|november)\b/.test(
        normalized,
      ))
  );
}

export function cleanMemoryTitle(input: MemoryTitleInput): string {
  const prompt = input.prompt.trim();
  const normalizedPrompt = normalizeCaptureInput(prompt).normalized;
  const text = combinedText(input);

  if (isPayday(input, text)) {
    return "Payday";
  }

  if (
    isMoneyLanguage(prompt) &&
    /^\$?\d+(?:\.\d{1,2})?\s*(dollars?|bucks?)?$/i.test(normalizedPrompt.trim())
  ) {
    return "Small money note";
  }

  if (/\bsend\b.*\b(money|cash|\$\d+)/.test(normalizedPrompt)) {
    const toMom = /\b(mom|mama|mother)\b/.test(normalizedPrompt);
    return toMom ? "Send money to Mom" : "Money transfer";
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
    return "Rent Due";
  }

  if (
    /\bsend\b.*\b(mama|mom|mother)\b.*\b(money|cash)\b/i.test(prompt) ||
    /\bsend\b.*\b(money|cash)\b.*\b(mama|mom|mother)\b/i.test(prompt)
  ) {
    return "Send Money to Mom";
  }

  const takeChild = normalizedPrompt.match(/\btake\s+(?:my\s+)?(daughter|son)\s+to\s+school\b/i);
  if (takeChild?.[1]) {
    return `Take ${relationLabel(takeChild[1])} to School`;
  }

  if (/\bshower(?:ed|ing)?\b/i.test(text)) {
    return "Shower Logged";
  }

  if (/\bcoffee\b/i.test(text) && !/\b(meeting|date)\b/i.test(text)) {
    return "Coffee";
  }

  if (
    /\b(sad|upset|anxious|stressed|depressed|lonely|feeling low|feeling down|cried|crying)\b/i.test(
      text,
    )
  ) {
    return "Emotional Check-in";
  }

  const expenseMatch = prompt.match(
    /\b(?:spent|paid|spend)\s+\$?(\d+(?:\.\d{1,2})?)\s*(?:at|on|for)?\s*([a-z0-9'&\s-]{2,30})/i,
  );
  if (expenseMatch) {
    const place = expenseMatch[2]?.trim().replace(/\s+(and|it|was).*$/i, "").trim();
    if (place && place.length <= 24) {
      return titleCaseKeep(place);
    }
    return "Small Purchase";
  }

  if (/\b(spent|paid|bought|purchase)\b/i.test(text) && input.category === "expense") {
    return "Small Purchase";
  }

  if (/\b(slept|sleep)\b/i.test(text) && input.category !== "workout") {
    return "Sleep Logged";
  }

  if (input.category === "workout" && input.timeLabel && input.timeLabel !== "Flexible") {
    return `${input.timeLabel} Workout`;
  }

  if (input.category === "workout" || /\b(gym|workout|exercise)\b/i.test(text)) {
    return "Workout";
  }

  if (/\b(medication|medicine|prescription)\b/i.test(text)) {
    return "Medication";
  }

  if (/\bcleaned my room\b/i.test(text) || /\bclean(?:ed)? the room\b/i.test(text)) {
    return "Room cleaned";
  }

  if (/\bfixed my car\b/i.test(text) || /\bcar (?:fix|repair)/i.test(text)) {
    return "Car fixed";
  }

  if (
    (/\b(worked on|working on)\b/i.test(text) && /\b(project|sync|app)\b/i.test(text)) ||
    (/\bworked\b/i.test(text) && /\bproject\b/i.test(text))
  ) {
    return "Project work";
  }

  if (/\bcoded\b|\bcoding\b/i.test(text)) {
    return "Coding session";
  }

  if (
    (input.category === "workday" || /\b(overtime|worked)\b/i.test(text)) &&
    !isWorkDayOffLanguage(prompt)
  ) {
    if (/\bovertime\b/i.test(text)) return "Overtime";
    if (/\bworked\b/i.test(text)) return "Work logged";
    return "Work";
  }

  if (input.category === "reminder") {
    const cleaned = input.title.replace(/\s+Reminder$/i, "").trim();
    if (cleaned && !looksLikeRawCaptureTitle(cleaned)) {
      return cleaned;
    }
  }

  if (looksLikeRawCaptureTitle(input.title) || looksLikeRawCaptureTitle(prompt)) {
    if (
      input.parsedInput?.workAvailability === "off" ||
      input.workAvailability === "off" ||
      isWorkDayOffLanguage(prompt)
    ) {
      if (/\btomorrow\b/i.test(text)) return "Day Off Tomorrow";
      if (/\btoday\b/i.test(text)) return "Day Off Today";
      return "Day Off";
    }
    if (/\banniversary\b/i.test(prompt)) return "Anniversary";
    if (isPayday(input, text)) return "Payday";
    if (/\brent\b/i.test(text) && /\b(due|pay)\b/i.test(text)) return "Rent Due";
    if (/\bshower(?:ed|ing)?\b/i.test(text)) return "Shower Logged";
    if (/\b(gym|workout)\b/i.test(text)) return "Workout";
    const relation = extractBirthdayRelation(prompt) ?? extractBirthdayRelation(input.title);
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
    parsedInput: {
      moneyType: item.moneyType,
      workAvailability: item.workAvailability,
    },
    moneyType: item.moneyType,
    workAvailability: item.workAvailability,
  });
}
