import assert from "node:assert/strict";

import {
  classifySettlementClaim,
  isUnverifiedSettlementClaim,
} from "@/lib/intelligence/settlement-claim";
import { decideTodayPriorities } from "@/lib/intelligence/decision-engine";
import { applyCaptureInput } from "@/lib/sync-capture/apply-capture-input";
import { processSyncMessage } from "@/lib/sync-engine";
import { memoryFromSyncEngineResult } from "@/lib/sync-engine/tools/lab-state";
import { captureFromBriefInput, attemptBriefCapture } from "@/lib/mobile-prototype/capture-brief-input";
import { buildDailyBrief } from "@/lib/mobile-prototype/build-daily-brief";
import { buildSyncTimeBlocksForRange } from "@/lib/sync-time-blocks";
import { createTestCaptureStore } from "@/tests/test-capture-handlers";

const reference = new Date("2026-06-10T18:00:00");

function addDays(date: Date, amount: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + amount);
  return next;
}

{
  const income = classifySettlementClaim("I get paid Friday");
  assert.equal(income.detected, false);

  const userPaid = classifySettlementClaim("I paid rent.");
  assert.equal(userPaid.detected, true);
  assert.equal(userPaid.actor, "user");
  assert.equal(userPaid.verification, "self_reported");
  assert.equal(userPaid.obligationKey, "rent");

  const assistant = classifySettlementClaim("my assistant paid the rent");
  assert.equal(assistant.verification, "unverified");
  assert.equal(isUnverifiedSettlementClaim("ChatGPT paid the electric bill"), true);
  assert.equal(isUnverifiedSettlementClaim("Rent is due Friday."), false);
}

{
  const result = processSyncMessage({
    text: "my assistant paid the rent",
    reference,
    engineMode: "dryRun",
  });
  assert.equal(result.debug.memoryDecision, "ask_follow_up");
  assert.equal(result.debug.wouldCreateMemory, false);
  assert.equal(result.vagueInput.detected, true);
  assert.match(result.response, /rent actually go through/i);
}

{
  const result = processSyncMessage({
    text: "ChatGPT paid the electric bill",
    reference,
    engineMode: "dryRun",
  });
  assert.equal(result.debug.memoryDecision, "ask_follow_up");
  assert.equal(result.debug.remembered, false);
  assert.match(result.response, /electric bill actually go through/i);
}

{
  const rent = processSyncMessage({
    text: "Rent is due Friday.",
    reference,
    engineMode: "dryRun",
  });
  const rentMemory = memoryFromSyncEngineResult(rent, reference);
  assert.ok(rentMemory);

  const paid = processSyncMessage({
    text: "I paid rent.",
    reference,
    storedMemories: [rentMemory],
    engineMode: "dryRun",
  });
  assert.equal(paid.contradiction.detected, true);
  assert.equal(paid.contradiction.type, "money");
  assert.equal(paid.debug.memoryDecision, "update_existing");
  assert.equal(paid.debug.wouldCreateMemory, false);
  assert.equal(paid.correctionTarget.targetMemoryId, rentMemory.id);
  const surfacedAfterPayment = [
    paid.runtime.after.judgment.primary,
    ...paid.runtime.after.judgment.supporting,
    paid.runtime.after.brief.lede,
    ...paid.runtime.after.brief.lines,
  ].join(" ");
  assert.doesNotMatch(surfacedAfterPayment, /rent is due friday/i);
}

{
  const rent = processSyncMessage({
    text: "Rent is due Friday.",
    reference,
    engineMode: "dryRun",
  });
  const rentMemory = memoryFromSyncEngineResult(rent, reference);
  assert.ok(rentMemory);

  const assistant = processSyncMessage({
    text: "my assistant paid the rent",
    reference,
    storedMemories: [rentMemory],
    engineMode: "dryRun",
  });
  assert.equal(assistant.debug.memoryDecision, "ask_follow_up");
  assert.equal(assistant.debug.wouldCreateMemory, false);
  assert.equal(assistant.debug.wouldUpdateExistingMemory, false);
  assert.match(assistant.runtime.after.judgment.primary, /rent is due friday/i);
}

{
  const store = createTestCaptureStore();
  const ctx = { items: store.items, reference };
  const attempt = applyCaptureInput(
    "my assistant paid the rent",
    ctx,
    store.handlers,
  );
  assert.equal(attempt.status, "needs_clarification");
  assert.equal(store.items.length, 0);
}

{
  const store = createTestCaptureStore();
  const ctx = { items: store.items, reference };
  captureFromBriefInput("rent due friday", ctx, store.handlers);
  const paid = applyCaptureInput("I paid rent.", ctx, store.handlers);
  assert.equal(paid.status, "saved");
  if (paid.status === "saved") {
    assert.equal(paid.kind, "edit");
  }
  assert.equal(store.items.length, 1);
  assert.match(store.items[0].prompt, /i paid rent/i);
  assert.equal(store.items[0].destinations.includes("Calendar"), false);
  assert.doesNotMatch(store.items[0].understanding ?? "", /rent is due/i);
  assert.match(store.items[0].understanding ?? "", /paid|payment/i);
  const brief = buildDailyBrief({ items: store.items, reference });
  const dueLines = (brief.consequences ?? [])
    .filter((consequence) => consequence.kind === "financial_due")
    .map((consequence) => consequence.surfaceText);
  assert.equal(dueLines.length, 0);
}

{
  const store = createTestCaptureStore();
  const ctx = { items: store.items, reference };
  captureFromBriefInput("rent due friday", ctx, store.handlers);
  captureFromBriefInput("worried about money", ctx, store.handlers);
  const blocked = attemptBriefCapture(
    "my assistant paid the rent",
    ctx,
    store.handlers,
  );
  assert.equal(blocked.status, "needs_clarification");

  const brief = buildDailyBrief({ items: store.items, reference });
  const blocks = buildSyncTimeBlocksForRange({
    items: store.items,
    startDate: reference,
    endDate: addDays(reference, 14),
    reference,
  });
  const decision = decideTodayPriorities({
    consequences: brief.consequences ?? [],
    items: store.items,
    blocks,
    reference,
    hasUserContext: true,
  });
  assert.match(decision.primary.text, /rent is due friday/i);
  assert.ok(!/paid the rent/i.test(decision.primary.text));
}

console.log("settlement-claim tests passed");
