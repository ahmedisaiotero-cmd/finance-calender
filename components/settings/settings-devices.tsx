"use client";

import { useCallback, useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { useToast } from "@/components/ui/toast";

type DeviceItem = {
  connectionId: string;
  label: string | null;
  permissionState: string;
  lastSeenAt: string | null;
  revokedAt: string | null;
};

export function SettingsDevices() {
  const { push } = useToast();
  const [devices, setDevices] = useState<DeviceItem[]>([]);
  const [pairingCode, setPairingCode] = useState<string | null>(null);
  const [pairingExpires, setPairingExpires] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    const response = await fetch("/api/ai-activity/pair", {
      credentials: "include",
    });
    if (!response.ok) return;
    const json = (await response.json()) as { devices?: DeviceItem[] };
    setDevices(json.devices ?? []);
  }, []);

  useEffect(() => {
    queueMicrotask(() => {
      void refresh();
    });
  }, [refresh]);

  async function issueCode() {
    setBusy(true);
    const response = await fetch("/api/ai-activity/pair", {
      method: "POST",
      credentials: "include",
    });
    const json = (await response.json()) as {
      code?: string;
      expiresAt?: string;
      error?: string;
    };
    setBusy(false);
    if (!response.ok || !json.code) {
      push(json.error ?? "Could not issue a pairing code.");
      return;
    }
    setPairingCode(json.code);
    setPairingExpires(json.expiresAt ?? null);
    await refresh();
  }

  async function revoke(connectionId: string) {
    setBusy(true);
    const response = await fetch("/api/ai-activity/pair/revoke", {
      method: "POST",
      credentials: "include",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ connectionId }),
    });
    setBusy(false);
    if (!response.ok) {
      const json = (await response.json()) as { error?: string };
      push(json.error ?? "Could not revoke the device.");
      return;
    }
    push("Extension access revoked.");
    await refresh();
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Paired devices</CardTitle>
        <CardDescription>
          Issue a short-lived code, then enter it in the Chrome add-on. Captures
          belong to this account.
        </CardDescription>
      </CardHeader>
      <Button type="button" disabled={busy} onClick={() => void issueCode()}>
        {busy ? "Working…" : "Issue pairing code"}
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
        <EmptyState
          className="mt-5"
          message="No paired extensions yet. Issue a code, then claim it in the add-on options."
        />
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
                  onClick={() => void revoke(device.connectionId)}
                >
                  Revoke
                </Button>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
