import type { SyncConsequence } from "@/lib/intelligence/sync-consequences";

export type LifeLoadLevel = "light" | "normal" | "busy" | "heavy";

export type TomorrowLoadAssessment = {
  level: LifeLoadLevel;
  score: number;
  earlyStart: boolean;
  commitmentCount: number;
};

function isContextualNoise(text: string) {
  const normalized = text.toLowerCase();
  return (
    /early flight tomorrow — tonight/.test(normalized) ||
    /affects your morning availability/.test(normalized) ||
    /tomorrow stays open unless/.test(normalized) ||
    /finance deadline within the week/.test(normalized) ||
    /evening opens|open after/.test(normalized) ||
    /you work the next/.test(normalized)
  );
}

export function loadWeightForConsequence(consequence: SyncConsequence): number {
  if (consequence.daysUntil !== 1) return 0;
  if (!consequence.briefEligible) return 0;
  if (consequence.kind === "ambient" || consequence.kind === "health_log") return 0;
  if (consequence.kind === "day_synthesis") return 0;

  const text = consequence.surfaceText.toLowerCase();
  if (isContextualNoise(text)) return 0;

  if (/\bflight\b/.test(text)) return 4;
  if (/\btake\s+\w+\s+to\s+school\b/.test(text)) return 2;
  if (
    consequence.kind === "family_moment" &&
    /\b(school|daughter|son)\b/.test(text)
  ) {
    return 2;
  }
  if (consequence.kind === "work_start") return 2;
  if (/\bbirthday\b/.test(text)) return 2;
  if (/\banniversary\b/.test(text)) return 2;
  if (consequence.kind === "financial_due" || /\brent\b/.test(text)) return 2;
  if (consequence.kind === "income" || /\bpayday\b/.test(text)) return 1;
  if (/\bworld cup\b/.test(text)) return 1;
  if (consequence.kind === "event" || consequence.kind === "relationship_moment") {
    return 2;
  }

  return 1;
}

export function assessTomorrowLoad(
  consequences: SyncConsequence[],
): TomorrowLoadAssessment {
  const tomorrow = consequences.filter(
    (consequence) =>
      consequence.daysUntil === 1 &&
      consequence.briefEligible &&
      consequence.kind !== "day_synthesis" &&
      consequence.kind !== "ambient" &&
      !isContextualNoise(consequence.surfaceText),
  );

  const score = tomorrow.reduce(
    (total, consequence) => total + loadWeightForConsequence(consequence),
    0,
  );

  const timed = tomorrow.filter((consequence) => consequence.sortMinutes != null);
  const earliest = timed.length
    ? Math.min(...timed.map((consequence) => consequence.sortMinutes!))
    : null;
  const earlyStart = earliest != null && earliest < 7 * 60;

  let level: LifeLoadLevel = "light";
  if (score >= 9) level = "heavy";
  else if (score >= 6) level = "busy";
  else if (score >= 3) level = "normal";

  return {
    level,
    score,
    earlyStart,
    commitmentCount: tomorrow.length,
  };
}

export function headlineForTomorrowLoad(
  assessment: TomorrowLoadAssessment,
): string | null {
  if (assessment.level === "heavy" || assessment.level === "busy") {
    return "Tomorrow looks busy.";
  }

  if (assessment.earlyStart) {
    return "Tomorrow starts early.";
  }

  if (assessment.level === "normal" && assessment.commitmentCount >= 3) {
    return "Most of tomorrow is already spoken for.";
  }

  return null;
}
