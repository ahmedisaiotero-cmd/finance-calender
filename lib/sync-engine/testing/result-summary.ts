export type SyncEngineOutcomeStatus =
  | "pass"
  | "warn"
  | "known_gap"
  | "fail";

export type SyncEngineOutcomeSummary = {
  total: number;
  passed: number;
  warned: number;
  knownGaps: number;
  failed: number;
  shouldFailCommand: boolean;
};

export type SyncEngineOutcomeInput = {
  status: SyncEngineOutcomeStatus;
};

/**
 * Pure summary/exit contract for Sync Engine intelligence suite results.
 * Known gaps are visible and non-blocking. Real failures fail the command.
 */
export function summarizeSyncEngineOutcomes(
  outcomes: readonly SyncEngineOutcomeInput[],
): SyncEngineOutcomeSummary {
  let passed = 0;
  let warned = 0;
  let knownGaps = 0;
  let failed = 0;

  for (const outcome of outcomes) {
    switch (outcome.status) {
      case "pass":
        passed += 1;
        break;
      case "warn":
        warned += 1;
        break;
      case "known_gap":
        knownGaps += 1;
        break;
      case "fail":
        failed += 1;
        break;
    }
  }

  return {
    total: outcomes.length,
    passed,
    warned,
    knownGaps,
    failed,
    shouldFailCommand: failed > 0,
  };
}

export function formatSyncEngineOutcomeSummary(
  summary: SyncEngineOutcomeSummary,
): string {
  return `${summary.passed} pass, ${summary.warned} warn, ${summary.knownGaps} known gap, ${summary.failed} fail`;
}

export function classifySyncEngineCaseStatus(input: {
  mismatchCount: number;
  hasKnownGap: boolean;
}): SyncEngineOutcomeStatus {
  if (input.mismatchCount === 0) return "pass";
  if (input.hasKnownGap) return "known_gap";
  return "fail";
}
