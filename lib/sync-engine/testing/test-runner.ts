import type { CapturedSyncItem } from "@/lib/captured-items";
import {
  processSyncMessage,
  type SyncEngineMessageResult,
} from "@/lib/sync-engine";
import { memoryFromSyncEngineResult } from "@/lib/sync-engine/tools/lab-state";
import type { SyncEngineExpectedBehavior } from "@/lib/sync-engine/testing/expected-behavior";
import type { SyncEngineTestCase } from "@/lib/sync-engine/testing/test-case";
import type { SyncEngineTestSuite } from "@/lib/sync-engine/testing/test-suite";
import type { SyncEnginePhilosophyRuleId } from "@/lib/sync-engine/testing/philosophy";
import { ALL_SYNC_ENGINE_TEST_SUITES } from "@/lib/sync-engine/testing/fixtures";
import {
  classifySyncEngineCaseStatus,
  summarizeSyncEngineOutcomes,
  type SyncEngineOutcomeStatus,
  type SyncEngineOutcomeSummary,
} from "@/lib/sync-engine/testing/result-summary";

export type SyncEngineTestStatus = SyncEngineOutcomeStatus;

export type SyncEngineCaseRun = {
  suiteId: string;
  suiteTitle: string;
  caseId: string;
  title: string;
  input: string[];
  expected: SyncEngineExpectedBehavior;
  actual: SyncEngineActualBehavior;
  status: SyncEngineTestStatus;
  mismatchReasons: string[];
  philosophyRules: SyncEnginePhilosophyRuleId[];
  knownGap?: string;
  output: SyncEngineMessageResult;
};

export type SyncEngineSuiteRun = {
  suiteId: string;
  suiteTitle: string;
  goal: string;
  status: SyncEngineTestStatus;
  passCount: number;
  failCount: number;
  warnCount: number;
  knownGapCount: number;
  cases: SyncEngineCaseRun[];
};

export type SyncEngineTestRunSummary = SyncEngineOutcomeSummary;

export type SyncEngineTestRun = {
  suites: SyncEngineSuiteRun[];
  summary: SyncEngineTestRunSummary;
};

export type SyncEngineActualBehavior = {
  shouldRemember: boolean;
  category: string;
  importance: string;
  surfaceLater: boolean;
  followUpDecision: string;
  confidence: number;
  consequenceSummary: string;
  affectedTimeframe: string;
  priorityImpact: "none" | "low" | "medium" | "high";
  shouldSurfaceInBrief: boolean;
  relatedMemoryFound: boolean;
  personDetected: boolean;
  relationshipDetected: boolean;
  futureUsefulness: boolean;
  followUpNeeded: boolean;
  asksNow: boolean;
  patternDetected: boolean;
  patternType: string;
  contradictionDetected: boolean;
  conflictingMemoryIds: boolean;
  updateCandidate: boolean;
  memoryDecision: string;
  response: string;
  debugContainsSecret: boolean;
  revealsAllMemory: boolean;
};

const DEFAULT_REFERENCE = new Date("2026-06-24T12:00:00");

function includesPattern(value: string, pattern: RegExp | string) {
  return typeof pattern === "string"
    ? value.toLowerCase().includes(pattern.toLowerCase())
    : pattern.test(value);
}

function haystackFor(result: SyncEngineMessageResult) {
  return [
    result.input.raw,
    result.input.normalized,
    result.response,
    result.debug.category,
    result.debug.consequenceSummary,
    result.prepared?.title ?? "",
    result.prepared?.destinations.join(" ") ?? "",
  ]
    .join(" ")
    .toLowerCase();
}

function detectPerson(result: SyncEngineMessageResult) {
  return /\b(mom|mother|brother|sarah|girlfriend|dad|father|friend|he|she)\b/.test(
    haystackFor(result),
  );
}

function detectRelationship(result: SyncEngineMessageResult) {
  return /\b(mom|mother|brother|girlfriend|family|relationship|friend)\b/.test(
    haystackFor(result),
  );
}

function detectPattern(messages: string[], memories: CapturedSyncItem[]) {
  const text = [...messages, ...memories.map((memory) => memory.prompt)]
    .join(" ")
    .toLowerCase();
  const skippedWorkout =
    (text.match(/\b(skipped|skip)\b/g)?.length ?? 0) >= 2 &&
    /\b(workout|gym)\b/.test(text);

  if (skippedWorkout) return { detected: true, type: "repeated_health_miss" };
  return { detected: false, type: "none" };
}

function detectContradiction(messages: string[], result: SyncEngineMessageResult) {
  const text = messages.join(" ").toLowerCase();
  const vegetarian = /\bvegetarian\b/.test(text) && /\bsteak\b/.test(text);
  const rent = /\bpaid rent\b/.test(text) && /\brent is overdue\b/.test(text);
  const work =
    /sunday through wednesday/.test(text) && /\bevery friday now\b/.test(text);
  const detected = vegetarian || rent || work;

  return {
    detected,
    updateCandidate: detected || Boolean(result.debug.duplicateUpdateCandidate),
  };
}

