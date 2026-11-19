"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

import { SyncLogo } from "@/components/brand/sync-logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PUBLIC_AUTH_ERROR } from "@/lib/auth/app-auth-gate";
import { signInWithOAuthProvider } from "@/lib/auth/browser-auth";
import { evaluateLegalAcceptance } from "@/lib/auth/legal-acceptance";
import { authCallbackUrl } from "@/lib/auth/oauth-providers";
import { LEGAL_MINIMUM_AGE, LEGAL_PATHS, LEGAL_POLICY_VERSION } from "@/lib/site/legal";
import { isSupabaseBrowserConfigured } from "@/lib/supabase/env";

export function LoginForm({
  configMissing = false,
  googleEnabled = false,
  appleEnabled = false,
}: {
  configMissing?: boolean;
  googleEnabled?: boolean;
  appleEnabled?: boolean;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [birthYear, setBirthYear] = useState("");
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [acceptedPrivacy, setAcceptedPrivacy] = useState(false);
  const [error, setError] = useState<string | null>(
    searchParams.get("error") === "auth"
      ? "Could not complete sign-in. Try the link again or use email."
      : null,
  );
  const [notice, setNotice] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const configured = !configMissing && isSupabaseBrowserConfigured();
  const years = useMemo(() => {
    const current = new Date().getFullYear();
    return Array.from({ length: 100 }, (_, index) => current - index);
  }, []);

  function origin() {
    return window.location.origin;
  }

  async function authAttempt(body: Record<string, unknown>) {
    const response = await fetch("/api/auth/attempt", {
      method: "POST",
      headers: { "content-type": "application/json" },
      credentials: "include",
      body: JSON.stringify(body),
    });
    const json = (await response.json().catch(() => ({}))) as {
      ok?: boolean;
      error?: string;
    };
    if (!response.ok) {
      return {
        ok: false as const,
        error: json.error || PUBLIC_AUTH_ERROR.generic,
      };
    }
    return { ok: true as const };
  }

  function legalResult() {
    return evaluateLegalAcceptance({
      birthYear: Number(birthYear),
      acceptedTerms,
      acceptedPrivacy,
    });
  }

  async function handleMagicLink(event?: { preventDefault?: () => void }) {
    event?.preventDefault?.();
    setError(null);
    setNotice(null);
    if (!configured) {
      setError(PUBLIC_AUTH_ERROR.config);
      return;
    }
    if (!email.trim()) {
      setError("Email is required.");
      return;
    }
    const accepted = legalResult();
    if (!accepted.ok) {
      setError(accepted.error);
      return;
    }
    setPending(true);
    const result = await authAttempt({
      action: "magic_link",
      email,
      emailRedirectTo: authCallbackUrl(origin()),
      userMetadata: {
        birthYear: accepted.birthYear,
        legalPolicyVersion: accepted.policyVersion,
        legalAcceptedAt: accepted.acceptedAt,
      },
    });
    setPending(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setNotice("Check your email for a sign-in link. It expires soon.");
  }

  async function handlePasswordReset() {
    setError(null);
    setNotice(null);
    if (!email.trim()) {
      setError("Enter your email first.");
      return;
    }
    setPending(true);
    const result = await authAttempt({
      action: "reset",
      email,
      emailRedirectTo: `${origin()}/auth/reset-password`,
    });
    setPending(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setNotice("If an account exists, a reset email is on the way.");
  }

  async function handleOAuth(provider: "google" | "apple") {
    setError(null);
    const accepted = legalResult();
    if (!accepted.ok) {
      setError(accepted.error);
      return;
    }
    window.sessionStorage.setItem(
      "sync-legal-acceptance",
      JSON.stringify(accepted),
    );
    setPending(true);
    const result = await signInWithOAuthProvider({
      provider,
      redirectTo: authCallbackUrl(origin()),
    });
    setPending(false);
    if (!result.ok) setError(result.error);
  }

  async function handleSubmit(
    event: { preventDefault?: () => void } | undefined,
    mode: "signin" | "signup",
  ) {
    event?.preventDefault?.();
    setError(null);
    setNotice(null);

    if (!configured) {
      setError(PUBLIC_AUTH_ERROR.config);
      return;
    }

    if (!email.trim() || !password) {
      setError("Email and password are required.");
      return;
    }

    if (mode === "signup") {
      const accepted = legalResult();
      if (!accepted.ok) {
        setError(accepted.error);
        return;
      }
    }

    setPending(true);
    const accepted = mode === "signup" ? legalResult() : null;
    const result = await authAttempt({
      action: mode === "signin" ? "login" : "signup",
      email,
      password,
      emailRedirectTo: authCallbackUrl(origin()),
      userMetadata:
        accepted && accepted.ok
          ? {
              birthYear: accepted.birthYear,
              legalPolicyVersion: LEGAL_POLICY_VERSION,
              legalAcceptedAt: accepted.acceptedAt,
            }
          : undefined,
    });
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
          Email a magic link, or use a password. Apple and Google appear when
          they are configured.
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
        <form
          className="flex flex-col gap-4"
          onSubmit={(event) => void handleMagicLink(event)}
        >
          <label className="flex flex-col gap-1.5 text-[13px]">
            <span className="text-muted-foreground">Email</span>
            <Input
              type="email"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              disabled={pending}
              required
            />
          </label>

          <label className="flex flex-col gap-1.5 text-[13px]">
            <span className="text-muted-foreground">Birth year</span>
            <select
              value={birthYear}
              onChange={(event) => setBirthYear(event.target.value)}
              className="h-11 w-full rounded-xl border border-border/45 bg-background px-3.5 text-[15px] outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/35"
              disabled={pending}
              required
            >
              <option value="">Select year</option>
              {years.map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
            <span className="text-[12px] text-muted-foreground">
              You must be {LEGAL_MINIMUM_AGE} or older. We do not offer a
              children’s account.
            </span>
          </label>

          <label className="flex items-start gap-2.5 text-[13px] leading-relaxed text-muted-foreground">
            <input
              type="checkbox"
              className="mt-1 size-4 accent-primary"
              checked={acceptedTerms}
              onChange={(event) => setAcceptedTerms(event.target.checked)}
              disabled={pending}
            />
            <span>
              I agree to the{" "}
              <Link
                href={LEGAL_PATHS.terms}
                className="underline underline-offset-2 hover:text-foreground"
              >
                Terms of Service
              </Link>
              .
            </span>
          </label>

          <label className="flex items-start gap-2.5 text-[13px] leading-relaxed text-muted-foreground">
            <input
              type="checkbox"
              className="mt-1 size-4 accent-primary"
              checked={acceptedPrivacy}
              onChange={(event) => setAcceptedPrivacy(event.target.checked)}
              disabled={pending}
            />
            <span>
              I agree to the{" "}
              <Link
                href={LEGAL_PATHS.privacy}
                className="underline underline-offset-2 hover:text-foreground"
              >
                Privacy Policy
              </Link>
              .
            </span>
          </label>

          <p className="text-[12px] leading-relaxed text-muted-foreground">
            By continuing you agree to the{" "}
            <Link
              href={LEGAL_PATHS.terms}
              className="underline underline-offset-2 hover:text-foreground"
            >
              Terms of Service
            </Link>{" "}
            and{" "}
            <Link
              href={LEGAL_PATHS.privacy}
              className="underline underline-offset-2 hover:text-foreground"
            >
              Privacy Policy
            </Link>
            . We record the policy version ({LEGAL_POLICY_VERSION}) and time
            when you accept.
          </p>

          {error ? (
            <p className="text-[13px] text-red-600/90 dark:text-red-400/90">
              {error}
            </p>
          ) : null}
          {notice ? (
            <p className="text-[13px] text-foreground/80">{notice}</p>
          ) : null}

          <Button type="submit" disabled={pending}>
            {pending ? "Working…" : "Email me a sign-in link"}
          </Button>

          {(googleEnabled || appleEnabled) && (
            <div className="flex flex-col gap-2">
              {googleEnabled ? (
                <Button
                  type="button"
                  variant="outline"
                  disabled={pending}
                  onClick={() => void handleOAuth("google")}
                >
                  Sign in with Google
                </Button>
              ) : null}
              {appleEnabled ? (
                <Button
                  type="button"
                  variant="outline"
                  disabled={pending}
                  onClick={() => void handleOAuth("apple")}
                >
                  Sign in with Apple
                </Button>
              ) : null}
            </div>
          )}

          <button
            type="button"
            className="text-left text-[13px] text-muted-foreground underline-offset-2 hover:underline"
            onClick={() => setShowPassword((value) => !value)}
          >
            {showPassword ? "Hide password" : "Use a password instead"}
          </button>

          {showPassword ? (
            <>
              <label className="flex flex-col gap-1.5 text-[13px]">
                <span className="text-muted-foreground">Password</span>
                <Input
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  disabled={pending}
                  minLength={6}
                />
              </label>
              <div className="flex flex-col gap-2 sm:flex-row">
                <Button
                  type="button"
                  disabled={pending}
                  className="sm:flex-1"
                  onClick={(event) => void handleSubmit(event, "signin")}
                >
                  Sign in
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  disabled={pending}
                  className="sm:flex-1"
                  onClick={(event) => void handleSubmit(event, "signup")}
                >
                  Create account
                </Button>
              </div>
              <button
                type="button"
                className="text-left text-[13px] text-muted-foreground underline-offset-2 hover:underline"
                onClick={() => void handlePasswordReset()}
              >
                Forgot password?
              </button>
            </>
          ) : null}
        </form>
      )}
    </div>
  );
}
