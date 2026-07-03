import type { SyncEngineTestSuite } from "@/lib/sync-engine/testing/test-suite";

export const memoryTests: SyncEngineTestSuite = {
  id: "memory",
  title: "Memory Tests",
  category: "memory",
  goal: "Check whether Sync remembers the right things and ignores trivial things.",
  cases: [
    {
      id: "memory-girlfriend-birthday",
      title: "Girlfriend birthday should become future relationship context",
      category: "memory",
      input: "My girlfriend's birthday is August 12.",
      expected: {
        shouldRemember: true,
        surfaceLater: true,
        futureUsefulness: true,
        confidenceRange: { min: 0.45, max: 1 },
      },
      philosophyRules: ["P1", "P4", "P8"],
    },
    {
      id: "memory-coffee-preference",
      title: "Preference can be remembered quietly",
      category: "memory",
      input: "I like dark roast coffee.",
      expected: {
        shouldRemember: true,
        surfaceLater: false,
        followUpDecision: "none",
      },
      philosophyRules: ["P1", "P5"],
      knownGap: {
        reason:
          "Preference memory is still mixed with general capture behavior and may be over-surfaced.",
      },
    },
    {
      id: "memory-trivial-meal",
      title: "Trivial meal should not become durable memory",
      category: "memory",
      input: "I ate Chick-fil-A.",
      expected: {
        shouldRemember: false,
        surfaceLater: false,
      },
      philosophyRules: ["P1", "P5"],
      knownGap: {
        reason:
          "The current capture wrapper still tends to remember simple life logs.",
      },
    },
    {
      id: "memory-dentist-appointment",
      title: "Dentist appointment should be remembered with timing",
      category: "memory",
      input: "My dentist appointment is Thursday.",
      expected: {
        shouldRemember: true,
        surfaceLater: true,
        futureUsefulness: true,
        confidenceRange: { min: 0.35, max: 1 },
      },
      philosophyRules: ["P1", "P4", "P8"],
    },
    {
      id: "memory-met-sarah",
      title: "Meeting Sarah should capture a relationship signal carefully",
      category: "memory",
      input: "I met Sarah today.",
      expected: {
        shouldRemember: true,
        personDetected: true,
        relationshipDetected: true,
        surfaceLater: false,
      },
      philosophyRules: ["P1", "P6", "P8"],
      knownGap: {
        reason:
          "The engine has weak person-entity understanding for new names without relationship context.",
      },
    },
  ],
};
