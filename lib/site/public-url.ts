type EnvLike = NodeJS.ProcessEnv | Record<string, string | undefined>;

export function publicSiteUrl(env: EnvLike = process.env): string | undefined {
  const raw = env.NEXT_PUBLIC_SITE_URL?.trim();
  if (!raw) return undefined;
  try {
    const url = new URL(raw);
    if (url.protocol !== "http:" && url.protocol !== "https:") return undefined;
    return url.origin;
  } catch {
    return undefined;
  }
}
