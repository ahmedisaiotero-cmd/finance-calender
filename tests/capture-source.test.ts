import assert from "node:assert/strict";

import {
  captureSourceMetadata,
  resolveCaptureText,
  toSyncCaptureInput,
} from "@/lib/sync-capture/capture-source";
import { captureFromBriefInput } from "@/lib/mobile-prototype/capture-brief-input";
import { createTestCaptureStore } from "@/tests/test-capture-handlers";

const reference = new Date("2026-06-14T18:00:00");

{
  assert.equal(resolveCaptureText("  workout at 8pm  "), "workout at 8pm");
  assert.equal(
    resolveCaptureText({ text: "  rent due friday  ", source: "typed" }),
    "rent due friday",
  );
}

{
  const typed = captureSourceMetadata("payday tomorrow");
  assert.equal(typed.captureSource, "typed");
  assert.equal(typed.voiceTranscript, undefined);

  const voice = captureSourceMetadata({
    text: "workout at 8pm",
    source: "voice",
    transcript: "workout at 8pm",
  });
  assert.equal(voice.captureSource, "voice");
  assert.equal(voice.voiceTranscript, "workout at 8pm");
}

{
  const input = toSyncCaptureInput("felt weird today", {
    captureSource: "voice",
    voiceTranscript: "felt weird today",
  });
  assert.equal(input.source, "voice");
  assert.equal(input.transcript, "felt weird today");
}

{
  const store = createTestCaptureStore();
  captureFromBriefInput(
    { text: "coffee this morning", source: "voice", transcript: "coffee this morning" },
    { items: store.items, reference },
    store.handlers,
  );
  assert.equal(store.items[0]?.captureSource, "voice");
  assert.equal(store.items[0]?.voiceTranscript, "coffee this morning");
  assert.ok(store.items[0]?.prompt);
}

console.log("capture-source tests passed");
