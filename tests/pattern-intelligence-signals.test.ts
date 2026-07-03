import assert from "node:assert/strict";

import type { CapturedSyncItem } from "@/lib/captured-items";
import { buildPatternStateSnapshot } from "@/lib/intelligence/pattern-intelligence";

const reference = new Date("2026-06-27T12:00:00");

function memory(id: string, prompt: string, daysAgo: number, destinations: CapturedSyncItem["destinations"] = ["Health"]): CapturedSyncItem {
  const created = new Date(reference);
  created.setDate(created.getDate() - daysAgo);
  const ts = created.toISOString();
  return {
    id,
    title: prompt.slice(0, 32),
    category: "general",
    prompt,
    originalPrompt: prompt,
    destinations,
    dateLabel: "No date",
    timeLabel: "Flexible",
    status: "active",
    createdAt: ts,
    updatedAt: ts,
  };
}

function hasType(snapshot: ReturnType<typeof buildPatternStateSnapshot>, type: string) {
  return snapshot.patterns.some((pattern) => pattern.type === type);
}

{
  const snapshot = buildPatternStateSnapshot({
    items: [
      memory("r1", "i skipped workout again", 1, ["Health"]),
      memory("r2", "skipped workout today", 3, ["Health"]),
      memory("r3", "missed gym again", 6, ["Health"]),
    ],
    reference,
  });
  assert.equal(hasType(snapshot, "routine_drift"), true);
}

{
  const snapshot = buildPatternStateSnapshot({
    items: [
      memory("f1", "spent too much this week", 1, ["Finance"]),
      memory("f2", "overspending again", 4, ["Finance"]),
      memory("f3", "rent is due monday", 1, ["Finance"]),
      memory("f4", "payday is friday", 2, ["Finance"]),
    ],
    reference,
  });
  assert.equal(hasType(snapshot, "financial_pressure"), true);
}

{
  const snapshot = buildPatternStateSnapshot({
    items: [
      memory("e1", "i feel stressed", 1),
      memory("e2", "i feel anxious", 3),
      memory("e3", "i feel overwhelmed", 5),
    ],
    reference,
  });
  assert.equal(hasType(snapshot, "emotional_strain"), true);
}

{
  const snapshot = buildPatternStateSnapshot({
    items: [
      memory("h1", "i slept 3 hours", 1, ["Health"]),
      memory("h2", "i feel exhausted", 2, ["Health"]),
      memory("h3", "headache all day", 4, ["Health"]),
    ],
    reference,
  });
  assert.equal(hasType(snapshot, "health_decline"), true);
}

{
  const snapshot = buildPatternStateSnapshot({
    items: [
      memory("w1", "running late to work again", 1, ["Work"]),
      memory("w2", "might call in sick", 2, ["Work"]),
      memory("w3", "thinking about quitting my job", 3, ["Work"]),
    ],
    reference,
  });
  assert.equal(hasType(snapshot, "work_pressure"), true);
}

{
  const snapshot = buildPatternStateSnapshot({
    items: [
      memory("rs1", "argument with my girlfriend", 1, ["Relationships"]),
      memory("rs2", "still tense with my girlfriend", 2, ["Relationships"]),
      memory("rs3", "anniversary is tomorrow", 1, ["Relationships"]),
    ],
    reference,
  });
  assert.equal(hasType(snapshot, "relationship_strain"), true);
}

{
  const snapshot = buildPatternStateSnapshot({
    items: [
      memory("rc1", "i feel better today", 1, ["Health"]),
      memory("rc2", "went for a walk", 2, ["Health"]),
      memory("rc3", "ate real food", 3, ["Health"]),
    ],
    reference,
  });
  assert.equal(hasType(snapshot, "recovery"), true);
}

{
  const snapshot = buildPatternStateSnapshot({
    items: [
      memory("n1", "drank coffee", 1),
      memory("n2", "brushed teeth", 2),
      memory("n3", "watched random video", 3),
      memory("n4", "drank coffee", 4),
      memory("n5", "watched random video", 6),
    ],
    reference,
  });
  assert.equal(snapshot.patterns.length, 0);
}

{
  const snapshot = buildPatternStateSnapshot({
    items: [memory("s1", "i feel stressed", 1)],
    reference,
  });
  assert.equal(snapshot.patterns.length, 0);
}

{
  const snapshot = buildPatternStateSnapshot({
    items: [
      memory("sec1", "my password is hunter2", 1, ["Finance"]),
      memory("sec2", "api key sk-test-123456", 2, ["Finance"]),
      memory("sec3", "credit card is 4111 1111 1111 1111", 3, ["Finance"]),
    ],
    reference,
  });
  assert.equal(snapshot.patterns.length, 0);
}

console.log("pattern-intelligence-signals tests passed");
