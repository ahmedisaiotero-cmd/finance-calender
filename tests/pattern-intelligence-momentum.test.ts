import assert from "node:assert/strict";

import type { CapturedSyncItem } from "@/lib/captured-items";
import {
  buildPatternStateSnapshot,
  type Pattern,
} from "@/lib/intelligence/pattern-intelligence";

const reference = new Date("2026-06-27T12:00:00");

function memory(
  id: string,
  prompt: string,
  daysAgo: number,
  destinations: CapturedSyncItem["destinations"] = ["Health"],
): CapturedSyncItem {
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

function patternOf(
  snapshot: ReturnType<typeof buildPatternStateSnapshot>,
  type: string,
): Pattern | undefined {
  return snapshot.patterns.find((entry) => entry.type === type);
}

function momentumIs(
  pattern: Pattern | undefined,
  allowed: Array<Pattern["momentum"]>,
) {
  assert.ok(pattern, `expected pattern to exist`);
  assert.ok(
    allowed.includes(pattern.momentum),
    `expected momentum in [${allowed.join(", ")}], got ${pattern.momentum}`,
  );
}

{
  const snapshot = buildPatternStateSnapshot({
    items: [
      memory("rd1", "skipped workout", 3, ["Health"]),
      memory("rd2", "skipped workout again", 2, ["Health"]),
      memory("rd3", "skipped gym today too", 1, ["Health"]),
    ],
    reference,
  });
  const pattern = patternOf(snapshot, "routine_drift");
  assert.ok(pattern);
  momentumIs(pattern, ["emerging", "growing"]);
  assert.ok(
    pattern.lifecycle === "candidate" || pattern.lifecycle === "active",
  );
  assert.notEqual(pattern.confidence.level, "high");
}

{
  const snapshot = buildPatternStateSnapshot({
    items: [
      memory("re1", "skipped workout again", 5, ["Health"]),
      memory("re2", "missed gym again", 4, ["Health"]),
      memory("re3", "skipped workout today", 2, ["Health"]),
      memory("re4", "still tired", 1, ["Health"]),
      memory("re5", "slept badly", 1, ["Health"]),
    ],
    reference,
  });
  const routine = patternOf(snapshot, "routine_drift");
  const health = patternOf(snapshot, "health_decline");
  const target = routine ?? health;
  assert.ok(target);
  momentumIs(target, ["growing", "escalating", "stable"]);
  assert.ok((target.strength ?? 0) >= 20);
  assert.ok((target.severityScore ?? 0) > 0);
}

{
  const snapshot = buildPatternStateSnapshot({
    items: [
      memory("rr1", "skipped workout again", 6, ["Health"]),
      memory("rr2", "missed gym again", 5, ["Health"]),
      memory("rr3", "skipped workout today", 4, ["Health"]),
      memory("rr4", "worked out today", 2, ["Health"]),
      memory("rr5", "worked out again", 1, ["Health"]),
    ],
    reference,
  });
  const routine = patternOf(snapshot, "routine_drift");
  const recovery = patternOf(snapshot, "recovery");
  assert.ok(routine || recovery);
  if (routine) {
    momentumIs(routine, ["recovering", "stable", "growing", "emerging"]);
    assert.notEqual(routine.lifecycle, "resolved");
  }
  if (recovery) {
    momentumIs(recovery, ["recovering", "emerging", "growing"]);
  }
}

{
  const snapshot = buildPatternStateSnapshot({
    items: [
      memory("fe1", "spent too much", 4, ["Finance"]),
      memory("fe2", "impulse purchase today", 3, ["Finance"]),
      memory("fe3", "rent is due friday", 2, ["Finance"]),
      memory("fe4", "might miss rent", 1, ["Finance"]),
    ],
    reference,
  });
  const pattern = patternOf(snapshot, "financial_pressure");
  assert.ok(pattern);
  momentumIs(pattern, ["escalating", "growing", "emerging"]);
  assert.ok(pattern.strength >= 20);
}

{
  const snapshot = buildPatternStateSnapshot({
    items: [
      memory("fr1", "spent too much this week", 5, ["Finance"]),
      memory("fr2", "overspending again", 4, ["Finance"]),
      memory("fr3", "rent is due monday", 3, ["Finance"]),
      memory("fr4", "paid rent", 2, ["Finance"]),
      memory("fr5", "spent less today", 1, ["Finance"]),
    ],
    reference,
  });
  const financial = patternOf(snapshot, "financial_pressure");
  assert.ok(financial);
  momentumIs(financial, ["recovering", "stable", "growing", "emerging"]);
  assert.notEqual(financial.lifecycle, "resolved");
  assert.ok((financial.recoveryScore ?? 0) > 0);
}

{
  const snapshot = buildPatternStateSnapshot({
    items: [
      memory("eg1", "i feel overwhelmed", 3),
      memory("eg2", "i feel anxious", 2),
      memory("eg3", "i feel stressed", 1),
    ],
    reference,
  });
  const pattern = patternOf(snapshot, "emotional_strain");
  assert.ok(pattern);
  momentumIs(pattern, ["growing", "emerging", "stable"]);
}

{
  const snapshot = buildPatternStateSnapshot({
    items: [
      memory("er1", "i feel overwhelmed", 4),
      memory("er2", "i feel anxious", 3),
      memory("er3", "i feel stressed", 2),
      memory("er4", "i feel better today", 1),
      memory("er5", "went for a walk", 1),
    ],
    reference,
  });
  const emotional = patternOf(snapshot, "emotional_strain");
  const recovery = patternOf(snapshot, "recovery");
  assert.ok(emotional || recovery);
  if (emotional) {
    momentumIs(emotional, ["recovering", "stable", "growing", "emerging"]);
  }
  if (recovery) {
    momentumIs(recovery, ["recovering", "emerging", "growing"]);
  }
}

{
  const snapshot = buildPatternStateSnapshot({
    items: [
      memory("lv1", "drank coffee", 1),
      memory("lv2", "drank coffee again", 2),
      memory("lv3", "coffee again", 3),
    ],
    reference,
  });
  assert.equal(snapshot.patterns.length, 0);
}

{
  const recent = buildPatternStateSnapshot({
    items: [
      memory("dec-r1", "i feel stressed", 1),
      memory("dec-r2", "i feel anxious", 2),
      memory("dec-r3", "i feel overwhelmed", 3),
    ],
    reference,
  });
  const stale = buildPatternStateSnapshot({
    items: [
      memory("dec-s1", "i feel stressed", 40),
      memory("dec-s2", "i feel anxious", 45),
      memory("dec-s3", "i feel overwhelmed", 50),
    ],
    reference,
  });
  const recentPattern = patternOf(recent, "emotional_strain");
  const stalePattern = patternOf(stale, "emotional_strain");
  assert.ok(recentPattern);
  assert.ok(stalePattern);
  assert.ok((recentPattern.recencyScore ?? 0) > (stalePattern.recencyScore ?? 0));
  assert.ok(recentPattern.strength >= stalePattern.strength);
}

{
  const items = [
    memory("det1", "skipped workout", 3, ["Health"]),
    memory("det2", "skipped workout again", 2, ["Health"]),
    memory("det3", "skipped gym today too", 1, ["Health"]),
  ];
  const first = buildPatternStateSnapshot({ items, reference });
  const second = buildPatternStateSnapshot({ items, reference });
  assert.deepEqual(
    first.patterns.map((pattern) => ({
      type: pattern.type,
      momentum: pattern.momentum,
      lifecycle: pattern.lifecycle,
      strength: pattern.strength,
      confidence: pattern.confidence,
      momentumScore: pattern.momentumScore,
      recoveryScore: pattern.recoveryScore,
      severityScore: pattern.severityScore,
      recencyScore: pattern.recencyScore,
      evidenceCount: pattern.evidenceCount,
    })),
    second.patterns.map((pattern) => ({
      type: pattern.type,
      momentum: pattern.momentum,
      lifecycle: pattern.lifecycle,
      strength: pattern.strength,
      confidence: pattern.confidence,
      momentumScore: pattern.momentumScore,
      recoveryScore: pattern.recoveryScore,
      severityScore: pattern.severityScore,
      recencyScore: pattern.recencyScore,
      evidenceCount: pattern.evidenceCount,
    })),
  );
}

console.log("pattern-intelligence-momentum tests passed");
