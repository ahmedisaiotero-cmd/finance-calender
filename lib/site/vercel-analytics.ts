type EnvLike = NodeJS.ProcessEnv | Record<string, string | undefined>;

export function isVercelAnalyticsEnabled(
  env: EnvLike = process.env,
): boolean {
  return env.NEXT_PUBLIC_VERCEL_ANALYTICS === "true";
}

export type AnalyticsBeforeSendEvent = {
  type?: string;
  url?: string;
};

export function scrubAnalyticsEvent<T extends AnalyticsBeforeSendEvent>(
  event: T,
): T | null {
  if (!event?.url) return event;
  try {
    const url = new URL(event.url);
    return { ...event, url: `${url.origin}${url.pathname}` };
  } catch {
    return { ...event, url: event.url.split("?")[0]?.split("#")[0] };
  }
}
