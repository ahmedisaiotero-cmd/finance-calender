import assert from "node:assert/strict";
import { buildBeliefStore } from "../lib/sync-agent/belief/build-belief-store";
import type {
  BuildBeliefStoreInput,
  SyncMemory,
  SyncPattern,
  SyncProfile,
} from "../lib/sync-agent/belief/types";

const REFERENCE = { now: "2026-06-30T12:00:00.000Z" };

function activeBeliefs(input: BuildBeliefStoreInput) {
  return buildBeliefStore(input).beliefs.filter(
    (belief) => belief.status === "active",
  );
}

function hasActiveBelief(
  input: BuildBeliefStoreInput,
  predicate: (belief: {
    kind: string;
    proposition: string;
    domain: string;
    evidenceIds: string[];
  }) => boolean,
) {
  return activeBeliefs(input).some(predicate);
}

function testRentMemoryBecomesObligationBelief() {
  const input: BuildBeliefStoreInput = {
    memories: [
      {
        id: "mem-rent-1",
        domain: "money",
        text: "Rent is due on Friday",
        committed: true,
        createdAt: "2026-06-01T10:00:00.000Z",
        updatedAt: "2026-06-01T10:00:00.000Z",
      },
    ],
    profile: {},
    patterns: [],
    reference: REFERENCE,
  };

  const beliefs = activeBeliefs(input);
  assert.equal(beliefs.length, 1);
  assert.equal(beliefs[0]?.kind, "obligation");
  assert.match(beliefs[0]?.proposition ?? "", /rent/i);
  assert.deepEqual(beliefs[0]?.evidenceIds, ["mem-rent-1"]);
  console.log("✓ rent memory -> obligation belief");
}

function testWorkScheduleBecomesCommitmentBelief() {
  const input: BuildBeliefStoreInput = {
    memories: [
      {
        id: "mem-work-1",
        domain: "work",
        text: "Work shift Monday 9am-5pm",
        committed: true,
        createdAt: "2026-06-02T10:00:00.000Z",
        updatedAt: "2026-06-02T10:00:00.000Z",
      },
    ],
    profile: {},
    patterns: [],
    reference: REFERENCE,
  };

  const beliefs = activeBeliefs(input);
  assert.equal(beliefs.length, 1);
  assert.equal(beliefs[0]?.kind, "commitment");
  assert.match(beliefs[0]?.proposition ?? "", /work shift/i);
  console.log("✓ work schedule memory -> commitment belief");
}

function testMomBirthdayBecomesFactOrObligationBelief() {
  const input: BuildBeliefStoreInput = {
    memories: [
      {
        id: "mem-bday-1",
        domain: "relationships",
        text: "Mom's birthday is March 15",
        committed: true,
        createdAt: "2026-06-03T10:00:00.000Z",
        updatedAt: "2026-06-03T10:00:00.000Z",
      },
    ],
    profile: {},
    patterns: [],
    reference: REFERENCE,
  };

  const beliefs = activeBeliefs(input);
  assert.equal(beliefs.length, 1);
  assert.ok(
    beliefs[0]?.kind === "fact" || beliefs[0]?.kind === "obligation",
    `expected fact or obligation, got ${beliefs[0]?.kind}`,
  );
  assert.match(beliefs[0]?.proposition ?? "", /birthday/i);
  console.log("✓ mom birthday -> fact/obligation belief");
}

function testRestaurantPreferenceBecomesPreferenceBelief() {
  const input: BuildBeliefStoreInput = {
    memories: [
      {
        id: "mem-pref-1",
        domain: "relationships",
        text: "Girlfriend prefers Italian restaurants",
        committed: true,
        createdAt: "2026-06-04T10:00:00.000Z",
        updatedAt: "2026-06-04T10:00:00.000Z",
      },
    ],
    profile: {},
    patterns: [],
    reference: REFERENCE,
  };

  const beliefs = activeBeliefs(input);
  assert.equal(beliefs.length, 1);
  assert.equal(beliefs[0]?.kind, "preference");
  assert.match(beliefs[0]?.proposition ?? "", /prefers italian/i);
  console.log("✓ girlfriend restaurant preference -> preference belief");
}

