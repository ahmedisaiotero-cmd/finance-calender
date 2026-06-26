import assert from "node:assert/strict";

import type {
  DecisionCandidate,
  DecisionScoreBreakdown,
  TodayDecision,
} from "@/lib/intelligence/decision-engine";
import { runSyncEngine } from "@/lib/intelligence/sync-engine";
import type { SyncConsequence } from "@/lib/intelligence/sync-consequences";

function breakdown(
  overrides: Partial<DecisionScoreBreakdown> = {},
): DecisionScoreBreakdown {
  return {
    base: 100,
    todayBoost: 0,
    tomorrowBoost: 0,
    timeProximity: 0,
    profilePriority: 0,
    specificity: 0,
    penalty: 0,
    ...overrides,
  };
}

function consequence(
  overrides: Partial<SyncConsequence> = {},
): SyncConsequence {
  return {
    id: "consequence-1",
    sourceMemoryId: "memory-1",
    kind: "event",
    surfaceText: "Workout starts at 6.",
    daysUntil: 0,
    dateKey: "2026-06-26",
    priority: 5,
    horizon: "coming_soon",
    area: "Health",
    briefEligible: true,
    sortMinutes: 18 * 60,
    ...overrides,
  };
}

function candidate(
  overrides: Partial<DecisionCandidate> = {},
): DecisionCandidate {
  const scoreBreakdown = overrides.scoreBreakdown ?? breakdown();
  const score = Object.values(scoreBreakdown).reduce((sum, value) => sum + value, 0);

  return {
    text: "Workout starts at 6.",
    score,
    consequence: consequence(),
    source: "today_timed",
    area: "Health",
    daysUntil: 0,
    dateKey: "2026-06-26",
    sortMinutes: 18 * 60,
    isSpecific: true,
    isContext: false,
    scoreBreakdown,
    ...overrides,
  };
}

function decision(
  overrides: Partial<TodayDecision> = {},
): TodayDecision {
  const primary =
    overrides.primary ??
    candidate({
      text: "Workout starts at 6.",
      scoreBreakdown: breakdown({ base: 300 }),
    });
  const supporting =
    overrides.supporting ??
    [
      candidate({
        text: "Payday arrives tomorrow.",
        source: "consequence",
        area: "finance",
        daysUntil: 1,
        dateKey: "2026-06-27",
        sortMinutes: null,
        consequence: consequence({
          id: "payday",
          kind: "income",
          surfaceText: "Payday arrives tomorrow.",
          daysUntil: 1,
          dateKey: "2026-06-27",
          area: "finance",
          sortMinutes: undefined,
        }),
        scoreBreakdown: breakdown({ base: 200, tomorrowBoost: 20 }),
      }),
      candidate({
        text: "Rent follows Friday.",
        source: "consequence",
        area: "finance",
        daysUntil: 3,
        dateKey: "2026-06-29",
        sortMinutes: null,
        consequence: consequence({
          id: "rent",
          kind: "financial_due",
          surfaceText: "Rent follows Friday.",
          daysUntil: 3,
          dateKey: "2026-06-29",
          area: "finance",
          sortMinutes: undefined,
        }),
        scoreBreakdown: breakdown({ base: 190 }),
      }),
    ];

  return {
    primary,
    supporting,
    rankedCandidates: [primary, ...supporting],
    isEmpty: false,
    isQuiet: false,
    ...overrides,
  };
}

{
  const input = decision();
  const output = runSyncEngine({ decision: input });

  assert.equal(output.primary.text, input.primary.text);
  assert.deepEqual(
    output.supporting.map((line) => line.text),
    input.supporting.map((line) => line.text),
  );
}

{
  const input = decision();
  const output = runSyncEngine({ decision: input });

  assert.deepEqual(
    output.rankedLines.map((line) => line.text),
    input.rankedCandidates.map((line) => line.text),
  );
  assert.equal(output.quality.preservesDecisionOrdering, true);
  assert.equal(output.quality.preservesVisibleCopy, true);
}

{
  const output = runSyncEngine({ decision: decision() });
  const allLines = [output.primary, ...output.supporting, ...output.rankedLines];

  for (const line of allLines) {
    assert.ok(line.intent);
    assert.ok(line.confidence);
    assert.ok(line.reasons.length > 0, `expected reasons for ${line.text}`);
    assert.ok(line.evidence.length > 0, `expected evidence for ${line.text}`);
    assert.equal(line.quality.hasIntent, true);
    assert.equal(line.quality.hasConfidence, true);
    assert.equal(line.quality.hasReason, true);
    assert.equal(line.quality.hasEvidence, true);
    assert.equal(line.quality.preservesVisibleText, true);
  }
}

{
  const output = runSyncEngine({
    decision: decision({
      primary: candidate({
        text: "Workout starts at 6.",
        source: "today_timed",
        daysUntil: 0,
        dateKey: "2026-06-26",
        sortMinutes: 18 * 60,
      }),
      supporting: [],
      rankedCandidates: [],
    }),
  });

  assert.equal(output.primary.confidence, "high");
  assert.ok(output.primary.reasons.includes("today"));
  assert.ok(output.primary.reasons.includes("time_sensitive"));
}

