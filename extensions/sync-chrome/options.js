const siteUrlEl = document.getElementById("siteUrl");
const codeEl = document.getElementById("code");
const statusEl = document.getElementById("status");

function send(type, extra = {}) {
  return chrome.runtime.sendMessage({ type, ...extra });
}

function applyLegalLinks(siteUrl) {
  const base = (siteUrl || "").replace(/\/$/, "");
  const links = [
    ["privacyLink", "/privacy"],
    ["termsLink", "/terms"],
    ["chromePrivacyLink", "/chrome-privacy"],
  ];
  for (const [id, path] of links) {
    const el = document.getElementById(id);
    if (el && base) el.href = `${base}${path}`;
  }
}

async function refresh() {
  const state = await send("SYNC_GET_STATE");
  siteUrlEl.value = state.settings.siteUrl || "";
  applyLegalLinks(state.settings.siteUrl || "");
  if (state.settings.paired) {
    statusEl.textContent = `Paired as ${state.settings.connectionId}.`;
  } else {
    statusEl.textContent = "Not connected. Issue a pairing code in Settings.";
  }
}

document.getElementById("pair").addEventListener("click", async () => {
  statusEl.textContent = "Claiming…";
  const result = await send("SYNC_PAIR", {
    siteUrl: siteUrlEl.value.trim(),
    code: codeEl.value.trim(),
    label: "Chrome extension",
  });
  statusEl.textContent = result?.ok
    ? `Paired. Device ${result.settings.connectionId}.`
    : result?.error || "Pairing failed.";
  if (result?.ok) codeEl.value = "";
});

document.getElementById("saveSite").addEventListener("click", async () => {
  const result = await send("SYNC_SAVE_SETTINGS", {
    siteUrl: siteUrlEl.value.trim(),
  });
  statusEl.textContent = result?.ok
    ? "Site URL saved. Pair with a code from Settings."
    : result?.error || "Could not save settings.";
});

document.getElementById("unpair").addEventListener("click", async () => {
  await send("SYNC_UNPAIR");
  statusEl.textContent = "Pairing cleared. Local queue was kept.";
  await refresh();
});

refresh();
