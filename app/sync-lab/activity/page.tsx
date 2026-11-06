"use client";

import Link from "next/link";
import { FormEvent, useMemo, useState } from "react";

import { AI_PROVIDER_DETAILS } from "@/lib/ai-activity/providers";
import { buildPasteImportPayload } from "@/lib/ai-activity/paste-import";
import { AI_PROVIDER_SLUGS, type AiProviderSlug } from "@/lib/ai-activity/types";

import styles from "../page.module.css";

const OWNER_SECRET_KEY = "sync-owner-secret";

type TimelineItem = {
  id: string;
  provider: string;
  providerName: string;
  title: string | null;
  summary: string | null;
  origin: string;
  capturedAt: string;
  captureMethod: string;
  visibility: string;
  messageCount: number;
  activityEventCount: number;
};

type DeviceItem = {
  connectionId: string;
  label: string | null;
  permissionState: string;
  createdAt: string;
  lastSeenAt: string | null;
  revokedAt: string | null;
};

const PASTE_PROVIDERS = AI_PROVIDER_SLUGS.filter((slug) => slug !== "paste_import");

function ownerHeaders(secret: string): HeadersInit {
  return {
    authorization: `Bearer ${secret}`,
    "content-type": "application/json",
  };
}

function readStoredOwnerSecret() {
  if (typeof window === "undefined") return "";
  return sessionStorage.getItem(OWNER_SECRET_KEY) ?? "";
}