{
  const tomorrow = candidate({
    text: "Tomorrow starts early.",
    source: "tomorrow_summary",
    consequence: null,
    area: undefined,
    daysUntil: 1,
    dateKey: "2026-06-27",
    sortMinutes: null,
    isSpecific: false,
    scoreBreakdown: breakdown({ base: 400 }),
  });
  const output = runSyncEngine({
    decision: decision({
      primary: tomorrow,
      supporting: [],
      rankedCandidates: [tomorrow],
    }),
  });

  assert.equal(output.primary.intent, "prepare");
  assert.ok(
    output.primary.reasons.includes("life_load") ||
      output.primary.reasons.includes("tomorrow"),
  );
}

{
  const context = candidate({
    text: "Money has been showing up more this week.",
    source: "life_context",
    consequence: null,
    area: "finance",
    daysUntil: null,
    dateKey: null,
    sortMinutes: null,
    isSpecific: false,
    isContext: true,
  });
  const output = runSyncEngine({
    decision: decision({
      primary: context,
      supporting: [],
      rankedCandidates: [context],
    }),
  });

  assert.equal(output.primary.intent, "reflect");
  assert.ok(output.primary.reasons.includes("context"));
  assert.ok(output.primary.reasons.includes("pattern"));
}

{
  const boosted = candidate({
    text: "Take daughter to school tomorrow.",
    source: "consequence",
    area: "family",
    daysUntil: 1,
    dateKey: "2026-06-27",
    sortMinutes: null,
    scoreBreakdown: breakdown({ base: 200, profilePriority: 30 }),
  });
  const output = runSyncEngine({
    decision: decision({
      primary: boosted,
      supporting: [],
      rankedCandidates: [boosted],
    }),
  });

  assert.ok(output.primary.reasons.includes("profile_priority"));
  assert.ok(
    output.primary.evidence.some(
      (item) => item.label === "Profile priority boost" && item.value === 30,
    ),
  );
}

{
  const emptyCandidate = candidate({
    text: "",
    score: 0,
    consequence: null,
    source: "empty",
    area: undefined,
    daysUntil: undefined,
    dateKey: undefined,
    sortMinutes: undefined,
    isSpecific: false,
    isContext: false,
    scoreBreakdown: breakdown({ base: 0 }),
  });
  const output = runSyncEngine({
    decision: {
      primary: emptyCandidate,
      supporting: [],
      rankedCandidates: [],
      isEmpty: true,
      isQuiet: false,
    },
  });

  assert.equal(output.isEmpty, true);
  assert.equal(output.primary.text, "");
  assert.equal(output.arc, null);
  assert.ok(output.primary.reasons.includes("empty"));
  assert.equal(output.primary.quality.preservesVisibleText, true);
}

{
  const quietCandidate = candidate({
    text: "Today is quiet.",
    score: 0,
    consequence: null,
    source: "quiet",
    area: undefined,
    daysUntil: undefined,
    dateKey: undefined,
    sortMinutes: undefined,
    isSpecific: false,
    isContext: false,
    scoreBreakdown: breakdown({ base: 0 }),
  });
  const output = runSyncEngine({
    decision: {
      primary: quietCandidate,
      supporting: [],
      rankedCandidates: [],
      isEmpty: false,
      isQuiet: true,
    },
  });

  assert.equal(output.isQuiet, true);
  assert.equal(output.primary.text, "Today is quiet.");
  assert.equal(output.arc?.theme, "quiet");
  assert.ok(output.primary.reasons.includes("quiet"));
}

{
  const controlling = candidate({
    text: "You need to call Mom.",
    source: "consequence",
    area: "relationships",
    daysUntil: 0,
    dateKey: "2026-06-26",
  });
  const output = runSyncEngine({
    decision: decision({
      primary: controlling,
      supporting: [],
      rankedCandidates: [controlling],
    }),
  });

  assert.equal(output.primary.text, "You need to call Mom.");
  assert.equal(output.primary.quality.forbiddenPhraseFound, true);
  assert.ok(output.quality.warnings.includes("forbidden_phrase_found"));
}

{
  const lowerScore = candidate({
    text: "First decision line.",
    scoreBreakdown: breakdown({ base: 10 }),
  });
  const higherScore = candidate({
    text: "Second decision line.",
    scoreBreakdown: breakdown({ base: 999 }),
  });
  const input: TodayDecision = {
    primary: lowerScore,
    supporting: [higherScore],
    rankedCandidates: [lowerScore, higherScore],
    isEmpty: false,
    isQuiet: false,
  };
  const output = runSyncEngine({ decision: input });

  assert.deepEqual(
    output.rankedLines.map((line) => line.text),
    ["First decision line.", "Second decision line."],
  );
  assert.equal(output.quality.preservesDecisionOrdering, true);
}

console.log("sync-engine tests passed");
