type NormalizationResult = {
  original: string;
  normalized: string;
  corrections: string[];
};

const TYPO_CORRECTIONS: Array<[RegExp, string, string]> = [
  [/\bwroked\b/g, "worked", "wroked -> worked"],
  [/\bworkd\b/g, "worked", "workd -> worked"],
  [/\bthru\b/g, "through", "thru -> through"],
  [/\btommorow\b/g, "tomorrow", "tommorow -> tomorrow"],
  [/\bmonady\b/g, "monday", "monady -> monday"],
  [/\bfirday\b/g, "friday", "firday -> friday"],
];

const DATE_WORDS = [
  "today",
  "tonight",
  "tomorrow",
  "yesterday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
];

const GLUED_PREFIXES = [
  "worked",
  "work",
  "gym",
  "paid",
  "pay",
  "payday",
  "rent",
  "appointment",
  "doctor",
];

function applyCorrection(
  value: string,
  pattern: RegExp,
  replacement: string,
  label: string,
  corrections: string[],
) {
  if (!pattern.test(value)) return value;
  corrections.push(label);
  pattern.lastIndex = 0;
  return value.replace(pattern, replacement);
}

function splitGluedDateWords(value: string, corrections: string[]) {
  let next = value;

  for (const prefix of GLUED_PREFIXES) {
    for (const day of DATE_WORDS) {
      const pattern = new RegExp(`\\b${prefix}${day}\\b`, "g");
      next = applyCorrection(
        next,
        pattern,
        `${prefix} ${day}`,
        `${prefix}${day} -> ${prefix} ${day}`,
        corrections,
      );
    }
  }

  next = applyCorrection(
    next,
    /\brentnext(friday|monday|tuesday|wednesday|thursday|saturday|sunday)\b/g,
    "rent next $1",
    "rentnext[day] -> rent next [day]",
    corrections,
  );

  next = applyCorrection(
    next,
    /\b(paid|payday|work|worked|gym|rent)next(friday|monday|tuesday|wednesday|thursday|saturday|sunday)\b/g,
    "$1 next $2",
    "[intent]next[day] -> [intent] next [day]",
    corrections,
  );

  return next;
}

export function normalizeCaptureInput(input: string): NormalizationResult {
  const original = input;
  const corrections: string[] = [];
  let normalized = input.toLowerCase().replace(/\s+/g, " ").trim();

  if (normalized !== input) {
    corrections.push("lowercase/trim whitespace");
  }

  for (const [pattern, replacement, label] of TYPO_CORRECTIONS) {
    normalized = applyCorrection(
      normalized,
      pattern,
      replacement,
      label,
      corrections,
    );
  }

  normalized = splitGluedDateWords(normalized, corrections);
  normalized = normalized.replace(/\s+/g, " ").trim();

  return {
    original,
    normalized,
    corrections: [...new Set(corrections)],
  };
}
