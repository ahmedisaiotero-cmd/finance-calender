"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { SyncLogo } from "@/components/brand/sync-logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { updateBrowserPassword } from "@/lib/auth/browser-auth";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    setPending(true);
    const result = await updateBrowserPassword({ password });
    setPending(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    router.replace("/");
    router.refresh();
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 py-12">
      <SyncLogo size="md" />
      <h1 className="mt-6 text-3xl font-semibold tracking-tight">
        Choose a new password
      </h1>
      <p className="mt-2 text-[14px] text-muted-foreground">
        Use the link from your email, then set a password for this account.
      </p>
      <form className="mt-8 flex flex-col gap-4" onSubmit={(event) => void handleSubmit(event)}>
        <label className="flex flex-col gap-1.5 text-[13px]">
          <span className="text-muted-foreground">New password</span>
          <Input
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            minLength={6}
            required
          />
        </label>
        {error ? (
          <p className="text-[13px] text-red-600/90 dark:text-red-400/90">{error}</p>
        ) : null}
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : "Update password"}
        </Button>
      </form>
    </div>
  );
}
