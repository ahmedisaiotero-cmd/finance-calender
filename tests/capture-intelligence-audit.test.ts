import assert from "node:assert/strict";

import { createPulsePlan } from "@/lib/pulse/create-pulse-plan";
import {
  isSilentCaptureReady,
  prepareCaptureFromText,
} from "@/lib/sync-capture/save-capture";
import { cleanMemoryTitle } from "@/lib/sync-capture/memory-title";

const reference = new Date("2026-06-14T18:00:00");

function audit(text: string) {
  const plan = createPulsePlan(text, { timeline: { now: reference } });
  const prepared = prepareCaptureFromText(text, { items: [], reference });
  return { plan, prepared };
}

{
  const { plan, prepared } = audit("My girlfriend's birthday is April 25");
  assert.ok(prepared, "girlfriend birthday should prepare");
  assert.ok(isSilentCaptureReady(prepared!), "girlfriend birthday should be save-ready");
  assert.match(prepared!.title, /Girlfriend's Birthday/i);
  assert.ok(prepared!.destinations.includes("Relationships"));
  assert.ok(prepared!.destinations.includes("Calendar"));
  assert.equal(plan.timeline?.recurrence?.frequency, "yearly");
  assert.equal(plan.timeline?.recurrence?.month, 3);
  assert.equal(plan.timeline?.recurrence?.dayOfMonth, 25);
}

{
  const { plan, prepared } = audit("My mom's birthday is December 14");
  assert.ok(prepared);
  assert.ok(isSilentCaptureReady(prepared!));
  assert.match(prepared!.title, /Mom's Birthday/i);
  assert.ok(prepared!.destinations.includes("Family"));
  assert.equal(plan.timeline?.recurrence?.frequency, "yearly");
  assert.equal(plan.timeline?.recurrence?.month, 11);
  assert.equal(plan.timeline?.recurrence?.dayOfMonth, 14);
}

{
  const { plan, prepared } = audit("I get paid every other Thursday");
  assert.ok(prepared);
  assert.ok(isSilentCaptureReady(prepared!), "biweekly payday should be save-ready");
  assert.match(prepared!.title, /Payday/i);
  assert.ok(prepared!.destinations.includes("Finance"));
  assert.equal(plan.timeline?.kind, "recurring");
  assert.equal(plan.timeline?.recurrence?.frequency, "biweekly");
  assert.ok(plan.timeline?.startDate);
  assert.equal(plan.parsedInput?.moneyType, "income");
}

{
  const { plan, prepared } = audit("my girlfrienda bday is april 25");
  assert.ok(prepared);
  assert.ok(isSilentCaptureReady(prepared!));
  assert.match(cleanMemoryTitle({ title: prepared!.title, prompt: plan.prompt }), /Girlfriend's Birthday/i);
  assert.ok(prepared!.destinations.includes("Relationships"));
}

{
  const { plan, prepared } = audit("I don't work tomorrow");
  assert.ok(prepared);
  assert.ok(isSilentCaptureReady(prepared!));
  assert.equal(plan.parsedInput?.workAvailability, "off");
  assert.match(prepared!.title, /Day Off Tomorrow/i);
  assert.doesNotMatch(prepared!.title, /Work is tomorrow/i);
}

{
  const { prepared } = audit("I went to the gym yesterday");
  assert.ok(prepared);
  assert.ok(isSilentCaptureReady(prepared!));
  assert.match(prepared!.title, /Gym|Workout/i);
}

{
  const { prepared } = audit("I showered today");
  assert.ok(prepared);
  assert.ok(isSilentCaptureReady(prepared!));
  assert.match(prepared!.title, /Shower Logged/i);
}

console.log("capture-intelligence-audit tests passed");
