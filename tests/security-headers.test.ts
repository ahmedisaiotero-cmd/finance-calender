import assert from "node:assert/strict";

import {
  CONTENT_SECURITY_POLICY_REPORT_ONLY,
  SYNC_SECURITY_HEADERS,
  nextSecurityHeaderConfig,
} from "@/lib/security/http-headers";

function header(name: string) {
  return SYNC_SECURITY_HEADERS.find((item) => item.key === name)?.value;
}

{
  assert.match(header("Strict-Transport-Security") ?? "", /max-age=63072000/);
  assert.match(header("Strict-Transport-Security") ?? "", /includeSubDomains/);
  assert.equal(header("X-Content-Type-Options"), "nosniff");
  assert.equal(header("Referrer-Policy"), "strict-origin-when-cross-origin");
  assert.equal(header("X-Frame-Options"), "DENY");
}

{
  const csp = header("Content-Security-Policy-Report-Only") ?? "";
  assert.equal(csp, CONTENT_SECURITY_POLICY_REPORT_ONLY);
  assert.match(csp, /frame-ancestors 'none'/);
  assert.match(csp, /object-src 'none'/);
  assert.equal(SYNC_SECURITY_HEADERS.some((item) => item.key === "Content-Security-Policy"), false);
}

{
  const config = nextSecurityHeaderConfig();
  assert.equal(config[0]?.source, "/:path*");
  assert.equal(config[0]?.headers.length, SYNC_SECURITY_HEADERS.length);
}

console.log("security-headers tests passed");
