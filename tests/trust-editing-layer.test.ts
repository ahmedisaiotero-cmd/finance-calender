import assert from "node:assert/strict";

import { MOCK_SYNC_USER_CONTEXT } from "@/lib/intelligence/sync-user-context";
import {
  buildEditPlanFromCommand,
  buildUpdatedCaptureFromPlan,
  detectCaptureActionIntent,
  resolveCaptureAction,
} from "@/lib/capture-action-resolver";
import { detectDuplicateCapture } from "@/lib/capture-duplicate-detection";
import { capturedItemToTimelineEvent } from "@/lib/captured-to-timeline";
import type { CapturedSyncItem, SyncDestination } from "@/lib/captured-items";
import { createPulsePlan } from "@/lib/pulse/create-pulse-plan";
import { resolveSyncDestinations } from "@/lib/pulse/resolve-sync-destinations";
import { buildSyncPreviewViewModel } from "@/lib/pulse/sync-preview-view-model";
import { detectSyncCommandIntent } from "@/lib/sync-command-intent";

const now = new Date("2026-06-10T12:00:00");

function createPlan(input: string) {
  return createPulsePlan(input, {
    timeline: { now, userContext: {} },
  });
}

function seedCapture(
  input: string,
  overrides: Partial<CapturedSyncItem> = {},
): CapturedSyncItem {
  const plan = createPlan(input);
  const destinations = resolveSyncDestinations(plan);
  const timestamp = now.toISOString();

  return {
    id: plan.id,
    title: plan.title,
    category: plan.category,
    prompt: plan.prompt,
    destinations,
    dateLabel: plan.dateLabel,
    timeLabel: plan.timeLabel,
    timeline: plan.timeline,
    status: "active",
    createdAt: timestamp,
    updatedAt: timestamp,
    deletedAt: null,
    ...overrides,
  };
}

{
  const intent = detectSyncCommandIntent("change date on wednesday to tuesday");
  assert.equal(intent.type, "edit");
  if (intent.type === "edit") {
    assert.ok(intent.operation === "move" || intent.operation === "change_date");
    assert.equal(intent.targetText, "date");
    assert.equal(intent.fromDateLabel, "Wednesday");
    assert.equal(intent.toDateLabel, "Tuesday");
    assert.equal(intent.requiresConfirmation, true);
  }

  const existing = seedCapture("i have a date with my girlfriend on wednesday at 9pm", {
    id: "date-night",
    title: "Date with Girlfriend",
  });
  const action = resolveCaptureAction("change date on wednesday to tuesday", [
    existing,
  ]);
  assert.equal(action.intent, "edit");
  assert.equal(action.primaryTarget?.id, "date-night");
  if (action.intent === "edit" && action.primaryTarget) {
    const editPlan = buildEditPlanFromCommand(
      action.primaryTarget,
      action.commandIntent,
      "change date on wednesday to tuesday",
      { now, userContext: {} },
    );
    assert.notEqual(editPlan.timeline?.kind, "date_range");
    assert.equal(editPlan.category, "date-night");
  }
}

{
  const intent = detectSyncCommandIntent("move call mom to Friday");
  assert.equal(intent.type, "edit");
  if (intent.type === "edit") {
    assert.equal(intent.targetText, "call mom");
    assert.equal(intent.toDateLabel, "Friday");
    assert.equal(intent.requiresConfirmation, true);
  }
}

{
  const intent = detectSyncCommandIntent("delete call mom");
  assert.equal(intent.type, "delete");
  if (intent.type === "delete") {
    assert.equal(intent.targetText, "call mom");
    assert.equal(intent.requiresConfirmation, true);
  }
  assert.equal(detectCaptureActionIntent("delete call mom"), "delete");
}

{
  const plan = createPlan("i have a date with my girlfriend on wednesday at 9pm");
  assert.equal(detectSyncCommandIntent(plan.originalPrompt ?? plan.prompt).type, "create");
  assert.equal(plan.category, "date-night");
  assert.deepEqual(resolveSyncDestinations(plan), ["Relationships", "Calendar"]);
  assert.ok(plan.timeline?.startDate);
  assert.equal(plan.timeline?.startTime, "21:00");
}

{
  const plan = createPlan("call mom tomorrow 11 am");
  const preview = buildSyncPreviewViewModel(plan, {
    userContext: MOCK_SYNC_USER_CONTEXT,
  });

  assert.deepEqual(preview.where.destinations, ["Relationships", "Calendar"]);
  assert.equal(preview.readyToSave, true);
  assert.equal(preview.banner, "Ready to save.");
  assert.ok(preview.when.label.includes("Tomorrow"));

  const capture = seedCapture("call mom tomorrow 11 am");
  const event = capturedItemToTimelineEvent(capture, now);
  assert.ok(event);
  assert.equal(event?.date, "2026-06-11");
  assert.equal(event?.title, capture.title);
  assert.equal(event?.lifeCategory, "relationships");
}

{
  const existing = seedCapture("call mom tomorrow 11 am", { id: "existing-1" });
  const plan = createPlan("call mom tomorrow 11 am");
  const duplicate = detectDuplicateCapture(
    plan,
    "Call Mom",
    [existing],
    now,
  );

  assert.equal(duplicate.isDuplicate, true);
  assert.equal(duplicate.bestMatch?.item.id, "existing-1");
}

{
  assert.equal(detectCaptureActionIntent("Delete call mom"), "delete");
  assert.equal(detectCaptureActionIntent("Move call mom to Friday"), "edit");

  const existing = seedCapture("call mom tomorrow 11 am", {
    id: "call-mom",
    title: "Call Mom",
  });
  const editAction = resolveCaptureAction("Move call mom to Friday", [existing]);
  assert.equal(editAction.intent, "edit");
  assert.equal(editAction.primaryTarget?.id, "call-mom");

  const deleteAction = resolveCaptureAction("Delete call mom", [existing]);
  assert.equal(deleteAction.intent, "delete");
  assert.equal(deleteAction.primaryTarget?.id, "call-mom");
}

{
  const existing = seedCapture("call mom tomorrow 11 am", { id: "call-mom" });
  const plan = createPlan("Move call mom to Friday at 2 pm");
  const updated = buildUpdatedCaptureFromPlan(
    existing,
    plan,
    ["Relationships", "Calendar"] as SyncDestination[],
    "Call Mom",
  );

  assert.equal(updated.id, "call-mom");
  assert.equal(updated.title, "Call Mom");
  assert.ok(updated.updatedAt >= existing.updatedAt);
}

{
  const gym = seedCapture("gym tomorrow at 6pm");
  const event = capturedItemToTimelineEvent(gym, now);
  assert.ok(event);
  assert.deepEqual(gym.destinations, ["Health", "Calendar"]);
  assert.equal(event?.lifeCategory, "health");
}

console.log("Trust and editing layer tests passed");
