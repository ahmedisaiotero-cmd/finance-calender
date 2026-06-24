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
        timeline: {
          timelineRole: "log",
          startDate: "2026-06-14",
          label: "Today",
        },
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
        timeline: {
          timelineRole: "log",
          startDate: "2026-06-14",
          label: "Today",
        },
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
      parsedInput: { moneyType: "expense", amount: 9 },
      timeline: {
        timelineRole: "log",
        startDate: "2026-06-14",
        label: "Today",
      },
    }),
    reference,
  );
  assert.equal(understanding, "Small spending note.");
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
      parsedInput: { moneyType: "expense", amount: 9 },
      timeline: {
        timelineRole: "log",
        startDate: "2026-06-14",
        label: "Today",
      },
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

console.log("memory-understanding tests passed");
