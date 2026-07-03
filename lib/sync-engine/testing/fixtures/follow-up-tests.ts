import type { SyncEngineTestSuite } from "@/lib/sync-engine/testing/test-suite";

export const followUpTests: SyncEngineTestSuite = {
  id: "follow-up",
  title: "Follow-Up Tests",
  category: "follow-up",
  goal: "Check whether Sync asks questions only when useful.",
  cases: [
    {
      id: "followup-doctor-appointment",
      title: "Doctor appointment without timing should ask for useful detail",
      category: "follow-up",
      input: "I have a doctor's appointment.",
      expected: {
        askNow: true,
        followUpQuestion: /more|when|place/i,
        reason: /detail|place|confidently/i,
        confidenceRange: { max: 0.7 },
      },
      philosophyRules: ["P3", "P6", "P8"],
      knownGap: {
        reason:
          "The current vague-input detector does not always ask for missing appointment timing.",
      },
    },
    {
      id: "followup-new-job",
      title: "Started a new job should not ask just to be chatty",
      category: "follow-up",
      input: "I started a new job.",
      expected: {
        noAsk: true,
        shouldRemember: true,
        followUpNeeded: false,
      },
      philosophyRules: ["P1", "P3"],
      knownGap: {
        reason:
          "The current vague-input detector asks for clarification on some meaningful work changes.",
      },
    },
    {
      id: "followup-that-thing-moved",
      title: "Vague moved thing should ask now",
      category: "follow-up",
      input: "That thing got moved.",
      expected: {
        askNow: true,
        followUpNeeded: true,
        followUpQuestion: /more|what|place/i,
      },
      philosophyRules: ["P3", "P6"],
      knownGap: {
        reason:
          "The current parser can over-accept vague reschedule language instead of asking what moved.",
      },
    },
    {
      id: "followup-cancel-something",
      title: "Cancel something needs the object before memory is useful",
      category: "follow-up",
      input: "I need to cancel something.",
      expected: {
        askNow: true,
        followUpNeeded: true,
      },
      philosophyRules: ["P3", "P6"],
      knownGap: {
        reason:
          "The capture layer may classify this as a reminder even though the object is missing.",
      },
    },
    {
      id: "followup-phoenix-next-week",
      title: "Phoenix trip next week has enough useful timing",
      category: "follow-up",
      input: "I'm going to Phoenix next week.",
      expected: {
        noAsk: true,
        shouldRemember: true,
        futureUsefulness: true,
      },
      philosophyRules: ["P3", "P4"],
    },
  ],
};
