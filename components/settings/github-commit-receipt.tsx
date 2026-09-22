"use client";

import { useEffect, useState } from "react";

import type { GithubCommitReceiptView } from "@/lib/connectors/github/receipt";

const FIRST_TEST_REPO = {
  owner: "ahmedisaiotero-cmd",
  repo: "finance-calender",
  sha: "8156c2ac8928edc468e8a2b4bc4aca0b86a787c5",
};

type ConnectionState = {
  connected: boolean;
  connectionId: string | null;
};

export function GithubCommitReceiptPanel() {
  const [connection, setConnection] = useState<ConnectionState>({
    connected: false,
    connectionId: null,
  });
  const [repoOwner, setRepoOwner] = useState(FIRST_TEST_REPO.owner);
  const [repo, setRepo] = useState(FIRST_TEST_REPO.repo);
  const [sha, setSha] = useState(FIRST_TEST_REPO.sha);
  const [status, setStatus] = useState<string | null>(null);
  const [receipt, setReceipt] = useState<GithubCommitReceiptView | null>(null);
  const [busy, setBusy] = useState(false);

  async function refreshConnection() {
    const response = await fetch("/api/connections/github");
    if (!response.ok) {
      setConnection({ connected: false, connectionId: null });
      return;
    }
    const body = (await response.json()) as ConnectionState;
    setConnection({
      connected: Boolean(body.connected),
      connectionId: body.connectionId ?? null,
    });
  }

  useEffect(() => {
    void refreshConnection();
  }, []);

  async function connectGithub() {
    setBusy(true);
    setStatus(null);
    try {
      const response = await fetch("/api/connections/github", { method: "POST" });
      const body = (await response.json()) as { authorizeUrl?: string; error?: string };
      if (!response.ok || !body.authorizeUrl) {
        setStatus(body.error ?? "GitHub is not configured.");
        return;
      }
      window.location.assign(body.authorizeUrl);
    } finally {
      setBusy(false);
    }
  }

  async function verifyCommit() {
    if (!connection.connectionId) {
      setStatus("Connect GitHub first.");
      return;
    }
    setBusy(true);
    setStatus(null);
    try {
      const response = await fetch("/api/connections/github/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          connectionId: connection.connectionId,
          repoOwner,
          repo,
          sha,
          idempotencyKey: `github-confirm:${repoOwner}/${repo}@${sha}`,
        }),
      });
      const body = (await response.json()) as {
        receipt?: GithubCommitReceiptView;
        error?: string;
      };
      if (!response.ok || !body.receipt) {
        setReceipt(null);
        setStatus(body.error ?? "GitHub did not confirm that commit.");
        return;
      }
      setReceipt(body.receipt);
      setStatus(null);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="flex flex-col gap-4">
      <h2 className="text-[13px] font-medium tracking-[-0.02em] text-foreground/88">
        GitHub confirmation
      </h2>
      <p className="text-[13px] leading-relaxed text-muted-foreground/78">
        Connect GitHub with read-only access, then confirm one public commit.
        Sync records what it read — not that you wrote it.
      </p>

      <button
        type="button"
        onClick={() => void connectGithub()}
        disabled={busy}
        className="w-fit text-[13px] text-primary underline-offset-2 hover:underline disabled:opacity-50"
      >
        {connection.connected ? "Reconnect GitHub" : "Connect GitHub"}
      </button>

      {connection.connected ? (
        <p className="text-[12px] text-muted-foreground/72">GitHub is connected.</p>
      ) : null}

      <div className="flex flex-col gap-2">
        <label className="text-[12px] text-muted-foreground/72">
          Repository owner
          <input
            className="mt-1 block w-full border-b border-border/40 bg-transparent py-1 text-[13px] outline-none"
            value={repoOwner}
            onChange={(event) => setRepoOwner(event.target.value)}
          />
        </label>
        <label className="text-[12px] text-muted-foreground/72">
          Repository
          <input
            className="mt-1 block w-full border-b border-border/40 bg-transparent py-1 text-[13px] outline-none"
            value={repo}
            onChange={(event) => setRepo(event.target.value)}
          />
        </label>
        <label className="text-[12px] text-muted-foreground/72">
          Commit SHA
          <input
            className="mt-1 block w-full border-b border-border/40 bg-transparent py-1 text-[13px] outline-none"
            value={sha}
            onChange={(event) => setSha(event.target.value)}
          />
        </label>
      </div>

      <button
        type="button"
        onClick={() => void verifyCommit()}
        disabled={busy || !connection.connected}
        className="w-fit text-[13px] text-primary underline-offset-2 hover:underline disabled:opacity-50"
      >
        Confirm this commit
      </button>

      {status ? (
        <p className="text-[13px] leading-relaxed text-muted-foreground/78">{status}</p>
      ) : null}

      {receipt ? <GithubReceiptText receipt={receipt} /> : null}
    </section>
  );
}

function GithubReceiptText({ receipt }: { receipt: GithubCommitReceiptView }) {
  return (
    <div className="space-y-3 text-[13px] leading-relaxed text-foreground/88">
      <p className="font-medium">{receipt.heading}</p>
      <p>{receipt.whatSyncRead}</p>
      <p>Confirmed {receipt.confirmedAt}.</p>
      <p>Verification: {receipt.verification}.</p>
      <p>{receipt.role.read}</p>
      <p>{receipt.role.decision}</p>
      <p>{receipt.role.action}</p>
      <ul className="space-y-1 text-muted-foreground/78">
        {receipt.evidence.map((row) => (
          <li key={row.label}>
            {row.label}: {row.value}
          </li>
        ))}
      </ul>
      <ul className="space-y-1 text-muted-foreground/72">
        {receipt.doesNotClaim.map((line) => (
          <li key={line}>{line}</li>
        ))}
      </ul>
    </div>
  );
}