export default function SyncLabActivityPage() {
  const [secret, setSecret] = useState(readStoredOwnerSecret);
  const [provider, setProvider] = useState<AiProviderSlug>("grok");
  const [title, setTitle] = useState("");
  const [transcript, setTranscript] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [items, setItems] = useState<TimelineItem[]>([]);
  const [devices, setDevices] = useState<DeviceItem[]>([]);
  const [pairingCode, setPairingCode] = useState<string | null>(null);
  const [pairingExpires, setPairingExpires] = useState<string | null>(null);

  function rememberSecret(value: string) {
    setSecret(value);
    if (value.trim()) sessionStorage.setItem(OWNER_SECRET_KEY, value.trim());
    else sessionStorage.removeItem(OWNER_SECRET_KEY);
  }

  const preview = useMemo(() => {
    const built = buildPasteImportPayload({
      provider,
      transcript,
      title: title || undefined,
    });
    return built.ok ? built.payload : null;
  }, [provider, title, transcript]);

  async function refresh(nextSecret = secret) {
    const trimmed = nextSecret.trim();
    if (!trimmed) return;
    const [timeline, pair] = await Promise.all([
      fetch("/api/ai-activity", { headers: ownerHeaders(trimmed) }),
      fetch("/api/ai-activity/pair", { headers: ownerHeaders(trimmed) }),
    ]);
    if (timeline.ok) {
      const json = (await timeline.json()) as { items?: TimelineItem[] };
      setItems(json.items ?? []);
    }
    if (pair.ok) {
      const json = (await pair.json()) as { devices?: DeviceItem[] };
      setDevices(json.devices ?? []);
    }
  }


  async function handlePaste(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmedSecret = secret.trim();
    if (!trimmedSecret) {
      setStatus("Enter the owner secret to save.");
      return;
    }
    const built = buildPasteImportPayload({
      provider,
      transcript,
      title: title || undefined,
    });
    if (!built.ok) {
      setStatus(built.error);
      return;
    }

    setBusy(true);
    setStatus(null);
    try {
      const response = await fetch("/api/ai-activity/ingest", {
        method: "POST",
        headers: ownerHeaders(trimmedSecret),
        body: JSON.stringify(built.payload),
      });
      const json = (await response.json()) as { error?: string; conversationId?: string };
      if (!response.ok) {
        setStatus(json.error ?? "Could not save the paste.");
        return;
      }
      setTranscript("");
      setTitle("");
      setStatus(`Saved. Conversation ${json.conversationId}.`);
      await refresh(trimmedSecret);
    } catch {
      setStatus("Could not reach ingest.");
    } finally {
      setBusy(false);
    }
  }

  async function issuePairingCode() {
    const trimmedSecret = secret.trim();
    if (!trimmedSecret) {
      setStatus("Enter the owner secret to issue a pairing code.");
      return;
    }
    setBusy(true);
    try {
      const response = await fetch("/api/ai-activity/pair", {
        method: "POST",
        headers: ownerHeaders(trimmedSecret),
      });
      const json = (await response.json()) as {
        error?: string;
        code?: string;
        expiresAt?: string;
      };
      if (!response.ok || !json.code) {
        setStatus(json.error ?? "Could not issue a pairing code.");
        return;
      }
      setPairingCode(json.code);
      setPairingExpires(json.expiresAt ?? null);
      setStatus("Pairing code issued. Enter it in the extension. It expires in 10 minutes.");
      await refresh(trimmedSecret);
    } finally {
      setBusy(false);
    }
  }

  async function revokeDevice(connectionId: string) {
    const trimmedSecret = secret.trim();
    if (!trimmedSecret) return;
    setBusy(true);
    try {
      const response = await fetch("/api/ai-activity/pair/revoke", {
        method: "POST",
        headers: ownerHeaders(trimmedSecret),
        body: JSON.stringify({ connectionId }),
      });
      if (!response.ok) {
        const json = (await response.json()) as { error?: string };
        setStatus(json.error ?? "Could not revoke the device.");
        return;
      }
      setStatus("Extension access revoked.");
      await refresh(trimmedSecret);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className={styles.page}>
      <div className={styles.managementShell}>
        <header className={styles.header}>
          <div>
            <p className={styles.brand}>SYNC</p>
            <p className={styles.subtitle}>AI activity capture.</p>
          </div>
          <nav className={styles.labNav} aria-label="Sync lab">
            <Link href="/sync-lab">Lab</Link>
            <Link href="/sync-lab/memory">Memory</Link>
            <Link href="/sync-lab/review">Review</Link>
            <Link href="/sync-lab/activity">Activity</Link>
          </nav>
        </header>

        <section className={styles.reviewIntro}>
          <h1>Paste and pair</h1>
          <p>
            Save a cleaned AI transcript through the same ingest path as the
            Chrome extension. The owner secret stays in this browser session
            only. Sync stores the redacted text, not raw secrets.
          </p>
        </section>

        <section className={styles.activityGrid}>
          <form className={styles.activityCard} onSubmit={handlePaste}>
            <h2>Paste a conversation</h2>
            <label>
              Owner secret
              <input
                type="password"
                autoComplete="off"
                value={secret}
                onChange={(event) => rememberSecret(event.target.value)}
                placeholder="SYNC_OWNER_SECRET"
              />
            </label>
            <button
              className={styles.toolButton}
              type="button"
              onClick={() => void refresh()}
              disabled={busy || !secret.trim()}
            >
              Load recent activity
            </button>
            <label>
              Provider
              <select
                value={provider}
                onChange={(event) =>
                  setProvider(event.target.value as AiProviderSlug)
                }
              >
                {PASTE_PROVIDERS.map((slug) => (
                  <option key={slug} value={slug}>
                    {AI_PROVIDER_DETAILS[slug].displayName}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Title
              <input
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="Optional. Sync will use the first line if empty."
              />
            </label>
            <label>
              Transcript
              <textarea
                value={transcript}
                onChange={(event) => setTranscript(event.target.value)}
                placeholder="User: ...&#10;Grok: ..."
                rows={10}
              />
            </label>
            <p className={styles.activityHint}>
              {preview
                ? `${preview.messages.length} message${preview.messages.length === 1 ? "" : "s"} ready. Secrets are redacted before save.`
                : "Paste a chat transcript or cleaned notes."}
            </p>
            <button className={styles.send} type="submit" disabled={busy}>
              Save to Sync
            </button>
            {status ? <p className={styles.activityStatus}>{status}</p> : null}
          </form>

          <div className={styles.activityCard}>
            <h2>Pair the Chrome extension</h2>
            <p className={styles.activityHint}>
              Issue a short-lived code, then enter the Sync site URL and code
              in the extension options. The extension receives a device token.
              It never needs the owner secret after that.
            </p>
            <button
              className={styles.toolButton}
              type="button"
              onClick={() => void issuePairingCode()}
              disabled={busy}
            >
              Issue pairing code
            </button>
            {pairingCode ? (
              <p className={styles.pairingCode}>
                <strong>{pairingCode}</strong>
                {pairingExpires ? (
                  <span>
                    expires {new Date(pairingExpires).toLocaleTimeString()}
                  </span>
                ) : null}
              </p>
            ) : null}
            <ul className={styles.deviceList}>
              {devices.length === 0 ? (
                <li>No paired extensions yet.</li>
              ) : (
                devices.map((device) => (
                  <li key={device.connectionId}>
                    <div>
                      <strong>{device.label ?? device.connectionId}</strong>
                      <em>
                        {device.permissionState}
                        {device.lastSeenAt
                          ? ` · last seen ${new Date(device.lastSeenAt).toLocaleString()}`
                          : ""}
                      </em>
                    </div>
                    {device.permissionState !== "revoked" ? (
                      <button
                        type="button"
                        onClick={() => void revokeDevice(device.connectionId)}
                      >
                        Revoke
                      </button>
                    ) : null}
                  </li>
                ))
              )}
            </ul>
          </div>
        </section>

        <section className={styles.activityTimeline}>
          <h2>Recent AI activity</h2>
          {items.length === 0 ? (
            <p className={styles.activityHint}>
              Nothing captured yet. Paste a transcript or save from the
              extension.
            </p>
          ) : (
            <ol>
              {items.map((item) => (
                <li key={item.id}>
                  <strong>{item.title || item.summary || item.providerName}</strong>
                  <span>
                    {item.providerName} · {item.captureMethod} ·{" "}
                    {new Date(item.capturedAt).toLocaleString()} ·{" "}
                    {item.messageCount} messages
                  </span>
                  {item.visibility === "sensitive" ||
                  item.visibility === "summary_only" ? (
                    <em>{item.summary}</em>
                  ) : item.summary ? (
                    <em>{item.summary}</em>
                  ) : null}
                </li>
              ))}
            </ol>
          )}
        </section>
      </div>
    </main>
  );
}
