import type { SyncEngineTestSuite } from "@/lib/sync-engine/testing/test-suite";

export const patternTests: SyncEngineTestSuite = {
  id: "pattern",
  title: "Pattern Tests",
  category: "pattern",
  goal: "Check whether Sync detects repeated behavior over multiple inputs.",
  cases: [
    {
      id: "pattern-skipped-workouts",
      title: "Repeated skipped workouts should become a health pattern",
      category: "pattern",
      sequence: [
        "I skipped my workout.",
        "Skipped my workout again.",
        "I skipped the gym today too.",
      ],
      expected: {
        patternDetected: true,
        patternType: "repeated_health_miss",
        category: "workout",
        importanceIncreased: true,
        surfaceLater: true,
        responseShouldMentionPattern: true,
      },
      philosophyRules: ["P1", "P6", "P8"],
      knownGap: {
        reason:
          "The runner can detect the repeated pattern, but the Sync Engine response does not yet narrate patterns.",
      },
    },
  ],
};
