import assert from "node:assert/strict";

import {
  chatClientFailureMessage,
  shouldPersistChatCapture,
} from "@/lib/api/chat-client-safety";
import { getTimelineItemsFromSupabase } from "@/lib/supabase/timeline-items";

{
  assert.equal(shouldPersistChatCapture(200), true);
  assert.equal(shouldPersistChatCapture(201), true);
  assert.equal(shouldPersistChatCapture(401), false);
  assert.equal(shouldPersistChatCapture(429), false);
  assert.equal(shouldPersistChatCapture(500), false);
}

{
  assert.match(chatClientFailureMessage(401), /sign in/i);
  assert.match(
    chatClientFailureMessage(401, "Unauthorized"),
    /unauthorized/i,
  );
  assert.match(chatClientFailureMessage(429), /too many/i);
  assert.match(chatClientFailureMessage(0), /could not reach chat/i);
}

void assert
  .rejects(() => getTimelineItemsFromSupabase(2026, 5), /unscoped/i)
  .then(() => {
    console.log("chat-client-safety tests passed");
  });
