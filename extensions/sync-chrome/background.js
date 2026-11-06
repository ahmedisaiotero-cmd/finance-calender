importScripts("lib/detect-provider.js", "lib/queue.js", "lib/redact.js");

const SETTINGS_KEY = "syncCaptureSettings";

function nowIso() {
  return new Date().toISOString();
}

function fingerprint(text) {
  const normalized = String(text || "").trim().replace(/\s+/g, " ").slice(0, 4000);
  let hash = 2166136261;
  for (let i = 0; i < normalized.length; i += 1) {
    hash ^= normalized.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

async function getSettings() {
  const stored = await chrome.storage.local.get(SETTINGS_KEY);
  return stored[SETTINGS_KEY] || {};
}

async function setSettings(next) {
  const current = await getSettings();
  const merged = { ...current, ...next };
  await chrome.storage.local.set({ [SETTINGS_KEY]: merged });
  return merged;
}

function siteOrigin(siteUrl) {
  try {
    return new URL(siteUrl).origin;
  } catch {
    return null;
  }
}

async function ensureSitePermission(siteUrl) {
  const origin = siteOrigin(siteUrl);
  if (!origin) return { ok: false, error: "Invalid Sync site URL" };
  if (origin.startsWith("http://localhost") || origin.startsWith("http://127.0.0.1")) {
    return { ok: true };
  }
  const originPattern = `${origin}/*`;
  const already = await chrome.permissions.contains({ origins: [originPattern] });
  if (already) return { ok: true };
  const granted = await chrome.permissions.request({ origins: [originPattern] });
  return granted
    ? { ok: true }
    : { ok: false, error: "Permission to reach the Sync site was not granted." };
}

function redactMessages(messages) {
  return messages.map((message) => {
    const redacted = globalThis.SyncCaptureRedact.redactText(message.text || "");
    return {
      role: message.role || "unknown",
      text: redacted.text,
      redactedText: redacted.text,
      redactionStatus: redacted.redacted ? "client_redacted" : "already_clean",
    };
  });
}

function buildPayload(extracted, settings) {
  const capturedAt = nowIso();
  const messages = redactMessages(extracted.messages);
  const joined = messages.map((message) => message.text).join("\n");
  const id = `${extracted.provider}:${fingerprint(joined)}`;
  return {
    provider: extracted.provider,
    providerConversationId: id,
    idempotencyKey: `ext:${id}`,
    title: extracted.title,
    origin: extracted.origin,
    capturedAt,
    captureMethod: "extension",
    visibility: "summary_only",
    summary: extracted.title,
    messages,
    proof: {
      sourceKind: "chrome_extension",
      connectionId: settings.connectionId || "chrome-extension",
      actorKind: "user",
      eventKind: "import",
      evidenceKind: "source_record",
      verification: "self_reported",
      permissionScope: "ai_activity.capture.write",
      permissionState: "granted",
      summary: extracted.title || "Captured AI conversation.",
    },
  };
}

async function uploadPayload(payload, settings) {
  if (!settings.siteUrl) {
    return { ok: false, error: "Set the Sync site URL in the extension options." };
  }
  if (!settings.token && !settings.ownerSecret) {
    return { ok: false, error: "Pair the extension or save an owner secret." };
  }
  const response = await fetch(`${settings.siteUrl.replace(/\/$/, "")}/api/ai-activity/ingest`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${settings.token || settings.ownerSecret}`,
      "content-type": "application/json",
    },
    body: JSON.stringify(payload),
  });
  const json = await response.json().catch(() => ({}));
  if (!response.ok) {
    return { ok: false, error: json.error || `Upload failed (${response.status})` };
  }
  return { ok: true, result: json };
}

async function flushQueue() {
  const settings = await getSettings();
  const queue = await globalThis.SyncCaptureQueue.readQueue();
  const remaining = [];
  let uploaded = 0;
  for (const item of queue) {
    const sent = await uploadPayload(item.payload, settings);
    if (sent.ok) {
      uploaded += 1;
    } else {
      remaining.push({
        ...item,
        attempts: (item.attempts ?? 0) + 1,
        lastError: sent.error,
      });
    }
  }
  await globalThis.SyncCaptureQueue.writeQueue(remaining);
  return { uploaded, remaining: remaining.length };
}

async function pairWithCode(input) {
  const siteUrl = String(input.siteUrl || "").replace(/\/$/, "");
  const code = String(input.code || "").trim().toUpperCase();
  if (!siteUrl || !code) {
    return { ok: false, error: "Site URL and pairing code are required." };
  }
  const permission = await ensureSitePermission(siteUrl);
  if (!permission.ok) return permission;
  const response = await fetch(`${siteUrl}/api/ai-activity/pair/claim`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ code, label: input.label || "Chrome extension" }),
  });
  const json = await response.json().catch(() => ({}));
  if (!response.ok) {
    return { ok: false, error: json.error || "Pairing failed." };
  }
  const settings = await setSettings({
    siteUrl,
    token: json.token,
    connectionId: json.connectionId,
    ownerSecret: null,
    pairedAt: nowIso(),
  });
  return { ok: true, settings: publicSettings(settings) };
}

function publicSettings(settings) {
  return {
    siteUrl: settings.siteUrl || "",
    connectionId: settings.connectionId || null,
    paired: Boolean(settings.token),
    hasOwnerSecret: Boolean(settings.ownerSecret),
    pairedAt: settings.pairedAt || null,
  };
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  const run = async () => {
    if (message?.type === "SYNC_GET_STATE") {
      const settings = await getSettings();
      const queue = await globalThis.SyncCaptureQueue.readQueue();
      return { settings: publicSettings(settings), queue };
    }
    if (message?.type === "SYNC_SAVE_SETTINGS") {
      if (message.siteUrl) {
        const permission = await ensureSitePermission(message.siteUrl);
        if (!permission.ok) return permission;
      }
      const settings = await setSettings({
        siteUrl: message.siteUrl,
        ownerSecret: message.ownerSecret || null,
      });
      return { ok: true, settings: publicSettings(settings) };
    }
    if (message?.type === "SYNC_PAIR") {
      return pairWithCode(message);
    }
    if (message?.type === "SYNC_UNPAIR") {
      const settings = await setSettings({
        token: null,
        connectionId: null,
        pairedAt: null,
      });
      return { ok: true, settings: publicSettings(settings) };
    }
    if (message?.type === "SYNC_QUEUE_CAPTURE") {
      const settings = await getSettings();
      const payload = buildPayload(message.extracted, settings);
      await globalThis.SyncCaptureQueue.enqueue({
        id: payload.idempotencyKey,
        createdAt: payload.capturedAt,
        attempts: 0,
        lastError: null,
        payload,
      });
      const flushed = await flushQueue();
      return { ok: true, payload, flushed };
    }
    if (message?.type === "SYNC_FLUSH_QUEUE") {
      return { ok: true, flushed: await flushQueue() };
    }
    if (message?.type === "SYNC_CLEAR_QUEUE") {
      await globalThis.SyncCaptureQueue.clearQueue();
      return { ok: true };
    }
    return { ok: false, error: "Unknown message" };
  };

  run().then(sendResponse).catch((error) => {
    sendResponse({ ok: false, error: error instanceof Error ? error.message : "Failed" });
  });
  return true;
});
