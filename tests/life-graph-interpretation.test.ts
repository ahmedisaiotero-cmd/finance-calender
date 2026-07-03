import assert from "node:assert/strict";

import {
  buildLifeGraphSnapshot,
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

function buildInterpretations(texts: string[]) {
  const snapshot = buildSnapshotFromTexts(texts);
  const signals = deriveContinuitySignals(snapshot);
  const resolutions = resolveContinuity(snapshot, signals);
  const interpretations = deriveInterpretations(snapshot, signals, resolutions);
  return { snapshot, signals, resolutions, interpretations };
}

function includesText(
  interpretations: ReturnType<typeof buildInterpretations>["interpretations"],
  pattern: RegExp,
) {
  return interpretations.some(
    (item) =>
      pattern.test(item.factualUnderstanding) || pattern.test(item.interpretation),
  );
}

{
  const { snapshot, interpretations } = buildInterpretations([
    "I worked on Sync from 8pm to 10pm",
  ]);

  assert.ok(includesText(interpretations, /worked on sync/i));
  assert.ok(includesText(interpretations, /active project/i));
  assert.ok(
    interpretations.some(
      (item) =>
        /worked on sync/i.test(item.factualUnderstanding) &&
        (item.confidence === "low" || item.confidence === "medium"),
    ),
  );
  assert.deepEqual(snapshot.beliefs, []);
}

{
  const { interpretations } = buildInterpretations(["Payday is Friday"]);
  const payday = interpretations.find((item) =>
    /payday/i.test(item.factualUnderstanding),
  );

  assert.ok(payday);
  assert.match(payday.interpretation, /money timing/i);
  assert.ok(
    payday.caveats.some((caveat) => /linked bill|rent evidence/i.test(caveat)),
  );
}

{
  const { interpretations } = buildInterpretations(["Mom's birthday is tomorrow"]);
  const birthday = interpretations.find((item) =>
    /birthday/i.test(item.factualUnderstanding),
  );

  assert.ok(birthday);
  assert.match(birthday.interpretation, /family timing|near-term family/i);
  assert.equal(
    /irresponsible|discipline|obsessed|bad with money/i.test(
      birthday.interpretation,
    ),
    false,
  );
}

{
  const { resolutions, interpretations } = buildInterpretations([
    "I keep delaying cancelling Uber",
  ]);

  assert.ok(resolutions.some((resolution) => resolution.status === "stalled"));
  assert.ok(includesText(interpretations, /unresolved loop|stalled/i));
}

{
  const { resolutions, interpretations } = buildInterpretations([
    "I finally cancelled Uber",
  ]);

  assert.ok(resolutions.some((resolution) => resolution.status === "completed"));
  assert.ok(includesText(interpretations, /completed|close/i));
  assert.ok(includesText(interpretations, /does not imply further reminders/i));
}

{
  const { resolutions, interpretations } = buildInterpretations([
    "I am done with the vending idea",
  ]);

  assert.ok(
    resolutions.some(
      (resolution) =>
        resolution.status === "archived" ||
        resolution.status === "historical_context",
    ),
  );
  assert.ok(includesText(interpretations, /vending idea is done/i));
  assert.ok(includesText(interpretations, /archived|historical context/i));
}

{
  const { interpretations } = buildInterpretations(["I want to buy a Mustang"]);
  const mustang = interpretations.find((item) =>
    /mustang/i.test(item.factualUnderstanding),
  );

  assert.ok(mustang);
  assert.ok(/stated car-related goal|stated goal/i.test(mustang.interpretation));
  assert.ok(
    mustang.caveats.some((caveat) =>
      /not enough evidence.*recommendation/i.test(caveat),
    ),
  );
}

{
  const { interpretations } = buildInterpretations(["I spent less this month"]);
  const spending = interpretations.find((item) =>
    /spent less/i.test(item.factualUnderstanding),
  );

  assert.ok(spending);
  assert.ok(/improvement/i.test(spending.interpretation));
  assert.ok(
    spending.caveats.some((caveat) => /not enough to claim.*trend/i.test(caveat)),
  );
}

{
  const { interpretations } = buildInterpretations(["I ate lunch"]);
  assert.equal(interpretations.length, 0);
}

{
  const { snapshot, signals, resolutions, interpretations } = buildInterpretations([
    "I keep delaying cancelling Uber",
    "Payday is Friday",
  ]);
  const first = deriveInterpretations(snapshot, signals, resolutions);
  const second = deriveInterpretations(snapshot, signals, resolutions);

  assert.deepEqual(first, second, "interpretation output should be deterministic");
  assert.deepEqual(snapshot.beliefs, []);
  assert.deepEqual(snapshot.continuityResolutions, []);
  assert.ok(interpretations.length > 0);
}

{
  const snapshot = buildSnapshotFromTexts([
    "Payday is Friday",
    "I keep delaying cancelling Uber",
  ]);
  const reasoning = runReasoningEngine(snapshot);

  assert.ok(reasoning.continuitySignals.length > 0);
  assert.ok(reasoning.continuityResolutions.length > 0);
  assert.ok(reasoning.interpretations.length > 0);
}

console.log("life-graph interpretation tests passed");
