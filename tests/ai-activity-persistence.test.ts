import assert from "node:assert/strict";

import {
  aiActivityEventOwnerWhere,
  aiConversationOwnerWhere,
} from "@/lib/db/ai-activity";
import { prepareAiCaptureForPersistence } from "@/lib/ai-activity/prepare-capture";
import { validateAiConversationCapturePayload } from "@/lib/ai-activity/validation";

{
  assert.deepEqual(aiConversationOwnerWhere("owner-a", "conversation-1"), {
    id: "conversation-1",
    ownerId: "owner-a",
  });
  assert.deepEqual(aiActivityEventOwnerWhere("owner-b", "event-1"), {
    id: "event-1",
    ownerId: "owner-b",
  });
}

{
  const first = validateAiConversationCapturePayload({
    provider: "grok",
    providerConversationId: "planning-thread",
    idempotencyKey: "grok-plan-1",
    origin: "https://grok.com/chat/1",
    capturedAt: "2026-11-05T20:00:00.000Z",
    captureMethod: "extension",
    messages: [{ role: "assistant", text: "Plan with card 4242 4242 4242 4242" }],
  });
  const second = validateAiConversationCapturePayload({
    provider: "grok",
    providerConversationId: "planning-thread",
    idempotencyKey: "grok-plan-1",
    origin: "https://grok.com/chat/1",
    capturedAt: "2026-11-05T20:00:00.000Z",
    captureMethod: "extension",
    messages: [{ role: "assistant", text: "Plan with card 4242 4242 4242 4242" }],
  });

  assert.equal(first.ok, true);
  assert.equal(second.ok, true);
  if (!first.ok || !second.ok) throw new Error("expected valid captures");

  const preparedFirst = prepareAiCaptureForPersistence(first.value);
  const preparedSecond = prepareAiCaptureForPersistence(second.value);

  assert.equal(
    preparedFirst.providerConversationRef,
    preparedSecond.providerConversationRef,
  );
  assert.equal(
    preparedFirst.activityEvent.correlationId,
    preparedSecond.activityEvent.correlationId,
  );
  assert.equal(preparedFirst.messages[0].text.includes("4242"), false);
  assert.equal(preparedFirst.messages[0].redactionStatus, "server_redacted");
}

console.log("ai-activity-persistence tests passed");
