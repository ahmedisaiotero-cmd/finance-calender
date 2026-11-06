const siteUrlEl = document.getElementById("siteUrl");
const codeEl = document.getElementById("code");
const ownerSecretEl = document.getElementById("ownerSecret");
const statusEl = document.getElementById("status");

function send(type, extra = {}) {
  return chrome.runtime.sendMessage({ type, ...extra });
}

async function refresh() {
  const state = await send("SYNC_GET_STATE");
  siteUrlEl.value = state.settings.siteUrl || "";
  if (state.settings.paired) {
    statusEl.textContent = `Paired as ${state.settings.connectionId}.`;
  } else if (state.settings.hasOwnerSecret) {
    statusEl.textContent = "Owner secret saved for this browser profile.";
  } else {
    statusEl.textContent = "Not connected.";
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

document.getElementById("saveSecret").addEventListener("click", async () => {
  const result = await send("SYNC_SAVE_SETTINGS", {
    siteUrl: siteUrlEl.value.trim(),
    ownerSecret: ownerSecretEl.value.trim(),
  });
  statusEl.textContent = result?.ok
    ? "Site and owner secret saved locally."
    : result?.error || "Could not save settings.";
  ownerSecretEl.value = "";
});

document.getElementById("unpair").addEventListener("click", async () => {
  await send("SYNC_UNPAIR");
  statusEl.textContent = "Pairing cleared. Local queue was kept.";
  await refresh();
});

refresh();
