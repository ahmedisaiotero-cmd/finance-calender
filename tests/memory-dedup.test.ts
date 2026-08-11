import assert from "node:assert/strict";

import type { CapturedSyncItem } from "@/lib/captured-items";
import {
  areMemoryDuplicates,
  areNoisyRelatedMemories,
  dedupeMemoryItems,
} from "@/lib/sync-capture/memory-dedup";
import { buildMemoryEntries } from "@/lib/mobile-prototype/format-memory-entry";
import { createTestTimelineResolution } from "@/tests/test-fixtures";

const reference = new Date("2026-06-14T18:00:00");

function birthdayItem(
  id: string,
  title: string,
  prompt: string,
  dateKey: string,
): CapturedSyncItem {
  return {
    id,
    title,
    category: "task",
    prompt,
    originalPrompt: prompt,
    destinations: ["Relationships"],
    dateLabel: "June 15",
    timeLabel: "Flexible",
    timeline: createTestTimelineResolution({
      timelineRole: "event",
      startDate: dateKey,
      label: "June 15",
    }),
    status: "active",
    createdAt: "2026-06-01T00:00:00.000Z",
    updatedAt: "2026-06-01T00:00:00.000Z",
  };
}

const friendBirthday = birthdayItem(
  "friend",
  "Friend's Birthday",
  "My friend's birthday is tomorrow",
  "2026-06-15",
);

const girlfriendBirthday = birthdayItem(
  "girlfriend",
  "Girlfriend's Birthday",
  "My girlfriend's birthday is tomorrow",
  "2026-06-15",
);

const girlfriendTypo = birthdayItem(
  "girlfriend-typo",
  "Girlfriends's Birthday",
  "My girlfriends's birthday is tomorrow",
  "2026-06-15",
);

assert.ok(
  areMemoryDuplicates(girlfriendBirthday, girlfriendTypo, reference),
  "typo variant should count as duplicate",
);

assert.ok(
  areNoisyRelatedMemories(friendBirthday, girlfriendTypo, reference),
  "typo variant should be noisy in related memories",
);

const deduped = dedupeMemoryItems(
  [friendBirthday, girlfriendBirthday, girlfriendTypo],
  reference,
);
assert.equal(deduped.length, 2, "should keep friend and girlfriend, drop typo duplicate");

const entries = buildMemoryEntries(
  [friendBirthday, girlfriendBirthday, girlfriendTypo],
  reference,
);
assert.equal(entries.length, 2, "memory list should hide duplicate-looking entries");

console.log("memory-dedup tests passed");
