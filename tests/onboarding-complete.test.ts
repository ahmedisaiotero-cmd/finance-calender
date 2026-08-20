import assert from "node:assert/strict";
import test from "node:test";
import { NextResponse } from "next/server";

import { generateDailyBrief } from "@/lib/brief/generate-daily-brief";
import { handleProfileGet, handleProfilePut } from "@/lib/api/profile-handler";
import {
  canEnterAuthenticatedHome,
  completeOnboardingSubmission,
  decideAuthenticatedHomeEntry,
  interpretProfileGetResponse,
  mergeOnboardingProfile,
  ONBOARDING_INCOMPLETE_ERROR,
  ONBOARDING_SAVE_ERROR,
  sanitizeSyncUserProfile,
} from "@/lib/sync-profile/complete-onboarding";
import { materializeOnboardingReading } from "@/lib/sync-profile/materialize-onboarding-reading";
import {
  applyInitialReadingCorrection,
  collectOnboardingSeedTexts,
  nextOnboardingStep,
  pressureImpliesGoal,
  pressureQuestion,
  shouldAskGoalQuestion,
} from "@/lib/sync-profile/onboarding-reading";
import {
  EMPTY_USER_PROFILE,
  profileToSyncUserContext,
  type SyncUserProfile,
} from "@/lib/sync-profile/user-profile";
import { createTestCaptureStore } from "@/tests/test-capture-handlers";

function messyProfile(overrides: Partial<SyncUserProfile> = {}): SyncUserProfile {
  return {
    ...EMPTY_USER_PROFILE,
    name: "Ahmed",
    priorities: ["Money", "Family"],
    currentStress:
      "landlord keeps texting about Friday and I'm short until payday tbh",
    comingUp: "rent friday. mom flying in next weekend idk the time yet",
    workingToward: "get 2 months rent saved so this stops happening",
    goalTimeframe: "this-quarter",
    constraints: ["Money", "Uncertainty"],
    directness: "direct",
    ...overrides,
  };
}

function identity() {
  return {
    ok: true as const,
    identity: {
      mode: "authenticated" as const,
      user: { id: "user-owned", email: "a@example.com", name: "Ahmed" },
      workspace: { id: "ws-owned", name: "Personal" },
    },
  };
}

test("sanitize drops client identity fields", () => {
  const stripped = sanitizeSyncUserProfile({
    ...messyProfile({ onboardingComplete: true }),
    userId: "attacker",
    ownerId: "attacker-ws",
  } as SyncUserProfile & { userId: string; ownerId: string });
  assert.equal("userId" in stripped, false);
  assert.equal(stripped.onboardingComplete, true);
  assert.equal(stripped.name, "Ahmed");
});

test("merge keeps completion true on duplicate retry", () => {
  const first = mergeOnboardingProfile(null, messyProfile({ onboardingComplete: true }));
  const retry = mergeOnboardingProfile(
    first,
    messyProfile({
      onboardingComplete: false,
      comingUp: "rent friday. mom flying in next weekend idk the time yet",
    }),
  );
  assert.equal(first.onboardingComplete, true);
  assert.equal(retry.onboardingComplete, true);
});

test("home entry waits until remote hydrate unless local is already complete", () => {
  assert.equal(
    decideAuthenticatedHomeEntry({
      remoteStatus: "loading",
      localProfile: EMPTY_USER_PROFILE,
      remoteProfile: null,
    }),
    "wait",
  );
  assert.equal(
    decideAuthenticatedHomeEntry({
      remoteStatus: "loading",
      localProfile: { onboardingComplete: true },
      remoteProfile: null,
    }),
    "enter",
  );
  assert.equal(
    decideAuthenticatedHomeEntry({
      remoteStatus: "ready",
      localProfile: EMPTY_USER_PROFILE,
      remoteProfile: { onboardingComplete: true },
    }),
    "enter",
  );
  assert.equal(
    decideAuthenticatedHomeEntry({
      remoteStatus: "ready",
      localProfile: { onboardingComplete: true },
      remoteProfile: null,
    }),
    "enter",
  );
  assert.equal(
    decideAuthenticatedHomeEntry({
      remoteStatus: "ready",
      localProfile: { onboardingComplete: true },
      remoteProfile: EMPTY_USER_PROFILE,
    }),
    "onboarding",
  );
  assert.equal(
    interpretProfileGetResponse({ ok: false, status: 500, body: null }).remoteStatus,
    "error",
  );
});

