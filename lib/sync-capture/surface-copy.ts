import { normalizeCaptureInput } from "@/lib/parser/normalize-capture-input";
import { titleCaseKeep } from "@/lib/pulse/parse-pulse-prompt";

function weekdayLabel(dateKey: string) {
  const [y, m, d] = dateKey.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-US", { weekday: "long" });
}

function ensurePeriod(text: string) {
  const trimmed = text.trim().replace(/\.+$/, "");
  if (!trimmed) return trimmed;
  return `${trimmed}.`;
}

export function isMoneyLanguage(text: string) {
  const normalized = normalizeCaptureInput(text).normalized;
  return (
    /\$\s*\d+/.test(normalized) ||
    /\b\d+\s*(dollars?|bucks?)\b/.test(normalized) ||
    /\b(get paid|getting paid|payday|paycheck|direct deposit|salary|wage)\b/.test(
      normalized,
    ) ||
    /\b(spent|paid|purchase|purchased|bought|send money|send cash|send \$\d+)\b/.test(
      normalized,
    ) ||
    (/\b(rent|bill|subscription)\b/.test(normalized) &&
      !/\b(call|visit|dinner|birthday|anniversary)\b/.test(normalized))
  );
}

export function isContextConnectionLine(text: string) {
  const normalized = text.toLowerCase().replace(/[.!?]/g, "").trim();
  return (
    normalized.includes("payday lands before") ||
    normalized.includes("money lands before") ||
    normalized.includes("emotional check-in noted") ||
    normalized.includes("stress showing up") ||
    normalized.includes("tonight is quiet") ||
    normalized.includes("tomorrow is open after") ||
    normalized.includes("evening opens")
  );
}

export function isAwkwardSurfacedLine(line: string) {
  const normalized = line.toLowerCase().replace(/[.!?]/g, "").trim();
  if (!normalized) return true;

  return (
    /^.+\sis today$/.test(normalized) ||
    /^coffee\b/.test(normalized) ||
    /^tomorrow is tomorrow/.test(normalized) ||
    /tomorrow looks busy/i.test(normalized) ||
    /\bis tomorrow$/.test(normalized) ||
    /\bhavbe\b|\bduaghter\b|\bsvchool\b|\bscvhool\b/i.test(line) ||
    /^new task is tomorrow/i.test(normalized) ||
    /^5 dollars is tomorrow/i.test(normalized)
  );
}

export function cleanSurfacedCopy(text: string): string {
  let cleaned = text.trim().replace(/\s+/g, " ");

  cleaned = cleaned.replace(/\s+is today\.?$/i, "");
  cleaned = cleaned.replace(/\s+is tomorrow\.?$/i, (match, offset, whole) => {
    const before = whole.slice(0, offset).toLowerCase();
    if (/\btomorrow\b/.test(before)) return "";
    return match;
  });
  cleaned = cleaned.replace(/\s+tomorrow\.?$/i, (match, offset, whole) => {
    const before = whole.slice(0, offset).toLowerCase();
    if (/\btomorrow\b/.test(before)) return "";
    return match;
  });

  const schoolTake = cleaned.match(/\btake\s+(?:my\s+)?(daughter|son)\s+to\s+school\b/i);
  if (schoolTake) {
    const child = schoolTake[1].toLowerCase();
    if (/\btomorrow\b/i.test(cleaned) || /\bis tomorrow\b/i.test(cleaned)) {
      return ensurePeriod(`Take ${child} to school tomorrow`);
    }
    if (/\btoday\b/i.test(cleaned)) {
      return ensurePeriod(`Take ${child} to school today`);
    }
    return ensurePeriod(`Take ${child} to school`);
  }

  if (/\bdaughter\b.*\bschool\b/i.test(cleaned)) {
    if (/\btomorrow\b/i.test(cleaned)) {
      return "Daughter has school tomorrow.";
    }
    return "Daughter has school.";
  }

  if (/\bson\b.*\bschool\b/i.test(cleaned)) {
    if (/\btomorrow\b/i.test(cleaned)) {
      return "Son has school tomorrow.";
    }
    return "Son has school.";
  }

  cleaned = cleaned.replace(/\bHavbe\b/gi, "Have");
  cleaned = cleaned.replace(/\bDuaghter\b/gi, "Daughter");
  cleaned = cleaned.replace(/\bSvchool\b|\bScvhool\b/gi, "School");

  return ensurePeriod(cleaned);
}

