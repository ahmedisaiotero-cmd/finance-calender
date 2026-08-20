import assert from "node:assert/strict";
import test from "node:test";

import { generateDailyBrief } from "@/lib/brief/generate-daily-brief";
import { capturedItemToTimelineEvent } from "@/lib/captured-to-timeline";
import { applyChatTurn } from "@/lib/sync-capture/apply-chat-turn";
import { interpretChatTurn } from "@/lib/sync-capture/interpret-chat-turn";
import { resolveChatTurnPersistence } from "@/lib/sync-profile/remote-profile";
import { EMPTY_USER_PROFILE } from "@/lib/sync-profile/user-profile";
import { FORECAST_SPACE_EVENING } from "@/lib/mobile-prototype/sync-voice";
import { buildLifeContextForecast } from "@/lib/mobile-prototype/build-life-context";
import { buildHomePriorities } from "@/lib/mobile-prototype/build-home-priorities";
import { createTestCaptureStore } from "@/tests/test-capture-handlers";

const august = new Date("2026-08-20T15:00:00");
const debtQuestion =
  "How are you planning to approach the debt?";

test("debt follow-up is a belief, not a calendar event", () => {
  const clauses = interpretChatTurn({
    text: "i dont really have much plans",
    priorAssistantText: debtQuestion,
  });
  assert.equal(clauses.length, 1);
  assert.equal(clauses[0]?.kind, "belief_state");
  assert.match(clauses[0]?.captureText ?? "", /no current plan/i);

  const store = createTestCaptureStore();
  const applied = applyChatTurn(
    "i dont really have much plans",
    {
      items: store.items,
      reference: august,
      priorAssistantText: debtQuestion,
    },
    store.handlers,
  );
  assert.equal(
    applied.items.some((item) => item.destinations.includes("Calendar")),
    false,
  );
  assert.equal(
    applied.items.some((item) =>
      /Dont Really Have Much Plans/i.test(item.title),
    ),
    false,
  );
});

test("standalone no plans today is not automatically important", () => {
  const store = createTestCaptureStore();
  const applied = applyChatTurn(
    "I don't have plans today",
    { items: store.items, reference: august },
    store.handlers,
  );
  const item = applied.items[0];
  assert.ok(item);
  assert.equal(item.destinations.includes("Calendar"), false);
  const brief = generateDailyBrief({
    items: applied.items,
    profile: { ...EMPTY_USER_PROFILE, onboardingComplete: true },
    reference: august,
  });
  const text = [brief.lede, ...brief.items.map((entry) => entry.text)].join(" ");
  assert.doesNotMatch(text, /Dont Really Have Much Plans today/i);
});

test("Aug 20 payday and rent on the first resolve correctly", () => {
  const store = createTestCaptureStore();
  const applied = applyChatTurn(
    "i got paid today, and rent is due on the first",
    { items: store.items, reference: august },
    store.handlers,
  );

  const payday = applied.items.find((item) =>
    /paid/i.test(`${item.title} ${item.prompt}`),
  );
  const rent = applied.items.find((item) =>
    /rent/i.test(`${item.title} ${item.prompt}`),
  );
  assert.ok(payday);
  assert.ok(rent);
  assert.equal(payday.timeline?.startDate, "2026-08-20");
  assert.equal(rent.timeline?.deadlineDate, "2026-09-01");
  assert.notEqual(rent.timeline?.deadlineDate, "2026-08-20");
});

test("comfortable with debt is a state, not an event", () => {
  const store = createTestCaptureStore();
  const applied = applyChatTurn(
    "comfortable for now but i have a lot of debt",
    { items: store.items, reference: august },
    store.handlers,
  );
  assert.ok(applied.items.length >= 1);
  assert.equal(
    applied.items.every((item) => !item.destinations.includes("Calendar")),
    true,
  );
  assert.ok(
    applied.items.some((item) =>
      /debt|comfortable/i.test(`${item.title} ${item.prompt}`),
    ),
  );
});

test("actually rent is due on the third corrects the earlier date", () => {
  const store = createTestCaptureStore();
  applyChatTurn(
    "i got paid today, and rent is due on the first",
    { items: store.items, reference: august },
    store.handlers,
  );
  const before = store.items.filter((item) => /rent/i.test(item.prompt));
  applyChatTurn(
    "actually rent is due on the third",
    { items: store.items, reference: august },
    store.handlers,
  );
  const rentItems = store.items.filter(
    (item) => /rent/i.test(`${item.title} ${item.prompt}`) && !item.deletedAt,
  );
  assert.equal(rentItems.length, 1);
  assert.equal(rentItems[0]?.timeline?.deadlineDate, "2026-09-03");
  assert.ok(before[0]);
});

test("chat fragments do not appear on the calendar", () => {
  const store = createTestCaptureStore();
  const applied = applyChatTurn(
    "i dont really have much plans",
    {
      items: store.items,
      reference: august,
      priorAssistantText: debtQuestion,
    },
    store.handlers,
  );
  assert.equal(
    applied.items.map((item) => capturedItemToTimelineEvent(item, august)).every(
      (event) => event == null,
    ),
    true,
  );
});

test("priority chips do not create fake Today cards", () => {
  const home = buildHomePriorities({
    consequences: [],
    items: [],
    reference: august,
    hasUserContext: true,
    priorities: ["Money", "Family"],
  });
  const text = [
    home.primaryPriority.text,
    ...home.supportingPriorities.map((item) => item.text),
  ].join(" ");
  assert.doesNotMatch(text, /Money today|Family\/plans today/i);
});

test("no calendar connection means no availability claims", () => {
  const forecast = buildLifeContextForecast({
    blocks: [],
    items: [],
    consequences: [],
    reference: august,
    isQuiet: false,
    lastEndToday: 0,
    nowMinutes: 12 * 60,
    existingLines: [],
  });
  assert.notEqual(forecast, FORECAST_SPACE_EVENING);
});

test("duplicate chat submission does not duplicate memory", () => {
  const store = createTestCaptureStore();
  applyChatTurn(
    "i got paid today",
    { items: store.items, reference: august },
    store.handlers,
  );
  const firstCount = store.items.length;
  applyChatTurn(
    "i got paid today",
    { items: store.items, reference: august },
    store.handlers,
  );
  assert.equal(store.items.length, firstCount);

  assert.equal(
    resolveChatTurnPersistence({
      lastUser: { content: "i got paid today", createdAtMs: august.getTime() },
      lastAfterUser: { role: "sync" },
      userText: "i got paid today",
      nowMs: august.getTime() + 1000,
    }),
    "skip",
  );
});
