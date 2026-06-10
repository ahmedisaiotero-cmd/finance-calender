import type {
  PulseMoneyType,
  PulseParsedInput,
  PulsePlanCategory,
  PulsePlanFrequency,
} from "@/lib/pulse/types";

const WEEKDAYS = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
] as const;

const NUMBER_WORDS: Record<string, number> = {
  one: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
  seven: 7,
  eight: 8,
  nine: 9,
  ten: 10,
  eleven: 11,
  twelve: 12,
};

/** Capitalize the first letter of each word without lowercasing the rest. */
export function titleCaseKeep(value: string): string {
  return value
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function formatAmount(value: string): string {
  const amount = Number(value);
  if (Number.isNaN(amount)) return `$${value}`;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: amount % 1 === 0 ? 0 : 2,
  }).format(amount);
}

function parseAmount(text: string): string | null {
  const dollar = text.match(/\$\s?(\d+(?:\.\d{1,2})?)/);
  if (dollar) return formatAmount(dollar[1]);

  const dollars = text.match(/(\d+(?:\.\d{1,2})?)\s*(?:dollars?|bucks?)\b/i);
  if (dollars) return formatAmount(dollars[1]);

  const verb = text.match(
    /\b(?:for|costs?|cost|paid|spent|spend)\s+\$?(\d+(?:\.\d{1,2})?)/i,
  );
  if (verb) return formatAmount(verb[1]);

  return null;
}

function parseNumber(value: string): number | null {
  if (/^\d+$/.test(value)) return Number(value);
  return NUMBER_WORDS[value] ?? null;
}

function parseDateLabel(text: string): string {
  const relative = text.match(/\bin\s+(\d+|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve)\s+(days?|weeks?)\b/);
  if (relative) {
    const amount = parseNumber(relative[1]);
    const unit = relative[2].startsWith("week") ? "week" : "day";
    if (amount) return `In ${amount} ${unit}${amount === 1 ? "" : "s"}`;
  }

  const nextDay = text.match(/\bnext\s+(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/);
  if (nextDay) return `Next ${titleCaseKeep(nextDay[1])}`;

  if (/\btomorrow\b/.test(text)) return "Tomorrow";
  if (/\btoday\b/.test(text)) return "Today";
  if (/\bnext week\b/.test(text)) return "Next week";

  for (const day of WEEKDAYS) {
    if (new RegExp(`\\b${day.toLowerCase()}\\b`).test(text)) return day;
  }

  return "Upcoming";
}

function parseTimeLabel(text: string): string {
  if (/\bbefore work\b/.test(text)) return "Before work";
  if (/\btonight\b/.test(text)) return "Tonight";
  if (/\bmorning\b/.test(text)) return "Morning";
  if (/\bafternoon\b/.test(text)) return "Afternoon";
  if (/\b(evening|night)\b/.test(text)) return "Evening";

  return "Flexible";
}

function parseFrequency(text: string): PulsePlanFrequency {
  if (/\b(monthly|every month|per month|\/mo)\b/.test(text)) return "monthly";
  if (/\b(weekly|every week|per week)\b/.test(text)) return "weekly";
  if (/\b(yearly|annual|annually|every year)\b/.test(text)) return "yearly";
  if (/\b(daily|every day|each day)\b/.test(text)) return "daily";
  return "one-time";
}

function detectMoneyType(
  text: string,
  category: PulsePlanCategory,
): PulseMoneyType {
  if (
    /\b(get paid|getting paid|paid in|paycheck|payday|direct deposit|income|deposit|paid on|salary|wage)\b/.test(
      text,
    )
  ) {
    return "income";
  }

  if (category === "subscription") return "subscription";
  if (category === "expense") return "expense";
  return "unknown";
}

const STOP_AFTER =
  "today|yesterday|tomorrow|tonight|this|last|next|for|on|at|every|each|monthly|weekly|yearly|daily|by|before|from";

function cleanPhrase(value: string): string {
  return value
    .replace(/\b(my|a|an|the|some)\b/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Best-effort merchant/subject for subscriptions and expenses. */
function parseMerchant(
  prompt: string,
  category: PulsePlanCategory,
): string | null {
  if (category === "subscription") {
    const match = prompt.match(
      new RegExp(
        `(?:subscribed|subscribe|subscription)\\s+(?:to\\s+)?([A-Za-z0-9][A-Za-z0-9 &'+.-]*?)(?=\\s+(?:${STOP_AFTER}|\\$|\\d)|$)`,
        "i",
      ),
    );
    if (match) return cleanPhrase(match[1]) || null;
    return null;
  }

  if (category === "expense") {
    const onMatch = prompt.match(
      new RegExp(
        `\\bon\\s+([A-Za-z][A-Za-z0-9 &'+.-]*?)(?=\\s+(?:${STOP_AFTER}|\\$|\\d)|$)`,
        "i",
      ),
    );
    if (onMatch) return cleanPhrase(onMatch[1]) || null;
    return null;
  }

  return null;
}

/**
 * Extract a human title subject for reminder / savings-goal / task prompts.
 * Reads from the original prompt to preserve casing like "PS5 Pro" or "Sync".
 */
export function extractSubject(
  prompt: string,
  category: PulsePlanCategory,
): string | null {
  if (category === "reminder") {
    const match = prompt.match(
      new RegExp(
        `(?:remind(?:\\s+me)?\\s+to|reminder\\s+to|remember\\s+to)\\s+([A-Za-z0-9][A-Za-z0-9 &'+.-]*?)(?=\\s+(?:${STOP_AFTER}|\\$|\\d)|$)`,
        "i",
      ),
    );
    if (match) return cleanPhrase(match[1]) || null;
    return null;
  }

  if (category === "savings-goal") {
    const match = prompt.match(
      new RegExp(
        `(?:save(?:\\s+up)?\\s+for|saving\\s+for|afford)\\s+([A-Za-z0-9][A-Za-z0-9 &'+.-]*?)(?=\\s+(?:${STOP_AFTER})|$)`,
        "i",
      ),
    );
    if (match) return cleanPhrase(match[1]) || null;
    return null;
  }

  if (category === "task") {
    const match = prompt.match(
      new RegExp(
        `(?:need to|have to|finish|complete|todo:?|task:?)\\s+([A-Za-z0-9][A-Za-z0-9 &'+.-]*?)(?=\\s+(?:${STOP_AFTER})|$)`,
        "i",
      ),
    );
    if (match) return cleanPhrase(match[1]) || null;
    return null;
  }

  return null;
}

export function parsePulsePrompt(
  prompt: string,
  category: PulsePlanCategory,
): PulseParsedInput {
  const text = prompt.trim().toLowerCase();

  let frequency = parseFrequency(text);
  if (category === "subscription" && frequency === "one-time") {
    frequency = "monthly";
  }

  return {
    category,
    amount: parseAmount(text),
    merchant: parseMerchant(prompt, category),
    dateLabel: parseDateLabel(text),
    timeLabel: parseTimeLabel(text),
    frequency,
    moneyType: detectMoneyType(text, category),
  };
}
