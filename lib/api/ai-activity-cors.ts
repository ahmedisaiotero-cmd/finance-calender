const ALLOWED_METHODS = "GET, POST, OPTIONS";
const ALLOWED_HEADERS = "authorization, content-type, x-sync-owner-secret";

export function isAllowedAiActivityOrigin(origin: string | null): origin is string {
  if (!origin) return false;
  if (origin.startsWith("chrome-extension://")) return true;
  try {
    const url = new URL(origin);
    return (
      url.hostname === "localhost" ||
      url.hostname === "127.0.0.1"
    );
  } catch {
    return false;
  }
}

export function aiActivityCorsHeaders(request: Request): HeadersInit {
  const origin = request.headers.get("origin");
  if (!isAllowedAiActivityOrigin(origin)) return {};
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": ALLOWED_METHODS,
    "Access-Control-Allow-Headers": ALLOWED_HEADERS,
    Vary: "Origin",
  };
}

export function withAiActivityCors(
  request: Request,
  response: Response,
): Response {
  const headers = aiActivityCorsHeaders(request);
  const next = new Headers(response.headers);
  for (const [key, value] of Object.entries(headers)) {
    next.set(key, value);
  }
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: next,
  });
}
