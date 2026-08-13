/**
 * Explicit local demo gate for Sync API routes.
 * Never activates from missing auth alone. Always false in production.
 */
export function isSyncDemoMode(
  env: NodeJS.ProcessEnv = process.env,
): boolean {
  if (env.NODE_ENV === "production") return false;
  return env.SYNC_DEMO_MODE === "true";
}
