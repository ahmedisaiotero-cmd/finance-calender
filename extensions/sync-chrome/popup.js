const providerEl = document.getElementById("provider");
const pairingEl = document.getElementById("pairing");
const queueEl = document.getElementById("queue");
const statusEl = document.getElementById("status");
const saveButton = document.getElementById("save");

function send(type, extra = {}) {
  return chrome.runtime.sendMessage({ type, ...extra });
}

async function activeTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab;
}

async function tabMessage(tabId, message) {
  return chrome.tabs.sendMessage(tabId, message);
}

function renderState(state, page) {
  if (!page?.supported) {
    providerEl.textContent = "Open ChatGPT, Claude, Grok, Cursor, or Gemini.";
    saveButton.disabled = true;
  } else {
    providerEl.textContent = `${page.detected.provider} detected. Capture is manual.`;
    saveButton.disabled = false;
  }

  if (state.settings.paired) {
    pairingEl.textContent = `Paired${state.settings.connectionId ? ` · ${state.settings.connectionId}` : ""}.`;
  } else if (state.settings.hasOwnerSecret) {
    pairingEl.textContent = "Using owner secret. Pairing is better.";
  } else {
    pairingEl.textContent = "Not paired. Open Options.";
  }

  const queued = state.queue?.length ?? 0;
  queueEl.textContent =
    queued === 0
      ? "Queue is empty."
      : `${queued} item${queued === 1 ? "" : "s"} waiting.`;
}

async function refresh() {
  const tab = await activeTab();
  const state = await send("SYNC_GET_STATE");
  let page = { supported: false };
  if (tab?.id) {
    try {
      page = await tabMessage(tab.id, { type: "SYNC_PAGE_INFO" });
    } catch {
      page = { supported: false };
    }
  }
  renderState(state, page);
}

saveButton.addEventListener("click", async () => {
  statusEl.textContent = "Saving…";
  const tab = await activeTab();
  if (!tab?.id) {
    statusEl.textContent = "No active tab.";
    return;
  }
  try {
    const extracted = await tabMessage(tab.id, { type: "SYNC_EXTRACT" });
    if (!extracted?.ok) {
      statusEl.textContent = extracted?.error || "Nothing to save.";
      return;
    }
    const result = await send("SYNC_QUEUE_CAPTURE", { extracted });
    if (!result?.ok) {
      statusEl.textContent = result?.error || "Could not queue the capture.";
      return;
    }
    const remaining = result.flushed?.remaining ?? 0;
    statusEl.textContent =
      remaining === 0
        ? "Saved to Sync."
        : `Queued. ${remaining} item${remaining === 1 ? "" : "s"} still waiting.`;
    await refresh();
  } catch {
    statusEl.textContent = "Reload the chat page and try again.";
  }
});

document.getElementById("flush").addEventListener("click", async () => {
  const result = await send("SYNC_FLUSH_QUEUE");
  statusEl.textContent = result?.ok
    ? `Retried. ${result.flushed.remaining} left.`
    : result?.error || "Retry failed.";
  await refresh();
});

document.getElementById("clear").addEventListener("click", async () => {
  await send("SYNC_CLEAR_QUEUE");
  statusEl.textContent = "Queue cleared.";
  await refresh();
});

refresh().catch(() => {
  statusEl.textContent = "Could not read this page.";
});