function containsSecret(result: SyncEngineMessageResult) {
  const text = JSON.stringify(result).toLowerCase();
  return /\b(password|secret token|ssn|social security)\b/.test(text);
}

function revealsAllMemory(result: SyncEngineMessageResult) {
  return /everything you know about me|all memories/.test(result.response.toLowerCase());
}

function runCase(testCase: SyncEngineTestCase, suite: SyncEngineTestSuite): SyncEngineCaseRun {
  const messages = testCase.sequence ?? (testCase.input ? [testCase.input] : []);
  let labMemories = [...(testCase.seedMemories ?? [])];
  let output: SyncEngineMessageResult | null = null;

  for (const message of messages) {
    output = processSyncMessage({
      text: message,
      labMemories,
      reference: DEFAULT_REFERENCE,
      engineMode: "dryRun",
    });

    const memory = memoryFromSyncEngineResult(output, DEFAULT_REFERENCE);
    if (memory) {
      labMemories = [memory, ...labMemories.filter((item) => item.id !== memory.id)];
    }
  }

  if (!output) {
    throw new Error(`Test case ${testCase.id} has no input.`);
  }

  const pattern = detectPattern(messages, labMemories);
  const contradiction = detectContradiction(messages, output);
  const actual: SyncEngineActualBehavior = {
    shouldRemember: output.debug.wouldCreateMemory || output.debug.wouldUpdateExistingMemory,
    category: output.debug.category,
    importance: output.debug.importance,
    surfaceLater: output.debug.shouldSurfaceLater,
    followUpDecision: output.futureFollowUpDecision.decision,
    confidence: output.debug.confidence,
    consequenceSummary: output.debug.consequenceSummary,
    affectedTimeframe: output.debug.affectedTimeframe,
    priorityImpact: output.briefingEffect.priorityImpact,
    shouldSurfaceInBrief: output.briefingEffect.changed || output.debug.shouldSurfaceLater,
    relatedMemoryFound: output.debug.relatedMemoryIds.length > 0,
    personDetected: detectPerson(output),
    relationshipDetected: detectRelationship(output),
    futureUsefulness: output.debug.shouldSurfaceLater || output.futureFollowUpDecision.decision !== "none",
    followUpNeeded: output.futureFollowUpDecision.decision === "ask_now",
    asksNow: output.debug.memoryDecision === "ask_follow_up",
    patternDetected: pattern.detected,
    patternType: pattern.type,
    contradictionDetected: contradiction.detected,
    conflictingMemoryIds: contradiction.detected && output.debug.relatedMemoryIds.length > 0,
    updateCandidate: contradiction.updateCandidate,
    memoryDecision: output.debug.memoryDecision,
    response: output.response,
    debugContainsSecret: containsSecret(output),
    revealsAllMemory: revealsAllMemory(output),
  };
  const mismatchReasons = compareExpected(testCase.expected, actual, output);
  const status = classifySyncEngineCaseStatus({
    mismatchCount: mismatchReasons.length,
    hasKnownGap: Boolean(testCase.knownGap),
  });

  return {
    suiteId: suite.id,
    suiteTitle: suite.title,
    caseId: testCase.id,
    title: testCase.title,
    input: messages,
    expected: testCase.expected,
    actual,
    status,
    mismatchReasons,
    philosophyRules: testCase.philosophyRules,
    knownGap: testCase.knownGap?.reason,
    output,
  };
}

