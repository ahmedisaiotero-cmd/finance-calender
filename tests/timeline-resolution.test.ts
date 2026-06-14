import assert from "node:assert/strict";

import { analyzeConsequences } from "@/lib/intelligence/consequence-engine";
import { generateForecast } from "@/lib/intelligence/forecast-engine";
import { MOCK_SYNC_USER_CONTEXT } from "@/lib/intelligence/sync-user-context";
import { normalizeCaptureInput } from "@/lib/parser/normalize-capture-input";
import { createPulsePlan } from "@/lib/pulse/create-pulse-plan";
import {
  checkDestinationSources,
  resolveSyncDestinations,
} from "@/lib/pulse/resolve-sync-destinations";
import { resolveTime } from "@/lib/timeline/resolve-time";
import { resolveTimeline } from "@/lib/timeline/resolve-timeline";
import { summarizeTimeByCategory } from "@/lib/timeline/summarize-time";

const now = new Date("2026-06-10T12:00:00");
const defaultWorkSchedule = {
  days: ["Sunday", "Monday", "Tuesday", "Wednesday"],
  startTime: "11:00",
  endTime: "21:00",
};

function resolve(input: string) {
  return resolveTimeline(input, {
    now,
    userContext: { workSchedule: defaultWorkSchedule },
  });
}

function resolveWithoutContext(input: string) {
  return resolveTimeline(input, { now, userContext: {} });
}

function createPlan(input: string) {
  return createPulsePlan(input, {
    timeline: { now, userContext: {} },
  });
}

function analyze(
  captureText: string,
  category: string,
  destinations: string[],
) {
  return analyzeConsequences({
    captureText,
    category,
    destinations,
    timeline: resolveWithoutContext(captureText),
    userContext: MOCK_SYNC_USER_CONTEXT,
  });
}

{
  const result = resolve("I worked Sunday through Monday");
  assert.equal(result.kind, "date_range");
  assert.equal(result.tense, "past");
  assert.equal(result.startDate, "2026-06-07");
  assert.equal(result.endDate, "2026-06-08");
  assert.equal(result.startTime, "11:00");
  assert.equal(result.endTime, "21:00");
  assert.equal(result.isTimed, true);
  assert.equal(result.confidenceLabel, "high");
  assert.equal(result.scheduleInferenceApplied, true);
  assert.equal(result.timeSource, "user_context");
}

{
  const normalized = normalizeCaptureInput("  I workedmonday  ");
  assert.equal(normalized.original, "  I workedmonday  ");
  assert.equal(normalized.normalized, "i worked monday");
  assert.ok(normalized.corrections.includes("lowercase/trim whitespace"));
  assert.ok(normalized.corrections.includes("workedmonday -> worked monday"));
}

{
  const plan = createPlan("i workedmonday");
  assert.equal(plan.prompt, "i worked monday");
  assert.equal(plan.originalPrompt, "i workedmonday");
  assert.equal(plan.category, "workday");
  assert.equal(plan.timeline?.kind, "single_date");
  assert.equal(plan.timeline?.tense, "past");
  assert.equal(plan.timeline?.confidenceLabel, "high");
  assert.equal(plan.timeline?.startDate, "2026-06-08");
  assert.equal(plan.timeline?.startTime, undefined);
  assert.equal(plan.timeline?.endTime, undefined);
  assert.equal(plan.timeline?.needsConfirmation, true);
  assert.equal(plan.timeline?.scheduleInferenceApplied, false);
  assert.equal(plan.timeline?.isTimed, false);
  assert.equal(plan.timeline?.timeSource, "none");
}

{
  const normalized = normalizeCaptureInput("rentnextfriday");
  assert.equal(normalized.normalized, "rent next friday");
  assert.ok(normalized.corrections.includes("rentnext[day] -> rent next [day]"));
}

const TIMELINE_LABELS = [
  "Today",
  "Tomorrow",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
  "Next week",
  "Upcoming",
] as const;

