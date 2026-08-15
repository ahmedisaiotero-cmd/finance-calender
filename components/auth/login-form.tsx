"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { SyncLogo } from "@/components/brand/sync-logo";
import { Button } from "@/components/ui/button";
import {
  signInWithPassword,
  signUpWithPassword,
} from "@/lib/auth/browser-auth";
import { isSupabaseConfigured } from "@/lib/supabase/env";

export function LoginForm({
  configMissing = false,
}: {
  configMissing?: boolean;
}) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const configured = !configMissing && isSupabaseConfigured();

  async function handleSubmit(mode: "signin" | "signup") {
    setError(null);

    if (!configured) {
      setError("Authentication is not configured for this environment.");
      return;
    }

    if (!email.trim() || !password) {
      setError("Email and password are required.");
      return;
    }

    setPending(true);
    const result =
      mode === "signin"
        ? await signInWithPassword({ email, password })
        : await signUpWithPassword({ email, password });
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
      <div className="mb-10 space-y-3">
        <SyncLogo size="md" />
        <h1 className="text-3xl font-semibold tracking-tight text-foreground">
          Sign in to Sync
        </h1>
        <p className="text-[14px] leading-relaxed text-muted-foreground">
          Your local profile name is not a login. Sign in to unlock Sync and its
          protected APIs.
        </p>
      </div>

      {!configured ? (
        <p className="rounded-2xl border border-border/40 px-4 py-3 text-[13px] text-muted-foreground">
          Authentication is not configured. Set{" "}
          <span className="text-foreground/80">NEXT_PUBLIC_SUPABASE_URL</span>{" "}
          and{" "}
          <span className="text-foreground/80">
            NEXT_PUBLIC_SUPABASE_ANON_KEY
          </span>
          .
        </p>
      ) : (
        <form className="flex flex-col gap-4">
          <label className="flex flex-col gap-1.5 text-[13px]">
            <span className="text-muted-foreground">Email</span>
            <input
              type="email"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="rounded-xl border border-border/40 bg-background px-3 py-2.5 text-[14px] outline-none focus:border-foreground/30"
              disabled={pending}
              required
            />
          </label>

          <label className="flex flex-col gap-1.5 text-[13px]">
            <span className="text-muted-foreground">Password</span>
            <input
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="rounded-xl border border-border/40 bg-background px-3 py-2.5 text-[14px] outline-none focus:border-foreground/30"
              disabled={pending}
              required
              minLength={6}
            />
          </label>

          {error ? (
            <p className="text-[13px] text-red-600/90 dark:text-red-400/90">
              {error}
            </p>
          ) : null}

          <div className="mt-2 flex flex-col gap-2 sm:flex-row">
            <Button
              type="button"
              disabled={pending}
              className="sm:flex-1"
              onClick={() => void handleSubmit("signin")}
            >
              {pending ? "Working…" : "Sign in"}
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={pending}
              className="sm:flex-1"
              onClick={() => void handleSubmit("signup")}
            >
              Create account
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
