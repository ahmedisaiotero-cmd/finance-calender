export function getSupabaseUrl() {
  return process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ?? "";
}

export function getSupabaseAnonKey() {
  return process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() ?? "";
}

/** Server-side only — prefer service/secret key over public anon for API routes. */
export function getSupabaseServerKey() {
  return (
    process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ||
    process.env.SUPABASE_SECRET_KEY?.trim() ||
    getSupabaseAnonKey()
  );
}

export function isSecretSupabaseApiKey(key: string) {
  return key.trim().startsWith("sb_secret_");
}

export function isPublicSupabaseAnonKey(key: string) {
  const trimmed = key.trim();
  if (!trimmed || trimmed.includes("paste_your_anon_key")) return false;
  if (isSecretSupabaseApiKey(trimmed)) return false;
  return (
    trimmed.startsWith("sb_publishable_") || trimmed.startsWith("eyJ")
  );
}

export function isSupabaseUrlReady(url: string) {
  const trimmed = url.trim();
  return (
    Boolean(trimmed) &&
    !trimmed.includes("paste_your_project_url") &&
    /^https:\/\//i.test(trimmed)
  );
}

/** Browser, middleware, and cookie session clients must use a publishable/anon key. */
export function isSupabaseBrowserConfigured(
  url = getSupabaseUrl(),
  anonKey = getSupabaseAnonKey(),
) {
  return isSupabaseUrlReady(url) && isPublicSupabaseAnonKey(anonKey);
}

export function isSupabaseConfigured(
  url = getSupabaseUrl(),
  anonKey = getSupabaseAnonKey(),
) {
  return isSupabaseBrowserConfigured(url, anonKey);
}
