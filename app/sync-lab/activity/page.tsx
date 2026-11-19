"use client";

import Link from "next/link";
import { FormEvent, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { AI_PROVIDER_DETAILS } from "@/lib/ai-activity/providers";
import { buildPasteImportPayload } from "@/lib/ai-activity/paste-import";
import { AI_PROVIDER_SLUGS, type AiProviderSlug } from "@/lib/ai-activity/types";

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

function authHeaders(secret: string): HeadersInit {
  const headers: HeadersInit = { "content-type": "application/json" };
  if (secret.trim()) headers.authorization = `Bearer ${secret.trim()}`;
  return headers;
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
    const [timeline, pair] = await Promise.all([
      fetch("/api/ai-activity", {
        credentials: "include",
        headers: authHeaders(nextSecret),
      }),
      fetch("/api/ai-activity/pair", {
        credentials: "include",
        headers: authHeaders(nextSecret),
      }),
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
        credentials: "include",
        headers: authHeaders(secret),
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
      await refresh(secret);
    } catch {
      setStatus("Could not reach ingest.");
    } finally {
      setBusy(false);
    }
  }

  async function issuePairingCode() {
    setBusy(true);
    try {
      const response = await fetch("/api/ai-activity/pair", {
        method: "POST",
        credentials: "include",
        headers: authHeaders(secret),
      });
      const json = (await response.json()) as {
        error?: string;
        code?: string;
        expiresAt?: string;
      };
      if (!response.ok || !json.code) {
        setStatus(json.error ?? "Could not issue a pairing code. Sign in, or use Settings.");
        return;
      }
      setPairingCode(json.code);
      setPairingExpires(json.expiresAt ?? null);
      setStatus("Pairing code issued. Enter it in the extension. It expires in 10 minutes.");
      await refresh(secret);
    } finally {
      setBusy(false);
    }
  }

  async function revokeDevice(connectionId: string) {
    setBusy(true);
    try {
      const response = await fetch("/api/ai-activity/pair/revoke", {
        method: "POST",
        credentials: "include",
        headers: authHeaders(secret),
        body: JSON.stringify({ connectionId }),
      });
      if (!response.ok) {
        const json = (await response.json()) as { error?: string };
        setStatus(json.error ?? "Could not revoke the device.");
        return;
      }
      setStatus("Extension access revoked.");
      await refresh(secret);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto min-h-screen max-w-5xl px-5 py-8 sm:px-8">
      <header className="mb-10 flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-[12px] font-medium tracking-[0.08em] text-muted-foreground uppercase">
            Sync lab
          </p>
          <h1 className="mt-1 text-[1.75rem] font-medium tracking-[-0.04em]">
            Paste and pair
          </h1>
          <p className="mt-2 max-w-xl text-[14px] leading-relaxed text-muted-foreground">
            Teaching surface for capture. Sign in so activity is scoped to your
            account. A lab owner secret is optional.
          </p>
        </div>
        <nav className="flex gap-3 text-[13px] text-muted-foreground" aria-label="Sync lab">
          <Link href="/sync-lab">Lab</Link>
          <Link href="/sync-lab/memory">Memory</Link>
          <Link href="/sync-lab/review">Review</Link>
          <Link href="/sync-lab/activity">Activity</Link>
        </nav>
      </header>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(280px,0.9fr)]">
        <Card>
          <CardHeader>
            <CardTitle>Paste a conversation</CardTitle>
            <CardDescription>
              Saved through the same ingest path as the Chrome add-on. Secrets
              are redacted before save.
            </CardDescription>
          </CardHeader>
          <form className="flex flex-col gap-4" onSubmit={handlePaste}>
            <label className="flex flex-col gap-1.5 text-[13px]">
              <span className="text-muted-foreground">Lab owner secret (optional)</span>
              <Input
                type="password"
                autoComplete="off"
                value={secret}
                onChange={(event) => rememberSecret(event.target.value)}
                placeholder="Leave blank if you are signed in"
              />
            </label>
            <Button
              className="w-fit"
              type="button"
              variant="outline"
              onClick={() => void refresh()}
              disabled={busy}
            >
              Load recent activity
            </Button>
            <label className="flex flex-col gap-1.5 text-[13px]">
              <span className="text-muted-foreground">Provider</span>
              <select
                value={provider}
                onChange={(event) =>
                  setProvider(event.target.value as AiProviderSlug)
                }
                className="h-11 rounded-xl border border-border/45 bg-background px-3.5 text-[15px]"
              >
                {PASTE_PROVIDERS.map((slug) => (
                  <option key={slug} value={slug}>
                    {AI_PROVIDER_DETAILS[slug].displayName}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1.5 text-[13px]">
              <span className="text-muted-foreground">Title</span>
              <Input
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="Optional. Sync will use the first line if empty."
              />
            </label>
            <label className="flex flex-col gap-1.5 text-[13px]">
              <span className="text-muted-foreground">Transcript</span>
              <textarea
                value={transcript}
                onChange={(event) => setTranscript(event.target.value)}
                placeholder="User: ...&#10;Grok: ..."
                rows={10}
                className="min-h-44 rounded-xl border border-border/45 bg-background px-3.5 py-3 text-[15px] outline-none focus-visible:ring-3 focus-visible:ring-ring/35"
              />
            </label>
            <p className="text-[13px] text-muted-foreground">
              {preview
                ? `${preview.messages.length} message${preview.messages.length === 1 ? "" : "s"} ready. Secrets are redacted before save.`
                : "Paste a chat transcript or cleaned notes."}
            </p>
            <Button type="submit" disabled={busy}>
              Save to Sync
            </Button>
            {status ? <p className="text-[13px] text-foreground/80">{status}</p> : null}
          </form>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Pair the Chrome extension</CardTitle>
            <CardDescription>
              Prefer Settings on the signed-in site. Codes belong to the
              signed-in account.
            </CardDescription>
          </CardHeader>
          <Button type="button" disabled={busy} onClick={() => void issuePairingCode()}>
            Issue pairing code
          </Button>
          {pairingCode ? (
            <p className="mt-4 text-[22px] tracking-[0.08em]">
              {pairingCode}
              {pairingExpires ? (
                <span className="ml-2 text-[13px] tracking-normal text-muted-foreground">
                  expires {new Date(pairingExpires).toLocaleTimeString()}
                </span>
              ) : null}
            </p>
          ) : null}
          {devices.length === 0 ? (
            <EmptyState className="mt-5" message="No paired extensions yet." />
          ) : (
            <ul className="mt-5 flex flex-col gap-3">
              {devices.map((device) => (
                <li
                  key={device.connectionId}
                  className="flex items-start justify-between gap-3 rounded-xl border border-border/35 px-3 py-3"
                >
                  <div>
                    <p className="text-[14px] font-medium">
                      {device.label ?? device.connectionId}
                    </p>
                    <p className="text-[12px] text-muted-foreground">
                      {device.permissionState}
                      {device.lastSeenAt
                        ? ` · last seen ${new Date(device.lastSeenAt).toLocaleString()}`
                        : ""}
                    </p>
                  </div>
                  {device.permissionState !== "revoked" ? (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => void revokeDevice(device.connectionId)}
                    >
                      Revoke
                    </Button>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <section className="mt-8">
        <h2 className="text-[17px] font-medium tracking-[-0.02em]">Recent AI activity</h2>
        {items.length === 0 ? (
          <EmptyState
            className="mt-4"
            message="Nothing captured yet. Paste a transcript or save from the extension."
          />
        ) : (
          <ol className="mt-4 space-y-3">
            {items.map((item) => (
              <li key={item.id} className="rounded-2xl border border-border/35 px-4 py-3">
                <p className="font-medium">
                  {item.title || item.summary || item.providerName}
                </p>
                <p className="text-[13px] text-muted-foreground">
                  {item.providerName} · {item.captureMethod} ·{" "}
                  {new Date(item.capturedAt).toLocaleString()} · {item.messageCount}{" "}
                  messages
                </p>
                {item.summary ? (
                  <p className="mt-1 text-[13px] text-muted-foreground">{item.summary}</p>
                ) : null}
              </li>
            ))}
          </ol>
        )}
      </section>
    </main>
  );
}
