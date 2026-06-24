import type { PulsePlanCategory } from "@/lib/pulse/types";
import { isStandingWorkScheduleLanguage } from "@/lib/timeline/resolve-timeline";
import {
  applyCategoryHintToDetection,
  type CaptureCategoryHint,
} from "@/lib/sync-capture/capture-hint";
import { isWorkDayOffLanguage } from "@/lib/sync-capture/work-availability";

/**
 * Maps a casual prompt to a Pulse category using keyword detection.
 *
 * Order matters: intent verbs (remind, subscribed, spent, save) are checked
 * before lifestyle categories so that "I spent $45 on food" reads as an expense
 * rather than a date-night, and "cancel my trial" reads as a reminder rather
 * than a subscription.
 */
export function detectPulseCategory(
  prompt: string,
  hint?: CaptureCategoryHint,
): PulsePlanCategory {
  const text = prompt.trim().toLowerCase();

  if (isWorkDayOffLanguage(text)) return "workday";

  if (
    /\b(get paid|getting paid|paid in|paycheck|payday|direct deposit|income|deposit|paid on|salary|wage)\b/.test(
      text,
    )
  ) {
    return "expense";
  }

  if (/\b(showered|shower)\b/.test(text)) return "general";

  if (/\b(school|class|homework|assignment|exam|study)\b/.test(text)) {
    return "task";
  }

  if (/\b(remind|reminder|cancel|due|rent)\b/.test(text)) return "reminder";

  if (
    /\bsend\b.*\b(money|cash|\$\d+)/.test(text) ||
    /\bsend money to\b/.test(text)
  ) {
    return "expense";
  }

  if (
    /\$\s*\d+|\b\d+\s*(dollars?|bucks?)\b/.test(text) &&
    !/\b(workout|hours?)\b/.test(text)
  ) {
    return "expense";
  }

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

  if (/\bwork on\b/.test(text)) return "task";

  if (
    /\b(worked on|working on|spent \d+ hours?|building|coded|coding|cursor work|focus session)\b/.test(
      text,
    ) ||
    (/\b(worked|working|coded)\b/.test(text) &&
      /\b(project|sync|app|code)\b/.test(text))
  ) {
    return "task";
  }

  if (isStandingWorkScheduleLanguage(text)) return "work-schedule";

  if (/\b(workday|work|worked|working|shift|job|productivity)\b/.test(text)) {
    return "workday";
  }

  if (/\b(date night|anniversary|birthday|bday|grandma|grandpa|dinner with friends|call mom|call dad|call my|sister|brother)\b/.test(text)) {
    return "date-night";
  }

  if (/\b(date night|date|girlfriend|girlfrienda|food|mini golf)\b/.test(text)) {
    return "date-night";
  }

  if (/\b(finish|todo|task|need to|work on)\b/.test(text)) return "task";

  return applyCategoryHintToDetection(prompt, "general", hint);
}
