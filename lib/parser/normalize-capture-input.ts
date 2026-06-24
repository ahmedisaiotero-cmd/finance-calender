export type CorrectionSeverity = "typo" | "fuzzy" | "spacing" | "format";

export type CorrectionEntry = {
  label: string;
  severity: CorrectionSeverity;
};

export type NormalizationResult = {
  original: string;
  normalized: string;
  corrections: string[];
  correctionEntries: CorrectionEntry[];
};

type CorrectionRule = [RegExp, string, string, CorrectionSeverity];

const TYPO_CORRECTIONS: CorrectionRule[] = [
  [/\bhacve\b/g, "have", "hacve -> have", "typo"],
  [/\brecieved\b/g, "received", "recieved -> received", "typo"],
  [/\bwroked\b/g, "worked", "wroked -> worked", "typo"],
  [/\bwrok\b/g, "work", "wrok -> work", "typo"],
  [/\bworkd\b/g, "worked", "workd -> worked", "typo"],
  [/\bthru\b/g, "through", "thru -> through", "format"],
  [/\btommorow\b/g, "tomorrow", "tommorow -> tomorrow", "typo"],
  [/\btommorrow\b/g, "tomorrow", "tommorrow -> tomorrow", "typo"],
  [/\btmrw\b/g, "tomorrow", "tmrw -> tomorrow", "fuzzy"],
  [/\bmonady\b/g, "monday", "monady -> monday", "typo"],
  [/\bmondayy\b/g, "monday", "mondayy -> monday", "typo"],
  [/\btusday\b/g, "tuesday", "tusday -> tuesday", "typo"],
  [/\btueday\b/g, "tuesday", "tueday -> tuesday", "typo"],
  [/\bwensday\b/g, "wednesday", "wensday -> wednesday", "typo"],
  [/\bwednsday\b/g, "wednesday", "wednsday -> wednesday", "typo"],
  [/\bwendsday\b/g, "wednesday", "wendsday -> wednesday", "typo"],
  [/\bthrusday\b/g, "thursday", "thrusday -> thursday", "typo"],
  [/\bthuresday\b/g, "thursday", "thuresday -> thursday", "typo"],
  [/\bfirday\b/g, "friday", "firday -> friday", "typo"],
  [/\bfrday\b/g, "friday", "frday -> friday", "typo"],
  [/\bsaterday\b/g, "saturday", "saterday -> saturday", "typo"],
  [/\bsatday\b/g, "saturday", "satday -> saturday", "typo"],
  [/\bsundy\b/g, "sunday", "sundy -> sunday", "typo"],
  [/\bschedual\b/g, "schedule", "schedual -> schedule", "typo"],
  [/\bscheduele\b/g, "schedule", "scheduele -> schedule", "typo"],
  [/\bcalander\b/g, "calendar", "calander -> calendar", "typo"],
  [/\bgirfreind\b/g, "girlfriend", "girfreind -> girlfriend", "typo"],
  [/\bgirlfreind\b/g, "girlfriend", "girlfreind -> girlfriend", "typo"],
  [/\bduaghter\b/g, "daughter", "duaghter -> daughter", "typo"],
  [/\bdaugher\b/g, "daughter", "daugher -> daughter", "typo"],
  [/\bsvchool\b/g, "school", "svchool -> school", "typo"],
  [/\bscvhool\b/g, "school", "scvhool -> school", "typo"],
  [/\bhavbe\b/g, "have", "havbe -> have", "typo"],
  [/\bbday\b/g, "birthday", "bday -> birthday", "fuzzy"],
  [/\bbdays\b/g, "birthdays", "bdays -> birthdays", "fuzzy"],
  [/\bgrocerys\b/g, "groceries", "grocerys -> groceries", "typo"],
  [/\bpaymnt\b/g, "payment", "paymnt -> payment", "fuzzy"],
  [/\bpymnt\b/g, "payment", "pymnt -> payment", "fuzzy"],
];

const FUZZY_KEYWORD_CORRECTIONS: CorrectionRule[] = [
  [/\bwrk\b/g, "work", "fuzzy:wrk -> work", "fuzzy"],
  [/\bworkk\b/g, "work", "fuzzy:workk -> work", "fuzzy"],
  [/\bwrkout\b/g, "workout", "fuzzy:wrkout -> workout", "fuzzy"],
  [/\bworkoutt\b/g, "workout", "fuzzy:workoutt -> workout", "fuzzy"],
  [/\bwork\s+out\b/g, "workout", "fuzzy:work out -> workout", "fuzzy"],
  [/\brnt\b/g, "rent", "fuzzy:rnt -> rent", "fuzzy"],
  [/\bbll\b/g, "bill", "fuzzy:bll -> bill", "fuzzy"],
  [/\bgf\b/g, "girlfriend", "fuzzy:gf -> girlfriend", "fuzzy"],
  [/\bmommm+\b/g, "mom", "fuzzy:mommm -> mom", "fuzzy"],
];