function assertLifeAreaDestinationsOnly(
  input: string,
  expected: string[],
) {
  const plan = createPlan(input);
  const destinations = resolveSyncDestinations(plan);
  const sourceCheck = checkDestinationSources(plan);

  assert.deepEqual(destinations, expected);
  assert.equal(sourceCheck.usesTimelineLabel, false);
  assert.equal(sourceCheck.usesDateLabel, false);
  assert.equal(sourceCheck.usesBlockedTimelineLabel, false);
  assert.ok(
    !TIMELINE_LABELS.some((label) =>
      destinations.includes(label as (typeof destinations)[number]),
    ),
    `destinations must not include timeline labels for: ${input}`,
  );
}

{
  const plan = createPlan("call mom tomorrow 11 am");
  const destinations = resolveSyncDestinations(plan);
  const sourceCheck = checkDestinationSources(plan);

  assert.deepEqual(destinations, ["Relationships", "Calendar"]);
  assert.equal(plan.timeline?.label, "Tomorrow");
  assert.equal(plan.timeline?.startTime, "11:00");
  assert.equal(plan.timeline?.endTime, "12:00");
  assert.equal(sourceCheck.usesTimelineLabel, false);
  assert.equal(sourceCheck.usesDateLabel, false);
  assert.ok(!destinations.includes("Today" as never));
  assert.ok(!destinations.includes("Tomorrow" as never));
}

{
  assertLifeAreaDestinationsOnly("gym tomorrow at 6pm", [
    "Health",
    "Calendar",
  ]);
  assertLifeAreaDestinationsOnly("rent due next Friday", [
    "Finance",
    "Calendar",
  ]);
  assertLifeAreaDestinationsOnly("worked Monday 11 to 9", [
    "Work",
    "Calendar",
  ]);
  assertLifeAreaDestinationsOnly("call mom tomorrow 11am", [
    "Relationships",
    "Calendar",
  ]);
}

{
  const normalized = normalizeCaptureInput("wroked monady thru firday");
  assert.equal(normalized.normalized, "worked monday through friday");
  assert.ok(normalized.corrections.includes("wroked -> worked"));
  assert.ok(normalized.corrections.includes("monady -> monday"));
  assert.ok(normalized.corrections.includes("thru -> through"));
  assert.ok(normalized.corrections.includes("firday -> friday"));
}

{
  const result = resolve("I work Sunday through Wednesday 11 to 9");
  assert.equal(result.kind, "recurring");
  assert.equal(result.recurrence?.frequency, "weekly");
  assert.deepEqual(result.recurrence?.days, ["SU", "MO", "TU", "WE"]);
  assert.equal(result.startTime, "11:00");
  assert.equal(result.endTime, "21:00");
  assert.equal(result.isTimed, true);
  assert.equal(result.scheduleInferenceApplied, false);
  assert.equal(result.timeSource, "input");
}

{
  const result = resolveWithoutContext("I work Sunday through Wednesday");
  assert.equal(result.kind, "recurring");
  assert.deepEqual(result.recurrence?.days, ["SU", "MO", "TU", "WE"]);
  assert.equal(result.startTime, undefined);
  assert.equal(result.endTime, undefined);
  assert.equal(result.isTimed, false);
  assert.equal(result.needsConfirmation, true);
  assert.equal(result.timeSource, "none");
}

{
  const result = resolveWithoutContext("I work Sunday through Wednesday 11am to 9pm");
  assert.equal(result.kind, "recurring");
  assert.deepEqual(result.recurrence?.days, ["SU", "MO", "TU", "WE"]);
  assert.equal(result.startTime, "11:00");
  assert.equal(result.endTime, "21:00");
  assert.equal(result.isTimed, true);
  assert.equal(result.timeSource, "input");
}

{
  const result = resolveWithoutContext("I work Sunday through Wednesday 11am-9pm");
  assert.equal(result.kind, "recurring");
  assert.deepEqual(result.recurrence?.days, ["SU", "MO", "TU", "WE"]);
  assert.equal(result.startTime, "11:00");
  assert.equal(result.endTime, "21:00");
  assert.equal(result.isTimed, true);
  assert.equal(result.timeSource, "input");
}

