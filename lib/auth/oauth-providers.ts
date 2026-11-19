export type OAuthProviderId = "google" | "apple";

export function isGoogleAuthEnabled(
  env: NodeJS.ProcessEnv | Record<string, string | undefined> = process.env,
): boolean {
  return env.NEXT_PUBLIC_AUTH_GOOGLE_ENABLED === "true";
}

export function isAppleAuthEnabled(
  env: NodeJS.ProcessEnv | Record<string, string | undefined> = process.env,
): boolean {
  return env.NEXT_PUBLIC_AUTH_APPLE_ENABLED === "true";
}

export function enabledOAuthProviders(
  env: NodeJS.ProcessEnv | Record<string, string | undefined> = process.env,
): OAuthProviderId[] {
  const providers: OAuthProviderId[] = [];
  if (isGoogleAuthEnabled(env)) providers.push("google");
  if (isAppleAuthEnabled(env)) providers.push("apple");
  return providers;
}

export function authCallbackUrl(origin: string, next = "/"): string {
  const safeNext = next.startsWith("/") && !next.startsWith("//") ? next : "/";
  return `${origin.replace(/\/$/, "")}/auth/callback?next=${encodeURIComponent(safeNext)}`;
}
