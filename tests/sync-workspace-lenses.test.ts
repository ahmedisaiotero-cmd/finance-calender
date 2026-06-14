import assert from "node:assert/strict";

import { buildSidebarNavigation, resolveLifeAreaStates } from "@/lib/user-life-areas";
import { lensItemCount, lensNextLine } from "@/lib/sync-lens-copy";
import type { CapturedSyncItem } from "@/lib/captured-items";

const emptyStates = resolveLifeAreaStates({
  finance: false,
  health: false,
  work: false,
  relationships: false,
  school: false,
  goals: false,
});

{
  const nav = buildSidebarNavigation(emptyStates, true, {});
  const ids = nav.primary.map((item) => item.id);
  assert.deepEqual(ids, ["home", "calendar"]);
  assert.ok(!ids.includes("finance"));
  assert.ok(!ids.includes("health"));
}

{
  const nav = buildSidebarNavigation(
    resolveLifeAreaStates({
      finance: true,
      health: false,
      work: false,
      relationships: false,
      school: false,
      goals: false,
    }),
    true,
    {},
  );
  assert.ok(nav.primary.some((item) => item.id === "finance"));
  assert.ok(!nav.primary.some((item) => item.id === "health"));
}

{
  const nav = buildSidebarNavigation(emptyStates, true, {
    hasFamilyConnection: true,
    hasWorkConnection: false,
  });
  assert.ok(nav.primary.some((item) => item.id === "family"));
}

function capture(partial: Partial<CapturedSyncItem> & Pick<CapturedSyncItem, "id" | "title">) {
  return {
    category: "task" as const,
    prompt: partial.title,
    destinations: ["Family", "Calendar", "School"],
    dateLabel: "Tomorrow",
    timeLabel: "7:00 AM",
    status: "active" as const,
    createdAt: "2026-06-01T00:00:00.000Z",
    updatedAt: "2026-06-01T00:00:00.000Z",
    ...partial,
  } satisfies CapturedSyncItem;
}

{
  const items = [
    capture({
      id: "family-1",
      title: "Daughter's School Event",
      meaning: {
        importance: "high",
        meaningLabel: "Family commitment",
        summary: "Important family commitment.",
        protection: {
          eligible: true,
          recommended: true,
          protected: false,
        },
        suggestedActions: [],
      },
    }),
  ];

  assert.equal(lensItemCount(items, "family"), 1);
  assert.equal(lensItemCount(items, "school"), 1);
  assert.equal(lensItemCount(items, "finance"), 0);
  assert.match(lensNextLine(items, "family") ?? "", /Next: Tomorrow/i);
}

console.log("Sync workspace lens tests passed");
