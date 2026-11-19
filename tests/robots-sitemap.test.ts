import assert from "node:assert/strict";

import {
  PUBLIC_INDEX_PATHS,
  ROBOTS_DISALLOW_PATHS,
  robotsMetadata,
  sitemapEntries,
} from "@/lib/site/public-index";

{
  assert.ok(PUBLIC_INDEX_PATHS.includes("/privacy"));
  assert.ok(PUBLIC_INDEX_PATHS.includes("/contact"));
  assert.equal(PUBLIC_INDEX_PATHS.includes("/login" as never), false);
  assert.ok(ROBOTS_DISALLOW_PATHS.includes("/api/"));
  assert.ok(ROBOTS_DISALLOW_PATHS.includes("/sync-lab"));
  assert.ok(ROBOTS_DISALLOW_PATHS.includes("/settings"));
}

{
  const robots = robotsMetadata({
    NEXT_PUBLIC_SITE_URL: "https://sync.example",
  });
  assert.equal(robots.sitemap, "https://sync.example/sitemap.xml");
  assert.deepEqual(robots.rules[0]?.disallow, [...ROBOTS_DISALLOW_PATHS]);
  assert.equal(robots.rules[0]?.allow?.includes("/login") ?? false, false);
}

{
  const empty = sitemapEntries({});
  assert.deepEqual(empty, []);
  const urls = sitemapEntries({
    NEXT_PUBLIC_SITE_URL: "https://sync.example",
  }).map((entry) => entry.url);
  assert.ok(urls.includes("https://sync.example/welcome"));
  assert.ok(urls.includes("https://sync.example/privacy"));
  assert.equal(urls.some((url) => url.includes("/login")), false);
  assert.equal(urls.some((url) => url.includes("/api/")), false);
}

console.log("robots-sitemap tests passed");
