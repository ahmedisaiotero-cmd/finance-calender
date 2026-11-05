import assert from "node:assert/strict";

import { prepareAiCaptureForPersistence } from "@/lib/ai-activity/prepare-capture";
import { redactAiTranscriptText } from "@/lib/ai-activity/redaction";
import {
  validateAiConversationCapturePayload,
} from "@/lib/ai-activity/validation";
import type { AiLink, AiLinkBasis, AiLinkRelationship } from "@/lib/ai-activity/types";

const payload = {
  provider: "chatgpt",
  providerConversationId: "conversation-with-secret",
  idempotencyKey: "capture-1",
  title: "ChatGPT budget plan",
  origin: "https://chatgpt.com/c/abc",
  capturedAt: "2026-11-05T20:00:00.000Z",
  captureMethod: "extension",
  messages: [
    {
      providerMessageId: "m-1",
      role: "user",
      text: "My password is hunter2 and account number 123456789012.",
      sentAt: "2026-11-05T19:59:00.000Z",
    },
    {
      providerMessageId: "m-2",
      role: "assistant",
      redactedText: "Use the safer budget plan.",
      redactionStatus: "client_redacted",
    },
  ],
  proof: {
    connectionId: "extension-install-1",
    summary: "Captured a ChatGPT budget plan.",
  },
};

{
  const validated = validateAiConversationCapturePayload(payload);
  assert.equal(validated.ok, true);
  if (!validated.ok) throw new Error("expected valid payload");

  assert.equal(validated.value.origin, "https://chatgpt.com");
  assert.equal(validated.value.proof.sourceKind, "chrome_extension");
  assert.equal(validated.value.proof.permissionScope, "ai_activity.capture.write");

  const prepared = prepareAiCaptureForPersistence(validated.value);
  assert.equal(prepared.messages.length, 2);
  assert.equal(prepared.messages[0].text.includes("hunter2"), false);
  assert.equal(prepared.messages[0].text.includes("123456789012"), false);
  assert.equal(prepared.messages[0].redactionStatus, "server_redacted");
  assert.equal(prepared.messages[0].visibility, "sensitive");
  assert.equal(prepared.activityEvent.kind, "import");
  assert.equal(prepared.activityEvent.verification, "system_logged");
  assert.equal(prepared.activityEvent.source.connectionId, "extension-install-1");
}

{
  const invalidProvider = validateAiConversationCapturePayload({
    ...payload,
    provider: "not-real",
  });
  assert.equal(invalidProvider.ok, false);

  const invalidOrigin = validateAiConversationCapturePayload({
    ...payload,
    origin: "https://claude.ai/chat",
  });
  assert.equal(invalidOrigin.ok, false);

  const invalidRole = validateAiConversationCapturePayload({
    ...payload,
    messages: [{ role: "developer", text: "nope" }],
  });
  assert.equal(invalidRole.ok, false);
}

{
  const redacted = redactAiTranscriptText(
    "Authorization: Bearer abcdef1234567890 and API key sk-ABCDEFGHIJKLMNOP1234567890",
  );
  assert.equal(redacted.redacted, true);
  assert.equal(redacted.text.includes("abcdef1234567890"), false);
  assert.equal(redacted.text.includes("sk-ABCDEFGHIJKLMNOP"), false);
}

{
  const relationship: AiLinkRelationship = "supersedes";
  const basis: AiLinkBasis = "user_confirmed";
  const link: AiLink = {
    id: "link-1",
    ownerId: "owner-1",
    fromEventId: "event-a",
    toEventId: "event-b",
    relationship,
    confidence: 0.9,
    basis,
    evidence: [
      {
        kind: "user_statement",
        description: "Ahmed confirmed the later Claude advice superseded the Grok plan.",
      },
    ],
    createdAt: "2026-11-05T20:00:00.000Z",
    confirmedAt: "2026-11-05T20:01:00.000Z",
    rejectedAt: null,
  };
  assert.equal(link.relationship, "supersedes");
  assert.equal(link.basis, "user_confirmed");
}

console.log("ai-activity-contract tests passed");
