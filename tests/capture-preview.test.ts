import assert from "node:assert/strict";

import { buildCapturePreview } from "@/lib/mobile-prototype/build-capture-preview";
import {
  commitPreparedCapture,
  captureFromBriefInput,
} from "@/lib/mobile-prototype/capture-brief-input";
import { buildCaptureConfirmation } from "@/lib/mobile-prototype/build-capture-confirmation";
import { buildDailyBrief } from "@/lib/mobile-prototype/build-daily-brief";
import { buildLifeTimelineView } from "@/lib/mobile-prototype/build-life-timeline";
import { buildMyLifeOverview } from "@/lib/mobile-prototype/build-my-life";
import { previewCaptureInput } from "@/lib/mobile-prototype/preview-capture-input";
import { createTestCaptureStore } from "@/tests/test-capture-handlers";

const reference = new Date("2026-06-14T18:00:00");

const workSchedule = {
  days: ["SU", "MO", "TU", "WE"],
  startTime: "11:00",
  endTime: "21:00",
  recurrence: {
    frequency: "weekly" as const,
    interval: 1 as const,
    startsOn: "2026-06-01",
    endsOn: null,
  },
  status: "active" as const,
};

function preview(text: string) {
  const store = createTestCaptureStore();
  const result = previewCaptureInput(
    text,
    { items: store.items, reference, workSchedule },
  );
  assert.equal(result.status, "ready", `expected preview for: ${text}`);
  return { store, result: result as Extract<typeof result, { status: "ready" }> };
}

function expectPreview(
  text: string,
  expected: {
    title: string | RegExp;
    areaLine: string | RegExp;
    destinations: string[];
  },
) {
  const { result } = preview(text);
  const built = buildCapturePreview(result.prepared, reference);

  if (typeof expected.title === "string") {
    assert.equal(built.title, expected.title);
  } else {
    assert.match(built.title, expected.title);
  }

  if (typeof expected.areaLine === "string") {
    assert.equal(built.areaLine, expected.areaLine);
  } else {
    assert.match(built.areaLine, expected.areaLine);
  }

  for (const destination of expected.destinations) {
    assert.ok(
      built.destinations.includes(destination),
      `expected destination ${destination} in ${built.destinations.join(", ")}`,
    );
  }

  return result;
}

expectPreview("i worked today on a project from 8pm to 10pm", {
  title: "Project work",
  areaLine: /Work · Today, 8:00 PM–10:00 PM/i,
  destinations: ["Work", "Life Timeline"],
});

expectPreview("workout at 8pm", {
  title: "Workout",
  areaLine: /Health · Tonight at 8:00 PM/i,
  destinations: ["Health", "Life Timeline"],
});

expectPreview("payday tomorrow at 5am", {
  title: "Payday",
  areaLine: /Money · Tomorrow at 5:00 AM/i,
  destinations: ["Money", "Life Timeline"],
});

expectPreview("rent due friday", {
  title: "Rent",
  areaLine: /Money · Friday/i,
  destinations: ["Money", "Life Timeline"],
});

expectPreview("i was sad today", {
  title: "Emotional check-in",
  areaLine: /Health · Today/i,
  destinations: ["Health"],
});

expectPreview("coffee this morning", {
  title: "Coffee",
  areaLine: /Personal · Today/i,
  destinations: ["Personal"],
});

expectPreview("mom birthday tomorrow", {
  title: /Mom's Birthday/i,
  areaLine: /Family · Tomorrow/i,
  destinations: ["Family", "Life Timeline"],
});

expectPreview("my anniversary is friday", {
  title: "Anniversary",
  areaLine: /Relationships · Friday/i,
  destinations: ["Relationships", "Life Timeline"],
});

{
  const { store, result } = preview("workout at 8pm");
  assert.equal(store.items.length, 0);

  const attempt = commitPreparedCapture(
    result.prepared,
    { items: store.items, reference, workSchedule },
    result.sourceMeta,
    store.handlers,
  );
  assert.equal(attempt.status, "saved");
  assert.equal(store.items.length, 1);
  assert.equal(store.items[0]?.title, result.prepared.title);

  const confirmation = buildCaptureConfirmation(store.items[0]!, {
    reference,
    consequences:
      buildDailyBrief({ items: store.items, reference, workSchedule })
        .consequences ?? [],
  });
  assert.equal(confirmation.headline, "Remembered.");

  const timeline = buildLifeTimelineView({
    consequences:
      buildDailyBrief({ items: store.items, reference, workSchedule })
        .consequences ?? [],
    items: store.items,
    reference,
  });
  assert.ok(
    timeline.groups.some((group) =>
      group.entries.some((entry) => /workout/i.test(entry.text)),
    ),
  );
}

{
  const store = createTestCaptureStore();
  const cancelled = previewCaptureInput("workout at 8pm", {
    items: store.items,
    reference,
    workSchedule,
  });
  assert.equal(cancelled.status, "ready");
  assert.equal(store.items.length, 0);
}

{
  const { result } = preview("i worked today on a project from 8pm to 10pm");
  const store = createTestCaptureStore();
  commitPreparedCapture(
    result.prepared,
    { items: store.items, reference, workSchedule },
    result.sourceMeta,
    store.handlers,
  );

  const direct = captureFromBriefInput(
    "i worked today on a project from 8pm to 10pm",
    { items: [], reference, workSchedule },
    createTestCaptureStore().handlers,
  );
  assert.equal(direct?.title, result.prepared.title);

  const myLife = buildMyLifeOverview({
    items: store.items,
    consequences:
      buildDailyBrief({ items: store.items, reference, workSchedule })
        .consequences ?? [],
    reference,
  });
  assert.ok(myLife.rows.some((row) => row.label === "Work"));
}

console.log("capture-preview tests passed");
