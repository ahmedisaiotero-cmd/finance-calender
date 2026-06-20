import assert from "node:assert/strict";

import { buildMemoryUnderstanding } from "@/lib/intelligence/memory-understanding";
import { captureFromBriefInput } from "@/lib/mobile-prototype/capture-brief-input";
import { displayMemoryTitle } from "@/lib/sync-capture/memory-title";
import { createTestCaptureStore } from "@/tests/test-capture-handlers";

const reference = new Date("2026-06-14T18:00:00");

{
  const understanding = buildMemoryUnderstanding(
    {
      title: "Send Money to Mom",
      prompt: "send mama ghordita car money next week",
      originalPrompt: "send mama ghordita car money next week",
      destinations: ["Family", "Finance"],
      timeline: {
        timelineRole: "event",
        startDate: "2026-06-21",
        label: "Next week",
      },
      category: "task",
    },
    reference,
  );
  assert.match(understanding, /send money to your mother/i);
  assert.match(understanding, /next week|Monday/i);
}

{
  const understanding = buildMemoryUnderstanding(
    {
      title: "Take Daughter to School",
      prompt: "i havbe to take duaghter to svchool tomorrow",
      originalPrompt: "i havbe to take duaghter to svchool tomorrow",
      destinations: ["Family", "School"],
      timeline: {
        timelineRole: "event",
        startDate: "2026-06-15",
        label: "Tomorrow",
      },
      category: "task",
    },
    reference,
  );
  assert.match(understanding, /take your daughter to school tomorrow/i);
}

{
  const store = createTestCaptureStore();
  captureFromBriefInput(
    "send mama ghordita car money next week",
    { items: store.items, reference },
    store.handlers,
  );
  assert.match(displayMemoryTitle(store.items[0]), /send money to mom/i);
  assert.ok(store.items[0].understanding?.includes("mother"));
}

console.log("memory-understanding tests passed");
