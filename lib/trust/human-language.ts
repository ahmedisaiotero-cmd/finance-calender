import type { MeaningAnalysis } from "@/lib/intelligence/meaning-engine";

export function humanizeProtectionReason(
  meaning: MeaningAnalysis,
  destinations: string[],
): string | undefined {
  if (!meaning.protection.recommended && !meaning.protection.eligible) {
    return undefined;
  }

  if (!meaning.protection.recommended) {
    return "You can protect this time if it starts to feel crowded.";
  }

  if (destinations.includes("Family")) return "You may want to protect this time.";
  if (destinations.includes("Health")) return "You may want to protect this time.";
  if (destinations.includes("Relationships")) {
    return "You may want to protect this time.";
  }

  return "You may want to protect this time.";
}

export function humanizeMeaningSummary(summary: string): string {
  return summary
    .replace(/\bHigh Importance\b/gi, "This looks important.")
    .replace(/\bMedium Importance\b/gi, "Worth keeping in view.")
    .replace(/\bLow Importance\b/gi, "A light item on your radar.");
}
