import assert from "node:assert/strict";

import { createPulsePlan } from "@/lib/pulse/create-pulse-plan";
import { buildSyncPreviewViewModel } from "@/lib/pulse/sync-preview-view-model";
import { resolveSyncDestinations } from "@/lib/pulse/resolve-sync-destinations";
import {
  detectScheduleCommandIntent,
  extractScheduleUpdateQuery,
} from "@/lib/schedule-command-intent";
import { resolveTime } from "@/lib/timeline/resolve-time";
import { resolveTimeline } from "@/lib/timeline/resolve-timeline";
import { generateWorkScheduleEvents } from "@/lib/work-schedule-events";

const now = new Date("2026-06-10T12:00:00");

function resolve(input: string) {
  return resolveTimeline(input, { now, userContext: {} });
}

function createPlan(input: string) {
  return createPulsePlan(input, {
    timeline: { now, userContext: {} },
  });
}

{
  const result = resolve("my work schedule is sunday through monday 11 to 9pm");
  assert.equal(result.kind, "recurring");
  assert.equal(result.timelineRole, "schedule");
  assert.equal(result.recurrence?.frequency, "weekly");
  assert.deepEqual(result.recurrence?.days, ["SU", "MO"]);
  assert.equal(result.startTime, "11:00");
  assert.equal(result.endTime, "21:00");
  assert.equal(result.isTimed, true);
  assert.equal(result.timeSource, "input");
  assert.equal(result.needsConfirmation, true);
  assert.match(result.label, /Every Sunday and Monday/i);
}

{
  const plan = createPlan("my work schedule is sunday through monday 11 to 9pm");
  assert.equal(plan.category, "work-schedule");
  assert.equal(plan.title, "Work Schedule");
  assert.equal(plan.timeline?.kind, "recurring");
  assert.equal(plan.timeline?.timelineRole, "schedule");
  assert.deepEqual(plan.timeline?.recurrence?.days, ["SU", "MO"]);

  const preview = buildSyncPreviewViewModel(plan);
  assert.equal(preview.mode, "schedule-save");
  assert.equal(preview.what.title, "Work Schedule");
  assert.match(preview.when.label, /Every Sunday and Monday/i);
  assert.equal(preview.when.startTime, "11:00 AM");
  assert.equal(preview.when.endTime, "9:00 PM");
  assert.deepEqual(resolveSyncDestinations(plan), ["Work", "Calendar"]);
  assert.match(
    preview.why.summary ?? "",
    /repeats weekly until you change it/i,
  );
  assert.equal(preview.confidence.needsConfirmation, true);
}

{
  const result = resolve("I work sunday through wednesday 11 to 9");
  assert.equal(result.kind, "recurring");
  assert.equal(result.recurrence?.frequency, "weekly");
  assert.deepEqual(result.recurrence?.days, ["SU", "MO", "TU", "WE"]);
  assert.equal(result.startTime, "11:00");
  assert.equal(result.endTime, "21:00");
  assert.equal(result.isTimed, true);
}

{
  const result = resolve("worked sunday through monday 11 to 9pm");
  assert.equal(result.kind, "date_range");
  assert.notEqual(result.timelineRole, "schedule");
  assert.equal(result.tense, "past");
  assert.equal(result.startTime, "11:00");
  assert.equal(result.endTime, "21:00");
}

{
  const command = detectScheduleCommandIntent("delete my work schedule");
  assert.equal(command.type, "delete");
  assert.equal(command.requiresConfirmation, true);
}

{
  const update = extractScheduleUpdateQuery(
    "change my work schedule to sunday through wednesday 11 to 9",
  );
  assert.equal(
    update,
    "my work schedule is sunday through wednesday 11 to 9",
  );
}

{
  const time = resolveTime("11 to 9pm");
  assert.equal(time.startTime, "11:00");
  assert.equal(time.endTime, "21:00");
  assert.equal(time.isTimed, true);
}

{
  const time = resolveTime("7 to 3pm");
  assert.equal(time.startTime, "07:00");
  assert.equal(time.endTime, "15:00");
}

{
  const time = resolveTime("3 to 11pm");
  assert.equal(time.startTime, "15:00");
  assert.equal(time.endTime, "23:00");
}

{
  const events = generateWorkScheduleEvents(
    {
      days: ["SU", "MO"],
      startTime: "11:00",
      endTime: "21:00",
      recurrence: {
        frequency: "weekly",
        interval: 1,
        startsOn: "2026-06-01",
        endsOn: null,
      },
      status: "active",
    },
    2026,
    5,
  );

  assert.ok(events.some((event) => event.date === "2026-06-07"));
  assert.ok(events.some((event) => event.date === "2026-06-08"));
  assert.ok(events.every((event) => event.title === "Work"));
  assert.match(events[0]?.detail?.time ?? "", /11:00 AM – 9:00 PM/);
}

{
  const result = resolveTimeline("I worked Monday", {
    now,
    userContext: {
      workSchedule: {
        days: ["SU", "MO"],
        startTime: "11:00",
        endTime: "21:00",
      },
    },
  });
  assert.equal(result.kind, "single_date");
  assert.equal(result.startTime, "11:00");
  assert.equal(result.endTime, "21:00");
  assert.equal(result.scheduleInferenceApplied, true);
  assert.equal(result.timeSource, "user_context");
}

console.log("work-schedule tests passed");