function testOverspendingRentPatternBecomesPatternOrConcernBelief() {
  const memories: SyncMemory[] = [
    {
      id: "mem-rent-2",
      domain: "money",
      text: "Rent is due on the 1st",
      committed: true,
      createdAt: "2026-06-05T10:00:00.000Z",
      updatedAt: "2026-06-05T10:00:00.000Z",
    },
    {
      id: "mem-spend-1",
      domain: "money",
      text: "Overspent on dining this week",
      committed: true,
      createdAt: "2026-06-05T11:00:00.000Z",
      updatedAt: "2026-06-05T11:00:00.000Z",
    },
  ];

  const patterns: SyncPattern[] = [
    {
      id: "pat-overspend-rent",
      domain: "money",
      proposition: "Overspending risk with rent due",
      kind: "concern",
      active: true,
      evidenceIds: ["mem-rent-2", "mem-spend-1"],
      confidenceScore: 0.78,
      createdAt: "2026-06-05T12:00:00.000Z",
      updatedAt: "2026-06-05T12:00:00.000Z",
    },
  ];

  const input: BuildBeliefStoreInput = {
    memories,
    profile: {},
    patterns,
    reference: REFERENCE,
  };

  assert.ok(
    hasActiveBelief(
      input,
      (belief) =>
        (belief.kind === "pattern" || belief.kind === "concern") &&
        /overspending/i.test(belief.proposition),
    ),
    "expected pattern or concern belief for overspending risk",
  );
  console.log("✓ overspending + rent pattern -> pattern/concern belief");
}

function testDuplicateRentMemoriesMergeIntoOneBelief() {
  const input: BuildBeliefStoreInput = {
    memories: [
      {
        id: "mem-rent-a",
        domain: "money",
        text: "Rent is due on Friday",
        committed: true,
        createdAt: "2026-06-06T10:00:00.000Z",
        updatedAt: "2026-06-06T10:00:00.000Z",
      },
      {
        id: "mem-rent-b",
        domain: "money",
        text: "Rent is due on Friday",
        committed: true,
        createdAt: "2026-06-06T11:00:00.000Z",
        updatedAt: "2026-06-06T11:00:00.000Z",
      },
    ],
    profile: {},
    patterns: [],
    reference: REFERENCE,
  };

  const beliefs = activeBeliefs(input);
  const rentBeliefs = beliefs.filter((belief) => /rent/i.test(belief.proposition));
  assert.equal(rentBeliefs.length, 1);
  assert.deepEqual(rentBeliefs[0]?.evidenceIds, ["mem-rent-a", "mem-rent-b"]);
  assert.ok((rentBeliefs[0]?.confidenceScore ?? 0) > 0.55);
  console.log("✓ duplicate rent memories -> one belief with multiple evidenceIds");
}

function testCorrectionSupersedesOldRentBelief() {
  const input: BuildBeliefStoreInput = {
    memories: [
      {
        id: "mem-rent-friday",
        domain: "money",
        text: "Rent is due on Friday",
        committed: true,
        createdAt: "2026-06-07T10:00:00.000Z",
        updatedAt: "2026-06-07T10:00:00.000Z",
      },
      {
        id: "mem-rent-correct",
        domain: "money",
        text: "Rent is due on Monday not Friday",
        committed: true,
        correction: {
          supersedesMemoryIds: ["mem-rent-friday"],
          text: "Rent is due on Monday not Friday",
        },
        createdAt: "2026-06-07T11:00:00.000Z",
        updatedAt: "2026-06-07T11:00:00.000Z",
      },
    ],
    profile: {},
    patterns: [],
    reference: REFERENCE,
  };

  const store = buildBeliefStore(input);
  const superseded = store.beliefs.filter((belief) => belief.status === "superseded");
  const active = store.beliefs.filter((belief) => belief.status === "active");

  assert.equal(superseded.length, 1);
  assert.ok(
    active.some((belief) => /monday/i.test(belief.proposition)),
    "expected active corrected rent belief mentioning Monday",
  );
  assert.ok(
    active.some((belief) => belief.supersedesBeliefIds.length > 0),
    "expected corrected belief to reference superseded belief ids",
  );
  console.log("✓ correction supersedes old rent belief");
}

