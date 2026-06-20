import type { SyncDestination } from "@/lib/captured-items";
import type { PulsePlanCategory } from "@/lib/pulse/types";

export type CaptureCategoryHint =
  | "Family"
  | "Relationship"
  | "Money"
  | "Health"
  | "Work"
  | "Personal";

export const CAPTURE_CATEGORY_HINTS: CaptureCategoryHint[] = [
  "Family",
  "Relationship",
  "Money",
  "Health",
  "Work",
  "Personal",
];

export function hintDestinations(
  hint: CaptureCategoryHint,
): SyncDestination[] {
  switch (hint) {
    case "Family":
      return ["Family"];
    case "Relationship":
      return ["Relationships"];
    case "Money":
      return ["Finance"];
    case "Health":
      return ["Health"];
    case "Work":
      return ["Work"];
    case "Personal":
    default:
      return [];
  }
}

export function applyCategoryHintToDetection(
  prompt: string,
  category: PulsePlanCategory,
  hint?: CaptureCategoryHint,
): PulsePlanCategory {
  if (!hint || category !== "general") {
    return category;
  }

  const text = prompt.trim().toLowerCase();

  switch (hint) {
    case "Money":
      if (
        /\b(get paid|getting paid|payday|paycheck|rent|bill|subscription|debt|savings|paid)\b/.test(
          text,
        )
      ) {
        if (/\b(get paid|payday|paycheck)\b/.test(text)) return "expense";
        if (/\b(subscription|renewal|trial)\b/.test(text)) return "subscription";
        if (/\b(rent|due|bill)\b/.test(text)) return "reminder";
        return "expense";
      }
      return category;
    case "Health":
      if (/\b(gym|workout|exercise|run|walk|cardio)\b/.test(text)) {
        return "workout";
      }
      return category;
    case "Work":
      if (/\b(overtime|shift|schedule|worked|working)\b/.test(text)) {
        return "workday";
      }
      if (/\b(work|job)\b/.test(text)) return "workday";
      return category;
    case "Relationship":
      if (
        /\b(girlfriend|boyfriend|partner|wife|husband|anniversary|date|birthday|bday)\b/.test(
          text,
        )
      ) {
        return "date-night";
      }
      return category;
    case "Family":
      if (
        /\b(mom|dad|mother|father|daughter|son|family|birthday|bday|grandma|grandpa)\b/.test(
          text,
        )
      ) {
        return "date-night";
      }
      return category;
    case "Personal":
    default:
      return category;
  }
}
