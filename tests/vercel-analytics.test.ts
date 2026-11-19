import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import {
  isVercelAnalyticsEnabled,
  scrubAnalyticsEvent,
} from "@/lib/site/vercel-analytics";

{
  assert.equal(isVercelAnalyticsEnabled({}), false);
  assert.equal(isVercelAnalyticsEnabled({ NEXT_PUBLIC_VERCEL_ANALYTICS: "1" }), false);
  assert.equal(
    isVercelAnalyticsEnabled({ NEXT_PUBLIC_VERCEL_ANALYTICS: "true" }),
    true,
  );
}

{
  const scrubbed = scrubAnalyticsEvent({
    type: "pageview",
    url: "https://sync.example/settings?email=owner@example.com#panel",
  });
  assert.equal(scrubbed?.url, "https://sync.example/settings");
}

{
  const layout = readFileSync(join(process.cwd(), "app/layout.tsx"), "utf8");
  assert.match(layout, /OptionalAnalytics/);
  const cookies = readFileSync(
    join(process.cwd(), "app/(marketing)/cookies/page.tsx"),
    "utf8",
  );
  assert.match(cookies, /NEXT_PUBLIC_VERCEL_ANALYTICS/);
}

console.log("vercel-analytics tests passed");