const WEEKDAY_SHORTHAND: CorrectionRule[] = [
  [/\bsun\b/g, "sunday", "shorthand:sun -> sunday", "format"],
  [/\bmon\b/g, "monday", "shorthand:mon -> monday", "format"],
  [/\btues\b/g, "tuesday", "shorthand:tues -> tuesday", "format"],
  [/\btue\b/g, "tuesday", "shorthand:tue -> tuesday", "format"],
  [/\bwed\b/g, "wednesday", "shorthand:wed -> wednesday", "format"],
  [/\bthurs\b/g, "thursday", "shorthand:thurs -> thursday", "format"],
  [/\bthur\b/g, "thursday", "shorthand:thur -> thursday", "format"],
  [/\bthu\b/g, "thursday", "shorthand:thu -> thursday", "format"],
  [/\bfri\b/g, "friday", "shorthand:fri -> friday", "format"],
  [/\bsat\b/g, "saturday", "shorthand:sat -> saturday", "format"],
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
  "date",
  "dinner",
  "call",
  "school",
  "assignment",
];

function applyCorrection(
  value: string,
  pattern: RegExp,
  replacement: string,
  label: string,
  severity: CorrectionSeverity,
  entries: CorrectionEntry[],
) {
  if (!pattern.test(value)) return value;
  entries.push({ label, severity });
  pattern.lastIndex = 0;
  return value.replace(pattern, replacement);
}

function applyRules(
  value: string,
  rules: CorrectionRule[],
  entries: CorrectionEntry[],
) {
  let next = value;
  for (const [pattern, replacement, label, severity] of rules) {
    next = applyCorrection(next, pattern, replacement, label, severity, entries);
  }
  return next;
}

function splitGluedDateWords(value: string, entries: CorrectionEntry[]) {
  let next = value;

  for (const prefix of GLUED_PREFIXES) {
    for (const day of DATE_WORDS) {
      const pattern = new RegExp(`\\b${prefix}${day}\\b`, "g");
      next = applyCorrection(
        next,
        pattern,
        `${prefix} ${day}`,
        `${prefix}${day} -> ${prefix} ${day}`,
        "spacing",
        entries,
      );
    }
  }

  next = applyCorrection(
    next,
    /\bgymtomorrow\b/g,
    "gym tomorrow",
    "gymtomorrow -> gym tomorrow",
    "spacing",
    entries,
  );

  next = applyCorrection(
    next,
    /\brentnext(friday|monday|tuesday|wednesday|thursday|saturday|sunday)\b/g,
    "rent next $1",
    "rentnext[day] -> rent next [day]",
    "spacing",
    entries,
  );

  next = applyCorrection(
    next,
    /\b(paid|payday|work|worked|gym|rent|call)next(friday|monday|tuesday|wednesday|thursday|saturday|sunday)\b/g,
    "$1 next $2",
    "[intent]next[day] -> [intent] next [day]",
    "spacing",
    entries,
  );

  return next;
}

function normalizeTimeGlued(value: string, entries: CorrectionEntry[]) {
  let next = value;

  next = applyCorrection(
    next,
    /\b(\d{1,2})\s*to\s*(\d{1,2})\s*(am|pm)\b/gi,
    "$1 to $2$3",
    "time spacing",
    "format",
    entries,
  );

  next = applyCorrection(
    next,
    /\b(\d{1,2})to(\d{1,2})(am|pm)\b/gi,
    "$1 to $2$3",
    "[time]to[time] -> [time] to [time]",
    "format",
    entries,
  );

  next = applyCorrection(
    next,
    /\b(\d{1,2})-(\d{1,2})(am|pm)\b/gi,
    "$1 to $2$3",
    "[time]-[time] -> [time] to [time]",
    "format",
    entries,
  );

  return next;
}

function normalizePunctuation(value: string, entries: CorrectionEntry[]) {
  let next = value.replace(/[.!?,;]+/g, " ");
  next = next.replace(/\s+/g, " ").trim();
  if (next !== value) {
    entries.push({
      label: "punctuation cleanup",
      severity: "format",
    });
  }
  return next;
}

function uniqueEntries(entries: CorrectionEntry[]) {
  const seen = new Set<string>();
  return entries.filter((entry) => {
    if (seen.has(entry.label)) return false;
    seen.add(entry.label);
    return true;
  });
}

export function normalizeCaptureInput(input: string): NormalizationResult {
  const original = input;
  const entries: CorrectionEntry[] = [];
  let normalized = input.toLowerCase().replace(/\s+/g, " ").trim();

  if (normalized !== input.trim()) {
    entries.push({
      label: "lowercase/trim whitespace",
      severity: "spacing",
    });
  }

  normalized = normalizePunctuation(normalized, entries);
  normalized = applyRules(normalized, TYPO_CORRECTIONS, entries);
  normalized = applyRules(normalized, FUZZY_KEYWORD_CORRECTIONS, entries);
  normalized = applyRules(normalized, WEEKDAY_SHORTHAND, entries);
  normalized = splitGluedDateWords(normalized, entries);
  normalized = normalizeTimeGlued(normalized, entries);
  normalized = normalized.replace(/\s+/g, " ").trim();

  const correctionEntries = uniqueEntries(entries);

  return {
    original,
    normalized,
    corrections: correctionEntries.map((entry) => entry.label),
    correctionEntries,
  };
}