{
  const result = resolveWithoutContext("I worked Monday");
  assert.equal(result.kind, "single_date");
  assert.equal(result.startDate, "2026-06-08");
  assert.equal(result.startTime, undefined);
  assert.equal(result.endTime, undefined);
  assert.equal(result.isTimed, false);
  assert.equal(result.needsConfirmation, true);
  assert.equal(result.scheduleInferenceApplied, false);
  assert.equal(result.timeSource, "none");
}

{
  const result = resolveWithoutContext("I worked Monday 11 to 9");
  assert.equal(result.kind, "single_date");
  assert.equal(result.startDate, "2026-06-08");
  assert.equal(result.startTime, "11:00");
  assert.equal(result.endTime, "21:00");
  assert.equal(result.isTimed, true);
  assert.equal(result.scheduleInferenceApplied, false);
  assert.equal(result.timeSource, "input");
  assert.equal(result.durationMinutes, 600);
  assert.equal(result.timelineRole, "event");
}

{
  const result = resolveWithoutContext("worked 8 hours Monday");
  assert.equal(result.timelineRole, "log");
  assert.equal(result.durationMinutes, 480);
  assert.equal(result.startDate, "2026-06-08");
  assert.equal(result.isTimed, false);
}

{
  const result = resolveWithoutContext("gym for 45 minutes");
  assert.equal(result.timelineRole, "log");
  assert.equal(result.durationMinutes, 45);
  assert.equal(result.isTimed, false);
}

{
  const result = resolveWithoutContext("studied for 2 hours yesterday");
  assert.equal(result.timelineRole, "log");
  assert.equal(result.durationMinutes, 120);
  assert.equal(result.startDate, "2026-06-09");
}

{
  const result = resolveWithoutContext("slept 6 hours");
  assert.equal(result.timelineRole, "log");
  assert.equal(result.durationMinutes, 360);
}

{
  const result = resolveWithoutContext("finish budget by Friday");
  assert.equal(result.timelineRole, "deadline");
  assert.equal(result.deadlineDate, "2026-06-12");
  assert.equal(result.isTimed, false);
}

{
  const result = resolveWithoutContext("assignment due tomorrow at midnight");
  assert.equal(result.timelineRole, "deadline");
  assert.equal(result.deadlineDate, "2026-06-11");
  assert.equal(result.deadlineTime, "00:00");
}

{
  const result = resolveWithoutContext("pay rent due on the 1st");
  assert.equal(result.timelineRole, "deadline");
  assert.equal(result.deadlineDate, "2026-07-01");
}

{
  const result = resolveWithoutContext("gym after work");
  assert.equal(result.timelineRole, "task");
  assert.equal(result.kind, "unknown");
  assert.equal(result.needsConfirmation, true);
  assert.equal(result.timeSource, "none");
}

{
  const result = resolveWithoutContext("work on Sync before bed");
  assert.equal(result.timelineRole, "task");
  assert.equal(result.kind, "unknown");
  assert.equal(result.needsConfirmation, true);
}

{
  const result = resolveWithoutContext("gym tomorrow at 6pm");
  assert.equal(result.kind, "relative");
  assert.equal(result.startDate, "2026-06-11");
  assert.equal(result.startTime, "18:00");
  assert.equal(result.endTime, "19:00");
  assert.equal(result.isTimed, true);
  assert.equal(result.timeSource, "input");
  assert.equal(result.needsConfirmation, false);
}

{
  const result = resolveWithoutContext("doctor appointment Friday at 10:30am");
  assert.equal(result.kind, "single_date");
  assert.equal(result.startDate, "2026-06-12");
  assert.equal(result.startTime, "10:30");
  assert.equal(result.endTime, "11:30");
  assert.equal(result.isTimed, true);
  assert.equal(result.timeSource, "input");
}