test("successful authenticated completion is remote-first and idempotent", async () => {
  let localSaves = 0;
  let remoteSaves = 0;

  const submitted = await completeOnboardingSubmission({
    profile: messyProfile({ onboardingComplete: false }),
    applyLocal: (completed) => {
      localSaves += 1;
      assert.equal(completed.onboardingComplete, true);
    },
    saveRemote: async (completed) => {
      remoteSaves += 1;
      assert.equal(completed.onboardingComplete, true);
      assert.equal("userId" in completed, false);
      return { ok: true, status: 200 };
    },
  });

  assert.equal(submitted.ok, true);
  assert.equal(localSaves, 1);
  assert.equal(remoteSaves, 1);
  if (submitted.ok) {
    assert.equal(canEnterAuthenticatedHome(submitted.profile), true);
  }

  const duplicate = await completeOnboardingSubmission({
    profile: messyProfile({ onboardingComplete: true }),
    applyLocal: () => {
      localSaves += 1;
    },
    saveRemote: async () => {
      remoteSaves += 1;
      return { ok: true, status: 200 };
    },
  });
  assert.equal(duplicate.ok, true);
  assert.equal(remoteSaves, 2);
  assert.equal(localSaves, 2);
});

test("failed save does not mark onboarding complete locally", async () => {
  let localSaves = 0;
  const failed = await completeOnboardingSubmission({
    profile: messyProfile(),
    applyLocal: () => {
      localSaves += 1;
    },
    saveRemote: async () => ({
      ok: false,
      status: 500,
      error: ONBOARDING_SAVE_ERROR,
    }),
  });
  assert.equal(failed.ok, false);
  if (!failed.ok) assert.equal(failed.error, ONBOARDING_SAVE_ERROR);
  assert.equal(failed.profile.onboardingComplete, false);
  assert.equal(localSaves, 0);
});

test("partial answers are not marked complete", async () => {
  const incomplete = await completeOnboardingSubmission({
    profile: {
      ...EMPTY_USER_PROFILE,
      name: "Ahmed",
      comingUp: "rent friday",
    },
    applyLocal: () => {
      throw new Error("should not apply");
    },
    saveRemote: async () => {
      throw new Error("should not save");
    },
  });
  assert.equal(incomplete.ok, false);
  if (!incomplete.ok) assert.equal(incomplete.error, ONBOARDING_INCOMPLETE_ERROR);
});

test("authenticated profile PUT persists completion and GET hydrates it", async () => {
  const saved: SyncUserProfile[] = [];

  const unauthorized = await handleProfilePut(
    new Request("http://localhost/api/profile", {
      method: "PUT",
      body: JSON.stringify(messyProfile({ onboardingComplete: true })),
      headers: { "content-type": "application/json" },
    }),
    {
      loadIdentity: async () => ({
        ok: false as const,
        response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
      }),
    },
  );
  assert.equal(unauthorized.status, 401);

  const created = await handleProfilePut(
    new Request("http://localhost/api/profile", {
      method: "PUT",
      body: JSON.stringify({
        ...messyProfile({ onboardingComplete: true }),
        userId: "attacker",
      }),
      headers: { "content-type": "application/json" },
    }),
    {
      loadIdentity: async () => identity(),
      loadProfile: async (userId) => {
        assert.equal(userId, "user-owned");
        return saved[saved.length - 1] ?? null;
      },
      saveProfile: async (userId, next) => {
        assert.equal(userId, "user-owned");
        assert.equal("userId" in next, false);
        saved.push(next);
        return next;
      },
    },
  );
  assert.equal(created.status, 200);
  const createdBody = await created.json();
  assert.equal(createdBody.profile.onboardingComplete, true);

  const hydrated = await handleProfileGet({
    loadIdentity: async () => identity(),
    loadProfile: async () => saved[0],
  });
  assert.equal(hydrated.status, 200);
  const hydratedBody = await hydrated.json();
  assert.equal(hydratedBody.profile.onboardingComplete, true);
  assert.match(hydratedBody.profile.comingUp, /rent friday/i);

  const retried = await handleProfilePut(
    new Request("http://localhost/api/profile", {
      method: "PUT",
      body: JSON.stringify(messyProfile({ onboardingComplete: true })),
      headers: { "content-type": "application/json" },
    }),
    {
      loadIdentity: async () => identity(),
      loadProfile: async () => saved[0],
      saveProfile: async (_userId, next) => {
        saved.push(next);
        return next;
      },
    },
  );
  assert.equal(retried.status, 200);
  assert.equal(saved[1].onboardingComplete, true);
});