function testTrivialMemoriesDoNotBecomeBeliefs() {
  const input: BuildBeliefStoreInput = {
    memories: [
      {
        id: "mem-coffee",
        domain: "personal",
        text: "Had a coffee",
        committed: true,
        createdAt: "2026-06-08T08:00:00.000Z",
        updatedAt: "2026-06-08T08:00:00.000Z",
      },
      {
        id: "mem-teeth",
        domain: "personal",
        text: "Brushed my teeth",
        committed: true,
        createdAt: "2026-06-08T08:05:00.000Z",
        updatedAt: "2026-06-08T08:05:00.000Z",
      },
    ],
    profile: {},
    patterns: [],
    reference: REFERENCE,
  };

  const beliefs = buildBeliefStore(input).beliefs;
  assert.equal(beliefs.length, 0);
  console.log("✓ trivial memories do not become beliefs");
}

function testSensitiveInputsDoNotBecomeBeliefs() {
  const input: BuildBeliefStoreInput = {
    memories: [
      {
        id: "mem-password",
        domain: "security",
        text: "My password is hunter2",
        committed: true,
        createdAt: "2026-06-09T10:00:00.000Z",
        updatedAt: "2026-06-09T10:00:00.000Z",
      },
      {
        id: "mem-api-key",
        domain: "security",
        text: "API key sk-live-abcdef",
        securityRejected: true,
        committed: true,
        createdAt: "2026-06-09T10:05:00.000Z",
        updatedAt: "2026-06-09T10:05:00.000Z",
      },
    ],
    profile: {},
    patterns: [],
    reference: REFERENCE,
  };

  const beliefs = buildBeliefStore(input).beliefs;
  assert.equal(beliefs.length, 0);
  console.log("✓ sensitive/password/API key inputs do not become beliefs");
}

function testProfilePriorityBecomesProfileBelief() {
  const profile: SyncProfile = {
    priorities: ["money"],
  };

  const input: BuildBeliefStoreInput = {
    memories: [],
    profile,
    patterns: [],
    reference: REFERENCE,
  };

  const beliefs = activeBeliefs(input);
  assert.equal(beliefs.length, 1);
  assert.equal(beliefs[0]?.kind, "profile");
  assert.match(beliefs[0]?.proposition ?? "", /money/i);
  console.log("✓ profile priority money -> profile belief");
}

function testOutputIsDeterministic() {
  const input: BuildBeliefStoreInput = {
    memories: [
      {
        id: "mem-z",
        domain: "money",
        text: "Rent is due on Friday",
        committed: true,
        createdAt: "2026-06-10T10:00:00.000Z",
        updatedAt: "2026-06-10T10:00:00.000Z",
      },
      {
        id: "mem-a",
        domain: "work",
        text: "Work shift Monday 9am-5pm",
        committed: true,
        createdAt: "2026-06-10T11:00:00.000Z",
        updatedAt: "2026-06-10T11:00:00.000Z",
      },
    ],
    profile: { priorities: ["money"] },
    patterns: [
      {
        id: "pat-1",
        domain: "money",
        proposition: "Overspending risk with rent due",
        kind: "concern",
        active: true,
        evidenceIds: ["mem-z"],
      },
    ],
    reference: REFERENCE,
  };

  const first = buildBeliefStore(input);
  const second = buildBeliefStore(input);

  assert.deepEqual(first, second);
  assert.deepEqual(
    first.beliefs.map((belief) => belief.id),
    [...first.beliefs.map((belief) => belief.id)].sort(),
    "belief ids should be sorted deterministically",
  );
  console.log("✓ output is deterministic");
}

function main() {
  testRentMemoryBecomesObligationBelief();
  testWorkScheduleBecomesCommitmentBelief();
  testMomBirthdayBecomesFactOrObligationBelief();
  testRestaurantPreferenceBecomesPreferenceBelief();
  testOverspendingRentPatternBecomesPatternOrConcernBelief();
  testDuplicateRentMemoriesMergeIntoOneBelief();
  testCorrectionSupersedesOldRentBelief();
  testTrivialMemoriesDoNotBecomeBeliefs();
  testSensitiveInputsDoNotBecomeBeliefs();
  testProfilePriorityBecomesProfileBelief();
  testOutputIsDeterministic();
  console.log("\nAll sync-agent belief store tests passed.");
}

main();
