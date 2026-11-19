"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { LEGAL_PATHS } from "@/lib/site/legal";
import { SITE_PRODUCT } from "@/lib/site/product";

export function ConsumerFirstRun() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function continueToApp() {
    setPending(true);
    setError(null);
    const response = await fetch("/api/account", {
      method: "PATCH",
      credentials: "include",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ consumerFirstRun: true }),
    });
    setPending(false);
    if (!response.ok) {
      setError("Could not save that. Try again.");
      return;
    }
    router.replace("/");
    router.refresh();
  }

  return (
    <div className="mx-auto max-w-lg py-4">
      <p className="text-[12px] font-medium tracking-[0.04em] text-muted-foreground uppercase">
        {SITE_PRODUCT.name}
      </p>
      <h1 className="mt-2 text-[1.75rem] font-medium tracking-[-0.04em]">
        A private record you control
      </h1>
      <div className="mt-6 space-y-4 text-[15px] leading-relaxed text-muted-foreground">
        <p>
          Sync keeps what is true about your life, what that means, and what AI
          saw or did. It is not a task list or a briefing dashboard.
        </p>
        <p>
          Capture is something you choose. The browser add-on saves only the
          conversation you click. In-app chat stays off until you turn it on in
          Settings. Captured chats are not sent to a language model.
        </p>
        <p>
          You can inspect, export, or delete this record from Settings. See{" "}
          <Link href={LEGAL_PATHS.privacy} className="underline underline-offset-2">
            Privacy
          </Link>{" "}
          and{" "}
          <Link href={LEGAL_PATHS.terms} className="underline underline-offset-2">
            Terms
          </Link>
          .
        </p>
      </div>
      {error ? (
        <p className="mt-4 text-[13px] text-red-600/90 dark:text-red-400/90">{error}</p>
      ) : null}
      <Button
        type="button"
        className="mt-8"
        disabled={pending}
        onClick={() => void continueToApp()}
      >
        {pending ? "Saving…" : "Continue"}
      </Button>
    </div>
  );
}
