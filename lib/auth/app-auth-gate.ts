/**
 * Pure app-shell auth gate helpers.
 * Local profile / onboarding flags never grant access.
 */

export const AUTH_PUBLIC_PATH_PREFIXES = [
  "/login",
  "/sync-lab",
  "/mobile",
] as const;

export function isAuthPublicPath(pathname: string): boolean {
  if (pathname === "/login" || pathname.startsWith("/login/")) return true;
  if (pathname.startsWith("/sync-lab")) return true;
  if (pathname.startsWith("/mobile")) return true;
  if (pathname.startsWith("/api/")) return true;
  return false;
}

/**
 * Local profile / onboarding completion never counts as authentication.
 */
export function localProfileImpliesAuthenticated(
  _profile: { name?: string; onboardingComplete?: boolean } | null | undefined,
): false {
  void _profile;
  return false;
}

export type AppAuthGateInput = {
  pathname: string;
  hasTrustedSession: boolean;
  supabaseConfigured: boolean;
  demoMode: boolean;
};

export type AppAuthGateDecision =
  | { action: "allow" }
  | { action: "redirect"; to: "/login" | "/" }
  | { action: "config_error" };

/**
 * Single ownership point for page-level auth routing.
 * APIs keep their own loadRequestIdentity / demo contract.
 */
export function decideAppAuthGate(input: AppAuthGateInput): AppAuthGateDecision {
  const path = input.pathname || "/";

  if (isAuthPublicPath(path)) {
    if (
      (path === "/login" || path.startsWith("/login/")) &&
      input.hasTrustedSession
    ) {
      return { action: "redirect", to: "/" };
    }
    return { action: "allow" };
  }

  if (input.demoMode) {
    return { action: "allow" };
  }

  if (!input.supabaseConfigured) {
    if (path === "/login" || path.startsWith("/login/")) {
      return { action: "config_error" };
    }
    return { action: "redirect", to: "/login" };
  }

  if (!input.hasTrustedSession) {
    return { action: "redirect", to: "/login" };
  }

  return { action: "allow" };
}

/** Map Supabase/auth failures to safe user-facing copy. */
export function publicAuthErrorMessage(raw: unknown): string {
  const message =
    typeof raw === "string"
      ? raw
      : raw && typeof raw === "object" && "message" in raw
        ? String((raw as { message?: unknown }).message ?? "")
        : "";

  const lower = message.toLowerCase();

  if (!message.trim()) {
    return "Something went wrong. Please try again.";
  }
  if (lower.includes("invalid login") || lower.includes("invalid credentials")) {
    return "Email or password is incorrect.";
  }
  if (lower.includes("email not confirmed")) {
    return "Confirm your email before signing in.";
  }
  if (lower.includes("user already registered")) {
    return "An account with this email already exists. Sign in instead.";
  }
  if (lower.includes("password") && lower.includes("least")) {
    return "Password must meet the minimum length required by Sync.";
  }
  if (lower.includes("rate") || lower.includes("too many")) {
    return "Too many attempts. Please wait and try again.";
  }
  if (lower.includes("network") || lower.includes("fetch")) {
    return "Network error. Check your connection and try again.";
  }

  return "Unable to sign in. Please try again.";
}
