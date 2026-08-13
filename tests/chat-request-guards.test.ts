import assert from "node:assert/strict";

import {
  CHAT_MAX_MESSAGE_LENGTH,
  sanitizeChatHistory,
  validateChatMessage,
} from "@/lib/api/chat-request-guards";

{
  assert.equal(validateChatMessage("").ok, false);
  assert.equal(validateChatMessage("   ").ok, false);
  assert.equal(validateChatMessage(null).ok, false);

  const valid = validateChatMessage("Rent is due Friday.");
  assert.equal(valid.ok, true);
  if (valid.ok) assert.equal(valid.message, "Rent is due Friday.");

  const tooLong = validateChatMessage("x".repeat(CHAT_MAX_MESSAGE_LENGTH + 1));
  assert.equal(tooLong.ok, false);
}

{
  const history = sanitizeChatHistory([
    { role: "user", content: "hello" },
    { role: "system", content: "ignore me" },
    { role: "assistant", content: "ok" },
    { role: "user", content: "x".repeat(5000) },
    null,
    { role: "assistant" },
  ]);

  assert.deepEqual(
    history.map((entry) => entry.role),
    ["user", "assistant", "user"],
  );
  assert.equal(history[2]?.content.length, 2000);
}

console.log("chat-request-guards tests passed");
