import assert from "node:assert/strict";

import {
  assessTomorrowLoad,
  headlineForTomorrowLoad,
  loadWeightForConsequence,
} from "@/lib/intelligence/life-load";
import type { SyncConsequence } from "@/lib/intelligence/sync-consequences";

function consequence(
  partial: Partial<SyncConsequence> & Pick<SyncConsequence, "surfaceText" | "kind">,
): SyncConsequence {
  return {
    id: partial.id ?? "test",
    sourceMemoryId: partial.sourceMemoryId ?? "mem",
    daysUntil: partial.daysUntil ?? 1,
    dateKey: partial.dateKey ?? "2026-06-15",
    priority: partial.priority ?? 10,
    horizon: partial.horizon ?? "coming_soon",
    area: partial.area ?? "calendar",
    briefEligible: partial.briefEligible ?? true,
    ...partial,
  };
}

{
  assert.equal(
    loadWeightForConsequence(
      consequence({ kind: "event", surfaceText: "Flight at 6:00 AM." }),
    ),
    4,
  );
  assert.equal(
    loadWeightForConsequence(
      consequence({ kind: "income", surfaceText: "Payday lands tomorrow." }),
    ),
    1,
  );
}

{
  const assessment = assessTomorrowLoad([
    consequence({ kind: "event", surfaceText: "Flight at 6:00 AM.", sortMinutes: 6 * 60 }),
    consequence({
      kind: "family_moment",
      surfaceText: "Take daughter to school tomorrow.",
    }),
    consequence({ kind: "work_start", surfaceText: "Work starts at 11:00 AM." }),
    consequence({
      kind: "relationship_moment",
      surfaceText: "Your friend's birthday is tomorrow.",
    }),
  ]);

  assert.equal(assessment.level, "heavy");
  assert.equal(assessment.earlyStart, true);
  assert.equal(
    headlineForTomorrowLoad(assessment, [
      consequence({ kind: "event", surfaceText: "Flight at 6:00 AM.", sortMinutes: 6 * 60 }),
      consequence({
        kind: "family_moment",
        surfaceText: "Take daughter to school tomorrow.",
      }),
      consequence({ kind: "work_start", surfaceText: "Work starts at 11:00 AM." }),
      consequence({
        kind: "relationship_moment",
        surfaceText: "Your friend's birthday is tomorrow.",
      }),
    ]),
    "Tomorrow starts early.",
  );
}

{
  const assessment = assessTomorrowLoad([
    consequence({ kind: "income", surfaceText: "Payday lands tomorrow." }),
  ]);
  assert.equal(assessment.level, "light");
}

console.log("life-load tests passed");
