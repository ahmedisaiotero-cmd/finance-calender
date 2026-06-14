import {
  LIFE_AREA_DESTINATIONS,
  type SyncDestination,
} from "@/lib/captured-items";
import type { PulsePlan, PulsePlanCategory } from "@/lib/pulse/types";

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
  general: ["Calendar"],
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

function hasTimelineDestination(plan: PulsePlan) {
  return (
    plan.timeline?.startDate ||
    plan.timeline?.deadlineDate ||
    plan.timeline?.isTimed ||
    plan.dateLabel !== "Upcoming"
  );
}

function isFinanceLanguage(plan: PulsePlan) {
  return /\b(rent|bill|budget|payment|pay|paid|payday|income|subscription|spent|cost)\b/i.test(
    plan.prompt,
  );
}

function isRelationshipLanguage(plan: PulsePlan) {
  return /\b(mom|dad|mother|father|parent|grandma|grandpa|grandmother|grandfather|family|friend|friends|partner|wife|husband|girlfriend|boyfriend|anniversary|birthday|call|dinner with|date night)\b/i.test(
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

function inferCategoryDestinations(plan: PulsePlan): SyncDestination[] {
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
    return ["Finance", "Calendar"];
  }

  if (isRelationshipLanguage(plan)) {
    return unique(["Relationships", "Calendar"]);
  }

  if (isSchoolLanguage(plan)) {
    return hasTimelineDestination(plan) ? ["School", "Calendar"] : ["School"];
  }

  if (isGoalLanguage(plan)) {
    return hasTimelineDestination(plan) ? ["Goals", "Calendar"] : ["Goals"];
  }

  return unique(CATEGORY_DESTINATIONS[plan.category] ?? ["Calendar"]);
}

export function resolveSyncDestinations(plan: PulsePlan): SyncDestination[] {
  return sanitizeSyncDestinations(inferCategoryDestinations(plan));
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