{
  const result = resolveWithoutContext("meeting at 3");
  assert.equal(result.kind, "unknown");
  assert.equal(result.startTime, "15:00");
  assert.equal(result.endTime, "16:00");
  assert.equal(result.isTimed, true);
  assert.equal(result.needsConfirmation, true);
}

{
  const result = resolveWithoutContext("work Monday");
  assert.equal(result.kind, "recurring");
  assert.equal(result.tense, "present");
  assert.equal(result.needsConfirmation, true);
  assert.equal(result.startDate, "2026-06-15");
  assert.equal(result.isTimed, false);
  assert.equal(result.timeSource, "none");
}

{
  const result = resolveWithoutContext("work Monday 7 to 3");
  assert.equal(result.kind, "recurring");
  assert.deepEqual(result.recurrence?.days, ["MO"]);
  assert.equal(result.startTime, "07:00");
  assert.equal(result.endTime, "15:00");
  assert.equal(result.isTimed, true);
  assert.equal(result.timeSource, "input");
  assert.equal(result.durationMinutes, 480);
}

{
  const result = resolve("pay rent next Friday");
  assert.equal(result.kind, "single_date");
  assert.equal(result.tense, "future");
  assert.equal(result.startDate, "2026-06-19");
}

{
  const result = resolve("gym tomorrow morning");
  assert.equal(result.kind, "relative");
  assert.equal(result.label, "Tomorrow");
  assert.equal(result.startDate, "2026-06-11");
}

{
  const result = resolve("I get paid every other Friday");
  assert.equal(result.kind, "recurring");
  assert.equal(result.recurrence?.frequency, "biweekly");
  assert.deepEqual(result.recurrence?.days, ["Friday"]);
}

{
  const result = resolve("doctor appointment in five days");
  assert.equal(result.kind, "relative");
  assert.equal(result.label, "In 5 days");
  assert.equal(result.startDate, "2026-06-15");
}

{
  const result = resolve("worked last Monday");
  assert.equal(result.kind, "single_date");
  assert.equal(result.tense, "past");
  assert.equal(result.startDate, "2026-06-08");
}

{
  const result = resolveWithoutContext("work Monday");
  assert.equal(result.kind, "recurring");
  assert.equal(result.tense, "present");
  assert.equal(result.needsConfirmation, true);
  assert.equal(result.startDate, "2026-06-15");
}

{
  const result = resolve("rent is due every month on the 1st");
  assert.equal(result.timelineRole, "deadline");
  assert.equal(result.deadlineDate, "2026-07-01");
}

{
  const result = resolve("Friday night through Saturday morning");
  assert.equal(result.kind, "date_range");
  assert.equal(result.startTime, undefined);
  assert.equal(result.endTime, undefined);
  assert.equal(result.isTimed, false);
  assert.equal(result.timeSource, "none");
  assert.equal(result.startDate, "2026-06-12");
  assert.equal(result.endDate, "2026-06-13");
}

{
  const time = resolveTime("from 11am to 9pm");
  assert.equal(time.startTime, "11:00");
  assert.equal(time.endTime, "21:00");
  assert.equal(time.isTimed, true);
  assert.equal(time.source, "input");
}

{
  const time = resolveTime("between 3 and 5");
  assert.equal(time.startTime, "03:00");
  assert.equal(time.endTime, "05:00");
  assert.equal(time.durationMinutes, 120);
}

{
  const summaries = summarizeTimeByCategory(
    [
      { category: "Work", timeline: resolveWithoutContext("worked 8 hours Monday") },
      {
        category: "Fitness",
        createdAt: "2026-06-10T12:00:00.000Z",
        timeline: resolveWithoutContext("gym for 45 minutes"),
      },
      {
        category: "Sleep",
        createdAt: "2026-06-10T12:00:00.000Z",
        timeline: resolveWithoutContext("slept 6 hours"),
      },
    ],
    { startDate: "2026-06-01", endDate: "2026-06-30" },
  );
  assert.deepEqual(summaries, [
    { category: "Fitness", totalMinutes: 45, itemCount: 1 },
    { category: "Sleep", totalMinutes: 360, itemCount: 1 },
    { category: "Work", totalMinutes: 480, itemCount: 1 },
  ]);
}

