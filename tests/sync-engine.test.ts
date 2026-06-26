import assert from "node:assert/strict";

import type {
  DecisionCandidate,
  DecisionScoreBreakdown,
  TodayDecision,
} from "@/lib/intelligence/decision-engine";
import {
  runSyncEngine,
  type SyncEngineOutput,
  type SyncEngineLine,
  type SyncSurfacingReason,
} from "@/lib/intelligence/sync-engine";
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

function assertExplanation(line: SyncEngineLine) {
  assert.ok(line.explanation.isExplainable);
  assert.ok(line.explanation.headline);
  assert.equal(line.explanation.confidence, line.confidence);
  assert.deepEqual(
    line.explanation.details.map((detail) => detail.reason),
    line.reasons,
  );
  assert.deepEqual(line.explanation.evidence, line.evidence);
}

function explanationDetail(
  line: SyncEngineLine,
  reason: SyncSurfacingReason,
) {
  return line.explanation.details.find((detail) => detail.reason === reason);
}

function signal(
  output: SyncEngineOutput,
  kind: SyncEngineOutput["continuity"]["signals"][number]["kind"],
) {
  return output.continuity.signals.find((item) => item.kind === kind);
}

{
  const input = decision();
  const output = runSyncEngine({ decision: input });

  assert.equal(output.primary.text, input.primary.text);
  assert.ok(output.continuity);
  assert.equal(output.continuity.window.days, 7);
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
  const repeated = signal(output, "repeated_area");
  const dominant = signal(output, "dominant_weekly_theme");

  assert.equal(repeated?.area, "finance");
  assert.ok((repeated?.count ?? 0) >= 2);
  assert.equal(dominant?.area, "finance");
  assert.equal(output.continuity.dominantTheme?.theme, "money");
}

{
  const output = runSyncEngine({ decision: decision() });
  const allLines = [output.primary, ...output.supporting, ...output.rankedLines];

  for (const line of allLines) {
    assert.ok(line.intent);
    assert.ok(line.confidence);
    assert.ok(line.reasons.length > 0, `expected reasons for ${line.text}`);
    assert.ok(line.evidence.length > 0, `expected evidence for ${line.text}`);
    assertExplanation(line);
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
  assert.equal(output.primary.explanation.headline, "This has a specific time.");
  assert.equal(
    explanationDetail(output.primary, "today")?.summary,
    "This is happening today.",
  );
  assert.ok(
    explanationDetail(output.primary, "today")?.evidence.some(
      (item) => item.type === "timing" && item.label === "Days until",
    ),
  );
  assert.equal(
    explanationDetail(output.primary, "time_sensitive")?.summary,
    "This has a specific time.",
  );
  assert.ok(
    explanationDetail(output.primary, "time_sensitive")?.evidence.some(
      (item) => item.type === "timing" && item.label === "Sort minutes",
    ),
  );
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
  assert.equal(output.primary.explanation.confidence, output.primary.confidence);
  assert.ok(
    explanationDetail(output.primary, "tomorrow") ||
      explanationDetail(output.primary, "life_load"),
  );
  assert.ok(
    output.primary.explanation.details.some((detail) =>
      ["tomorrow", "life_load"].includes(detail.reason),
    ),
  );
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
  const quietOutput = runSyncEngine({
    decision: {
      primary: quietCandidate,
      supporting: [],
      rankedCandidates: [],
      isEmpty: false,
      isQuiet: true,
    },
  });
  const output = runSyncEngine({
    decision: {
      primary: quietCandidate,
      supporting: [],
      rankedCandidates: [],
      isEmpty: false,
      isQuiet: true,
    },
    recentOutputs: [quietOutput],
  });

  assert.equal(output.continuity.isQuietWeek, true);
  assert.equal(signal(output, "quiet_week")?.kind, "quiet_week");
}

{
  const tomorrowWork = candidate({
    text: "Work starts tomorrow at 11.",
    source: "consequence",
    area: "work",
    daysUntil: 1,
    dateKey: "2026-06-27",
    sortMinutes: 11 * 60,
    consequence: consequence({
      id: "work",
      kind: "work_start",
      surfaceText: "Work starts tomorrow at 11.",
      daysUntil: 1,
      dateKey: "2026-06-27",
      area: "work",
      sortMinutes: 11 * 60,
    }),
  });
  const base = decision();
  const output = runSyncEngine({
    decision: decision({
      supporting: [...base.supporting, tomorrowWork],
      rankedCandidates: [base.primary, ...base.supporting, tomorrowWork],
    }),
  });

  assert.equal(output.continuity.isBusyWeek, true);
  assert.equal(signal(output, "busy_week")?.kind, "busy_week");
}

{
  const recurring = candidate({
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
  });
  const recentOutput = runSyncEngine({
    decision: decision({
      primary: recurring,
      supporting: [],
      rankedCandidates: [recurring],
    }),
  });
  const newToday = candidate({
    text: "Workout starts at 6.",
    consequence: consequence({ id: "workout" }),
  });
  const output = runSyncEngine({
    decision: decision({
      primary: recurring,
      supporting: [newToday],
      rankedCandidates: [recurring, newToday],
    }),
    recentOutputs: [recentOutput],
  });

  assert.equal(signal(output, "recently_surfaced")?.kind, "recently_surfaced");
  assert.equal(signal(output, "new_today")?.kind, "new_today");
  assert.ok(
    output.continuity.recentlySurfaced.some(
      (line) => line.source.consequenceId === "payday",
    ),
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
  assert.equal(output.primary.confidence, "medium");
  assert.ok(output.primary.reasons.includes("context"));
  assert.ok(output.primary.reasons.includes("pattern"));
  assert.equal(
    explanationDetail(output.primary, "context")?.summary,
    "This adds useful context to today.",
  );
  assert.equal(
    explanationDetail(output.primary, "pattern")?.summary,
    "This appears to connect to a repeated pattern.",
  );
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
  assert.equal(
    explanationDetail(output.primary, "profile_priority")?.summary,
    "This matches a current profile priority.",
  );
  assert.ok(
    output.primary.evidence.some(
      (item) => item.label === "Profile priority boost" && item.value === 30,
    ),
  );
  assert.ok(
    explanationDetail(output.primary, "profile_priority")?.evidence.some(
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
  assert.equal(output.primary.explanation.isExplainable, true);
  assert.equal(
    explanationDetail(output.primary, "empty")?.summary,
    "Sync does not have enough context yet.",
  );
  assert.ok(
    !output.primary.explanation.evidence.some(
      (item) => item.type === "memory" || item.type === "consequence",
    ),
  );
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
  assert.equal(output.primary.explanation.isExplainable, true);
  assert.equal(
    explanationDetail(output.primary, "quiet")?.summary,
    "Sync did not find anything pressing.",
  );
  assert.equal(explanationDetail(output.primary, "quiet")?.tone, "gentle");
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
  assert.ok(output.primary.explanation.isExplainable);
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
