import type { SyncEngineTestSuite } from "@/lib/sync-engine/testing/test-suite";

export const consequenceTests: SyncEngineTestSuite = {
  id: "consequence",
  title: "Consequence Tests",
  category: "consequence",
  goal: "Check whether Sync understands what changes because of new information.",
  cases: [
    {
      id: "consequence-rent-friday",
      title: "Rent due Friday affects this week",
      category: "consequence",
      input: "Rent is due Friday.",
      expected: {
        shouldRemember: true,
        affectedTimeframe: "this_week",
        priorityImpact: "high",
        shouldSurfaceInBrief: true,
        consequenceSummary: /rent|deadline|due|Friday/i,
      },
      philosophyRules: ["P1", "P4", "P8"],
    },
    {
      id: "consequence-payday-thursday",
      title: "Payday Thursday should be money context",
      category: "consequence",
      input: "Payday is Thursday.",
      expected: {
        shouldRemember: true,
        affectedTimeframe: "tomorrow",
        shouldSurfaceInBrief: true,
        priorityImpact: "medium",
      },
      philosophyRules: ["P1", "P4", "P8"],
    },
    {
      id: "consequence-dinner-moved",
      title: "Moved dinner should be treated as an update candidate when context exists",
      category: "consequence",
      sequence: ["Dinner with Mom is Thursday.", "Dinner moved to Friday."],
      expected: {
        shouldRemember: true,
        relatedMemoryExpected: true,
        memoryDecision: "update_existing",
        affectedTimeframe: "this_week",
      },
      philosophyRules: ["P2", "P4"],
      knownGap: {
        reason:
          "Update detection is still mostly duplicate matching and misses some vague reschedules.",
      },
    },
    {
      id: "consequence-canceled-gym",
      title: "Canceled gym membership changes health and money context",
      category: "consequence",
      input: "I canceled my gym membership.",
      expected: {
        shouldRemember: true,
        futureUsefulness: true,
        consequenceSummary: /gym|membership|health|money|ripple/i,
      },
      philosophyRules: ["P1", "P8"],
      knownGap: {
        reason:
          "The current consequence analyzer does not consistently understand cancellation ripple effects.",
      },
    },
    {
      id: "consequence-early-flight",
      title: "Early flight tomorrow should affect tomorrow",
      category: "consequence",
      input: "I have a flight at 6 AM tomorrow.",
      expected: {
        shouldRemember: true,
        affectedTimeframe: "tomorrow",
        priorityImpact: "medium",
        shouldSurfaceInBrief: true,
        surfaceLater: true,
      },
      philosophyRules: ["P1", "P4"],
    },
  ],
};
