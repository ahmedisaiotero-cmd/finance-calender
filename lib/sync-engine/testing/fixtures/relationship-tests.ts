import type { SyncEngineTestSuite } from "@/lib/sync-engine/testing/test-suite";

export const relationshipTests: SyncEngineTestSuite = {
  id: "relationship",
  title: "Relationship Tests",
  category: "relationship",
  goal: "Check whether Sync understands people, relationships, and future relevance.",
  cases: [
    {
      id: "relationship-mom-orchids",
      title: "Mom's orchids preference should be useful later",
      category: "relationship",
      input: "Mom loves orchids.",
      expected: {
        personDetected: true,
        relationshipDetected: true,
        shouldRemember: true,
        futureUsefulness: true,
        followUpNeeded: false,
      },
      philosophyRules: ["P1", "P8"],
      knownGap: {
        reason:
          "Preference usefulness for future relationship moments is not modeled directly yet.",
      },
    },
    {
      id: "relationship-mothers-day",
      title: "Mother's Day next week should surface relationship timing",
      category: "relationship",
      input: "Mother's Day is next week.",
      expected: {
        personDetected: true,
        relationshipDetected: true,
        shouldRemember: true,
        futureUsefulness: true,
        surfaceLater: true,
      },
      philosophyRules: ["P4", "P8"],
    },
    {
      id: "relationship-brother-moving",
      title: "Brother moving should be remembered as family context",
      category: "relationship",
      input: "My brother is moving to Texas.",
      expected: {
        personDetected: true,
        relationshipDetected: true,
        shouldRemember: true,
        futureUsefulness: true,
      },
      philosophyRules: ["P1", "P8"],
      knownGap: {
        reason:
          "The current wrapper treats some open-ended family life changes as too vague to remember.",
      },
    },
    {
      id: "relationship-pronoun-visit",
      title: "Pronoun-only visit should need context",
      category: "relationship",
      input: "He's visiting next month.",
      expected: {
        personDetected: true,
        relationshipDetected: false,
        followUpNeeded: true,
        askNow: true,
      },
      philosophyRules: ["P3", "P6"],
      knownGap: {
        reason:
          "Pronoun resolution is not implemented; the wrapper may remember vague future events without asking.",
      },
    },
    {
      id: "relationship-girlfriend-crowds",
      title: "Girlfriend restaurant preference should be remembered quietly",
      category: "relationship",
      input: "My girlfriend hates crowded restaurants.",
      expected: {
        personDetected: true,
        relationshipDetected: true,
        shouldRemember: true,
        futureUsefulness: true,
        followUpNeeded: false,
      },
      philosophyRules: ["P1", "P8"],
      knownGap: {
        reason:
          "Preference memory is not yet connected to future dinner planning.",
      },
    },
  ],
};
