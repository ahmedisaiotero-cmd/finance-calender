import type { PulsePlanCategory } from "@/lib/pulse/types";

/**
 * Maps a casual prompt to a Pulse category using keyword detection.
 *
 * Order matters: intent verbs (remind, subscribed, spent, save) are checked
 * before lifestyle categories so that "I spent $45 on food" reads as an expense
 * rather than a date-night, and "cancel my trial" reads as a reminder rather
 * than a subscription.
 */
export function detectPulseCategory(prompt: string): PulsePlanCategory {
  const text = prompt.trim().toLowerCase();

  if (/\b(remind|reminder|cancel|due)\b/.test(text)) return "reminder";

  if (
    /\b(subscribed|subscribe|subscription|renewal|trial|charge|bill)\b/.test(
      text,
    )
  ) {
    return "subscription";
  }

  if (/\b(spent|bought|paid|purchase|purchased|cost|costs)\b/.test(text)) {
    return "expense";
  }

  if (/\b(save|saving|savings|afford|budget)\b/.test(text)) {
    return "savings-goal";
  }

  if (/\b(workout|gym|exercise|lift|run|cardio)\b/.test(text)) return "workout";

  if (/\b(workday|work|shift|productivity)\b/.test(text)) return "workday";

  if (/\b(date night|date|girlfriend|food|mini golf)\b/.test(text)) {
    return "date-night";
  }

  if (/\b(finish|todo|task|need to)\b/.test(text)) return "task";

  return "general";
}