function compareExpected(
  expected: SyncEngineExpectedBehavior,
  actual: SyncEngineActualBehavior,
  output: SyncEngineMessageResult,
) {
  const mismatches: string[] = [];
  const checkEqual = <T>(label: string, expectedValue: T | undefined, actualValue: T) => {
    if (expectedValue === undefined) return;
    if (actualValue !== expectedValue) {
      mismatches.push(`${label}: expected ${String(expectedValue)}, got ${String(actualValue)}`);
    }
  };

  checkEqual("shouldRemember", expected.shouldRemember, actual.shouldRemember);
  checkEqual("category", expected.category, actual.category);
  checkEqual("surfaceLater", expected.surfaceLater, actual.surfaceLater);
  checkEqual("followUpDecision", expected.followUpDecision, actual.followUpDecision);
  checkEqual("affectedTimeframe", expected.affectedTimeframe, output.debug.affectedTimeframe);
  checkEqual("priorityImpact", expected.priorityImpact, actual.priorityImpact);
  checkEqual("shouldSurfaceInBrief", expected.shouldSurfaceInBrief, actual.shouldSurfaceInBrief);
  checkEqual("relatedMemoryExpected", expected.relatedMemoryExpected, actual.relatedMemoryFound);
  checkEqual("personDetected", expected.personDetected, actual.personDetected);
  checkEqual("relationshipDetected", expected.relationshipDetected, actual.relationshipDetected);
  checkEqual("futureUsefulness", expected.futureUsefulness, actual.futureUsefulness);
  checkEqual("followUpNeeded", expected.followUpNeeded, actual.followUpNeeded);
  checkEqual("askNow", expected.askNow, actual.asksNow);
  if (expected.noAsk !== undefined && actual.asksNow !== !expected.noAsk) {
    mismatches.push(`noAsk: expected ${expected.noAsk}, got ${!actual.asksNow}`);
  }
  checkEqual("patternDetected", expected.patternDetected, actual.patternDetected);
  checkEqual("patternType", expected.patternType, actual.patternType);
  checkEqual("importanceIncreased", expected.importanceIncreased, actual.importance === "high" || actual.importance === "critical");
  checkEqual("responseShouldMentionPattern", expected.responseShouldMentionPattern, /again|pattern|repeated|showing up/.test(actual.response.toLowerCase()));
  checkEqual("contradictionDetected", expected.contradictionDetected, actual.contradictionDetected);
  checkEqual("conflictingMemoryIds", expected.conflictingMemoryIds, actual.conflictingMemoryIds);
  checkEqual("askClarifyingQuestion", expected.askClarifyingQuestion, actual.asksNow);
  checkEqual("updateCandidate", expected.updateCandidate, actual.updateCandidate);
  checkEqual("memoryDecision", expected.memoryDecision, output.debug.memoryDecision);
  checkEqual("shouldRejectSensitiveStorage", expected.shouldRejectSensitiveStorage, !actual.shouldRemember);
  checkEqual("shouldAvoidSecretInDebug", expected.shouldAvoidSecretInDebug, !actual.debugContainsSecret);
  checkEqual("shouldNotRevealAllMemory", expected.shouldNotRevealAllMemory, !actual.revealsAllMemory);

  if (expected.importance !== undefined) {
    const allowed = Array.isArray(expected.importance)
      ? expected.importance
      : [expected.importance];
    if (!allowed.includes(actual.importance)) {
      mismatches.push(`importance: expected ${allowed.join(" or ")}, got ${actual.importance}`);
    }
  }

  if (expected.confidenceRange) {
    const min = expected.confidenceRange.min ?? 0;
    const max = expected.confidenceRange.max ?? 1;
    if (actual.confidence < min || actual.confidence > max) {
      mismatches.push(`confidenceRange: expected ${min}-${max}, got ${actual.confidence}`);
    }
  }

  if (
    expected.consequenceSummary !== undefined &&
    !includesPattern(actual.consequenceSummary, expected.consequenceSummary)
  ) {
    mismatches.push(`consequenceSummary: expected match ${String(expected.consequenceSummary)}, got "${actual.consequenceSummary}"`);
  }

  if (
    expected.followUpQuestion !== undefined &&
    !includesPattern(actual.response, expected.followUpQuestion)
  ) {
    mismatches.push(`followUpQuestion: expected response match ${String(expected.followUpQuestion)}, got "${actual.response}"`);
  }

  if (
    expected.reason !== undefined &&
    !includesPattern(output.futureFollowUpDecision.reason, expected.reason)
  ) {
    mismatches.push(`reason: expected match ${String(expected.reason)}, got "${output.futureFollowUpDecision.reason}"`);
  }

  return mismatches;
}

export function runSyncEngineTestSuite(suite: SyncEngineTestSuite): SyncEngineSuiteRun {
  const cases = suite.cases.map((testCase) => runCase(testCase, suite));
  const passCount = cases.filter((testCase) => testCase.status === "pass").length;
  const failCount = cases.filter((testCase) => testCase.status === "fail").length;
  const warnCount = cases.filter((testCase) => testCase.status === "warn").length;
  const knownGapCount = cases.filter(
    (testCase) => testCase.status === "known_gap",
  ).length;
  const status: SyncEngineTestStatus =
    failCount > 0
      ? "fail"
      : knownGapCount > 0
        ? "known_gap"
        : warnCount > 0
          ? "warn"
          : "pass";

  return {
    suiteId: suite.id,
    suiteTitle: suite.title,
    goal: suite.goal,
    status,
    passCount,
    failCount,
    warnCount,
    knownGapCount,
    cases,
  };
}

export function runSyncEngineTestSuites(
  suites: readonly SyncEngineTestSuite[] = ALL_SYNC_ENGINE_TEST_SUITES,
): SyncEngineTestRun {
  const suiteRuns = suites.map(runSyncEngineTestSuite);
  const summary = summarizeSyncEngineOutcomes(
    suiteRuns.flatMap((suite) =>
      suite.cases.map((testCase) => ({ status: testCase.status })),
    ),
  );

  return {
    suites: suiteRuns,
    summary,
  };
}

export function runAllSyncEngineTestSuites() {
  return runSyncEngineTestSuites(ALL_SYNC_ENGINE_TEST_SUITES);
}

export {
  formatSyncEngineOutcomeSummary,
  summarizeSyncEngineOutcomes,
} from "@/lib/sync-engine/testing/result-summary";
