import assert from "node:assert/strict";

import type { CapturedSyncItem } from "@/lib/captured-items";
import { processSyncMessage } from "@/lib/sync-engine";
import { memoryFromSyncEngineResult } from "@/lib/sync-engine/tools/lab-state";

const reference = new Date("2026-06-14T18:00:00");

const workSchedule = {
  days: ["SU", "MO", "TU", "WE"],
  startTime: "11:00",
  endTime: "21:00",
  recurrence: {
    frequency: "weekly" as const,
    interval: 1 as const,
    startsOn: "2026-06-01",
    endsOn: null,
  },
  status: "active" as const,
};

function assertRuntimeShape(result: ReturnType<typeof processSyncMessage>) {
  assert.ok(result.runtime);
  assert.ok(result.runtime.before.judgment);
  assert.ok(result.runtime.after.judgment);
  assert.ok(typeof result.runtime.judgmentChanged === "boolean");
  assert.ok(typeof result.runtime.briefChanged === "boolean");
  assert.ok(result.runtime.pattern);
  assert.ok(typeof result.runtime.after.consequences.count === "number");
  assert.ok(typeof result.runtime.after.brief.lede === "string");
  assert.ok(Array.isArray(result.runtime.after.judgment.supporting));
  assert.ok(result.runtime.after.judgment.supporting.length <= 2);
  assert.ok(typeof result.runtime.after.responseEnginePrimary === "string");
}

{
  const result = processSyncMessage({
    text: "i have a flight tomorrow at 6am",
    reference,
    workSchedule,
  });

  assertRuntimeShape(result);
  assert.ok(result.runtime.after.judgment.primary.length > 0);
  assert.match(
    result.reasoningTrace.find((step) => step.step === "judgment_decision")?.summary ?? "",
    /Today primary/i,
  );
}

{
  const result = processSyncMessage({
    text: "mom's birthday is tomorrow",
    reference,
    workSchedule,
  });

  assertRuntimeShape(result);
  assert.equal(result.briefingEffect.changed, true);
  assert.equal(result.runtime.briefChanged, true);
  assert.ok(result.runtime.after.brief.lines.length >= 0);
}

{
  const seed = processSyncMessage({
    text: "i have a flight tomorrow at 6am",
    reference,
    workSchedule,
  });
  const memory = memoryFromSyncEngineResult(seed, reference);
  assert.ok(memory);

  const items: CapturedSyncItem[] = [memory];
  const before = processSyncMessage({
    text: "payday is tomorrow at 5am",
    reference,
    workSchedule,
    storedMemories: items,
  });

  assertRuntimeShape(before);
  assert.ok(before.runtime.before.judgment.primary.length > 0);
}

{
  const emotional: CapturedSyncItem[] = [
    {
      id: "e1",
      title: "Emotional Check-in",
      category: "general",
      prompt: "i was sad today",
      originalPrompt: "i was sad today",
      destinations: ["Health"],
      dateLabel: "Today",
      timeLabel: "Flexible",
      status: "active",
      createdAt: "2026-06-14T12:00:00.000Z",
      updatedAt: "2026-06-14T12:00:00.000Z",
      timeline: {
        timelineRole: "log",
        startDate: "2026-06-14",
        label: "Today",
      },
    },
    {
      id: "e2",
      title: "Emotional Check-in",
      category: "general",
      prompt: "feeling stressed",
      originalPrompt: "feeling stressed",
      destinations: ["Health"],
      dateLabel: "Today",
      timeLabel: "Flexible",
      status: "active",
      createdAt: "2026-06-10T12:00:00.000Z",
      updatedAt: "2026-06-10T12:00:00.000Z",
      timeline: {
        timelineRole: "log",
        startDate: "2026-06-10",
        label: "Today",
      },
    },
    {
      id: "e3",
      title: "Emotional Check-in",
      category: "general",
      prompt: "anxious again",
      originalPrompt: "anxious again",
      destinations: ["Health"],
      dateLabel: "Today",
      timeLabel: "Flexible",
      status: "active",
      createdAt: "2026-06-05T12:00:00.000Z",
      updatedAt: "2026-06-05T12:00:00.000Z",
      timeline: {
        timelineRole: "log",
        startDate: "2026-06-05",
        label: "Today",
      },
    },
  ];

  const result = processSyncMessage({
    text: "stressed again today",
    reference,
    workSchedule,
    storedMemories: emotional,
  });

  assertRuntimeShape(result);
  assert.ok(
    result.runtime.pattern.thread === "emotional" ||
      result.runtime.pattern.threadPeerCount >= 2,
  );
}

{
  const result = processSyncMessage({
    text: "",
    reference,
  });

  assertRuntimeShape(result);
  assert.equal(result.runtime.after.judgment.isEmpty, true);
}

console.log("sync-engine-brain tests passed");
