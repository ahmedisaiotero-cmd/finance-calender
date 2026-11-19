import { LEGAL_PATHS } from "@/lib/site/legal";
import { publicSiteUrl } from "@/lib/site/public-url";

export const PUBLIC_INDEX_PATHS = [
  "/welcome",
  LEGAL_PATHS.privacy,
  LEGAL_PATHS.terms,
  LEGAL_PATHS.cookies,
  LEGAL_PATHS.chromePrivacy,
  LEGAL_PATHS.contact,
  LEGAL_PATHS.accessibility,
] as const;

export const ROBOTS_DISALLOW_PATHS = [
  "/api/",
  "/login",
  "/settings",
  "/onboarding",
  "/start",
  "/sync-lab",
  "/mobile",
  "/auth/",
  "/chat",
] as const;

type EnvLike = NodeJS.ProcessEnv | Record<string, string | undefined>;

export function robotsMetadata(env: EnvLike = process.env) {
  const origin = publicSiteUrl(env);
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", ...PUBLIC_INDEX_PATHS],
        disallow: [...ROBOTS_DISALLOW_PATHS],
      },
    ],
    sitemap: origin ? `${origin}/sitemap.xml` : undefined,
  };
}

export function sitemapEntries(env: EnvLike = process.env) {
  const origin = publicSiteUrl(env);
  if (!origin) return [];
  return PUBLIC_INDEX_PATHS.map((path) => ({
    url: `${origin}${path}`,
    changeFrequency: "monthly" as const,
    priority: path === "/welcome" ? 1 : 0.6,
  }));
}
