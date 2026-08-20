import {
  LIFE_AREA_DESTINATIONS,
  type SyncDestination,
} from "@/lib/captured-items";
import type { PulsePlan, PulsePlanCategory } from "@/lib/pulse/types";
import {
  hintDestinations,
  type CaptureCategoryHint,
} from "@/lib/sync-capture/capture-hint";
import { classifyLifeNote } from "@/lib/intelligence/life-note-classifier";

const CATEGORY_DESTINATIONS: Record<PulsePlanCategory, SyncDestination[]> = {
  workout: ["Health", "Calendar"],
  workday: ["Work", "Calendar"],
  "work-schedule": ["Work", "Calendar"],
  "date-night": ["Relationships", "Calendar"],
  subscription: ["Finance", "Calendar"],
  expense: ["Finance"],
  reminder: ["Calendar"],
  "savings-goal": ["Goals", "Finance"],
  task: ["Calendar"],
  general: ["Goals"],
};

const TIMELINE_LABEL_BLOCKLIST = new Set([
  "Today",
  "Tomorrow",
  "Upcoming",
  "Needs a timeline",
  "Next week",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
]);

function unique(destinations: SyncDestination[]) {
  return [...new Set(destinations)];
}

/** Keep only valid life-area destinations; never timeline or date labels. */
export function sanitizeSyncDestinations(
  destinations: Iterable<string>,
): SyncDestination[] {
  return unique(
    [...destinations].filter((destination): destination is SyncDestination =>
      LIFE_AREA_DESTINATIONS.includes(destination as SyncDestination),
    ),
  );
}

export function hasConcreteCalendarTiming(plan: PulsePlan) {
  return Boolean(
    plan.timeline?.deadlineDate ||
      plan.timeline?.recurrence ||
      plan.timeline?.isTimed ||
      (plan.timeline?.startDate &&
        plan.timeline.timelineRole !== "task" &&
        plan.timeline.kind !== "unknown"),
  );
}

function hasTimelineDestination(plan: PulsePlan) {
  return hasConcreteCalendarTiming(plan);
}

function isFinanceLanguage(plan: PulsePlan) {
  return /\b(rent|bill|budget|payment|pay|paid|payday|income|subscription|spent|overspend|overspending|cost|money|cash|send|debt)\b/i.test(
    plan.prompt,
  );
}

function isFamilyLanguage(plan: PulsePlan) {
  return /\b(daughter|son|child|children|kids|sister|brother|moms?|dads?|mom|dad|mother|father|mama|parents|family\s+event|family)\b/i.test(
    plan.prompt,
  );
}

function isRelationshipLanguage(plan: PulsePlan) {
  return /\b(grandma|grandpa|grandmother|grandfather|friend|friends|partner|wife|husband|girlfrienda?|boyfriend|anniversary|birthday|bday|dinner with|date night|date with|date\b|met with|meet with)\b/i.test(
    plan.prompt,
  );
}

function isHealthLanguage(plan: PulsePlan) {
  return /\b(doctor|dentist|therapy|appointment|checkup|medical|hospital|gym|workout|workouts|running|run|shower|sleep|medication|medicine|sad|upset|anxious|stressed|depressed|lonely|cried|crying|feeling|weird|happy|excited|grateful)\b/i.test(
    plan.prompt,
  );
}

function isSchoolLanguage(plan: PulsePlan) {
  return /\b(school|class|homework|assignment|exam|study|studying)\b/i.test(
    plan.prompt,
  );
}

function isGoalLanguage(plan: PulsePlan) {
  return /\b(sync|project|business|goal|progress|work on)\b/i.test(plan.prompt);
}

function destinationsForLifeNote(plan: PulsePlan): SyncDestination[] | null {
  const lifeNote = classifyLifeNote(plan.prompt);
  if (!lifeNote) return null;

  const destinations: SyncDestination[] = [];
  if (lifeNote.kind === "concern") {
    if (isFinanceLanguage(plan)) destinations.push("Finance");
    else if (isHealthLanguage(plan)) destinations.push("Health");
    else if (isFamilyLanguage(plan)) destinations.push("Family");
    else destinations.push("Goals");
  }

  if (lifeNote.kind === "goal") destinations.push("Goals");
  if (lifeNote.kind === "preference") {
    destinations.push(isHealthLanguage(plan) ? "Health" : "Goals");
  }
  if (lifeNote.kind === "health_signal") destinations.push("Health");
  if (lifeNote.kind === "family_context") destinations.push("Family");
  if (lifeNote.kind === "idea") {
    if (isFamilyLanguage(plan)) destinations.push("Family");
    else if (isRelationshipLanguage(plan)) destinations.push("Relationships");
    else destinations.push("Goals");
  }
  if (lifeNote.kind === "financial_state") destinations.push("Finance");
  if (lifeNote.kind === "no_plan") {
    destinations.push(isFinanceLanguage(plan) ? "Finance" : "Goals");
  }
  if (lifeNote.kind === "routine") {
    destinations.push(isHealthLanguage(plan) ? "Health" : "Goals");
  }

  if (
    hasConcreteCalendarTiming(plan) &&
    lifeNote.kind !== "financial_state" &&
    lifeNote.kind !== "no_plan"
  ) {
    destinations.push("Calendar");
  }
  return unique(destinations);
}