{
  const analysis = analyze(
    "I picked up an extra shift Friday 11 to 9",
    "workday",
    ["Work", "Calendar"],
  );
  assert.ok(
    analysis.affectedAreas.some(
      (area) => area.area === "finance" && area.impact === "positive",
    ),
  );
  assert.ok(analysis.affectedAreas.some((area) => area.area === "health"));
  assert.ok(analysis.affectedAreas.some((area) => area.area === "goals"));
  assert.ok(
    analysis.suggestedActions.every((action) => action.requiresConfirmation),
  );
}

{
  const analysis = analyze("I spent $600 fixing my car", "expense", ["Finance"]);
  assert.ok(
    analysis.affectedAreas.some(
      (area) => area.area === "finance" && area.impact === "negative",
    ),
  );
  assert.ok(
    analysis.suggestedActions.some(
      (action) => action.actionType === "review_budget",
    ),
  );
}

{
  const analysis = analyze("I missed the gym today", "workout", ["Health"]);
  assert.ok(
    analysis.affectedAreas.some(
      (area) => area.area === "health" && area.impact === "negative",
    ),
  );
  assert.ok(
    analysis.suggestedActions.some((action) => action.label === "Reset workout plan"),
  );
}

{
  const analysis = analyze("I worked on Sync for 2 hours", "task", ["Goals"]);
  assert.ok(
    analysis.affectedAreas.some(
      (area) => area.area === "goals" && area.impact === "positive",
    ),
  );
}

{
  const analysis = analyze("rent is due next Friday", "reminder", ["Calendar"]);
  assert.ok(analysis.affectedAreas.some((area) => area.area === "finance"));
  assert.ok(
    analysis.suggestedActions.some((action) => action.actionType === "add_reminder"),
  );
}

{
  const forecast = generateForecast({
    now,
    userContext: MOCK_SYNC_USER_CONTEXT,
    items: [
      {
        id: "rent",
        title: "Rent",
        category: "expense",
        destinations: ["Finance"],
        timeline: resolveWithoutContext("rent is due Friday"),
      },
      {
        id: "work-a",
        title: "Work Shift",
        category: "workday",
        destinations: ["Work", "Calendar"],
        timeline: resolveWithoutContext("work Friday 11 to 9"),
      },
      {
        id: "project",
        title: "Sync project",
        destinations: ["Goals", "Calendar"],
        timeline: resolveWithoutContext("work on Sync Friday 7 to 9"),
      },
      {
        id: "work-b",
        title: "Extra shift",
        category: "workday",
        destinations: ["Work", "Calendar"],
        timeline: resolveWithoutContext("work Friday 7 to 3"),
      },
    ],
  });

  assert.ok(forecast.cards.length <= 4);
  assert.ok(forecast.cards.some((card) => card.area === "finance"));
  assert.ok(forecast.cards.some((card) => card.area === "calendar"));
  assert.ok(forecast.cards.some((card) => card.area === "work"));
  assert.ok(forecast.cards.some((card) => card.area === "goals"));
}

{
  const forecast = generateForecast({
    now,
    userContext: MOCK_SYNC_USER_CONTEXT,
    items: [],
  });
  assert.equal(forecast.cards.length, 0);
  assert.equal(forecast.summary, "Nothing urgent right now.");
}

{
  const forecast = generateForecast({
    now,
    userContext: MOCK_SYNC_USER_CONTEXT,
    items: [
      {
        id: "payday",
        title: "Upcoming Paycheck",
        category: "expense",
        destinations: ["Finance", "Calendar"],
        moneyType: "income",
        amount: "$1,200",
        timeline: resolveWithoutContext("I get paid Friday 1200 dollars"),
      },
    ],
  });
  assert.ok(forecast.cards.some((card) => card.message === "Payday is coming up."));
}

console.log("Timeline resolution tests passed");
