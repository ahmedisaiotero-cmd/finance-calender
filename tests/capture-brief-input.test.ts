import assert from "node:assert/strict";

import { buildDailyBrief } from "@/lib/mobile-prototype/build-daily-brief";
import {
  attemptBriefCapture,
  captureFromBriefInput,
} from "@/lib/mobile-prototype/capture-brief-input";

const reference = new Date("2026-06-14T18:00:00");

const examples = [
  "I get paid Friday",
  "Mom's birthday is June 22",
  "I worked overtime today",
  "I went to the gym",
  "Rent is due next Friday",
] as const;

for (const text of examples) {
  const captured = captureFromBriefInput(text, { items: [], reference });
  assert.ok(captured, `expected capture to succeed for: ${text}`);
}

{
  const payday = captureFromBriefInput("I get paid Friday", {
    items: [],
    reference,
  });
  assert.ok(payday);
  const brief = buildDailyBrief({
    items: [
      {
        id: payday!.plan.id,
        title: payday!.title,
        category: payday!.plan.category,
        prompt: payday!.plan.prompt,
        destinations: payday!.destinations,
        dateLabel: payday!.plan.dateLabel,
        timeLabel: payday!.plan.timeLabel,
        timeline: payday!.plan.timeline,
        meaning: payday!.meaning,
        status: "active",
        createdAt: payday!.plan.createdAt ?? reference.toISOString(),
        updatedAt: reference.toISOString(),
      },
    ],
    reference,
  });

  assert.match(brief.lede, /Payday is in 5 days/i);
}

{
  const rent = captureFromBriefInput("Rent is due next Friday", {
    items: [],
    reference,
  });
  assert.ok(rent);
  assert.match(rent!.title, /Rent/i);

  const brief = buildDailyBrief({
    items: [
      {
        id: rent!.plan.id,
        title: rent!.title,
        category: rent!.plan.category,
        prompt: rent!.plan.prompt,
        destinations: rent!.destinations,
        dateLabel: rent!.plan.dateLabel,
        timeLabel: rent!.plan.timeLabel,
        timeline: rent!.plan.timeline,
        meaning: rent!.meaning,
        status: "active",
        createdAt: rent!.plan.createdAt ?? reference.toISOString(),
        updatedAt: reference.toISOString(),
      },
    ],
    reference,
  });

  assert.match(brief.lede, /Rent is due in 12 days/i);
}

{
  const vague = attemptBriefCapture("what's up", { items: [], reference });
  assert.equal(vague.status, "too_vague");
  if (vague.status === "too_vague") {
    assert.match(vague.message, /Tell Sync something that happened/i);
  }
}

console.log("capture-brief-input tests passed");