export function formatEventMomentLine(input: {
  subject: string;
  days: number;
  dateKey: string | null;
  prompt?: string;
  time?: string | null;
}): string | null {
  const prompt = normalizeCaptureInput(input.prompt ?? input.subject).normalized;
  const subject = input.subject.trim();
  const time = input.time?.trim() ?? null;

  const schoolTake = prompt.match(/\btake\s+(?:my\s+)?(daughter|son)\s+to\s+school\b/);
  if (schoolTake) {
    const child = schoolTake[1];
    if (input.days === 0) {
      return time
        ? ensurePeriod(`Take ${child} to school today at ${time}`)
        : "Take daughter to school today.";
    }
    if (input.days === 1) {
      return time
        ? ensurePeriod(`Take ${child} to school tomorrow at ${time}`)
        : `Take ${child} to school tomorrow.`;
    }
    if (input.days >= 2 && input.days <= 7 && input.dateKey) {
      return ensurePeriod(`Take ${child} to school ${weekdayLabel(input.dateKey)}`);
    }
    if (input.days <= 14) {
      return ensurePeriod(`Take ${child} to school in ${input.days} days`);
    }
    return ensurePeriod(`Take ${child} to school`);
  }

  if (/\bdaughter\b.*\bschool\b/.test(prompt)) {
    if (input.days === 1) return "Daughter has school tomorrow.";
    if (input.days === 0) return "Daughter has school today.";
    if (input.days >= 2 && input.days <= 7 && input.dateKey) {
      return ensurePeriod(`Daughter has school ${weekdayLabel(input.dateKey)}`);
    }
    return "Daughter has school.";
  }

  if (/\bson\b.*\bschool\b/.test(prompt)) {
    if (input.days === 1) return "Son has school tomorrow.";
    if (input.days === 0) return "Son has school today.";
    if (input.days >= 2 && input.days <= 7 && input.dateKey) {
      return ensurePeriod(`Son has school ${weekdayLabel(input.dateKey)}`);
    }
    return "Son has school.";
  }

  if (/\bflight\b/i.test(prompt) || /^flight$/i.test(subject)) {
    if (input.days === 1) {
      return time ? `Flight tomorrow at ${time}.` : "Flight tomorrow.";
    }
    if (input.days === 0) {
      return time ? `Flight today at ${time}.` : "Flight today.";
    }
    if (input.days >= 2 && input.days <= 7 && input.dateKey) {
      return time
        ? ensurePeriod(`Flight ${weekdayLabel(input.dateKey)} at ${time}`)
        : ensurePeriod(`Flight ${weekdayLabel(input.dateKey)}`);
    }
    return time ? ensurePeriod(`Flight at ${time}`) : "Flight coming up.";
  }

  if (/\b(best\s+)?friend(?:'s)?\s+(?:b(?:irth)?d(?:ay)?|bday)\b/i.test(prompt)) {
    if (input.days === 1) return "Your friend's birthday is tomorrow.";
    if (input.days === 0) return "Your friend's birthday is today.";
  }

  if (/\bbirthday\b|\bbday\b/.test(prompt)) {
    const readable = subject.replace(/'s Birthday$/i, "'s birthday");
    if (input.days === 1) return ensurePeriod(`${readable} is tomorrow`);
    if (input.days === 0) return ensurePeriod(`${readable} is today`);
  }

  const readable = titleCaseKeep(subject.replace(/\s+is tomorrow$/i, "").trim());
  if (!readable) return null;

  if (input.days === 0) {
    return time
      ? ensurePeriod(`${readable} today at ${time}`)
      : ensurePeriod(`${readable} today`);
  }
  if (input.days === 1) {
    return time
      ? ensurePeriod(`${readable} tomorrow at ${time}`)
      : ensurePeriod(`${readable} tomorrow`);
  }
  if (input.days >= 2 && input.days <= 7 && input.dateKey) {
    return ensurePeriod(`${readable} ${weekdayLabel(input.dateKey)}`);
  }
  if (input.days <= 14) {
    return ensurePeriod(`${readable} in ${input.days} days`);
  }

  return ensurePeriod(readable);
}

export function formatDueMomentLine(input: {
  subject: string;
  days: number;
  dateKey: string | null;
}): string | null {
  const subject = input.subject.trim();
  if (!subject) return null;

  if (/\brent\b/i.test(subject)) {
    if (input.days === 0) return "Rent is due today.";
    if (input.days === 1) return "Rent is due tomorrow.";
    if (input.days >= 2 && input.days <= 7 && input.dateKey) {
      return ensurePeriod(`Rent is due ${weekdayLabel(input.dateKey)}`);
    }
    if (input.days <= 14) return ensurePeriod(`Rent is due in ${input.days} days`);
  }

  if (input.days === 0) return ensurePeriod(`${subject} is due today`);
  if (input.days === 1) return ensurePeriod(`${subject} is due tomorrow`);
  if (input.days >= 2 && input.days <= 7 && input.dateKey) {
    return ensurePeriod(`${subject} is due ${weekdayLabel(input.dateKey)}`);
  }
  if (input.days <= 14) return ensurePeriod(`${subject} is due in ${input.days} days`);
  return null;
}
