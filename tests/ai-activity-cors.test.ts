import assert from "node:assert/strict";

import {
  aiActivityCorsHeaders,
  isAllowedAiActivityOrigin,
  parseAllowedExtensionIds,
} from "@/lib/api/ai-activity-cors";

const extensionId = "abcdefghijklmnopabcdefghijklmnop";

{
  assert.deepEqual(parseAllowedExtensionIds({}), []);
  assert.deepEqual(parseAllowedExtensionIds({ SYNC_EXTENSION_IDS: extensionId }), [
    extensionId,
  ]);
}

{
  const env = { SYNC_EXTENSION_IDS: extensionId, NODE_ENV: "production" };
  assert.equal(
    isAllowedAiActivityOrigin(`chrome-extension://${extensionId}`, env),
    true,
  );
  assert.equal(
    isAllowedAiActivityOrigin("chrome-extension://zzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzz", env),
    false,
  );
  assert.equal(isAllowedAiActivityOrigin("http://localhost:3000", env), false);
}

{
  const env = { NODE_ENV: "development" };
  assert.equal(isAllowedAiActivityOrigin("http://localhost:3000", env), true);
  assert.equal(isAllowedAiActivityOrigin("http://127.0.0.1:3000", env), true);
  assert.equal(
    isAllowedAiActivityOrigin(`chrome-extension://${extensionId}`, env),
    false,
  );
}

{
  const env = { SYNC_EXTENSION_IDS: extensionId, NODE_ENV: "production" };
  const allowed = new Request("http://localhost/api/ai-activity/ingest", {
    headers: { origin: `chrome-extension://${extensionId}` },
  });
  const headers = aiActivityCorsHeaders(allowed, env) as Record<string, string>;
  assert.equal(headers["Access-Control-Allow-Origin"], `chrome-extension://${extensionId}`);
  assert.equal(
    String(headers["Access-Control-Allow-Headers"] ?? "").includes("x-sync-owner-secret"),
    false,
  );

  const denied = new Request("http://localhost/api/ai-activity/ingest", {
    headers: { origin: "https://evil.example" },
  });
  assert.deepEqual(aiActivityCorsHeaders(denied, env), {});
}

console.log("ai-activity-cors tests passed");
