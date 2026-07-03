import assert from "node:assert/strict";

import {
  buildLifeGraphSnapshot,
  deriveBeliefs,
  deriveContinuitySignals,
  deriveInterpretations,
  normalizeCapturedItems,
  resolveContinuity,
  runReasoningEngine,
} from "@/lib/intelligence/life-graph";
import { captureFromBriefInput } from "@/lib/mobile-prototype/capture-brief-input";
import { createTestCaptureStore } from "@/tests/test-capture-handlers";

const reference = new Date("2026-06-14T18:00:00.000Z");
const referenceDate = "2026-06-14";
const generatedAt = "2026-06-14T18:00:00.000Z";

function buildSnapshotFromTexts(texts: string[]) {
  const store = createTestCaptureStore();

  for (const text of texts) {
    const result = captureFromBriefInput(
      text,
      { items: store.items, reference },
      store.handlers,
    );
    assert.ok(result, `expected capture to succeed for: ${text}`);
  }

  return buildLifeGraphSnapshot({
    normalizations: normalizeCapturedItems(store.items),
    referenceDate,
    generatedAt,
  });
}

function buildBeliefs(texts: string[]) {
  const snapshot = buildSnapshotFromTexts(texts);
  const signals = deriveContinuitySignals(snapshot);
  const resolutions = resolveContinuity(snapshot, signals);
  const interpretations = deriveInterpretations(snapshot, signals, resolutions);
  const beliefs = deriveBeliefs(snapshot, signals, resolutions, interpretations);

  return { snapshot, signals, resolutions, interpretations, beliefs };
}

function statementIncludes(
  beliefs: ReturnType<typeof buildBeliefs>["beliefs"],
  pattern: RegExp,
) {
  return beliefs.find((belief) => pattern.test(belief.statement));
}

{
  const { beliefs } = buildBeliefs([
    "I worked on Sync from 8pm to 10pm",
    "I made progress on Sync",
  ]);
  const syncBelief = statementIncludes(beliefs, /sync appears to be an active project/i);

  assert.ok(syncBelief);
  assert.ok(syncBelief.domain === "work" || syncBelief.domain === "goals");
  assert.ok(syncBelief.status === "active" || syncBelief.status === "candidate");
  assert.ok(syncBelief.trend === "strengthening" || syncBelief.trend === "stable");
}

{
  const { beliefs } = buildBeliefs(["Payday is Friday", "I spent less this month"]);
  const moneyBelief = statementIncludes(beliefs, /money has been a recurring area/i);

  assert.ok(moneyBelief);
  assert.equal(moneyBelief.domain, "money");
  assert.equal(moneyBelief.confidence, "medium");
}

{
  const { beliefs } = buildBeliefs([
    "I want to buy a Mustang",
    "Still thinking about getting a Mustang",
  ]);
  const mustangBelief = statementIncludes(beliefs, /mustang goal has resurfaced/i);

  assert.ok(mustangBelief);
  assert.ok(mustangBelief.domain === "goals" || mustangBelief.domain === "personal");
  assert.ok(
    mustangBelief.trend === "strengthening" || mustangBelief.trend === "stable",
  );
}

{
  const { beliefs } = buildBeliefs([
    "I want to buy a Mustang",
    "Still thinking about getting a Mustang",
    "I changed my mind about buying a Mustang",
  ]);
  const mustangBelief = statementIncludes(beliefs, /mustang goal has resurfaced/i);

  assert.ok(mustangBelief);
  assert.ok(
    mustangBelief.trend === "weakening" || mustangBelief.status === "retired",
  );
  assert.ok(mustangBelief.contradictedByNodeIds.length > 0);
}

{
  const { beliefs } = buildBeliefs([
    "I keep delaying cancelling Uber",
    "I still need to cancel Uber",
  ]);
  const uberBelief = statementIncludes(beliefs, /uber cancellation has been an unresolved loop/i);

  assert.ok(uberBelief);
  assert.equal(uberBelief.status, "watching");
  assert.ok(uberBelief.domain === "money" || uberBelief.domain === "routine");
}

{
  const { beliefs } = buildBeliefs([
    "I keep delaying cancelling Uber",
    "I finally cancelled Uber",
  ]);
  const uberBelief = statementIncludes(beliefs, /uber cancellation has been an unresolved loop/i);

  assert.ok(uberBelief);
  assert.equal(uberBelief.status, "retired");
}

{
  const { beliefs } = buildBeliefs([
    "I thought about the vending business again",
    "I am done with the vending idea",
  ]);
  const vendingBelief = statementIncludes(beliefs, /vending idea appears archived/i);

  assert.ok(vendingBelief);
  assert.ok(
    vendingBelief.status === "retired" || vendingBelief.status === "active",
  );
  assert.equal(
    beliefs.some(
      (belief) =>
        /vending/i.test(belief.statement) && belief.status === "active",
    ),
    false,
  );
}

{
  const { beliefs } = buildBeliefs(["I want all subscriptions on my Amex"]);
  const amexBelief = statementIncludes(
    beliefs,
    /subscriptions.*organized through amex/i,
  );

  assert.ok(amexBelief);
  assert.equal(amexBelief.domain, "money");
  assert.equal(amexBelief.confidence, "medium");
}

{
  const { beliefs } = buildBeliefs(["I ate lunch"]);
  assert.equal(beliefs.length, 0);
}

{
  const { beliefs } = buildBeliefs(["I overspent again"]);
  assert.equal(
    beliefs.some((belief) =>
      /bad with money|lacks discipline|obsessed|unreliable|emotional/i.test(
        belief.statement,
      ),
    ),
    false,
  );
}

{
  const data = buildBeliefs(["Payday is Friday", "I spent less this month"]);
  const first = deriveBeliefs(
    data.snapshot,
    data.signals,
    data.resolutions,
    data.interpretations,
  );
  const second = deriveBeliefs(
    data.snapshot,
    data.signals,
    data.resolutions,
    data.interpretations,
  );

  assert.deepEqual(first, second, "belief output should be deterministic");
  assert.deepEqual(data.snapshot.beliefs, []);
  assert.deepEqual(data.snapshot.continuitySignals, []);
  assert.deepEqual(data.snapshot.continuityResolutions, []);
  assert.deepEqual(data.snapshot.interpretations, []);
}

{
  const snapshot = buildSnapshotFromTexts([
    "Payday is Friday",
    "I spent less this month",
    "I keep delaying cancelling Uber",
  ]);
  const reasoning = runReasoningEngine(snapshot);

  assert.ok(reasoning.continuitySignals.length > 0);
  assert.ok(reasoning.continuityResolutions.length > 0);
  assert.ok(reasoning.interpretations.length > 0);
  assert.ok(reasoning.beliefs.length > 0);
}

console.log("life-graph beliefs tests passed");
