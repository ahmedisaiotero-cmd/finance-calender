"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/components/ui/toast";
import { LEGAL_PATHS } from "@/lib/site/legal";

export function SettingsLlmConsent() {
  const { push } = useToast();
  const [consentAt, setConsentAt] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => {
      fetch("/api/account", { credentials: "include" })
        .then(async (response) => {
          if (!response.ok) return;
          const json = (await response.json()) as {
            user?: { llmChatConsentAt?: string | null };
          };
          if (!cancelled) {
            setConsentAt(json.user?.llmChatConsentAt ?? null);
            setLoaded(true);
          }
        })
        .catch(() => {
          if (!cancelled) setLoaded(true);
        });
    });
    return () => {
      cancelled = true;
    };
  }, []);

  async function setConsent(consented: boolean) {
    setPending(true);
    const response = await fetch("/api/account", {
      method: "PATCH",
      credentials: "include",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ llmChatConsent: consented }),
    });
    const json = (await response.json().catch(() => ({}))) as {
      llmChatConsentAt?: string | null;
      error?: string;
    };
    setPending(false);
    if (!response.ok) {
      push(json.error ?? "Could not update chat consent.");
      return;
    }
    setConsentAt(json.llmChatConsentAt ?? null);
    push(consented ? "In-app chat can use a language model." : "In-app chat consent withdrawn.");
  }

  const on = Boolean(consentAt);

  return (
    <Card>
      <CardHeader>
        <CardTitle>In-app chat</CardTitle>
        <CardDescription>
          Off unless you turn it on. This sends messages you type in Chat to a
          language model. Captured browser conversations stay in your account
          and are not sent. See{" "}
          <Link href={LEGAL_PATHS.privacy} className="underline underline-offset-2">
            Privacy
          </Link>
          .
        </CardDescription>
      </CardHeader>
      <p className="mb-4 text-[13px] text-muted-foreground">
        {loaded
          ? on
            ? `On since ${new Date(consentAt ?? "").toLocaleString()}.`
            : "Currently off."
          : "Checking…"}
      </p>
      <Button
        type="button"
        variant={on ? "outline" : "default"}
        disabled={pending || !loaded}
        onClick={() => void setConsent(!on)}
      >
        {on ? "Turn off" : "Allow in-app chat"}
      </Button>
    </Card>
  );
}
