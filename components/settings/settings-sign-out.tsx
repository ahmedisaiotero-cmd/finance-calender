"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { signOutBrowserSession } from "@/lib/auth/browser-auth";

export function SettingsSignOut() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSignOut() {
    setError(null);
    setPending(true);
    const result = await signOutBrowserSession();
    setPending(false);

    if (!result.ok) {
      setError(result.error);
      return;
    }

    router.replace("/login");
    router.refresh();
  }

  return (
    <section className="scroll-mt-6">
      <h2 className="text-[13px] font-medium tracking-[-0.02em] text-foreground/88">
        Account
      </h2>
      <p className="mt-2 text-[13px] leading-relaxed text-muted-foreground/78">
        Sign out clears your Sync session on this device. Local notes stay on
        this browser until you remove them.
      </p>
      {error ? (
        <p className="mt-3 text-[13px] text-red-600/90 dark:text-red-400/90">
          {error}
        </p>
      ) : null}
      <Button
        type="button"
        variant="outline"
        className="mt-4"
        disabled={pending}
        onClick={() => void handleSignOut()}
      >
        {pending ? "Signing out…" : "Sign out"}
      </Button>
    </section>
  );
}
