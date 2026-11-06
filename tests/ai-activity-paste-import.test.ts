import assert from "node:assert/strict";

import { prepareAiCaptureForPersistence } from "@/lib/ai-activity/prepare-capture";
import {
  buildPasteImportPayload,
  parsePastedTranscript,
} from "@/lib/ai-activity/paste-import";
import { detectAiProviderFromUrl } from "@/lib/ai-activity/providers";
import { validateAiConversationCapturePayload } from "@/lib/ai-activity/validation";

const grokPlanPaste = `
User: I need a plan for launching Sync this week. Don't put the API key sk-ABCDEFGHIJKLMNOP1234567890 in anything we save.

Grok: Here is the launch plan.
1. Paste the cleaned Grok thread into Sync.
2. Pair the Chrome extension tomorrow.
3. Keep the owner secret out of the transcript.

Assistant: I can also draft the Friday checklist after you confirm the pairing step.
`.trim();

{
  const messages = parsePastedTranscript(grokPlanPaste);
  assert.equal(messages.length, 3);
  assert.equal(messages[0].role, "user");
  assert.equal(messages[1].role, "assistant");
  assert.equal(messages[2].role, "assistant");
  assert.match(messages[0].text, /launching Sync this week/);
}

{
  const unlabeled = parsePastedTranscript("Just a cleaned note from Claude.");
  assert.deepEqual(unlabeled, [
    { role: "user", text: "Just a cleaned note from Claude." },
  ]);
}

{
  const built = buildPasteImportPayload({
    provider: "grok",
    transcript: grokPlanPaste,
    capturedAt: "2026-11-06T02:00:00.000Z",
  });
  assert.equal(built.ok, true);
  if (!built.ok) throw new Error("expected paste payload");

  assert.equal(built.payload.captureMethod, "paste_import");
  assert.equal(built.payload.provider, "grok");
  assert.equal(built.payload.origin, "https://grok.com");
  assert.equal(built.payload.proof?.sourceKind, "paste_import");
  const firstPasted = built.payload.messages[0];
  assert.ok(firstPasted);
  assert.equal((firstPasted.text ?? "").includes("sk-ABCDEFGHIJKLMNOP"), false);

  const validated = validateAiConversationCapturePayload(built.payload);
  if (!validated.ok) throw new Error(validated.error);

  const prepared = prepareAiCaptureForPersistence(validated.value);
  assert.equal(prepared.captureMethod, "paste_import");
  assert.equal(prepared.messages.length, 3);
  assert.equal(prepared.activityEvent.kind, "import");
  assert.equal(prepared.activityEvent.source.connectionId, "paste-import");
  assert.equal(prepared.messages[0].text.includes("sk-ABCDEFGHIJKLMNOP"), false);
  assert.equal(prepared.messages[0].redactionStatus, "client_redacted");
  assert.match(prepared.summary ?? "", /plan for launching Sync/i);
}

{
  const empty = buildPasteImportPayload({
    provider: "grok",
    transcript: "   ",
  });
  assert.equal(empty.ok, false);
}

{
  assert.deepEqual(detectAiProviderFromUrl("https://chatgpt.com/c/abc"), {
    provider: "chatgpt",
    origin: "https://chatgpt.com",
  });
  assert.deepEqual(detectAiProviderFromUrl("https://claude.ai/chat/1"), {
    provider: "claude",
    origin: "https://claude.ai",
  });
  assert.deepEqual(detectAiProviderFromUrl("https://grok.com/chat/1"), {
    provider: "grok",
    origin: "https://grok.com",
  });
  assert.deepEqual(detectAiProviderFromUrl("https://x.com/i/grok"), {
    provider: "grok",
    origin: "https://x.com",
  });
  assert.equal(detectAiProviderFromUrl("https://x.com/home"), null);
  assert.deepEqual(detectAiProviderFromUrl("https://cursor.com/agents"), {
    provider: "cursor",
    origin: "https://cursor.com",
  });
  assert.deepEqual(detectAiProviderFromUrl("https://gemini.google.com/app"), {
    provider: "gemini",
    origin: "https://gemini.google.com",
  });
  assert.equal(detectAiProviderFromUrl("https://example.com"), null);
}

console.log("ai-activity-paste-import tests passed");
