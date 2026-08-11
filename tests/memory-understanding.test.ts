import assert from "node:assert/strict";

import type { CapturedSyncItem } from "@/lib/captured-items";
import { buildMemoryUnderstanding } from "@/lib/intelligence/memory-understanding";
import {
  buildMemoryProfile,
  describeMemoryWeight,
} from "@/lib/intelligence/memory-profile";
import { cleanMemoryTitle } from "@/lib/sync-capture/memory-title";
import { captureFromBriefInput } from "@/lib/mobile-prototype/capture-brief-input";
import { createTestCaptureStore } from "@/tests/test-capture-handlers";
import { createTestTimelineResolution } from "@/tests/test-fixtures";

const reference = new Date("2026-06-14T18:00:00");

function item(
  partial: Partial<CapturedSyncItem> & Pick<CapturedSyncItem, "title" | "prompt">,
): CapturedSyncItem {
  return {
    category: "general",
    destinations: ["Calendar"],
    dateLabel: "Today",
    timeLabel: "Flexible",
    status: "active",
    createdAt: "2026-06-14T12:00:00.000Z",
    updatedAt: "2026-06-14T12:00:00.000Z",
    id: partial.id ?? "test",
    ...partial,
  };
}

{
  assert.equal(
    buildMemoryUnderstanding(
      item({
        id: "coffee",
        title: "Coffee",
        prompt: "coffee",
        originalPrompt: "coffee",
        timeline: createTestTimelineResolution({
          timelineRole: "log",
          startDate: "2026-06-14",
          label: "Today",
        }),
      }),
      reference,
    ),
    "Small daily habit.",
  );
}

{
  assert.equal(
    buildMemoryUnderstanding(
      item({
        id: "sad",
        title: "Emotional Check-in",
        prompt: "i was sad today",
        originalPrompt: "i was sad today",
        destinations: ["Health"],
        timeline: createTestTimelineResolution({
          timelineRole: "log",
          startDate: "2026-06-14",
          label: "Today",
        }),
      }),
      reference,
    ),
    "Emotional check-in noted today.",
  );
}

{
  const understanding = buildMemoryUnderstanding(
    item({
      id: "mcd",
      title: "McDonalds",
      prompt: "spent $9 at mcdonalds",
      originalPrompt: "spent $9 at mcdonalds",
      category: "expense",
      destinations: ["Finance"],
      moneyType: "expense",
      amount: "9",
      timeline: createTestTimelineResolution({
        timelineRole: "log",
        startDate: "2026-06-14",
        label: "Today",
      }),
    }),
    reference,
  );
  assert.equal(understanding, "Small money note saved.");
}

{
  const profile = buildMemoryProfile(
    item({
      id: "mcd-profile",
      title: "McDonalds",
      prompt: "spent $9 at mcdonalds",
      originalPrompt: "spent $9 at mcdonalds",
      category: "expense",
      destinations: ["Finance"],
      moneyType: "expense",
      amount: "9",
      timeline: createTestTimelineResolution({
        timelineRole: "log",
        startDate: "2026-06-14",
        label: "Today",
      }),
    }),
    reference,
  );
  assert.equal(profile.area, "Money");
  assert.equal(profile.type, "expense");
  assert.equal(describeMemoryWeight(profile.weight), "Light");
  assert.equal(profile.accumulation, "spending");
}

{
  assert.equal(
    cleanMemoryTitle({
      title: "Was Sad Today",
      prompt: "i was sad today",
    }),
    "Emotional Check-in",
  );
}

{
  const store = createTestCaptureStore();
  const captured = captureFromBriefInput(
    "had coffee today",
    { items: store.items, reference },
    store.handlers,
  );
  assert.ok(captured);
  assert.match(captured!.plan.prompt, /coffee/i);
  assert.match(store.items[0]?.understanding ?? buildMemoryUnderstanding(store.items[0], reference), /small daily habit/i);
}

{
  assert.match(
    buildMemoryUnderstanding(
      item({
        id: "rent-concern",
        title: "Money Concern",
        prompt: "i'm worried rent will be tight this month",
        originalPrompt: "I'm worried rent will be tight this month.",
        destinations: ["Finance"],
        dateLabel: "Upcoming",
        timeLabel: "Flexible",
      }),
      reference,
    ),
    /money concern/i,
  );
}

{
  assert.match(
    buildMemoryUnderstanding(
      item({
        id: "running-goal",
        title: "Running Goal",
        prompt: "i want to get better at running this summer",
        originalPrompt: "I want to get better at running this summer.",
        destinations: ["Goals"],
        dateLabel: "Upcoming",
        timeLabel: "Flexible",
      }),
      reference,
    ),
    /health goal|goal noted/i,
  );
}

{
  assert.match(
    buildMemoryUnderstanding(
      item({
        id: "morning-workout-preference",
        title: "Workout Preference",
        prompt: "i prefer morning workouts",
        originalPrompt: "I prefer morning workouts.",
        destinations: ["Health"],
        dateLabel: "Upcoming",
        timeLabel: "Flexible",
      }),
      reference,
    ),
    /morning workouts fit/i,
  );
}

{
  assert.match(
    buildMemoryUnderstanding(
      item({
        id: "sleep-signal",
        title: "Sleep Signal",
        prompt: "sleep was rough last night",
        originalPrompt: "Sleep was rough last night.",
        destinations: ["Health"],
        dateLabel: "Upcoming",
        timeLabel: "Flexible",
      }),
      reference,
    ),
    /sleep signal/i,
  );
}

{
  assert.match(
    buildMemoryUnderstanding(
      item({
        id: "dad-context",
        title: "Dad Context",
        prompt: "dad has been needing more help lately",
        originalPrompt: "Dad has been needing more help lately.",
        destinations: ["Family"],
        dateLabel: "Upcoming",
        timeLabel: "Flexible",
      }),
      reference,
    ),
    /family context noted/i,
  );
}

{
  assert.match(
    buildMemoryUnderstanding(
      item({
        id: "mom-birthday-idea",
        title: "Mom Birthday Idea",
        prompt: "idea: plan something nice for mom's birthday",
        originalPrompt: "Idea: plan something nice for Mom's birthday.",
        destinations: ["Family"],
        dateLabel: "Upcoming",
        timeLabel: "Flexible",
      }),
      reference,
    ),
    /idea saved/i,
  );
}

{
  assert.match(
    buildMemoryUnderstanding(
      item({
        id: "coffee-routine",
        title: "Coffee Routine",
        prompt: "coffee has been a daily thing lately",
        originalPrompt: "Coffee has been a daily thing lately.",
        destinations: ["Goals"],
        dateLabel: "Upcoming",
        timeLabel: "Flexible",
      }),
      reference,
    ),
    /routine noted/i,
  );
}

console.log("memory-understanding tests passed");
