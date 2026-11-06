import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { detectAiProviderFromUrl } from "@/lib/ai-activity/providers";

const require = createRequire(import.meta.url);
const extensionRoot = join(
  dirname(fileURLToPath(import.meta.url)),
  "../extensions/sync-chrome",
);

const manifest = JSON.parse(
  readFileSync(join(extensionRoot, "manifest.json"), "utf8"),
) as {
  manifest_version: number;
  background?: { service_worker?: string };
  permissions?: string[];
  host_permissions?: string[];
  content_scripts?: Array<{ matches?: string[]; js?: string[] }>;
  action?: { default_popup?: string };
  options_page?: string;
};

const detect = require(join(extensionRoot, "lib/detect-provider.js")) as {
  detectAiProviderFromUrl: (value: string) => {
    provider: string;
    origin: string;
  } | null;
  HOSTS: Array<{ host: string; provider: string }>;
};

const redact = require(join(extensionRoot, "lib/redact.js")) as {
  redactText: (text: string) => { text: string; redacted: boolean };
};

{
  assert.equal(manifest.manifest_version, 3);
  assert.equal(manifest.background?.service_worker, "background.js");
  assert.equal(manifest.action?.default_popup, "popup.html");
  assert.equal(manifest.options_page, "options.html");
  assert.ok(manifest.permissions?.includes("storage"));
  assert.ok(manifest.permissions?.includes("activeTab"));
  assert.equal(manifest.permissions?.includes("webRequest"), false);
  assert.equal(manifest.host_permissions?.includes("<all_urls>"), false);

  const matches = manifest.content_scripts?.flatMap((script) => script.matches ?? []) ?? [];
  for (const expected of [
    "https://chatgpt.com/*",
    "https://claude.ai/*",
    "https://grok.com/*",
    "https://x.com/*",
    "https://cursor.com/*",
    "https://gemini.google.com/*",
  ]) {
    assert.ok(matches.includes(expected), `missing content script match ${expected}`);
  }
}

{
  const samples = [
    "https://chatgpt.com/c/abc",
    "https://claude.ai/chat/1",
    "https://grok.com/chat/1",
    "https://x.com/i/grok",
    "https://x.com/home",
    "https://cursor.com/agents",
    "https://gemini.google.com/app",
    "https://example.com",
  ];
  for (const url of samples) {
    const fromLib = detectAiProviderFromUrl(url);
    const fromExtension = detect.detectAiProviderFromUrl(url);
    assert.deepEqual(fromExtension, fromLib);
  }
}

{
  const redacted = redact.redactText(
    "Keep this, not sk-ABCDEFGHIJKLMNOP1234567890 or 4242 4242 4242 4242",
  );
  assert.equal(redacted.redacted, true);
  assert.equal(redacted.text.includes("sk-ABCDEFGHIJKLMNOP"), false);
  assert.equal(redacted.text.includes("4242"), false);
}

console.log("ai-activity-extension tests passed");
