"use client";

import { Analytics } from "@vercel/analytics/next";

import {
  isVercelAnalyticsEnabled,
  scrubAnalyticsEvent,
} from "@/lib/site/vercel-analytics";

export function OptionalAnalytics() {
  if (!isVercelAnalyticsEnabled()) return null;
  return (
    <Analytics
      beforeSend={(event) => scrubAnalyticsEvent(event)}
    />
  );
}
