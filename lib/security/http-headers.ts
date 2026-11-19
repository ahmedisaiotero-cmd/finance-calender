/**
 * Production security headers applied to every route.
 * CSP starts report-only so Next.js inline scripts can be observed before enforcing.
 */

export const CONTENT_SECURITY_POLICY_REPORT_ONLY = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://vercel.live https://va.vercel-scripts.com",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://vercel.live https://*.ingest.sentry.io",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
  "upgrade-insecure-requests",
].join("; ");

export const SYNC_SECURITY_HEADERS: ReadonlyArray<{
  key: string;
  value: string;
}> = [
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  {
    key: "X-Content-Type-Options",
    value: "nosniff",
  },
  {
    key: "Referrer-Policy",
    value: "strict-origin-when-cross-origin",
  },
  {
    key: "X-Frame-Options",
    value: "DENY",
  },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), payment=()",
  },
  {
    key: "Content-Security-Policy-Report-Only",
    value: CONTENT_SECURITY_POLICY_REPORT_ONLY,
  },
];

export function nextSecurityHeaderConfig() {
  return [
    {
      source: "/:path*",
      headers: SYNC_SECURITY_HEADERS.map((header) => ({
        key: header.key,
        value: header.value,
      })),
    },
  ];
}
