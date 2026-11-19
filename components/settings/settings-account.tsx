"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { useToast } from "@/components/ui/toast";
import { ACCOUNT_DELETION_RETAINED } from "@/lib/db/delete-user-account";

type AccountUser = {
  id?: string;
  email?: string | null;
  name?: string | null;
  timezone?: string | null;
  legalPolicyVersion?: string | null;
  legalAcceptedAt?: string | null;
  createdAt?: string | null;
};

export function SettingsAccount() {
  const router = useRouter();
  const { push } = useToast();
  const [user, setUser] = useState<AccountUser | null>(null);
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => {
      fetch("/api/account", { credentials: "include" })
        .then(async (response) => {
          if (!response.ok) return;
          const json = (await response.json()) as { user?: AccountUser };
          if (!cancelled) setUser(json.user ?? null);
        })
        .catch(() => {
          if (!cancelled) setUser(null);
        });
    });
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleExport() {
    const response = await fetch("/api/account/export", { credentials: "include" });
    if (!response.ok) {
      push("Could not export your data.");
      return;
    }
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "sync-export.json";
    link.click();
    URL.revokeObjectURL(url);
    push("Export downloaded.");
  }

  async function handleDelete() {
    setError(null);
    setPending(true);
    const response = await fetch("/api/account", {
      method: "DELETE",
      credentials: "include",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ confirm }),
    });
    const json = (await response.json().catch(() => ({}))) as { error?: string };
    setPending(false);
    if (!response.ok) {
      setError(json.error ?? "Could not delete the account.");
      return;
    }
    push("Account deleted.");
    router.replace("/login");
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-8">
      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
          <CardDescription>
            What Sync uses to identify this account.
          </CardDescription>
        </CardHeader>
        {user ? (
          <dl className="grid gap-3 text-[14px]">
            <div>
              <dt className="text-muted-foreground">Email</dt>
              <dd>{user.email || "Not set"}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Name</dt>
              <dd>{user.name || "Not set"}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Policy accepted</dt>
              <dd>
                {user.legalPolicyVersion
                  ? `${user.legalPolicyVersion}${
                      user.legalAcceptedAt
                        ? ` · ${new Date(user.legalAcceptedAt).toLocaleString()}`
                        : ""
                    }`
                  : "Not recorded yet"}
              </dd>
            </div>
          </dl>
        ) : (
          <EmptyState message="Sign in to see your profile." />
        )}
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Export my data</CardTitle>
          <CardDescription>
            Download a JSON copy of your account, captures, and devices. Device
            tokens are not included — only hashes live on the server.
          </CardDescription>
        </CardHeader>
        <Button type="button" variant="outline" onClick={() => void handleExport()}>
          Download JSON
        </Button>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Delete my account</CardTitle>
          <CardDescription>
            This removes transcripts, devices, pairing codes, profile, and the
            sign-in record. Type DELETE to confirm.
          </CardDescription>
        </CardHeader>
        <ul className="mb-4 list-disc space-y-1 pl-5 text-[13px] text-muted-foreground">
          {ACCOUNT_DELETION_RETAINED.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
        <label className="flex flex-col gap-1.5 text-[13px]">
          <span className="text-muted-foreground">Confirmation</span>
          <input
            value={confirm}
            onChange={(event) => setConfirm(event.target.value)}
            className="h-11 rounded-xl border border-border/45 bg-background px-3.5"
            placeholder="DELETE"
            autoComplete="off"
          />
        </label>
        {error ? (
          <p className="mt-3 text-[13px] text-red-600/90 dark:text-red-400/90">
            {error}
          </p>
        ) : null}
        <Button
          type="button"
          variant="destructive"
          className="mt-4"
          disabled={pending || confirm !== "DELETE"}
          onClick={() => void handleDelete()}
        >
          {pending ? "Deleting…" : "Delete account"}
        </Button>
      </Card>
    </div>
  );
}
