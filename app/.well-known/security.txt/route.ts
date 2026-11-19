import { buildSecurityTxt } from "@/lib/site/security-txt";

export function GET() {
  return new Response(buildSecurityTxt(), {
    status: 200,
    headers: {
      "content-type": "text/plain; charset=utf-8",
      "cache-control": "public, max-age=86400",
    },
  });
}
