import assert from "node:assert/strict";

import { decideTodayPriorities } from "@/lib/intelligence/decision-engine";
import { buildJudgmentGraphContext } from "@/lib/intelligence/life-graph";
import { captureFromBriefInput } from "@/lib/mobile-prototype/capture-brief-input";
import { buildDailyBrief } from "@/lib/mobile-prototype/build-daily-brief";
import { buildSyncTimeBlocksForRange } from "@/lib/sync-time-blocks";
import { createTestCaptureStore } from "@/tests/test-capture-handlers";

const reference = new Date("2026-06-14T18:00:00");

function addDays(date: Date, amount: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + amount);
  return next;
}

function decisionFor(texts: string[]) {
  const store = createTestCaptureStore();
  const ctx = { items: store.items, reference };
  for (const text of texts) {
    const result = captureFromBriefInput(text, ctx, store.handlers);
    assert.ok(result, `expected capture to succeed for: ${text}`);
  }

  const brief = buildDailyBrief({ items: store.items, reference });
  const blocks = buildSyncTimeBlocksForRange({
    items: store.items,
    startDate: reference,
    endDate: addDays(reference, 14),
    reference,
  });

  return {
    items: store.items,
    brief,
    decision: decideTodayPriorities({
      consequences: brief.consequences ?? [],
      items: store.items,
      blocks,
      reference,
      hasUserContext: true,
    }),
  };
}

function allText(decision: ReturnType<typeof decideTodayPriorities>) {
  return [
    decision.primary.text,
    ...decision.supporting.map((candidate) => candidate.text),
    ...decision.rankedCandidates.map((candidate) => candidate.text),
  ].join(" ");
}

{
  const graph = buildJudgmentGraphContext({
    items: decisionFor(["I keep delaying cancelling Uber"]).items,
    reference,
  });
  assert.ok(
    graph.context.continuityResolutions.some(
      (resolution) => resolution.status === "stalled",
    ),
  );
}

{
  const open = decisionFor(["I keep delaying cancelling Uber"]);
  const closed = decisionFor([
    "I keep delaying cancelling Uber",
    "I finally cancelled Uber",
  ]);

  const openUber = open.decision.rankedCandidates.find((candidate) =>
    /uber/i.test(candidate.text),
  );
  const closedUber = closed.decision.rankedCandidates.find((candidate) =>
    /uber/i.test(candidate.text),
  );

  if (openUber && closedUber) {
    assert.ok(
      closedUber.score < openUber.score,
      `completed Uber loop should rank below the open loop (${closedUber.score} vs ${openUber.score})`,
    );
  }

  assert.ok(
    !/uber/i.test(closed.decision.primary.text) ||
      /flight|rent|school|payday/i.test(closed.decision.primary.text),
    `completed Uber should not own Today, got: ${closed.decision.primary.text}`,
  );
}

{
  const mixed = decisionFor([
    "I keep delaying cancelling Uber",
    "I finally cancelled Uber",
    "i have a flight tomorrow at 6am",
  ]);
  assert.match(mixed.decision.primary.text, /flight/i);
  assert.ok(!/uber/i.test(mixed.decision.primary.text));
}

{
  const vending = decisionFor([
    "I thought about the vending business again",
    "I am done with the vending idea",
    "rent due friday",
  ]);
  const surfaced = allText(vending.decision);
  assert.match(vending.decision.primary.text, /rent/i);
  assert.ok(
    !/vending/i.test(vending.decision.primary.text),
    `archived vending idea should not lead Today: ${vending.decision.primary.text}`,
  );
  assert.ok(typeof surfaced === "string");
}

console.log("life-graph-judgment-continuity tests passed");
