import type { SyncEngineTestSuite } from "@/lib/sync-engine/testing/test-suite";

export const contradictionTests: SyncEngineTestSuite = {
  id: "contradiction",
  title: "Contradiction Tests",
  category: "contradiction",
  goal: "Check whether Sync notices conflicting information.",
  cases: [
    {
      id: "contradiction-vegetarian-steak",
      title: "Vegetarian and steak preference conflict",
      category: "contradiction",
      sequence: ["I'm vegetarian.", "I love steak."],
      expected: {
        contradictionDetected: true,
        conflictingMemoryIds: true,
        askClarifyingQuestion: true,
        updateCandidate: true,
      },
      philosophyRules: ["P2", "P3", "P6"],
      knownGap: {
        reason:
          "Contradiction detection is not implemented in processSyncMessage yet.",
      },
    },
    {
      id: "contradiction-rent-paid-overdue",
      title: "Paid rent and overdue rent conflict",
      category: "contradiction",
      sequence: ["I paid rent.", "Rent is overdue."],
      expected: {
        contradictionDetected: true,
        conflictingMemoryIds: true,
        askClarifyingQuestion: true,
        updateCandidate: true,
      },
      philosophyRules: ["P2", "P3", "P8"],
      knownGap: {
        reason:
          "Money contradiction handling needs explicit state reconciliation.",
      },
    },
    {
      id: "contradiction-work-schedule-friday",
      title: "Work schedule change should update existing work pattern",
      category: "contradiction",
      sequence: [
        "My work schedule is Sunday through Wednesday.",
        "I work every Friday now.",
      ],
      expected: {
        contradictionDetected: true,
        conflictingMemoryIds: true,
        askClarifyingQuestion: true,
        updateCandidate: true,
      },
      philosophyRules: ["P2", "P3"],
      knownGap: {
        reason:
          "Work schedule updates are not reconciled by the Sync Engine wrapper yet.",
      },
    },
  ],
};