test("returning completed remote profile redirects completed users out of onboarding", () => {
  assert.equal(
    decideAuthenticatedHomeEntry({
      remoteStatus: "ready",
      localProfile: EMPTY_USER_PROFILE,
      remoteProfile: messyProfile({ onboardingComplete: true }),
    }),
    "enter",
  );
  assert.equal(canEnterAuthenticatedHome(EMPTY_USER_PROFILE), false);
});

test("adaptive branches change pressure copy and skip a separate goal prompt", () => {
  const money = pressureQuestion({ priorities: ["Money"] });
  const family = pressureQuestion({ priorities: ["Family"] });
  assert.match(money.question, /money/i);
  assert.match(family.question, /protected/i);
  assert.notEqual(money.question, family.question);

  assert.equal(
    pressureImpliesGoal("trying to save two months of rent by September"),
    true,
  );
  assert.equal(shouldAskGoalQuestion({ currentStress: "just tired" }), true);
  assert.equal(
    shouldAskGoalQuestion({
      currentStress: "trying to save two months of rent by September",
    }),
    false,
  );
  assert.equal(
    nextOnboardingStep("coming-up", { currentStress: "just tired" }),
    "goal",
  );
  assert.equal(
    nextOnboardingStep("pressure", { currentStress: "landlord texting" }),
    "coming-up",
  );
});

test("messy answers persist through capture, observations, and a grounded home brief", () => {
  const store = createTestCaptureStore();
  const profile = messyProfile({ onboardingComplete: true });
  const materialized = materializeOnboardingReading(profile, {
    items: store.items,
    addCapturedItem: store.handlers.addCapturedItem,
    reference: new Date("2026-08-20T15:00:00"),
  });

  const seeds = collectOnboardingSeedTexts(profile);
  assert.ok(seeds.some((seed) => /landlord keeps texting/i.test(seed.text)));
  assert.ok(seeds.some((seed) => /rent friday/i.test(seed.text)));
  assert.ok(seeds.some((seed) => /2 months rent saved/i.test(seed.text)));

  const joined = materialized.items.map((item) => item.prompt).join(" | ");
  assert.match(joined, /landlord keeps texting/i);
  assert.match(joined, /rent friday/i);
  assert.ok(materialized.observations.length >= 2);
  assert.ok(
    materialized.observations.some((observation) =>
      /landlord keeps texting/i.test(observation.rawContent),
    ),
  );

  const duplicate = materializeOnboardingReading(profile, {
    items: materialized.items,
    addCapturedItem: store.handlers.addCapturedItem,
    reference: new Date("2026-08-20T15:00:00"),
  });
  assert.equal(duplicate.items.length, materialized.items.length);

  const context = profileToSyncUserContext(profile);
  assert.ok(
    context.goals?.some((goal) => /2 months rent saved/i.test(goal.title)),
  );
  assert.equal(
    context.goals?.some((goal) => goal.title === "Money"),
    false,
  );

  const brief = generateDailyBrief({
    items: materialized.items,
    profile,
    reference: new Date("2026-08-20T09:00:00"),
  });
  const briefText = [brief.lede, ...brief.items.map((item) => item.text)].join(
    " ",
  );
  assert.equal(brief.isEmpty, false);
  assert.match(briefText, /mom|rent|landlord|payday|saved|flying/i);

  const quiet = generateDailyBrief({
    items: [],
    profile: {
      ...EMPTY_USER_PROFILE,
      name: "Sam",
      onboardingComplete: true,
      priorities: ["Work"],
      directness: "gentle",
    },
  });
  assert.equal(quiet.isEmpty, true);
  assert.doesNotMatch(quiet.lede ?? "", /Work is on your radar/i);
  assert.equal(quiet.curiousHook, null);
});

test("initial reading correction updates the saved intelligence text", () => {
  const original = messyProfile();
  const corrected = applyInitialReadingCorrection(
    original,
    "comingUp",
    "inspection Tuesday, not Friday — landlord moved it",
  );
  assert.match(corrected.comingUp, /inspection Tuesday/i);

  const store = createTestCaptureStore();
  const materialized = materializeOnboardingReading(
    { ...corrected, onboardingComplete: true },
    {
      items: store.items,
      addCapturedItem: store.handlers.addCapturedItem,
      reference: new Date("2026-08-20T15:00:00"),
    },
  );
  assert.ok(
    materialized.items.some((item) =>
      /inspection tuesday/i.test(item.prompt),
    ),
  );
  assert.equal(
    materialized.items.some((item) => /rent friday/i.test(item.prompt)),
    false,
  );
});
