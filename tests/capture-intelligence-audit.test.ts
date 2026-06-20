import assert from "node:assert/strict";

import { createPulsePlan } from "@/lib/pulse/create-pulse-plan";
import { resolveSyncDestinations } from "@/lib/pulse/resolve-sync-destinations";
import {
  isSilentCaptureReady,
  prepareCaptureFromText,
} from "@/lib/sync-capture/save-capture";

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

console.log("capture-intelligence-audit tests passed");
