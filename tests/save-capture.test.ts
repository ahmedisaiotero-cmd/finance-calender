import assert from "node:assert/strict";

import type { CapturedSyncItem } from "@/lib/captured-items";
import {
  isSilentCaptureReady,
  prepareCaptureFromText,
  saveCapture,
} from "@/lib/sync-capture/save-capture";

const reference = new Date("2026-06-14T18:00:00");

const examples = [
  "I get paid Friday",
  "Mom's birthday is June 22",
  "I worked overtime today",
  "I went to the gym",
  "Rent is due next Friday",
] as const;

for (const text of examples) {
  const prepared = prepareCaptureFromText(text, { items: [], reference });
  assert.ok(prepared, `expected prepare to succeed for: ${text}`);
  assert.ok(prepared.destinations.length > 0);
  assert.ok(prepared.meaning);
  assert.ok(isSilentCaptureReady(prepared), `expected silent-ready for: ${text}`);
}

{
  const prepared = prepareCaptureFromText("I get paid Friday", {
    items: [],
    reference,
  });
  assert.ok(prepared);
  assert.match(prepared!.title, /Payday/i);

  const saved: CapturedSyncItem[] = [];
  const result = saveCapture(
    prepared!,
    (plan, destinations, title, extras) => {
      const item: CapturedSyncItem = {
        id: plan.id,
        title: title ?? plan.title,
        category: plan.category,
        prompt: plan.prompt,
        destinations,
        dateLabel: plan.dateLabel,
        timeLabel: plan.timeLabel,
        timeline: plan.timeline,
        meaning: extras?.meaning,
        status: "active",
        createdAt: reference.toISOString(),
        updatedAt: reference.toISOString(),
      };
      saved.push(item);
      return item;
    },
  );

  assert.ok(result);
  assert.equal(saved.length, 1);
  assert.match(saved[0].title, /Payday/i);
  assert.ok(saved[0].meaning);
}

console.log("save-capture tests passed");
