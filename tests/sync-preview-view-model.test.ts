import assert from "node:assert/strict";

import { MOCK_SYNC_USER_CONTEXT } from "@/lib/intelligence/sync-user-context";
import { createPulsePlan } from "@/lib/pulse/create-pulse-plan";
import { isInvalidDestinationChip } from "@/lib/pulse/sync-preview-debug";
import {
  buildSyncPreviewViewModel,
  getDestinationChipLabels,
} from "@/lib/pulse/sync-preview-view-model";

const now = new Date("2026-06-10T12:00:00");

function createPlan(input: string) {
  return createPulsePlan(input, {
    timeline: { now, userContext: {} },
  });
}

function buildPreview(input: string) {
  const plan = createPlan(input);
  return buildSyncPreviewViewModel(plan, {
    userContext: MOCK_SYNC_USER_CONTEXT,
  });
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
  "Next Friday",
] as const;

function assertPreviewDestinations(
  input: string,
  expectedDestinations: string[],
  whenLabelIncludes?: string,
) {
  const preview = buildPreview(input);
  const renderedDestinationChips = getDestinationChipLabels(preview);

  assert.deepEqual(preview.where.destinations, expectedDestinations);
  assert.deepEqual(renderedDestinationChips, expectedDestinations);

  if (whenLabelIncludes) {
    assert.ok(
      preview.when.label.includes(whenLabelIncludes),
      `expected when.label to include "${whenLabelIncludes}", got "${preview.when.label}"`,
    );
  }

  for (const label of TIMELINE_LABELS) {
    assert.ok(
      !renderedDestinationChips.includes(label as never),
      `rendered chips must not include timeline label "${label}" for: ${input}`,
    );
    assert.ok(
      isInvalidDestinationChip(label),
      `timeline label "${label}" should be invalid as a destination chip`,
    );
  }

  assert.ok(
    !renderedDestinationChips.some((chip) => isInvalidDestinationChip(chip)),
    `invalid destination chip detected for: ${input}`,
  );
  assert.ok(
    preview.when.label.length > 0,
    `when.label should be set for: ${input}`,
  );
  assert.ok(
    preview.why.summary && preview.why.summary.length > 0,
    `why.summary should be set for: ${input}`,
  );
}

{
  const preview = buildPreview("call mom tomorrow 11 am");

  assertPreviewDestinations("call mom tomorrow 11 am", ["Calendar"], "Tomorrow");
  assert.equal(preview.what.title, "Call mom");
  assert.equal(preview.when.isTimed, true);
  assert.equal(preview.when.startTime, "11:00 AM");
  assert.equal(preview.when.endTime, "12:00 PM");
  assert.equal(preview.why.summary, "Adds structure to your timeline.");
}

{
  const preview = buildPreview("gym tomorrow at 6pm");

  assertPreviewDestinations("gym tomorrow at 6pm", ["Health", "Calendar"], "Tomorrow");
  assert.equal(preview.what.title, "Gym");
  assert.equal(preview.why.summary, "This supports your health rhythm.");
}

{
  const preview = buildPreview("rent due next Friday");

  assertPreviewDestinations("rent due next Friday", ["Finance", "Calendar"]);
  assert.equal(preview.what.title, "Rent");
  assert.equal(preview.why.summary, "Keeps an upcoming bill visible.");
}

{
  const preview = buildPreview("worked Monday 11 to 9");

  assertPreviewDestinations("worked Monday 11 to 9", ["Work", "Calendar"]);
  assert.ok(preview.when.label.includes("Monday"));
}

console.log("Sync preview view model tests passed");
