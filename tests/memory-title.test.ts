import assert from "node:assert/strict";

import { prepareCaptureFromText } from "@/lib/sync-capture/save-capture";
import { cleanMemoryTitle, displayMemoryTitle } from "@/lib/sync-capture/memory-title";
import type { CapturedSyncItem } from "@/lib/captured-items";

const reference = new Date("2026-06-14T18:00:00");

const titleCases = [
  {
    prompt: "my moms bday is on december 14",
    expected: "Mom's Birthday",
  },
  {
    prompt: "my girlfrienda bday is april 25",
    expected: "Girlfriend's Birthday",
  },
  {
    prompt: "i get paid every other thursday",
    expected: "Payday",
  },
  {
    prompt: "i showered today",
    expected: "Shower Logged",
  },
  {
    prompt: "anniversary is on friday",
    expected: "Anniversary",
  },
] as const;

for (const { prompt, expected } of titleCases) {
  const prepared = prepareCaptureFromText(prompt, { items: [], reference });
  assert.ok(prepared, `expected prepare for: ${prompt}`);
  assert.equal(prepared!.title, expected, `save title for: ${prompt}`);
}

for (const { prompt, expected } of titleCases) {
  const messyTitle = prompt;
  assert.equal(
    cleanMemoryTitle({ title: messyTitle, prompt }),
    expected,
    `clean title for: ${prompt}`,
  );
}

{
  const item: CapturedSyncItem = {
    id: "legacy-mom",
    title: "Ny Moms Bday Is",
    category: "date-night",
    prompt: "my moms bday is on december 14",
    originalPrompt: "my moms bday is on december 14",
    destinations: ["Family", "Calendar"],
    dateLabel: "December 14",
    timeLabel: "Flexible",
    status: "active",
    createdAt: reference.toISOString(),
    updatedAt: reference.toISOString(),
  };

  assert.equal(displayMemoryTitle(item), "Mom's Birthday");
}

console.log("memory-title tests passed");
