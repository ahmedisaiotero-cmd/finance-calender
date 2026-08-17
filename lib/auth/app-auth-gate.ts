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

export const PUBLIC_AUTH_ERROR = {
  config: "Authentication is not configured for this environment.",
  invalidCredentials: "Email or password is incorrect.",
  accountMissing: "No account exists for that email.",
  emailConfirm: "Confirm your email before signing in.",
  alreadyRegistered: "An account with this email already exists. Sign in instead.",
  signupDisabled: "Account creation is currently disabled.",
  weakPassword: "Password must meet the minimum length required by Sync.",
  rateLimited: "Too many attempts. Please wait and try again.",
  network: "Could not reach authentication. Check your connection and try again.",
  confirmEmail: "Check your email to confirm the account, then sign in.",
  generic: "Unable to sign in. Please try again.",
} as const;

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
    return PUBLIC_AUTH_ERROR.generic;
  }
  if (
    lower.includes("not configured") ||
    lower.includes("invalid api key") ||
    lower.includes("invalid_api_key") ||
    lower.includes("sb_secret") ||
    lower.includes("your project's url and api key are required")
  ) {
    return PUBLIC_AUTH_ERROR.config;
  }
  if (lower.includes("invalid login") || lower.includes("invalid credentials")) {
    return PUBLIC_AUTH_ERROR.invalidCredentials;
  }
  if (
    lower.includes("user not found") ||
    lower.includes("no user found") ||
    lower.includes("user does not exist")
  ) {
    return PUBLIC_AUTH_ERROR.accountMissing;
  }
  if (lower.includes("email not confirmed")) {
    return PUBLIC_AUTH_ERROR.emailConfirm;
  }
  if (lower.includes("user already registered")) {
    return PUBLIC_AUTH_ERROR.alreadyRegistered;
  }
  if (
    lower.includes("signups not allowed") ||
    lower.includes("signup is disabled") ||
    lower.includes("sign up is disabled")
  ) {
    return PUBLIC_AUTH_ERROR.signupDisabled;
  }
  if (lower.includes("password") && lower.includes("least")) {
    return PUBLIC_AUTH_ERROR.weakPassword;
  }
  if (lower.includes("rate") || lower.includes("too many")) {
    return PUBLIC_AUTH_ERROR.rateLimited;
  }
  if (
    lower.includes("network") ||
    lower.includes("fetch") ||
    lower.includes("failed to fetch") ||
    lower.includes("load failed")
  ) {
    return PUBLIC_AUTH_ERROR.network;
  }

  return PUBLIC_AUTH_ERROR.generic;
}
