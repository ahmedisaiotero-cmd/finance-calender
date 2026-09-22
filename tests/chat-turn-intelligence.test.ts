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

test("probe corpus keeps light daily chatter quiet", () => {
  for (const text of [
    "coffee this morning",
    "random thought: the clouds looked strange on the walk home",
  ]) {
    const store = createTestCaptureStore();
    const applied = applyChatTurn(
      text,
      { items: store.items, reference: august },
      store.handlers,
    );

    assert.equal(store.items.length, 0, text);
    assert.equal(applied.results.length, 1, text);
    assert.equal(applied.results[0]?.status, "too_vague", text);
    assert.match(
      applied.results[0]?.status === "too_vague"
        ? applied.results[0].message
        : "",
      /quiet/i,
    );
  }
});

test("probe corpus asks before storing vague timed placeholders", () => {
  for (const text of [
    "it’s tomorrow",
    "move it to Friday",
    "paid that",
    "remind me later",
    "something tomorrow",
    "flight at 6am and school dropoff and work standup",
    "remind me about mom's birthday next month",
    "follow up with them next week",
  ]) {
    const store = createTestCaptureStore();
    const applied = applyChatTurn(
      text,
      { items: store.items, reference: august },
      store.handlers,
    );

    assert.equal(store.items.length, 0, text);
    assert.equal(applied.results.length, 1, text);
    assert.equal(applied.results[0]?.status, "needs_clarification", text);
  }
});

test("probe corpus stores symptom-like health notes as health context", () => {
  const store = createTestCaptureStore();
  const applied = applyChatTurn(
    "my chest felt tight after running this morning",
    { items: store.items, reference: august },
    store.handlers,
  );
  const item = store.items[0];

  assert.equal(applied.results[0]?.status, "saved");
  assert.ok(item);
  assert.equal(item.destinations.includes("Health"), true);
  assert.match(item.understanding ?? "", /health signal/i);
});

test("tight money language remains money context, not a health symptom", () => {
  const store = createTestCaptureStore();
  applyChatTurn(
    "budget felt tight this month",
    { items: store.items, reference: august },
    store.handlers,
  );
  const item = store.items[0];

  assert.ok(item);
  assert.equal(item.destinations.includes("Finance"), true);
  assert.equal(item.destinations.includes("Health"), false);
  assert.match(item.understanding ?? "", /money concern/i);
});

test("password reset reminder is stored without secret handling or generic goals", () => {
  const store = createTestCaptureStore();
  applyChatTurn(
    "bank password reset tomorrow",
    { items: store.items, reference: august },
    store.handlers,
  );
  const item = store.items[0];

  assert.ok(item);
  assert.equal(item.destinations.includes("Finance"), true);
  assert.equal(item.destinations.includes("Calendar"), true);
  assert.equal(item.destinations.includes("Goals"), false);
  assert.doesNotMatch(item.understanding ?? "", /secret|password is/i);
});

test("feeling off lately is health context, not generic goal progress", () => {
  const store = createTestCaptureStore();
  applyChatTurn(
    "I feel off lately",
    { items: store.items, reference: august },
    store.handlers,
  );
  const item = store.items[0];

  assert.ok(item);
  assert.equal(item.destinations.includes("Health"), true);
  assert.equal(item.destinations.includes("Goals"), false);
  assert.match(item.understanding ?? "", /health signal/i);
});

test("appointment move updates existing memory without adding finance", () => {
  const store = createTestCaptureStore();
  applyChatTurn(
    "dentist appointment Thursday at 3pm",
    { items: store.items, reference: august },
    store.handlers,
  );
  const originalId = store.items[0]?.id;

  const moved = applyChatTurn(
    "move it to Friday",
    { items: store.items, reference: august },
    store.handlers,
  );
  const item = store.items[0];

  assert.equal(moved.results[0]?.status, "saved");
  assert.equal(moved.results[0]?.status === "saved" ? moved.results[0].kind : null, "edit");
  assert.equal(store.items.length, 1);
  assert.equal(item?.id, originalId);
  assert.match(item?.title ?? "", /dentist appointment/i);
  assert.equal(item?.destinations.includes("Health"), true);
  assert.equal(item?.destinations.includes("Calendar"), true);
  assert.equal(item?.destinations.includes("Finance"), false);
  assert.equal(item?.timeline?.startDate, "2026-08-21");
  assert.match(item?.understanding ?? "", /friday|tomorrow/i);
});

test("work standup time correction updates existing work memory", () => {
  const store = createTestCaptureStore();
  applyChatTurn(
    "work standup tomorrow at 9am",
    { items: store.items, reference: august },
    store.handlers,
  );
  const originalId = store.items[0]?.id;

  const corrected = applyChatTurn(
    "actually work standup is at 10am",
    { items: store.items, reference: august },
    store.handlers,
  );
  const item = store.items[0];

  assert.equal(corrected.results[0]?.status, "saved");
  assert.equal(corrected.results[0]?.status === "saved" ? corrected.results[0].kind : null, "edit");
  assert.equal(store.items.length, 1);
  assert.equal(item?.id, originalId);
  assert.equal(item?.destinations.includes("Work"), true);
  assert.equal(item?.destinations.includes("Calendar"), true);
  assert.equal(item?.destinations.includes("Finance"), false);
  assert.equal(item?.timeline?.startDate, "2026-08-21");
  assert.equal(item?.timeline?.startTime, "10:00");
});

test("missing birthday date asks first, then clear date creates one memory", () => {
  const store = createTestCaptureStore();
  const birthdayReference = new Date("2026-06-10T18:00:00");
  const missing = applyChatTurn(
    "remind me about mom's birthday next month",
    { items: store.items, reference: birthdayReference },
    store.handlers,
  );
  assert.equal(missing.results[0]?.status, "needs_clarification");
  assert.equal(store.items.length, 0);

  const supplied = applyChatTurn(
    "mom's birthday is July 12",
    { items: store.items, reference: birthdayReference },
    store.handlers,
  );
  const item = store.items[0];

  assert.equal(supplied.results[0]?.status, "saved");
  assert.equal(store.items.length, 1);
  assert.match(item?.title ?? "", /mom's birthday/i);
  assert.equal(item?.destinations.includes("Family"), true);
  assert.equal(item?.destinations.includes("Calendar"), true);
  assert.match(item?.understanding ?? "", /july 12/i);
});