function isProjectWorkLanguage(plan: PulsePlan) {
  return (
    /\b(worked on|working on|coded|coding|project|sync|app|building|focus session|spent \d+ hours)\b/i.test(
      plan.prompt,
    ) ||
    (/\b(worked|working)\b/i.test(plan.prompt) &&
      /\b(project|sync|app|code)\b/i.test(plan.prompt))
  );
}

function inferCategoryDestinations(plan: PulsePlan): SyncDestination[] {
  const lifeNoteDestinations = destinationsForLifeNote(plan);
  if (lifeNoteDestinations) return lifeNoteDestinations;

  if (plan.parsedInput?.moneyType === "income") {
    return hasTimelineDestination(plan) ? ["Finance", "Calendar"] : ["Finance"];
  }

  if (plan.timeline?.timelineRole === "deadline" && isFinanceLanguage(plan)) {
    return ["Finance", "Calendar"];
  }

  if (plan.category === "expense" && hasTimelineDestination(plan)) {
    return ["Finance", "Calendar"];
  }

  if (plan.category === "reminder" && isFinanceLanguage(plan)) {
    return hasTimelineDestination(plan) ? ["Finance", "Calendar"] : ["Finance"];
  }

  if (isFamilyLanguage(plan)) {
    const destinations: SyncDestination[] = ["Family"];
    if (hasTimelineDestination(plan)) destinations.push("Calendar");
    if (isSchoolLanguage(plan)) destinations.push("School");
    if (isFinanceLanguage(plan)) destinations.push("Finance");
    return unique(destinations);
  }

  if (isRelationshipLanguage(plan)) {
    return hasTimelineDestination(plan)
      ? unique(["Relationships", "Calendar"])
      : ["Relationships"];
  }

  if (isHealthLanguage(plan)) {
    return hasTimelineDestination(plan) ? ["Health", "Calendar"] : ["Health"];
  }

  if (isSchoolLanguage(plan)) {
    return hasTimelineDestination(plan) ? ["School", "Calendar"] : ["School"];
  }

  if (isProjectWorkLanguage(plan)) {
    return hasTimelineDestination(plan) ? ["Work", "Calendar"] : ["Work"];
  }

  if (isGoalLanguage(plan)) {
    return hasTimelineDestination(plan) ? ["Goals", "Calendar"] : ["Goals"];
  }

  const base = CATEGORY_DESTINATIONS[plan.category] ?? [];
  if (hasTimelineDestination(plan)) {
    return unique([
      ...base.filter((destination) => destination !== "Goals"),
      "Calendar",
    ]);
  }
  return unique(base.length > 0 ? base : ["Goals"]);
}

export function resolveSyncDestinations(
  plan: PulsePlan,
  hint?: CaptureCategoryHint,
): SyncDestination[] {
  const inferred = inferCategoryDestinations(plan);
  if (!hint) {
    return sanitizeSyncDestinations(inferred);
  }

  const boosted = unique([...hintDestinations(hint), ...inferred]);
  return sanitizeSyncDestinations(boosted);
}

export type DestinationSourceCheck = {
  timelineLabel: string | undefined;
  dateLabel: string;
  destinations: SyncDestination[];
  usesTimelineLabel: boolean;
  usesDateLabel: boolean;
  usesBlockedTimelineLabel: boolean;
};

/** Debug helper: confirm destinations are life areas, not timeline/date labels. */
export function checkDestinationSources(plan: PulsePlan): DestinationSourceCheck {
  const destinations = resolveSyncDestinations(plan);
  const timelineLabel = plan.timeline?.label;
  const dateLabel = plan.dateLabel;

  return {
    timelineLabel,
    dateLabel,
    destinations,
    usesTimelineLabel: Boolean(
      timelineLabel && destinations.includes(timelineLabel as SyncDestination),
    ),
    usesDateLabel: destinations.includes(dateLabel as SyncDestination),
    usesBlockedTimelineLabel: destinations.some((destination) =>
      TIMELINE_LABEL_BLOCKLIST.has(destination),
    ),
  };
}
